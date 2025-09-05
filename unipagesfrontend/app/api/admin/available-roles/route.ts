import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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

    // Get all realm roles
    const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();
      throw new Error(`Failed to fetch roles: ${errorText}`);
    }

    const roles = await rolesResponse.json();
    
    // Filter out system roles that shouldn't be assignable to users
    const systemRoles = [
      'admin',
      'default-roles-unipages',
      'uma_authorization',
      'offline_access'
    ];
    
    const availableRoles = roles
      .filter((role: any) => !systemRoles.includes(role.name))
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description || '',
        composite: role.composite || false
      }));

    return NextResponse.json(availableRoles);
  } catch (error) {
    console.error('Error fetching available roles:', error);
    return NextResponse.json({ error: 'Failed to fetch available roles', details: error }, { status: 500 });
  }
} 