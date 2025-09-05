import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get role by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const pool = await getPgPool();
    
    const result = await pool.query(
      `SELECT id, name, description, created_at, updated_at
       FROM public.roles 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = result.rows[0];
    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch role', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Update role by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description = '' } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Role ID and name are required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if new role name already exists for a different role
    const existingRole = await pool.query(
      'SELECT id FROM public.roles WHERE name = $1 AND id != $2',
      [name, id]
    );

    if (existingRole.rows.length > 0) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }

    // Update role in database (removed level and parent_id fields)
    const result = await pool.query(
      `UPDATE public.roles 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, description, created_at, updated_at`,
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const updatedRole = result.rows[0];
    return NextResponse.json({ 
      success: true, 
      message: 'Role updated successfully',
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        createdAt: updatedRole.created_at,
        updatedAt: updatedRole.updated_at,
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ 
      error: 'Failed to update role', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Delete role by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    console.log('=== ROLE DELETION REQUEST START ===');
    console.log('Deleting role ID:', id);

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
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get realm info
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    const pool = await getPgPool();
    
    // First, get the role details to find the Keycloak ID
    const roleResult = await pool.query('SELECT keycloak_id, name FROM roles WHERE id = $1', [id]);
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roleResult.rows[0];
    const keycloakRoleId = role.keycloak_id;

    if (keycloakRoleId) {
      // Delete role from Keycloak
      const deleteRoleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles-by-id/${keycloakRoleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!deleteRoleResponse.ok) {
        const errorText = await deleteRoleResponse.text();
        console.warn('⚠️ Warning: Failed to delete role from Keycloak:', errorText);
        // Continue with local deletion even if Keycloak deletion fails
      } else {
        console.log('✅ Role deleted successfully from Keycloak');
      }
    }

    // Delete role from local database
    try {
      // Delete from user_roles table first (foreign key constraint)
      await pool.query('DELETE FROM user_roles WHERE role_id = $1', [id]);
      console.log('✅ User role assignments deleted from local database');
      
      // Delete from roles table
      await pool.query('DELETE FROM roles WHERE id = $1', [id]);
      console.log('✅ Role deleted from local database');
      
    } catch (dbError) {
      console.error('❌ Error deleting role from local database:', dbError);
      throw new Error(`Failed to delete role from local database: ${dbError}`);
    }

    console.log('=== ROLE DELETION COMPLETED SUCCESSFULLY ===');
    return NextResponse.json({ success: true, message: 'Role deleted successfully' });

  } catch (error) {
    console.error('=== ROLE DELETION ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to delete role', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
