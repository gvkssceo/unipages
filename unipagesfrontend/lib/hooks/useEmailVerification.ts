'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface UseEmailVerificationOptions {
  enabled?: boolean;
  interval?: number;
  email?: string;
  onVerified?: () => void;
}

export function useEmailVerification({
  enabled = true,
  interval = 3000, // Check every 3 seconds
  email,
  onVerified
}: UseEmailVerificationOptions = {}) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'error'>('pending');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkVerificationStatus = async () => {
    if (isCheckingRef.current || status !== 'unauthenticated') return;
    
    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const url = new URL('/api/auth/check-verification', window.location.origin);
      if (email) {
        url.searchParams.set('email', email);
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.verified) {
          setVerificationStatus('verified');
          // Update the session to trigger a re-authentication
          await update();
          
          // Call the onVerified callback if provided
          if (onVerified) {
            onVerified();
          } else {
            // Default behavior: reload the page to trigger re-authentication
            window.location.reload();
          }
          
          // Clear the interval since verification is complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else if (response.status === 401) {
        // User is not authenticated, which means they might have been logged out
        // or the verification process failed
        setVerificationStatus('error');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationStatus('error');
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!enabled || status === 'loading' || status === 'authenticated') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling for verification status
    if (status === 'unauthenticated' && verificationStatus === 'pending') {
      intervalRef.current = setInterval(checkVerificationStatus, interval);
      
      // Also check immediately
      checkVerificationStatus();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, status, verificationStatus, interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isChecking,
    verificationStatus,
    checkVerificationStatus
  };
}
