// Performance monitoring utility for tracking API response times
interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit?: boolean;
  databaseTime?: number;
  keycloakTime?: number;
  transformTime?: number;
  totalTime?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  startRequest(endpoint: string): string {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    const metric: PerformanceMetrics = {
      requestId,
      endpoint,
      startTime
    };
    
    this.metrics.set(requestId, metric);
    
    console.log(`🚀 [${requestId}] ${endpoint} API Request Started at ${new Date().toISOString()}`);
    return requestId;
  }
  
  logCacheHit(requestId: string): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.cacheHit = true;
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      
      console.log(`✅ [${requestId}] CACHE HIT - Returning cached data in ${metric.duration}ms`);
    }
  }
  
  logCacheMiss(requestId: string): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.cacheHit = false;
      console.log(`🔄 [${requestId}] CACHE MISS - Fetching fresh data from database`);
    }
  }
  
  logDatabaseTime(requestId: string, dbTime: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.databaseTime = dbTime;
      console.log(`🔗 [${requestId}] Database operations completed in ${dbTime}ms`);
    }
  }
  
  logKeycloakTime(requestId: string, keycloakTime: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.keycloakTime = keycloakTime;
      console.log(`🔑 [${requestId}] Keycloak operations completed in ${keycloakTime}ms`);
    }
  }
  
  logTransformTime(requestId: string, transformTime: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.transformTime = transformTime;
      console.log(`🔄 [${requestId}] Data transformation completed in ${transformTime}ms`);
    }
  }
  
  endRequest(requestId: string, recordCount?: number): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.endTime = Date.now();
      metric.totalTime = metric.endTime - metric.startTime;
      
      console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
      if (metric.cacheHit) {
        console.log(`   - CACHE HIT: ${metric.totalTime}ms`);
      } else {
        if (metric.databaseTime) console.log(`   - Database: ${metric.databaseTime}ms`);
        if (metric.keycloakTime) console.log(`   - Keycloak: ${metric.keycloakTime}ms`);
        if (metric.transformTime) console.log(`   - Transformation: ${metric.transformTime}ms`);
        console.log(`   - TOTAL TIME: ${metric.totalTime}ms`);
      }
      
      if (recordCount !== undefined) {
        console.log(`   - Records processed: ${recordCount}`);
        console.log(`   - Time per record: ${(metric.totalTime / recordCount).toFixed(2)}ms`);
      }
      
      console.log(`💾 [${requestId}] Data cached for future requests`);
      
      // Store metric for analysis (optional)
      this.storeMetric(metric);
    }
  }
  
  private storeMetric(metric: PerformanceMetrics): void {
    // In a real application, you might want to send this to a monitoring service
    // For now, we'll just log it
    if (metric.totalTime && metric.totalTime > 1000) {
      console.warn(`⚠️ [${metric.requestId}] Slow request detected: ${metric.totalTime}ms for ${metric.endpoint}`);
    }
  }
  
  getAverageResponseTime(endpoint: string, timeWindow: number = 5 * 60 * 1000): number {
    const now = Date.now();
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.endpoint === endpoint && m.endTime && (now - m.endTime) < timeWindow)
      .map(m => m.totalTime || 0);
    
    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, time) => sum + time, 0) / recentMetrics.length;
  }
  
  getCacheHitRate(endpoint: string, timeWindow: number = 5 * 60 * 1000): number {
    const now = Date.now();
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.endpoint === endpoint && m.endTime && (now - m.endTime) < timeWindow);
    
    if (recentMetrics.length === 0) return 0;
    
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    return (cacheHits / recentMetrics.length) * 100;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Helper function to create a performance timer
export function createPerformanceTimer(endpoint: string) {
  const requestId = performanceMonitor.startRequest(endpoint);
  
  return {
    requestId,
    logCacheHit: () => performanceMonitor.logCacheHit(requestId),
    logCacheMiss: () => performanceMonitor.logCacheMiss(requestId),
    logDatabaseTime: (time: number) => performanceMonitor.logDatabaseTime(requestId, time),
    logKeycloakTime: (time: number) => performanceMonitor.logKeycloakTime(requestId, time),
    logTransformTime: (time: number) => performanceMonitor.logTransformTime(requestId, time),
    end: (recordCount?: number) => performanceMonitor.endRequest(requestId, recordCount)
  };
}
