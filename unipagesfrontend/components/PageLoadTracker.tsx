'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Logger } from '@/lib/logger';

/**
 * Component to track page load performance
 * Add this to your layout or individual pages
 */
export function PageLoadTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip tracking for API routes and static assets
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return;
    }

    const startTime = Date.now();
    const requestId = Logger.logPageLoad(pathname);

    // Track when the page is fully loaded
    const handleLoad = () => {
      Logger.logPageComplete(pathname, startTime, requestId);
    };

    // Use different events based on page state
    if (document.readyState === 'complete') {
      // Page is already loaded
      handleLoad();
    } else {
      // Wait for page to load
      window.addEventListener('load', handleLoad);
      
      // Fallback timeout in case load event doesn't fire
      const timeout = setTimeout(() => {
        Logger.logPageComplete(pathname, startTime, requestId);
        window.removeEventListener('load', handleLoad);
      }, 10000); // 10 second timeout

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('load', handleLoad);
      };
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}

/**
 * Hook for manual page load tracking
 */
export function usePageLoadTracking() {
  const pathname = usePathname();

  const trackPageLoad = (customRoute?: string) => {
    const route = customRoute || pathname;
    const startTime = Date.now();
    const requestId = Logger.logPageLoad(route);

    const handleLoad = () => {
      Logger.logPageComplete(route, startTime, requestId);
      window.removeEventListener('load', handleLoad);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      
      setTimeout(() => {
        Logger.logPageComplete(route, startTime, requestId);
        window.removeEventListener('load', handleLoad);
      }, 10000);
    }
  };

  return { trackPageLoad };
}
