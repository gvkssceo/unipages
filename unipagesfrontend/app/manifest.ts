import type { MetadataRoute } from 'next';
import { APP_BRANDING } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRANDING.title || 'Unipages',
    short_name: 'Unipages',
    description: 'Admin dashboard',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111827',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}


