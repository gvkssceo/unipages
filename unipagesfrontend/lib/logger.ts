/**
 * Centralized logging utility for API and page performance tracking
 */

export interface LogContext {
  requestId?: string;
  startTime?: number;
  route?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
}

export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Log API request start
   */
  static logApiRequest(apiPath: string, method: string = 'GET', requestId?: string): string {
    const id = requestId || this.generateRequestId();
    const timestamp = this.formatTimestamp();
    console.log(`<${apiPath}> requested at <${timestamp}> [${id}]`);
    return id;
  }

  /**
   * Log API request completion
   */
  static logApiResponse(
    apiPath: string, 
    statusCode: number, 
    startTime: number, 
    requestId: string,
    method: string = 'GET'
  ): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const timestamp = this.formatTimestamp();
    const status = statusCode >= 200 && statusCode < 300 ? 'successful' : 'failed';
    
    console.log(`<${apiPath}> ${status} at <${timestamp}> [${requestId}] (${responseTime}ms)`);
  }

  /**
   * Log page load start
   */
  static logPageLoad(route: string, requestId?: string): string {
    const id = requestId || this.generateRequestId();
    const timestamp = this.formatTimestamp();
    console.log(`opened page <${route}> at <${timestamp}> [${id}]`);
    return id;
  }

  /**
   * Log page load completion
   */
  static logPageComplete(route: string, startTime: number, requestId: string): void {
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    const timestamp = this.formatTimestamp();
    
    console.log(`completed page <${route}> at <${timestamp}> [${requestId}] (${loadTime}ms)`);
  }

  /**
   * Log with context
   */
  static logWithContext(message: string, context: LogContext): void {
    const timestamp = this.formatTimestamp();
    const contextStr = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    
    console.log(`[${timestamp}] ${message} ${contextStr ? `(${contextStr})` : ''}`);
  }
}

/**
 * Hook for client-side page load tracking
 */
export function usePageLoadTracking() {
  if (typeof window === 'undefined') return;

  const trackPageLoad = (route: string) => {
    const startTime = Date.now();
    const requestId = Logger.logPageLoad(route);
    
    // Track when page is fully loaded
    const handleLoad = () => {
      Logger.logPageComplete(route, startTime, requestId);
      window.removeEventListener('load', handleLoad);
    };
    
    window.addEventListener('load', handleLoad);
    
    // Fallback timeout in case load event doesn't fire
    setTimeout(() => {
      Logger.logPageComplete(route, startTime, requestId);
      window.removeEventListener('load', handleLoad);
    }, 10000); // 10 second timeout
  };

  return { trackPageLoad };
}
