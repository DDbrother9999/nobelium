import { NextResponse } from 'next/server';

export async function proxy(request) {
  const session = request.cookies.get('session');
  
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/staff')) {
    if (!session && request.nextUrl.pathname !== '/staff/login') {
      return NextResponse.redirect(new URL('/staff/login', process.env.APP_URL));
    }
  }

  if (request.nextUrl.pathname === '/staff/login' && session) {
    return NextResponse.redirect(new URL('/staff/dashboard', process.env.APP_URL));
  }

  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/staff/login', process.env.APP_URL));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/login'],
};
