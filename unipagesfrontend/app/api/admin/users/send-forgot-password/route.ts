import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SEND FORGOT PASSWORD LINK ROUTE CALLED ===');
    
    const { userId, username } = await request.json();
    console.log('User ID:', userId);
    console.log('Username:', username);

    // Check if required environment variables are set
    if (!process.env.KEYCLOAK_ISSUER) {
      console.error('❌ Missing environment variable: KEYCLOAK_ISSUER');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ISSUER not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_ID) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_ID');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_ID not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_SECRET not set' },
        { status: 500 }
      );
    }

    console.log('🔍 Environment variables check passed');

    // Get admin token from Keycloak
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token response not ok:', tokenResponse.status, tokenResponse.statusText);
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Admin token obtained successfully');

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    
    console.log('Realm info:', { realm, baseUrl });

    // Send forgot password email using Keycloak's execute actions email
    const executeActionsResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/execute-actions-email`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['UPDATE_PASSWORD']),
    });

    if (!executeActionsResponse.ok) {
      console.error('Failed to send forgot password email:', executeActionsResponse.status, executeActionsResponse.statusText);
      throw new Error('Failed to send forgot password email');
    }

    console.log('✅ Forgot password email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Forgot password link sent successfully',
      userId: userId,
      username: username
    });

  } catch (error) {
    console.error('Error sending forgot password link:', error);
    return NextResponse.json(
      { error: 'Failed to send forgot password link' },
      { status: 500 }
    );
  }
}
