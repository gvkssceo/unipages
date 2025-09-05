// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import { APP_BRANDING } from '@/lib/config';
import { PageLoadTracker } from '@/components/PageLoadTracker';

export const metadata: Metadata = {
  title: APP_BRANDING.title,
  icons: {
    icon: '/logo.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <PageLoadTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
