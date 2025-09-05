// Cache clearing utility for logout and security purposes

/**
 * Clear all browser caches and storage
 */
export function clearBrowserCache(): void {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      console.log('✅ localStorage cleared');
    }

    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
    }

    // Clear IndexedDB (if used)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      // Note: IndexedDB clearing is more complex and would need specific implementation
      console.log('ℹ️ IndexedDB clearing not implemented (not currently used)');
    }

    // Clear service worker cache (if available)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('✅ Service worker unregistered');
        });
      });
    }

    // Clear browser cache using Cache API (if available)
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log(`✅ Cache "${cacheName}" cleared`);
        });
      });
    }

    console.log('🧹 Browser cache clearing completed');
  } catch (error) {
    console.error('❌ Error clearing browser cache:', error);
  }
}

/**
 * Clear server-side cache by calling the cache clear API
 */
export async function clearServerCache(): Promise<void> {
  try {
    const response = await fetch('/api/admin/clear-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('✅ Server cache cleared successfully');
    } else {
      console.warn('⚠️ Failed to clear server cache:', response.statusText);
    }
  } catch (error) {
    console.error('❌ Error clearing server cache:', error);
  }
}

/**
 * Clear all caches (browser + server) - use this on logout
 */
export async function clearAllCaches(): Promise<void> {
  console.log('🧹 Starting comprehensive cache clearing...');
  
  // Clear browser cache immediately
  clearBrowserCache();
  
  // Clear server cache
  await clearServerCache();
  
  console.log('✅ All caches cleared successfully');
}

/**
 * Force refresh all data by clearing caches and reloading
 */
export function forceRefreshAllData(): void {
  clearBrowserCache();
  
  // Add cache-busting parameters to force fresh data
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    url.searchParams.set('_cache_clear', 'true');
    
    // Reload the page with cache-busting parameters
    window.location.href = url.toString();
  }
}
