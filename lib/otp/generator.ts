import { createHash, randomInt } from "node:crypto";

export function generateOtp(): string {
  return String(randomInt(100000, 1000000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtp(code: string, hash: string): boolean {
  return hashOtp(code) === hash;
}
