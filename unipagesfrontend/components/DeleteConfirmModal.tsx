'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  loading: boolean;
  itemType?: string; // 'user', 'role', 'permission set', etc.
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, userName, loading, itemType = 'user' }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const isBulkDelete = userName.includes('selected users') || userName.includes('selected');
  
  // Determine title and text based on item type
  const getTitle = () => {
    if (isBulkDelete) return `Delete ${itemType === 'user' ? 'Users' : 'Items'}`;
    switch (itemType) {
      case 'role': return 'Delete Role';
      case 'permission set': return 'Delete Permission Set';
      case 'profile': return 'Delete Profile';
      default: return 'Delete User';
    }
  };
  
  const getMessage = () => {
    if (isBulkDelete) {
      return `Are you sure you want to delete ${userName}? This action cannot be undone.`;
    }
    switch (itemType) {
      case 'role':
        return `Are you sure you want to delete the role <strong>${userName}</strong>? This action cannot be undone.`;
      case 'permission set':
        return `Are you sure you want to delete the permission set <strong>${userName}</strong>? This action cannot be undone.`;
      case 'profile':
        return `Are you sure you want to delete the profile <strong>${userName}</strong>? This action cannot be undone.`;
      default:
        return `Are you sure you want to delete the user <strong>${userName}</strong>? This action cannot be undone.`;
    }
  };
  
  const getButtonText = () => {
    if (isBulkDelete) return `Delete ${itemType === 'user' ? 'Users' : 'Items'}`;
    switch (itemType) {
      case 'role': return 'Delete Role';
      case 'permission set': return 'Delete Permission Set';
      case 'profile': return 'Delete Profile';
      default: return 'Delete User';
    }
  };

  const title = getTitle();
  const message = getMessage();
  const buttonText = getButtonText();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
        </div>

        <div className="mb-6">
          <p 
            className="text-sm text-gray-500 break-words"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
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
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Deleting...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
} 