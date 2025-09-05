import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Update permission set by name
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description = '' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Permission set name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if permission set exists
    const permissionSetCheck = await pool.query(
      'SELECT id FROM public.permission_sets WHERE name = $1',
      [name]
    );

    if (permissionSetCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    // Update permission set in database
    const result = await pool.query(
      `UPDATE public.permission_sets 
       SET description = $1, updated_at = CURRENT_TIMESTAMP
       WHERE name = $2
       RETURNING id, name, description, created_at, updated_at`,
      [description, name]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    const updatedPermissionSet = result.rows[0];
    return NextResponse.json({ 
      success: true, 
      message: 'Permission set updated successfully',
      permissionSet: {
        id: updatedPermissionSet.id,
        name: updatedPermissionSet.name,
        description: updatedPermissionSet.description,
        createdAt: updatedPermissionSet.created_at,
        updatedAt: updatedPermissionSet.updated_at,
      }
    });
  } catch (error) {
    console.error('Error updating permission set:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update permission set', 
      details: errorMessage 
    }, { status: 500 });
  }
}
