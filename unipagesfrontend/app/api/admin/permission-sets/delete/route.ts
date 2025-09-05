import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Delete permission set by name
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Permission set name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if permission set exists
    const permissionSetCheck = await pool.query(
      'SELECT id, name FROM public.permission_sets WHERE name = $1',
      [name]
    );

    if (permissionSetCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    const permissionSetId = permissionSetCheck.rows[0].id;
    
    // Check if permission set has profiles assigned
    const profileCheck = await pool.query(
      'SELECT COUNT(*) as profile_count FROM public.profile_permission_sets WHERE permission_set_id = $1',
      [permissionSetId]
    );

    const profileCount = parseInt(profileCheck.rows[0].profile_count);
    if (profileCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete permission set with assigned profiles', 
        details: `Permission set has ${profileCount} profile(s) assigned. Remove profiles from this permission set before deleting.` 
      }, { status: 409 });
    }

    // Delete the permission set
    const deleteResult = await pool.query(
      'DELETE FROM public.permission_sets WHERE name = $1 RETURNING id',
      [name]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permission set deleted successfully',
      deletedPermissionSetId: deleteResult.rows[0].id
    });
  } catch (error) {
    console.error('Error deleting permission set:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to delete permission set', 
      details: errorMessage 
    }, { status: 500 });
  }
}
