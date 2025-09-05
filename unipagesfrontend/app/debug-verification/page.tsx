'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DebugVerificationPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      addLog(`Received message: ${JSON.stringify(event.data)}`);
      if (event.data?.type === 'email-verification-status') {
        addLog(`Verification status: ${event.data.verified ? 'VERIFIED' : 'NOT VERIFIED'}`);
        if (event.data.verified) {
          addLog('🎉 Email verification completed! Reloading page...');
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    };

    const handleVisibilityChange = () => {
      addLog(`Page visibility changed: ${document.hidden ? 'HIDDEN' : 'VISIBLE'}`);
    };

    const handleFocus = () => {
      addLog('Window focused');
    };

    if (isListening) {
      window.addEventListener('message', handleMessage);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isListening]);

  const startListening = () => {
    setIsListening(true);
    addLog('Started listening for verification messages...');
  };

  const stopListening = () => {
    setIsListening(false);
    addLog('Stopped listening for verification messages');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testVerification = () => {
    addLog('Testing verification flow...');
    window.open('/auth/signin?email_verification=true&email=test@example.com', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Verification Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex gap-4 mb-4">
            <Button 
              onClick={startListening} 
              disabled={isListening}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Listening
            </Button>
            <Button 
              onClick={stopListening} 
              disabled={!isListening}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Listening
            </Button>
            <Button 
              onClick={testVerification}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Test Verification Flow
            </Button>
            <Button 
              onClick={clearLogs}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Clear Logs
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            <p>Status: <span className={isListening ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {isListening ? 'LISTENING' : 'NOT LISTENING'}
            </span></p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Start Listening" to begin.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Click "Start Listening" to begin monitoring</li>
            <li>Click "Test Verification Flow" to open the signin page</li>
            <li>In the signin page, you'll see the verification message</li>
            <li>Open the email verification link in another tab/device</li>
            <li>Watch this page for automatic reload when verification completes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
