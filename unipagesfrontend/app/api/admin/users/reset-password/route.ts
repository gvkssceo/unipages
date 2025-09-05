import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password, temporary = false } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
    }

    // Get admin token from Keycloak
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get admin token');
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Reset password in Keycloak
    const resetPasswordResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'password',
        value: password,
        temporary: temporary
      }),
    });

    if (!resetPasswordResponse.ok) {
      const errorText = await resetPasswordResponse.text();
      throw new Error(`Failed to reset password: ${errorText}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: temporary ? 'Temporary password set successfully' : 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password', details: error }, { status: 500 });
  }
} 