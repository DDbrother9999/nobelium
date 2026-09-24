import { NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/staff', '/staff/login']);

export async function proxy(request) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;
  const baseUrl = process.env.APP_URL || request.url;

  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    if (!session && !PUBLIC_PATHS.has(pathname)) {
      return NextResponse.redirect(new URL('/staff/login', baseUrl));
    }
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/staff/login', baseUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/login'],
};
