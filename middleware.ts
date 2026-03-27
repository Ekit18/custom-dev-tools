import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const publicPaths = ["/login", "/register"];
const authPaths = ["/login", "/register"];
const verificationPath = "/verify-email";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));
  const isVerificationPath = pathname.startsWith(verificationPath);

  if (!token && !isPublicPath && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const decoded = verifyToken(token);

    if (!decoded && !isPublicPath) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }

    if (decoded) {
      if (!decoded.isVerified) {
        // Unverified users may only access /verify-email
        if (!isVerificationPath) {
          return NextResponse.redirect(new URL(verificationPath, request.url));
        }
        return NextResponse.next();
      }

      // Verified users: hide the verification page and auth pages
      if (isVerificationPath || isAuthPath || pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
