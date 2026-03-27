import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set in environment variables");
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, isVerified: boolean): string {
  return jwt.sign({ userId, isVerified }, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(
  token: string,
): { userId: string; isVerified: boolean } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      isVerified: boolean;
    };
    return decoded;
  } catch (error) {
    console.error(
      "[verifyToken] Token verification failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
