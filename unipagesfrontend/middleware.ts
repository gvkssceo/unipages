import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Log API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiPath = request.nextUrl.pathname;
    const method = request.method;
    
    console.log(`<${apiPath}> requested at <${timestamp}> [${requestId}]`);
    
    // Create response and add logging
    const response = NextResponse.next();
    
    // Add custom header to track the request
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-start-time', startTime.toString());
    
    return response;
  }
  
  // Log page requests
  if (!request.nextUrl.pathname.startsWith('/_next') && 
      !request.nextUrl.pathname.startsWith('/favicon') &&
      !request.nextUrl.pathname.startsWith('/api/')) {
    
    const route = request.nextUrl.pathname;
    console.log(`opened page <${route}> at <${timestamp}> [${requestId}]`);
    
    // Add custom header to track the request
    const response = NextResponse.next();
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-start-time', startTime.toString());
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
