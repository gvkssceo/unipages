'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceMetrics {
  users: {
    averageResponseTime: number;
    cacheHitRate: number;
  };
  roles: {
    averageResponseTime: number;
    cacheHitRate: number;
  };
  profiles: {
    averageResponseTime: number;
    cacheHitRate: number;
  };
  permissionSets: {
    averageResponseTime: number;
    cacheHitRate: number;
  };
}

interface PerformanceData {
  timestamp: string;
  timeWindow: string;
  endpoints: PerformanceMetrics;
}

export default function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('/api/admin/performance');
        if (!response.ok) {
          throw new Error('Failed to fetch performance data');
        }
        const data = await response.json();
        setPerformanceData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Performance Dashboard</h2>
        <div className="text-center">Loading performance metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Performance Dashboard</h2>
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Performance Dashboard</h2>
        <div className="text-center">No performance data available</div>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (ms: number) => {
    if (ms < 100) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCacheHitColor = (rate: number) => {
    if (rate > 80) return 'text-green-600';
    if (rate > 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date(performanceData.timestamp).toLocaleTimeString()}
          <br />
          Time window: {performanceData.timeWindow}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(performanceData.endpoints).map(([endpoint, metrics]) => (
          <Card key={endpoint}>
            <CardHeader>
              <CardTitle className="capitalize">
                {endpoint.replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Average Response Time</div>
                  <div className={`text-lg font-semibold ${getPerformanceColor(metrics.averageResponseTime)}`}>
                    {formatTime(metrics.averageResponseTime)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Cache Hit Rate</div>
                  <div className={`text-lg font-semibold ${getCacheHitColor(metrics.cacheHitRate)}`}>
                    {metrics.cacheHitRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Performance Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">Response Time Colors:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Green: &lt; 100ms (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Yellow: 100-500ms (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Red: &gt; 500ms (Needs Improvement)</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">Cache Hit Rate Colors:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Green: &gt; 80% (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Yellow: 50-80% (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Red: &lt; 50% (Needs Improvement)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
