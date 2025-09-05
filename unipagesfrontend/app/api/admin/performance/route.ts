import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/utils/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'all';
    const timeWindow = parseInt(searchParams.get('timeWindow') || '300000'); // 5 minutes default
    
    const metrics = {
      users: {
        averageResponseTime: performanceMonitor.getAverageResponseTime('users', timeWindow),
        cacheHitRate: performanceMonitor.getCacheHitRate('users', timeWindow)
      },
      roles: {
        averageResponseTime: performanceMonitor.getAverageResponseTime('roles', timeWindow),
        cacheHitRate: performanceMonitor.getCacheHitRate('roles', timeWindow)
      },
      profiles: {
        averageResponseTime: performanceMonitor.getAverageResponseTime('profiles', timeWindow),
        cacheHitRate: performanceMonitor.getCacheHitRate('profiles', timeWindow)
      },
      permissionSets: {
        averageResponseTime: performanceMonitor.getAverageResponseTime('permission-sets', timeWindow),
        cacheHitRate: performanceMonitor.getCacheHitRate('permission-sets', timeWindow)
      }
    };
    
    const summary = {
      timestamp: new Date().toISOString(),
      timeWindow: `${timeWindow / 1000}s`,
      endpoints: endpoint === 'all' ? metrics : { [endpoint]: metrics[endpoint as keyof typeof metrics] }
    };
    
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
