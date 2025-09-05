import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Handle all role actions (GET, PUT, DELETE) by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const pool = await getPgPool();
    
    const result = await pool.query(
      `SELECT id, name, description, level, created_at, updated_at
       FROM public.roles 
       WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = result.rows[0];
    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      level: role.level,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description = '', level = 'realm', parent_id = null } = body;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if role exists
    const roleCheck = await pool.query(
      'SELECT id FROM public.roles WHERE name = $1',
      [name]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Update role in database
    const result = await pool.query(
      `UPDATE public.roles 
       SET description = $1, level = $2, parent_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE name = $4
       RETURNING id, name, description, level, created_at, updated_at`,
      [description, level, parent_id, name]
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
        level: updatedRole.level,
        createdAt: updatedRole.created_at,
        updatedAt: updatedRole.updated_at,
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update role', 
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if role exists
    const roleCheck = await pool.query(
      'SELECT id, name FROM public.roles WHERE name = $1',
      [name]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const roleId = roleCheck.rows[0].id;
    const roleNameValue = roleCheck.rows[0].name;
    
    // Check if role is a system role
    const SYSTEM_ROLES = new Set(['admin']);
    if (SYSTEM_ROLES.has(roleNameValue)) {
      return NextResponse.json({ 
        error: 'Cannot delete system roles', 
        details: 'System roles are protected and cannot be deleted' 
      }, { status: 403 });
    }

    // Check if role has users assigned
    const userCheck = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.user_roles WHERE role_id = $1',
      [roleId]
    );

    const userCount = parseInt(userCheck.rows[0].user_count);
    if (userCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role with assigned users', 
        details: `Role has ${userCount} user(s) assigned. Remove users from this role before deleting.` 
      }, { status: 409 });
    }

    // Delete the role
    const deleteResult = await pool.query(
      'DELETE FROM public.roles WHERE name = $1 RETURNING id',
      [name]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Role deleted successfully',
      deletedRoleId: deleteResult.rows[0].id
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to delete role', 
      details: errorMessage 
    }, { status: 500 });
  }
}
