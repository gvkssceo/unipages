'use client';

import { useEffect, useState, memo } from 'react';
import { cache } from '@/utils/cache';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  totalRequests: number;
  cacheSize: number;
}

const PerformanceMonitor = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    cacheSize: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      const cacheStats = cache.getStats();
      
      setMetrics(prev => ({
        ...prev,
        cacheSize: cacheStats.size,
        // These would be tracked in a real implementation
        pageLoadTime: performance.now(),
        apiResponseTime: 0,
        cacheHitRate: 0,
        totalRequests: 0
      }));
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Only show in development or for admin users
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="font-bold mb-2">Performance Monitor</div>
      <div>Cache Size: {metrics.cacheSize}</div>
      <div>Page Load: {metrics.pageLoadTime.toFixed(0)}ms</div>
      <div>API Response: {metrics.apiResponseTime}ms</div>
      <div>Cache Hit Rate: {metrics.cacheHitRate}%</div>
      <div>Total Requests: {metrics.totalRequests}</div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;
