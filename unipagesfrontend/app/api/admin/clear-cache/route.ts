import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/utils/cache';
import { requestCache } from '@/utils/request-cache';
import { auth } from '@/auth';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(session.user as any)?.roles?.includes('admin')) {
    return null;
  }
  return session as any;
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication for cache clearing
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('🧹 [CACHE CLEAR] Starting server-side cache clearing...');
    const startTime = Date.now();

    // Clear all in-memory caches
    const cacheKeys = [
      'users-list',
      'roles-list', 
      'profiles-list',
      'permission-sets-list',
      'admin-stats'
    ];

    // Clear specific caches
    let clearedCount = 0;
    cacheKeys.forEach(key => {
      if (cache.has(key)) {
        cache.delete(key);
        clearedCount++;
        console.log(`✅ Cleared cache: ${key}`);
      }
    });

    // Clear user roles caches (these have dynamic keys)
    // We'll clear all cache entries that start with 'user-roles-'
    const allCacheEntries = Array.from((cache as any).cache.keys()) as string[];
    const rolesCacheKeys = allCacheEntries.filter((key: string) => key.startsWith('user-roles-'));
    
    rolesCacheKeys.forEach(key => {
      cache.delete(key);
      clearedCount++;
      console.log(`✅ Cleared roles cache: ${key}`);
    });

    // Clear request cache (prevents duplicate requests)
    requestCache.clear();
    console.log('✅ Request cache cleared');

    // Clear any other dynamic caches
    const dynamicCacheKeys = allCacheEntries.filter((key: string) => 
      key.startsWith('users-') || 
      key.startsWith('roles-') || 
      key.startsWith('profiles-') ||
      key.startsWith('permission-sets-')
    );

    dynamicCacheKeys.forEach(key => {
      cache.delete(key);
      clearedCount++;
      console.log(`✅ Cleared dynamic cache: ${key}`);
    });

    const clearTime = Date.now() - startTime;
    console.log(`🧹 [CACHE CLEAR] Server cache clearing completed in ${clearTime}ms`);
    console.log(`📊 [CACHE CLEAR] Total caches cleared: ${clearedCount + 1}`); // +1 for request cache

    return NextResponse.json({
      success: true,
      message: 'Server cache cleared successfully',
      clearedCount: clearedCount + 1,
      clearTime: clearTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CACHE CLEAR] Error clearing server cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear server cache', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual cache clearing
export async function GET(request: NextRequest) {
  return POST(request);
}
