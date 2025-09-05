// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initObservers() {
    // Monitor navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('navigation', navEntry.loadEventEnd - navEntry.loadEventStart);
              this.recordMetric('domContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
              this.recordMetric('firstPaint', navEntry.loadEventEnd - navEntry.loadEventStart);
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        // Navigation timing observer not supported
      }

      // Monitor paint timing
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              this.recordMetric(entry.name, entry.startTime);
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        // Paint timing observer not supported
      }
    }
  }

  recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
    
    // Performance monitoring without console logs
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getAverageMetric(name: string): number {
    const values = Array.from(this.metrics.values());
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(`function_${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`function_${name}_error`, duration);
      throw error;
    }
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(`async_function_${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`async_function_${name}_error`, duration);
      throw error;
    }
  }

  // Generate performance report
  generateReport(): string {
    const metrics = this.getMetrics();
    const report = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${value.toFixed(2)}ms`)
      .join('\n');
    
    return `Performance Report:\n${report}`;
  }

  // Cleanup observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions
export const measureRender = (componentName: string) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(`render_${componentName}`, duration);
  };
};

export const measureApiCall = async <T>(name: string, apiCall: () => Promise<T>): Promise<T> => {
  return performanceMonitor.measureAsyncFunction(name, apiCall);
};
