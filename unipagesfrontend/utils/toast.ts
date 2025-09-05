import toast from 'react-hot-toast';
import { APP_KEYCLOAK } from '@/lib/config';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      id: message, // Prevent duplicate toasts
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      id: message, // Prevent duplicate toasts
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      id: message,
    });
  },
  
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },
  
  // Custom toast for specific actions
  userCreated: () => showToast.success('User created successfully'),
  userUpdated: () => showToast.success('User updated successfully'),
  userDeleted: () => showToast.success('User deleted successfully'),
  passwordReset: () => showToast.success('Password reset successfully'),
  roleCreated: () => showToast.success('Role created successfully'),
  roleUpdated: () => showToast.success('Role updated successfully'),
  roleDeleted: () => showToast.success('Role deleted successfully'),
  profileCreated: () => showToast.success('Profile created successfully'),
  profileUpdated: () => showToast.success('Profile updated successfully'),
  profileDeleted: () => showToast.success('Profile deleted successfully'),
  permissionSetCreated: () => showToast.success('Permission set created successfully'),
  permissionSetUpdated: () => showToast.success('Permission set updated successfully'),
  permissionSetDeleted: () => showToast.success('Permission set deleted successfully'),
  
  // Error messages
  userCreationFailed: (error: string) => showToast.error(`Failed to create user: ${error}`),
  userUpdateFailed: (error: string) => showToast.error(`Failed to update user: ${error}`),
  userDeletionFailed: (error: string) => showToast.error(`Failed to delete user: ${error}`),
  passwordResetFailed: (error: string) => showToast.error(`Failed to reset password: ${error}`),
  roleCreationFailed: (error: string) => showToast.error(`Failed to create role: ${error}`),
  roleUpdateFailed: (error: string) => showToast.error(`Failed to update role: ${error}`),
  roleDeletionFailed: (error: string) => showToast.error(`Failed to delete role: ${error}`),
  profileCreationFailed: (error: string) => showToast.error(`Failed to create profile: ${error}`),
  profileUpdateFailed: (error: string) => showToast.error(`Failed to update profile: ${error}`),
  profileDeletionFailed: (error: string) => showToast.error(`Failed to delete profile: ${error}`),
  permissionSetCreationFailed: (error: string) => showToast.error(`Failed to create permission set: ${error}`),
  permissionSetUpdateFailed: (error: string) => showToast.error(`Failed to update permission set: ${error}`),
  permissionSetDeletionFailed: (error: string) => showToast.error(`Failed to delete permission set: ${error}`),
  
  // Validation errors
  validationError: (message: string) => showToast.error(message),
  requiredFields: () => showToast.error('Please fill in all required fields'),
  passwordMismatch: () => showToast.error('Passwords do not match'),
  passwordTooShort: () => showToast.error('Password must be at least 6 characters long'),
  usernameEmailRequired: () => showToast.error('Username and email are required'),
  passwordRequired: () => showToast.error('Password is required for new users'),
};

// Utility function for complete logout
export const performCompleteLogout = async (
  signOut: any, 
  session: any, 
  redirectUrl: string = '/',
  postLogoutRedirect: string = 'https://admin.unimark.app'
) => {
  try {
    showToast.success('Logging out...');
    
    // First, sign out from NextAuth to clear local session
    await signOut({ 
      callbackUrl: redirectUrl,
      redirect: false 
    });
    
    // Clear any local storage or session storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Construct the Keycloak logout URL with proper parameters
    const keycloakLogoutUrl = new URL(APP_KEYCLOAK.logoutUrl);
    keycloakLogoutUrl.searchParams.set('client_id', 'nextjs-app');
    keycloakLogoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirect);
    keycloakLogoutUrl.searchParams.set('id_token_hint', (session as any)?.idToken || '');
    
    // Redirect to Keycloak logout - this will complete the logout and redirect back
    window.location.href = keycloakLogoutUrl.toString();
    
  } catch (error) {
    showToast.error('Logout failed');
    console.error('Logout error:', error);
    
    // Fallback: force redirect to specified URL
    window.location.href = redirectUrl;
  }
};
