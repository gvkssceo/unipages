import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get permission sets for a specific user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching permission sets for user: ${id}`);

    // Get database pool
    const pool = await getPgPool();
    
    // Get permission sets for the specified user with source type
    const permissionSetsResult = await pool.query(`
      SELECT 
        ps.id,
        ps.name,
        ps.description,
        ups.source_type,
        ups.id as assignment_id
      FROM user_permission_sets ups
      JOIN permission_sets ps ON ups.permission_set_id = ps.id
      WHERE ups.user_id = $1
      ORDER BY ps.name
    `, [id]);

    const permissionSets = permissionSetsResult.rows;
    
    console.log(`✅ Found ${permissionSets.length} permission sets for user ${id}`);
    
    return NextResponse.json({
      userId: id,
      permissionSets,
      count: permissionSets.length
    });

  } catch (error) {
    console.error('❌ Error fetching user permission sets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user permission sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Assign permission sets to a user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { permissionSetId } = body;
    
    if (!permissionSetId) {
      return NextResponse.json({ error: 'permissionSetId is required' }, { status: 400 });
    }

    console.log(`🔍 Assigning permission set ${permissionSetId} to user ${id}`);

    const pool = await getPgPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if already exists to avoid duplicates
      const existing = await client.query(
        'SELECT id FROM public.user_permission_sets WHERE user_id = $1 AND permission_set_id = $2',
        [id, permissionSetId]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO public.user_permission_sets (id, user_id, permission_set_id, source_type) VALUES (gen_random_uuid(), $1, $2, $3)',
          [id, permissionSetId, 'direct']
        );
      }
      
      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Permission set assigned successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning permission set to user:', error);
    return NextResponse.json({
      error: 'Failed to assign permission set to user',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Remove a specific permission set assignment for a user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { permissionSetId } = body;
    
    if (!permissionSetId) {
      return NextResponse.json({ error: 'permissionSetId is required' }, { status: 400 });
    }

    console.log(`🔍 Removing permission set ${permissionSetId} from user ${id}`);

    const pool = await getPgPool();
    
    // Check if user exists in local database
    const userResult = await pool.query('SELECT id FROM public.users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the permission set assignment exists
    const permissionSetAssignmentResult = await pool.query(
      'SELECT id FROM public.user_permission_sets WHERE user_id = $1 AND permission_set_id = $2', 
      [id, permissionSetId]
    );
    
    if (permissionSetAssignmentResult.rows.length === 0) {
      console.log('Permission set assignment not found');
      return NextResponse.json({ 
        success: true, 
        message: 'Permission set assignment not found',
        removedPermissionSets: 0
      });
    }

    // Remove the specific permission set assignment
    const deleteResult = await pool.query(
      'DELETE FROM public.user_permission_sets WHERE user_id = $1 AND permission_set_id = $2',
      [id, permissionSetId]
    );

    console.log('Permission set assignment removed:', deleteResult.rowCount);

    console.log('=== PERMISSION SET ASSIGNMENT REMOVED SUCCESSFULLY ===');
    return NextResponse.json({ 
      success: true, 
      message: 'Permission set assignment removed successfully',
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
