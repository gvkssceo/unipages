import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Update role by name
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
