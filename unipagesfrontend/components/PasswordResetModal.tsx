'use client';

import { useState } from 'react';
import { showToast } from '@/utils/toast';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export default function PasswordResetModal({ isOpen, onClose, userId, username, onSuccess }: PasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendForgotPasswordLink = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/users/send-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showToast.success('Forgot password link sent successfully!');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send forgot password link');
      }
    } catch (error) {
      console.error('Error sending forgot password link:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Always render something to maintain hook consistency
  if (!isOpen) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Send Forgot Password Link</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={loading}
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Send forgot password link to user: <span className="font-medium">{username}</span>
          </p>
        </div>

        <div className="space-y-4">
          

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendForgotPasswordLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Forgot Password Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 