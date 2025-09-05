import { NextRequest, NextResponse } from 'next/server';
import { Logger } from './logger';

/**
 * API request logging wrapper
 * Use this to wrap API route handlers for automatic logging
 */
export function withApiLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    
    // Extract API path and method
    const apiPath = request.nextUrl.pathname;
    const method = request.method;
    
    // Get request ID from headers if available (set by middleware)
    const requestId = request.headers.get('x-request-id') || Logger.logApiRequest(apiPath, method);
    
    try {
      // Call the original handler
      const response = await handler(...args);
      
      // Log successful response
      Logger.logApiResponse(apiPath, response.status, startTime, requestId, method);
      
      return response;
    } catch (error) {
      // Log error response
      Logger.logApiResponse(apiPath, 500, startTime, requestId, method);
      throw error;
    }
  };
}

/**
 * Manual API logging for existing routes
 */
export function logApiRequest(request: NextRequest, customPath?: string): string {
  const apiPath = customPath || request.nextUrl.pathname;
  const method = request.method;
  const requestId = request.headers.get('x-request-id') || Logger.logApiRequest(apiPath, method);
  return requestId;
}

export function logApiResponse(
  request: NextRequest, 
  statusCode: number, 
  startTime: number,
  customPath?: string
): void {
  const apiPath = customPath || request.nextUrl.pathname;
  const method = request.method;
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  Logger.logApiResponse(apiPath, statusCode, startTime, requestId, method);
}
