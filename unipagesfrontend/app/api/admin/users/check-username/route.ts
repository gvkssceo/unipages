import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const excludeUserId = searchParams.get('excludeUserId'); // For editing existing users

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Validate username format (3-20 characters, alphanumeric and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { available: false, reason: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
        { status: 200 }
      );
    }

    // Check if username exists in Keycloak
    try {
      // Get admin token from Keycloak
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
        console.error('Failed to get admin token from Keycloak');
        return NextResponse.json(
          { error: 'Failed to authenticate with Keycloak' },
          { status: 500 }
        );
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get realm info
      const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
      const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
      const realm = realmMatch ? realmMatch[1] : 'unipages';
      const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

      // Search for username in Keycloak
      const searchResponse = await fetch(
        `${baseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(username)}&exact=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!searchResponse.ok) {
        console.error('Failed to search users in Keycloak');
        return NextResponse.json(
          { error: 'Failed to search users in Keycloak' },
          { status: 500 }
        );
      }

      const users = await searchResponse.json();
      
      // Filter out the excluded user if editing
      const filteredUsers = excludeUserId 
        ? users.filter((user: any) => user.id !== excludeUserId)
        : users;

      const isAvailable = filteredUsers.length === 0;

      return NextResponse.json({
        available: isAvailable,
        username: username,
        reason: isAvailable ? null : 'Username already exists'
      });

    } catch (keycloakError) {
      console.error('Error checking username in Keycloak:', keycloakError);
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
