import { type NextRequest, NextResponse } from "next/server";
import { generateToken, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email/sendgrid";
import { generateOtp, hashOtp } from "@/lib/otp/generator";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!email.toLowerCase().endsWith("@devit.group")) {
      return NextResponse.json(
        { error: "Only @devit.group email addresses are permitted to register." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isVerified: false,
      },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpRequest.create({
      data: {
        email,
        codeHash: hashOtp(code),
        expiresAt,
      },
    });

    try {
      await sendOtpEmail(email, code);
    } catch (emailError) {
      console.error("Failed to send OTP email, rolling back:", JSON.stringify(emailError));
      await prisma.otpRequest.deleteMany({ where: { email } });
      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 503 },
      );
    }

    const token = generateToken(user.id, false);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          isVerified: false,
        },
        redirectTo: "/verify-email",
      },
      { status: 201 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
