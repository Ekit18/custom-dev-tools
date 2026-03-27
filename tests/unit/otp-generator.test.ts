import { generateOtp, hashOtp, verifyOtp } from '@/lib/otp/generator';

describe('generateOtp', () => {
  it('returns a 6-character string', () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(6);
  });

  it('returns only digit characters', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('returns a value in the range 100000–999999', () => {
    const otp = generateOtp();
    const num = parseInt(otp, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it('produces different values across calls (statistical)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('hashOtp', () => {
  it('returns a non-empty string', () => {
    expect(hashOtp('123456')).toBeTruthy();
  });

  it('produces the same hash for the same input', () => {
    expect(hashOtp('482931')).toBe(hashOtp('482931'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashOtp('111111')).not.toBe(hashOtp('222222'));
  });

  it('returns a 64-character hex string (SHA-256)', () => {
    expect(hashOtp('123456')).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('verifyOtp', () => {
  it('returns true when code matches the stored hash', () => {
    const code = '482931';
    const hash = hashOtp(code);
    expect(verifyOtp(code, hash)).toBe(true);
  });

  it('returns false when code does not match the stored hash', () => {
    const hash = hashOtp('482931');
    expect(verifyOtp('000000', hash)).toBe(false);
  });

  it('returns false for an empty code', () => {
    const hash = hashOtp('482931');
    expect(verifyOtp('', hash)).toBe(false);
  });
});
