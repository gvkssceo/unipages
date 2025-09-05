'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if logout is in progress
    const logoutInProgress = sessionStorage.getItem('logout-in-progress');
    if (logoutInProgress === 'true') {
      console.log('🚪 Logout in progress, clearing flag and redirecting to signin...');
      sessionStorage.removeItem('logout-in-progress');
      router.replace('/auth/signin');
      return;
    }

    // Immediately redirect based on authentication status
    if (status === 'loading') return; // Still loading, don't redirect yet

    if (status === 'unauthenticated') {
      // Redirect to signin for unauthenticated users
      router.replace('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const roles = (session.user as any)?.roles || [];
      
      // Only allow admin users to access the system
      if (roles.includes('admin')) {
        router.replace('/admin');
      } else {
        // Redirect non-admin users to unauthorized page
        router.replace('/auth/error?error=AccessDenied');
      }
    }
  }, [status, session, router]);

  // Show minimal loading state only while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // For all other states, show minimal redirecting message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
