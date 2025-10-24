import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Log incoming requests
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);

  const response = NextResponse.next();
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('X-API-Version', '1.0.0');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};