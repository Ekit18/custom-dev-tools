import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email/sendgrid";
import { generateOtp, hashOtp } from "@/lib/otp/generator";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 },
      );
    }

    if (decoded.isVerified) {
      return NextResponse.json(
        {
          error: "Email address is already verified.",
          redirectTo: "/dashboard",
        },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentRequests = await prisma.otpRequest.findMany({
      where: {
        email: user.email,
        createdAt: { gt: windowStart },
      },
      orderBy: { createdAt: "asc" },
    });

    if (recentRequests.length >= RATE_LIMIT_MAX) {
      const oldest = recentRequests[0];
      const retryAfterMs =
        oldest.createdAt.getTime() + RATE_LIMIT_WINDOW_MS - Date.now();
      const retryAfterSeconds = Math.ceil(Math.max(retryAfterMs, 0) / 1000);

      return NextResponse.json(
        {
          error:
            "Too many verification code requests. Please wait before requesting another.",
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    // Invalidate all currently active OTPs for this email
    await prisma.otpRequest.updateMany({
      where: { email: user.email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpRequest.create({
      data: {
        email: user.email,
        codeHash: hashOtp(code),
        expiresAt,
      },
    });

    await sendOtpEmail(user.email, code);

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent to your email address.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
