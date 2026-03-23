import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

const publicPaths = ['/login', '/register'];
const authPaths = ['/login', '/register'];
const protectedPaths = ['/dashboard', '/stores'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  console.log('[Middleware]', {
    pathname,
    hasToken: !!token,
    tokenLength: token?.length
  });

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Якщо немає токена і це не публічний шлях і не головна сторінка
  if (!token && !isPublicPath && pathname !== '/') {
    console.log('[Middleware] No token, redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Якщо є токен
  if (token) {
    const decoded = verifyToken(token);
    console.log('[Middleware] Token decoded:', !!decoded);

    // Якщо токен невалідний і це не публічний шлях
    if (!decoded && !isPublicPath) {
      console.log('[Middleware] Invalid token, redirecting to /login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    // Якщо токен валідний і користувач на сторінці login/register - редирект на dashboard
    if (decoded && isAuthPath) {
      console.log(
        '[Middleware] Valid token on auth page, redirecting to /dashboard'
      );
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Якщо токен валідний і користувач на головній сторінці - редирект на dashboard
    if (decoded && pathname === '/') {
      console.log(
        '[Middleware] Valid token on home, redirecting to /dashboard'
      );
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  console.log('[Middleware] Allowing request to', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)']
};