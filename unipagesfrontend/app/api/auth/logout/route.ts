import { NextResponse } from 'next/server';
import { APP_KEYCLOAK } from '@/lib/config';
import { cache } from '@/utils/cache';
import { requestCache } from '@/utils/request-cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idToken = searchParams.get('id_token');
  
  // Get the current host for dynamic post-logout redirect
  const host = request.headers.get('host') || 'localhost:5012';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const postLogoutRedirectUri = encodeURIComponent(`${protocol}://${host}/auth/signin`);
  
  // Get Keycloak configuration
  const keycloakIssuer = process.env.KEYCLOAK_ISSUER;
  if (!keycloakIssuer) {
    console.error('❌ KEYCLOAK_ISSUER not configured');
    return NextResponse.json({ error: 'Keycloak not configured' }, { status: 500 });
  }

  // Extract realm from issuer URL
  const realmMatch = keycloakIssuer.match(/\/realms\/([^\/]+)/);
  const realm = realmMatch ? realmMatch[1] : 'unipages';
  const keycloakBaseUrl = keycloakIssuer.replace(/\/realms\/[^\/]+/, '');
  
  // Construct Keycloak logout URL
  const keycloakLogoutUrl = `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/logout`;

  console.log('🚪 [LOGOUT] Starting Keycloak logout process...');
  console.log('🔍 [LOGOUT] Keycloak logout URL:', keycloakLogoutUrl);
  console.log('🔍 [LOGOUT] Post-logout redirect:', postLogoutRedirectUri);

  // Clear server-side caches on logout for security
  try {
    console.log('🧹 [LOGOUT] Clearing server-side caches...');
    
    // Clear all main caches
    const cacheKeys = [
      'users-list',
      'roles-list', 
      'profiles-list',
      'permission-sets-list',
      'admin-stats'
    ];

    cacheKeys.forEach(key => {
      cache.delete(key);
      console.log(`✅ Cleared cache: ${key}`);
    });

    // Clear request cache
    requestCache.clear();
    console.log('✅ Request cache cleared');

    // Clear any user roles caches
    const allCacheEntries = Array.from((cache as any).cache.keys()) as string[];
    const rolesCacheKeys = allCacheEntries.filter((key: string) => key.startsWith('user-roles-'));
    
    rolesCacheKeys.forEach(key => {
      cache.delete(key);
      console.log(`✅ Cleared roles cache: ${key}`);
    });

    console.log('✅ [LOGOUT] Server-side cache clearing completed');
  } catch (error) {
    console.error('❌ [LOGOUT] Error clearing server cache:', error);
    // Don't fail the logout process if cache clearing fails
  }

  if (!idToken) {
    console.log('⚠️ [LOGOUT] No id_token provided, redirecting to signin page');
    return NextResponse.redirect(`${protocol}://${host}/auth/signin`);
  }

  // Construct the complete Keycloak logout URL with parameters
  const logoutUrl = `${keycloakLogoutUrl}?id_token_hint=${encodeURIComponent(idToken)}&post_logout_redirect_uri=${postLogoutRedirectUri}`;
  
  console.log('🔑 [LOGOUT] Redirecting to Keycloak logout...');
  console.log('🔍 [LOGOUT] Final logout URL:', logoutUrl);

  return NextResponse.redirect(logoutUrl);
} 