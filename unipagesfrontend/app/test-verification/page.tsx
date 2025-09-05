'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleTestVerification = () => {
    if (email) {
      // Redirect to signin page with email verification parameters
      router.push(`/auth/signin?email_verification=true&email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Test Email Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter an email address to test the auto-reload functionality
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Button
              onClick={handleTestVerification}
              disabled={!email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Test Verification Flow
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">This will:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Redirect to the signin page with email verification mode</li>
              <li>Show a verification message with the entered email</li>
              <li>Start polling for verification status every 3 seconds</li>
              <li>Automatically reload when verification is detected</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
