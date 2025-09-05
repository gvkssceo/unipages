import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get roles for a specific user
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

    console.log(`🔍 Fetching roles for user: ${id}`);

    // Get database pool
    const pool = await getPgPool();
    
    // Get roles for the specified user
    const rolesResult = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.description
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [id]);

    const roles = rolesResult.rows;
    
    console.log(`✅ Found ${roles.length} roles for user ${id}`);
    
    return NextResponse.json({
      userId: id,
      roles,
      count: roles.length
    });

  } catch (error) {
    console.error('❌ Error fetching user roles:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user roles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Assign roles to a user
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
    const { roleId } = body;
    
    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
    }

    console.log(`🔍 Assigning role ${roleId} to user ${id}`);

    const pool = await getPgPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if already exists to avoid duplicates
      const existing = await client.query(
        'SELECT id FROM public.user_roles WHERE user_id = $1 AND role_id = $2',
        [id, roleId]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO public.user_roles (id, user_id, role_id) VALUES (gen_random_uuid(), $1, $2)',
          [id, roleId]
        );
      }
      
      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Role assigned successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return NextResponse.json({
      error: 'Failed to assign role to user',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Remove a specific role assignment for a user
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
    const { roleId } = body;
    
    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
    }

    console.log(`🔍 Removing role ${roleId} from user ${id}`);

    const pool = await getPgPool();
    
    // Check if user exists in local database
    const userResult = await pool.query('SELECT id FROM public.users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the role assignment exists
    const roleAssignmentResult = await pool.query(
      'SELECT id FROM public.user_roles WHERE user_id = $1 AND role_id = $2', 
      [id, roleId]
    );
    
    if (roleAssignmentResult.rows.length === 0) {
      console.log('Role assignment not found');
      return NextResponse.json({ 
        success: true, 
        message: 'Role assignment not found',
        removedRoles: 0
      });
    }

    // Remove the specific role assignment
    const deleteResult = await pool.query(
      'DELETE FROM public.user_roles WHERE user_id = $1 AND role_id = $2',
      [id, roleId]
    );

    console.log('Role assignment removed:', deleteResult.rowCount);

    console.log('=== ROLE ASSIGNMENT REMOVED SUCCESSFULLY ===');
    return NextResponse.json({ 
      success: true, 
      message: 'Role assignment removed successfully',
      removedRoles: deleteResult.rowCount
    });

  } catch (error) {
    console.error('=== ERROR REMOVING ROLE ASSIGNMENT ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to remove role assignment', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
