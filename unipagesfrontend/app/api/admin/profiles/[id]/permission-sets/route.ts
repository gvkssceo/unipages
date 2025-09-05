import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params;
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching permission sets for profile: ${profileId}`);

    // Get database pool
    const pool = await getPgPool();
    
    // Get permission sets for the specified profile
    const permissionSetsResult = await pool.query(`
      SELECT 
        ps.id,
        ps.name,
        ps.description
      FROM profile_permission_sets pps
      JOIN permission_sets ps ON pps.permission_set_id = ps.id
      WHERE pps.profile_id = $1
      ORDER BY ps.name
    `, [profileId]);

    const permissionSets = permissionSetsResult.rows;
    
    console.log(`✅ Found ${permissionSets.length} permission sets for profile ${profileId}`);
    
    return NextResponse.json({
      profileId,
      permissionSets,
      count: permissionSets.length
    });

  } catch (error) {
    console.error('❌ Error fetching profile permission sets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch profile permission sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('🔍 DEBUG: POST request received for profile permission set assignment');
    
    const body = await request.json();
    console.log('🔍 DEBUG: Request body:', body);
    
    const { permissionSetId } = body;
    
    if (!permissionSetId) {
      console.log('❌ DEBUG: Missing permissionSetId in request body');
      return NextResponse.json({ error: 'permissionSetId is required' }, { status: 400 });
    }
    
    console.log('✅ DEBUG: permissionSetId validation passed:', permissionSetId);
    
    const pool = await getPgPool();
    console.log('🔍 DEBUG: Database pool obtained');
    
    const client = await pool.connect();
    console.log('🔍 DEBUG: Database client connected');
    
    try {
      const { id } = await context.params;
      console.log('🔍 DEBUG: Profile ID from params:', id);
      
      await client.query('BEGIN');
      console.log('🔍 DEBUG: Transaction started');
      
      // Check if already exists to avoid duplicates
      console.log('🔍 DEBUG: Checking for existing assignment...');
      const existing = await client.query(
        'SELECT id FROM public.profile_permission_sets WHERE profile_id = $1 AND permission_set_id = $2',
        [id, permissionSetId]
      );
      
      console.log('🔍 DEBUG: Existing assignment check result:', existing.rows);
      
      if (existing.rows.length === 0) {
        console.log('🔍 DEBUG: No existing assignment found, inserting new one...');
        const insertResult = await client.query(
          'INSERT INTO public.profile_permission_sets (id, profile_id, permission_set_id) VALUES (gen_random_uuid(), $1, $2) RETURNING id',
          [id, permissionSetId]
        );
        console.log('🔍 DEBUG: Insert result:', insertResult.rows[0]);
      } else {
        console.log('🔍 DEBUG: Assignment already exists, skipping insert');
      }
      
      await client.query('COMMIT');
      console.log('✅ DEBUG: Transaction committed successfully');
      
      return NextResponse.json({ success: true, message: 'Permission set added successfully' });
    } catch (e) {
      console.error('❌ DEBUG: Error during transaction:', e);
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
      console.log('🔍 DEBUG: Database client released');
    }
  } catch (error) {
    console.error('❌ DEBUG: Error adding profile permission set:', error);
    console.error('❌ DEBUG: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json({
      error: 'Failed to add profile permission set',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Remove permission set assignments for a profile
// If permissionSetId is provided in body, removes specific assignment
// If no body or no permissionSetId, removes ALL assignments for the profile
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 DEBUG: DELETE request received for profile permission set unassignment');
    
    const { id } = await context.params;
    console.log('🔍 DEBUG: Profile ID from params:', id);
    
    if (!id) {
      console.log('❌ DEBUG: Missing profile ID');
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const pool = await getPgPool();
    console.log('🔍 DEBUG: Database pool obtained');
    
    // Check if profile exists
    console.log('🔍 DEBUG: Checking if profile exists...');
    const profileResult = await pool.query('SELECT id, name FROM public.profiles WHERE id = $1', [id]);
    
    if (profileResult.rows.length === 0) {
      console.log('❌ DEBUG: Profile not found');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileResult.rows[0];
    console.log('✅ DEBUG: Profile found:', profile.name);

    // Try to parse request body, but don't fail if it's empty
    let permissionSetId = null;
    try {
      const body = await request.json();
      console.log('🔍 DEBUG: Request body:', body);
      permissionSetId = body?.permissionSetId;
    } catch (parseError) {
      console.log('🔍 DEBUG: No request body or invalid JSON, will remove ALL permission set assignments');
    }

    let deleteResult;
    let message;

    if (permissionSetId) {
      // Remove specific permission set assignment
      console.log('🔍 DEBUG: Removing specific permission set assignment for ID:', permissionSetId);
      
      // Check if the permission set assignment exists
      console.log('🔍 DEBUG: Checking if permission set assignment exists...');
      const assignmentResult = await pool.query(
        'SELECT id FROM public.profile_permission_sets WHERE profile_id = $1 AND permission_set_id = $2', 
        [id, permissionSetId]
      );
      
      console.log('🔍 DEBUG: Assignment check result:', assignmentResult.rows);
      
      if (assignmentResult.rows.length === 0) {
        console.log('🔍 DEBUG: Permission set assignment not found');
        return NextResponse.json({ 
          success: true, 
          message: 'Permission set assignment not found',
          removedPermissionSets: 0
        });
      }

      // Remove the specific permission set assignment
      deleteResult = await pool.query(
        'DELETE FROM public.profile_permission_sets WHERE profile_id = $1 AND permission_set_id = $2',
        [id, permissionSetId]
      );
      
      message = 'Permission set assignment removed successfully';
    } else {
      // Remove ALL permission set assignments for the profile
      console.log('🔍 DEBUG: Removing ALL permission set assignments for profile');
      
      // First, count how many assignments exist
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM public.profile_permission_sets WHERE profile_id = $1',
        [id]
      );
      const existingCount = parseInt(countResult.rows[0].count);
      console.log('🔍 DEBUG: Found', existingCount, 'existing permission set assignments');
      
      if (existingCount === 0) {
        console.log('🔍 DEBUG: No permission set assignments found');
        return NextResponse.json({ 
          success: true, 
          message: 'No permission set assignments found',
          removedPermissionSets: 0
        });
      }

      // Remove all permission set assignments
      deleteResult = await pool.query(
        'DELETE FROM public.profile_permission_sets WHERE profile_id = $1',
        [id]
      );
      
      message = `All permission set assignments removed successfully (${deleteResult.rowCount} removed)`;
    }

    console.log('✅ DEBUG: Permission set assignment(s) removed:', deleteResult.rowCount);

    console.log('=== PERMISSION SET ASSIGNMENT(S) REMOVED SUCCESSFULLY ===');
    return NextResponse.json({ 
      success: true, 
      message: message,
      removedPermissionSets: deleteResult.rowCount
    });

  } catch (error) {
    console.error('=== ERROR REMOVING PERMISSION SET ASSIGNMENT ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to remove permission set assignment', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


