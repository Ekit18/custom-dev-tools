import { type NextRequest, NextResponse } from "next/server";
import { generateToken, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp/generator";

const MAX_ATTEMPTS = 5;

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

    const { code } = await request.json();

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "A 6-digit verification code is required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const activeOtp = await prisma.otpRequest.findFirst({
      where: {
        email: user.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp) {
      return NextResponse.json(
        {
          error:
            "Verification code not found or has expired. Please request a new code.",
          canResend: true,
        },
        { status: 410 },
      );
    }

    if (!verifyOtp(code, activeOtp.codeHash)) {
      const newAttempts = activeOtp.attempts + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        await prisma.otpRequest.update({
          where: { id: activeOtp.id },
          data: { usedAt: new Date(), attempts: newAttempts },
        });
        return NextResponse.json(
          {
            error:
              "Verification code not found or has expired. Please request a new code.",
            canResend: true,
          },
          { status: 410 },
        );
      }

      await prisma.otpRequest.update({
        where: { id: activeOtp.id },
        data: { attempts: newAttempts },
      });

      return NextResponse.json(
        {
          error: "Incorrect verification code.",
          attemptsRemaining: MAX_ATTEMPTS - newAttempts,
        },
        { status: 422 },
      );
    }

    await prisma.$transaction([
      prisma.otpRequest.update({
        where: { id: activeOtp.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    const newToken = generateToken(user.id, true);

    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
    });

    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
