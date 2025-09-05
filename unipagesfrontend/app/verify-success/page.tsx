'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // This page is reached when verification is successful
    // Redirect back to signin to complete authentication
    console.log('Verification success page loaded, redirecting to signin...');
    
    // Add a small delay to ensure the verification is processed
    setTimeout(() => {
      router.replace('/auth/signin');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified Successfully!</h2>
        <p className="text-gray-600">Redirecting you to complete sign in...</p>
      </div>
    </div>
  );
}
