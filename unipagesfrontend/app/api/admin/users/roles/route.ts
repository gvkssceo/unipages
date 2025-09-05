import { NextRequest, NextResponse } from 'next/server';

// Get user roles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    // Get user roles
    const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();
      throw new Error(`Failed to fetch user roles: ${errorText}`);
    }

    const roles = await rolesResponse.json();
    const userRoles = roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description
    }));

    return NextResponse.json(userRoles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: 'Failed to fetch user roles', details: error }, { status: 500 });
  }
}

// Assign roles to user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, roleIds } = body;

    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      return NextResponse.json({ error: 'User ID and role IDs array are required' }, { status: 400 });
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

    // Get role details for each role ID
    const rolesToAssign = [];
    for (const roleId of roleIds) {
      const roleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles-by-id/${roleId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (roleResponse.ok) {
        const role = await roleResponse.json();
        rolesToAssign.push(role);
      }
    }

    // Assign roles to user
    const assignRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rolesToAssign),
    });

    if (!assignRolesResponse.ok) {
      const errorText = await assignRolesResponse.text();
      throw new Error(`Failed to assign roles: ${errorText}`);
    }

    return NextResponse.json({ success: true, message: 'Roles assigned successfully' });
  } catch (error) {
    console.error('Error assigning roles:', error);
    return NextResponse.json({ error: 'Failed to assign roles', details: error }, { status: 500 });
  }
}

// Remove roles from user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, roleIds } = body;

    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      return NextResponse.json({ error: 'User ID and role IDs array are required' }, { status: 400 });
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

    // Get role details for each role ID
    const rolesToRemove = [];
    for (const roleId of roleIds) {
      const roleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles-by-id/${roleId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (roleResponse.ok) {
        const role = await roleResponse.json();
        rolesToRemove.push(role);
      }
    }

    // Remove roles from user
    const removeRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rolesToRemove),
    });

    if (!removeRolesResponse.ok) {
      const errorText = await removeRolesResponse.text();
      throw new Error(`Failed to remove roles: ${errorText}`);
    }

    return NextResponse.json({ success: true, message: 'Roles removed successfully' });
  } catch (error) {
    console.error('Error removing roles:', error);
    return NextResponse.json({ error: 'Failed to remove roles', details: error }, { status: 500 });
  }
} 