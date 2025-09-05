import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: permissionSetId } = await params;

    if (!permissionSetId) {
      return NextResponse.json(
        { error: 'Permission set ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Removing profile assignments for permission set:', permissionSetId);

    // Step 1: Get all profiles assigned to this permission set
    const getProfilesQuery = `
      SELECT profile_id 
      FROM profile_permission_sets 
      WHERE permission_set_id = $1
    `;
    
    const pool = await getPgPool();
    const profilesResult = await pool.query(getProfilesQuery, [permissionSetId]);
    const assignedProfiles = profilesResult.rows;
    
    console.log('🔍 Found', assignedProfiles.length, 'profiles assigned to permission set');

    if (assignedProfiles.length > 0) {
      // Step 2: Remove all profile assignments for this permission set
      const removeAssignmentsQuery = `
        DELETE FROM profile_permission_sets 
        WHERE permission_set_id = $1
      `;
      
      const removeResult = await pool.query(removeAssignmentsQuery, [permissionSetId]);
      
      console.log('✅ Removed', removeResult.rowCount, 'profile assignments');
      
      // Step 3: Also remove any table and field permissions for this permission set
      const removeTablePermissionsQuery = `
        DELETE FROM permission_set_tables 
        WHERE permission_set_id = $1
      `;
      
      const removeFieldPermissionsQuery = `
        DELETE FROM permission_set_fields 
        WHERE permission_set_id = $1
      `;
      
      await pool.query(removeTablePermissionsQuery, [permissionSetId]);
      await pool.query(removeFieldPermissionsQuery, [permissionSetId]);
      
      console.log('✅ Removed table and field permissions');
    }

    return NextResponse.json({
      message: 'Profile assignments removed successfully',
      removedProfiles: assignedProfiles.length,
      removedTables: true,
      removedFields: true
    });

  } catch (error) {
    console.error('❌ Error removing profile assignments:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove profile assignments',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
