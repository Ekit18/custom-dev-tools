import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

jest.mock('@/lib/email/sendgrid', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

import { sendOtpEmail } from '@/lib/email/sendgrid';
const mockSendOtpEmail = sendOtpEmail as jest.Mock;

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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


describe('POST /api/auth/register', () => {
  describe('happy path — @devit.group email', () => {
    it('returns 201 with user and redirectTo', async () => {
      const res = await POST(makeRequest({ email: 'test@devit.group', password: 'password123' }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.user.email).toBe('test@devit.group');
      expect(body.user.isVerified).toBe(false);
      expect(body.redirectTo).toBe('/verify-email');
    });

    it('sets an httpOnly token cookie with isVerified=false', async () => {
      const res = await POST(makeRequest({ email: 'cookie@devit.group', password: 'password123' }));
      const setCookie = res.headers.get('set-cookie') ?? '';
      expect(setCookie).toContain('token=');
      expect(setCookie).toContain('HttpOnly');

      const tokenMatch = setCookie.match(/token=([^;]+)/);
      const token = tokenMatch?.[1];
      expect(token).toBeTruthy();
      const decoded = verifyToken(token!);
      expect(decoded?.isVerified).toBe(false);
    });

    it('creates an OtpRequest row in the database', async () => {
      await POST(makeRequest({ email: 'otp@devit.group', password: 'password123' }));
      const otpRow = await prisma.otpRequest.findFirst({ where: { email: 'otp@devit.group' } });
      expect(otpRow).not.toBeNull();
      expect(otpRow?.usedAt).toBeNull();
    });

    it('dispatches an OTP email', async () => {
      await POST(makeRequest({ email: 'mail@devit.group', password: 'password123' }));
      expect(mockSendOtpEmail).toHaveBeenCalledTimes(1);
      expect(mockSendOtpEmail).toHaveBeenCalledWith('mail@devit.group', expect.stringMatching(/^\d{6}$/));
    });
  });

  describe('domain restriction', () => {
    it('returns 400 for non-@devit.group email', async () => {
      const res = await POST(makeRequest({ email: 'user@gmail.com', password: 'password123' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch("@devit.group");
    });

    it('does not create an OtpRequest for rejected domain', async () => {
      await POST(makeRequest({ email: 'user@gmail.com', password: 'password123' }));
      const count = await prisma.otpRequest.count({ where: { email: 'user@gmail.com' } });
      expect(count).toBe(0);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when email is missing', async () => {
      const res = await POST(makeRequest({ password: 'password123' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const res = await POST(makeRequest({ email: 'valid@devit.group', password: '1234567' }));
      expect(res.status).toBe(400);
    });

    it('returns 409 when email is already registered', async () => {
      await POST(makeRequest({ email: 'dup@devit.group', password: 'password123' }));
      const res = await POST(makeRequest({ email: 'dup@devit.group', password: 'password123' }));
      expect(res.status).toBe(409);
    });
  });
});
