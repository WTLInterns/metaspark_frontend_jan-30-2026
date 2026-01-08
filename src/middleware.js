import { NextResponse } from 'next/server';

export function middleware(request) {
  // For now, we'll allow all routes to pass through
  // Authentication will be handled client-side in the layout
  // since middleware runs server-side and can't access localStorage
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
