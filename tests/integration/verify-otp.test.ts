import { POST } from '@/app/api/auth/verify-otp/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { generateToken, verifyToken } from '@/lib/auth';
import { hashOtp } from '@/lib/otp/generator';

function makeRequest(body: object, token?: string) {
  const req = new NextRequest('http://localhost/api/auth/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `token=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return req;
}

async function seedUserAndOtp(opts: { isVerified?: boolean; code?: string; expiresInMs?: number } = {}) {
  const { isVerified = false, code = '482931', expiresInMs = 10 * 60 * 1000 } = opts;
  const user = await prisma.user.create({
    data: {
      email: `verify-test-${Date.now()}@devit.group`,
      password: 'hashed',
      isVerified,
    },
  });
  const otp = await prisma.otpRequest.create({
    data: {
      email: user.email,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + expiresInMs),
    },
  });
  const token = generateToken(user.id, isVerified);
  return { user, otp, token, code };
}

beforeEach(async () => {
  await prisma.otpRequest.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: '@devit.group' } } });
});

afterEach(async () => {
  await prisma.otpRequest.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: '@devit.group' } } });
});

describe('POST /api/auth/verify-otp', () => {
  describe('happy path', () => {
    it('returns 200 with redirectTo /dashboard', async () => {
      const { token, code } = await seedUserAndOtp();
      const res = await POST(makeRequest({ code }, token));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.redirectTo).toBe('/dashboard');
    });

    it('sets User.isVerified = true in the database', async () => {
      const { user, token, code } = await seedUserAndOtp();
      await POST(makeRequest({ code }, token));
      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated?.isVerified).toBe(true);
    });

    it('marks the OtpRequest as used', async () => {
      const { otp, token, code } = await seedUserAndOtp();
      await POST(makeRequest({ code }, token));
      const updated = await prisma.otpRequest.findUnique({ where: { id: otp.id } });
      expect(updated?.usedAt).not.toBeNull();
    });

    it('issues a new token cookie with isVerified=true', async () => {
      const { token, code } = await seedUserAndOtp();
      const res = await POST(makeRequest({ code }, token));
      const setCookie = res.headers.get('set-cookie') ?? '';
      const tokenMatch = setCookie.match(/token=([^;]+)/);
      const newToken = tokenMatch?.[1];
      expect(newToken).toBeTruthy();
      const decoded = verifyToken(newToken!);
      expect(decoded?.isVerified).toBe(true);
    });
  });

  describe('error cases', () => {
    it('returns 401 when no token cookie provided', async () => {
      const res = await POST(makeRequest({ code: '123456' }));
      expect(res.status).toBe(401);
    });

    it('returns 409 when user is already verified', async () => {
      const { token, code } = await seedUserAndOtp({ isVerified: true });
      const res = await POST(makeRequest({ code }, token));
      expect(res.status).toBe(409);
    });

    it('returns 410 when OTP has expired', async () => {
      const { token, code } = await seedUserAndOtp({ expiresInMs: -1000 });
      const res = await POST(makeRequest({ code }, token));
      expect(res.status).toBe(410);
      const body = await res.json();
      expect(body.canResend).toBe(true);
    });

    it('returns 422 with attemptsRemaining for wrong code', async () => {
      const { token } = await seedUserAndOtp({ code: '482931' });
      const res = await POST(makeRequest({ code: '000000' }, token));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.attemptsRemaining).toBeDefined();
    });

    it('returns 410 after 5 wrong attempts (auto-invalidation)', async () => {
      const { token } = await seedUserAndOtp({ code: '482931' });
      for (let i = 0; i < 4; i++) {
        await POST(makeRequest({ code: '000000' }, token));
      }
      const res = await POST(makeRequest({ code: '000000' }, token));
      expect(res.status).toBe(410);
    });
  });
});

// ---------------------------------------------------------------------------
// US3: OTP Expiry & Resend
// ---------------------------------------------------------------------------

import { POST as POST_RESEND } from '@/app/api/auth/resend-otp/route';

jest.mock('@/lib/email/sendgrid', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/auth/resend-otp', () => {
  beforeEach(async () => {
    await prisma.otpRequest.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { contains: '@devit.group' } } });
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.otpRequest.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { contains: '@devit.group' } } });
    jest.clearAllMocks();
  });

  it('returns 200 and creates a new OtpRequest', async () => {
    const { token, user } = await seedUserAndOtp();
    const res = await POST_RESEND(makeRequest({}, token));
    expect(res.status).toBe(200);
    const rows = await prisma.otpRequest.findMany({
      where: { email: user.email, usedAt: null },
    });
    expect(rows.length).toBe(1);
  });

  it('invalidates the previous OTP on resend', async () => {
    const { token, otp } = await seedUserAndOtp();
    await POST_RESEND(makeRequest({}, token));
    const old = await prisma.otpRequest.findUnique({ where: { id: otp.id } });
    expect(old?.usedAt).not.toBeNull();
  });

  it('returns 429 after the 3rd OTP request within the hour', async () => {
    const { user } = await seedUserAndOtp();
    const token = generateToken(user.id, false);

    // Seed 3 OtpRequest rows within the last hour
    for (let i = 0; i < 3; i++) {
      await prisma.otpRequest.create({
        data: {
          email: user.email,
          codeHash: hashOtp('111111'),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          createdAt: new Date(Date.now() - 1000 * (i + 1)),
        },
      });
    }

    const res = await POST_RESEND(makeRequest({}, token));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await POST_RESEND(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 409 when user is already verified', async () => {
    const { token } = await seedUserAndOtp({ isVerified: true });
    const res = await POST_RESEND(makeRequest({}, token));
    expect(res.status).toBe(409);
  });
});
