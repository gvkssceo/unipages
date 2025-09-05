import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // If user is already authenticated, they don't need verification
    if (session?.user) {
      return NextResponse.json({ verified: true, message: 'User is already authenticated' });
    }

    // Check if there's a verification token in the request
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');
    
    if (!token && !email) {
      return NextResponse.json({ verified: false, message: 'No verification token or email provided' }, { status: 400 });
    }

    // Check verification status with Keycloak
    const isVerified = await checkKeycloakVerificationStatus(token, email);
    
    if (isVerified) {
      return NextResponse.json({ verified: true, message: 'Email verified successfully' });
    } else {
      return NextResponse.json({ verified: false, message: 'Email not verified yet' }, { status: 200 });
    }
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json({ verified: false, message: 'Internal server error' }, { status: 500 });
  }
}

// Check verification status with Keycloak
async function checkKeycloakVerificationStatus(token?: string | null, email?: string | null): Promise<boolean> {
  try {
    // Get Keycloak admin token
    const adminToken = await getKeycloakAdminToken();
    if (!adminToken) {
      console.error('Failed to get Keycloak admin token');
      return false;
    }

    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realm = issuerUrl.split('/realms/')[1]?.split('/')[0];
    
    if (!realm) {
      console.error('Could not extract realm from KEYCLOAK_ISSUER');
      return false;
    }

    // If we have a token, validate it directly
    if (token) {
      const isValidToken = await validateKeycloakToken(token);
      if (isValidToken) {
        return true;
      }
    }

    // If we have an email, check if the user's email is verified
    if (email) {
      const isEmailVerified = await checkUserEmailVerification(adminToken, realm, email);
      return isEmailVerified;
    }

    return false;
  } catch (error) {
    console.error('Error checking Keycloak verification status:', error);
    return false;
  }
}

// Get Keycloak admin token
async function getKeycloakAdminToken(): Promise<string | null> {
  try {
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get admin token:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting admin token:', error);
    return null;
  }
}

// Validate a Keycloak token
async function validateKeycloakToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${await getKeycloakAdminToken()}`,
      },
      body: new URLSearchParams({
        token: token,
        client_id: process.env.KEYCLOAK_ID || 'nextjs-app',
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.active === true && data.email_verified === true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

// Check if a user's email is verified
async function checkUserEmailVerification(adminToken: string, realm: string, email: string): Promise<boolean> {
  try {
    const issuerUrl = process.env.KEYCLOAK_ISSUER;
    if (!issuerUrl) {
      console.error('KEYCLOAK_ISSUER environment variable is not set');
      return false;
    }
    
    const response = await fetch(`${issuerUrl.replace('/realms/' + realm, '')}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const users = await response.json();
    if (users.length === 0) {
      return false;
    }

    const user = users[0];
    return user.emailVerified === true;
  } catch (error) {
    console.error('Error checking user email verification:', error);
    return false;
  }
}
