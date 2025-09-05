'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AppName } from '@/components/ui/AppName';
import { useEmailVerification } from '@/lib/hooks/useEmailVerification';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  
  // Check if we're coming from email verification flow
  const isEmailVerification = searchParams.get('email_verification') === 'true';
  const userEmail = searchParams.get('email');
  
  // Use email verification hook when in verification mode
  const { isChecking, verificationStatus } = useEmailVerification({
    enabled: isEmailVerification,
    interval: 3000, // Check every 3 seconds
    email: userEmail || undefined,
    onVerified: () => {
      // When verification is complete, redirect to the callback URL
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
    }
  });

  useEffect(() => {
    // Check if user is already authenticated
    if (status === 'authenticated' && session) {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
    }
  }, [status, session, router, searchParams]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn('keycloak', {
        callbackUrl: searchParams.get('callbackUrl') || '/',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification message if we're in email verification mode
  useEffect(() => {
    if (isEmailVerification && userEmail) {
      setShowVerificationMessage(true);
    }
  }, [isEmailVerification, userEmail]);

  // Listen for messages from Keycloak iframe/popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
      if (event.data?.type === 'email-verification-status') {
        if (event.data.verified) {
          console.log('Email verification completed, reloading page...');
          // Email verification completed, reload the page to trigger re-authentication
          window.location.reload();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Also check URL parameters for verification success
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      console.log('Verification success detected via URL parameter, reloading...');
      // Remove the verification parameters and reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('verified');
      newUrl.searchParams.delete('email_verification');
      newUrl.searchParams.delete('email');
      window.history.replaceState({}, '', newUrl.toString());
      window.location.reload();
    }
  }, [searchParams]);

  // Don't render the signin form if already authenticated
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background - Keycloak Theme Colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-yellow-400 to-red-500">
      </div>

      {/* Overlay Content */}
      <div className="relative z-20 min-h-screen flex flex-col justify-center items-center text-center px-4">
        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
         Welcome to <AppName />
        </h1>
        
        {/* Sub-text */}
        <p className="text-xl text-white mb-8 max-w-3xl drop-shadow-lg">
         About <AppName /> </p>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6 max-w-md">
            {error}
          </div>
        )}

        {/* Email Verification Message */}
        {showVerificationMessage && (
          <div className="bg-blue-50 border border-blue-300 text-blue-700 px-6 py-4 rounded-lg mb-6 max-w-2xl">
            <div className="flex items-center justify-center mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <h3 className="text-lg font-semibold">Email Verification Required</h3>
            </div>
            <p className="text-center mb-3">
              We've sent a verification link to <strong>{userEmail}</strong>
            </p>
            <p className="text-center text-sm">
              Please check your email and click the verification link. This page will automatically reload when verification is complete.
            </p>
            {isChecking && (
              <p className="text-center text-sm mt-2 text-blue-600">
                Checking verification status...
              </p>
            )}
            {verificationStatus === 'error' && (
              <p className="text-center text-sm mt-2 text-red-600">
                There was an error checking verification status. Please try signing in again.
              </p>
            )}
          </div>
        )}
        
        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-gray-800 transition-colors duration-200 disabled:opacity-50 bg-transparent"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </div>


      </div>

      {/* Attribution */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-50">
        <AppName />
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
} 