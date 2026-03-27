import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables");
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
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return jwt.sign({ userId, isVerified }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(
  token: string,
): { userId: string; isVerified: boolean } | null {
  try {
    if (!JWT_SECRET) {
      console.error("[verifyToken] JWT_SECRET is not defined!");
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as {
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
