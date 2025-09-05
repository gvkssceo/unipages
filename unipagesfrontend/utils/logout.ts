// Logout utility for proper Keycloak logout integration

import { signOut } from 'next-auth/react';
import { clearAllCaches } from './cache-clear';

/**
 * Perform complete logout including Keycloak and cache clearing
 */
export async function performCompleteLogout(session: any): Promise<void> {
  try {
    console.log('🚪 Starting complete logout process...');
    
    // Step 1: Store id_token before clearing session
    const idToken = session?.idToken;
    console.log('🔑 Stored id_token for Keycloak logout:', idToken ? 'Yes' : 'No');
    
    // Step 2: Clear all caches
    console.log('🧹 Clearing caches...');
    await clearAllCaches();
    console.log('✅ Caches cleared');
    
    // Step 3: Clear NextAuth session and cookies
    console.log('🔐 Clearing NextAuth session and cookies...');
    
    // Clear NextAuth session
    await signOut({ 
      redirect: false // Don't redirect yet, we'll handle it manually
    });
    
    // Also clear NextAuth cookies manually to be extra sure
    document.cookie = 'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Add a small delay to ensure session is cleared
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('✅ NextAuth session and cookies cleared');
    
    // Step 4: Set logout flag to prevent auto-redirect
    sessionStorage.setItem('logout-in-progress', 'true');
    
    // Step 5: Perform Keycloak logout if we have id_token
    if (idToken) {
      console.log('🔑 Performing Keycloak logout...');
      
      // Get current host for dynamic redirect
      const host = window.location.host;
      const protocol = window.location.protocol;
      const postLogoutRedirectUri = encodeURIComponent(`${protocol}//${host}/auth/signin`);
      
      // Construct Keycloak logout URL
      const keycloakLogoutUrl = `/api/auth/logout?id_token=${encodeURIComponent(idToken)}`;
      
      console.log('🔍 Redirecting to Keycloak logout:', keycloakLogoutUrl);
      
      // Redirect to Keycloak logout
      window.location.href = keycloakLogoutUrl;
    } else {
      console.log('⚠️ No id_token found, redirecting to signin...');
      
      // Just redirect to signin page since NextAuth session is already cleared
      window.location.href = '/auth/signin';
    }
  } catch (error) {
    console.error('❌ Error during complete logout:', error);
    
    // Fallback: try to clear NextAuth session and redirect
    try {
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      });
    } catch (fallbackError) {
      console.error('❌ Fallback logout also failed:', fallbackError);
      // Last resort: redirect to signin page
      window.location.href = '/auth/signin';
    }
  }
}

/**
 * Check if user has valid session with id_token
 */
export function hasValidSession(session: any): boolean {
  return !!(session?.user && session?.idToken);
}

/**
 * Get logout method based on session state
 */
export function getLogoutMethod(session: any): 'keycloak' | 'nextauth' {
  return session?.idToken ? 'keycloak' : 'nextauth';
}
