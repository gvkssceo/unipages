'use client';

interface DeleteRoleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
  userCount: number;
  loading: boolean;
}

export default function DeleteRoleConfirmModal({ isOpen, onClose, onConfirm, roleName, userCount, loading }: DeleteRoleConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Delete Role</h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 break-words mb-3">
            Are you sure you want to delete the role <strong>{roleName}</strong>?
          </p>
          
          {userCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This role is currently assigned to <strong>{userCount}</strong> user{userCount !== 1 ? 's' : ''}. 
                Deleting this role will remove it from all users.
              </p>
            </div>
          )}
          
          <p className="text-sm text-gray-500 break-words">
            This action cannot be undone.
          </p>
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
            {loading ? 'Deleting...' : 'Delete Role'}
          </button>
        </div>
      </div>
    </div>
  );
} 