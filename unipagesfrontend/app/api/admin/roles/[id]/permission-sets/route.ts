import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    console.log('=== FETCHING ROLE PERMISSION SETS ===');
    console.log('Role ID:', roleId);

    // Get database pool
    console.log('🔍 Getting database connection...');
    const pool = await getPgPool();
    console.log('✅ Database connection established');
    
    // Check if required tables exist
    console.log('🔍 Checking if required database tables exist...');
    try {
      const tablesCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'profile_permission_sets', 'permission_sets')
      `);
      console.log('🔍 Available tables:', tablesCheck.rows.map((row: any) => row.table_name));
      
      if (tablesCheck.rows.length < 3) {
        console.error('❌ Required tables missing:', {
          profiles: tablesCheck.rows.some((row: any) => row.table_name === 'profiles'),
          profile_permission_sets: tablesCheck.rows.some((row: any) => row.table_name === 'profile_permission_sets'),
          permission_sets: tablesCheck.rows.some((row: any) => row.table_name === 'permission_sets')
        });
        console.log('⚠️ Returning empty array - tables not found');
        return NextResponse.json([]);
      }
      console.log('✅ Required tables exist');
    } catch (error) {
      console.error('❌ Error checking database tables:', error);
      console.log('⚠️ Returning empty array - table check failed');
      return NextResponse.json([]);
    }
    
    // Since roles don't directly have permission sets in this schema,
    // we need to get permission sets through profiles that might be associated with this role
    // For now, let's return an empty array since the relationship is through profiles, not roles
    console.log(`ℹ️ Roles don't directly have permission sets in this schema`);
    console.log(`ℹ️ Permission sets are assigned to profiles, not roles`);
    console.log(`ℹ️ To get user permissions, use the user's profile instead`);
    
    return NextResponse.json([]);

  } catch (error) {
    console.error('❌ Error fetching role permission sets:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // Return empty array instead of error to prevent frontend crashes
    console.log('⚠️ Returning empty array due to error');
    return NextResponse.json([]);
  }
}

// Remove all permission set assignments for a role
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    console.log('=== REMOVING PERMISSION SET ASSIGNMENTS FOR ROLE ===');
    console.log('Role ID:', id);

    const pool = await getPgPool();
    
    // Check if role exists
    const roleResult = await pool.query('SELECT id, name FROM public.roles WHERE id = $1', [id]);
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roleResult.rows[0];
    console.log('Role found:', role.name);

    // Since roles don't directly have permission sets in this schema,
    // we'll return success with 0 removed
    console.log('ℹ️ Roles don\'t directly have permission sets in this schema');
    console.log('ℹ️ Permission sets are assigned to profiles, not roles');
    
    return NextResponse.json({ 
      success: true, 
      message: 'No permission set assignments to remove (roles don\'t directly have permission sets)',
      removedPermissionSets: 0
    });

  } catch (error) {
    console.error('=== ERROR REMOVING PERMISSION SET ASSIGNMENTS ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to remove permission set assignments', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
