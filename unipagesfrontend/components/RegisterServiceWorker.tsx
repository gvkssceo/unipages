'use client';

import { useEffect } from 'react';

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const id = window.setTimeout(async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {}
    }, 500);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}


