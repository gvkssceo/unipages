// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import { APP_BRANDING } from '@/lib/config';
import { PageLoadTracker } from '@/components/PageLoadTracker';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';

export const metadata: Metadata = {
  title: APP_BRANDING.title,
  icons: {
    icon: '/logo.jpg',
  },
  themeColor: '#111827',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_BRANDING.title,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PageLoadTracker />
          <RegisterServiceWorker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
