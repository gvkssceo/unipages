import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function GET(request: NextRequest) {
  try {
    const pool = await getPgPool();
    
    console.log('🔍 DEBUG: Testing role users endpoint...');
    
    // First, let's check what roles exist
    const rolesQuery = 'SELECT id, name FROM public.roles LIMIT 5';
    const rolesResult = await pool.query(rolesQuery);
    console.log('🔍 DEBUG: Available roles:', rolesResult.rows);
    
    // Check if there are any users
    const usersQuery = 'SELECT COUNT(*) as count FROM public.users';
    const usersResult = await pool.query(usersQuery);
    console.log('🔍 DEBUG: Total users:', usersResult.rows[0]?.count);
    
    // Check users with roles
    const usersWithRolesQuery = 'SELECT username, roles FROM public.users WHERE array_length(roles, 1) > 0 LIMIT 5';
    const usersWithRolesResult = await pool.query(usersWithRolesQuery);
    console.log('🔍 DEBUG: Users with roles:', usersWithRolesResult.rows);
    
    // Check a specific role (e.g., "Location Manager")
    const specificRoleQuery = 'SELECT username, roles FROM public.users WHERE $1 = ANY(roles)';
    const specificRoleResult = await pool.query(specificRoleQuery, ['Location Manager']);
    console.log('🔍 DEBUG: Users with "Location Manager" role:', specificRoleResult.rows);
    
    return NextResponse.json({
      message: 'Debug info collected',
      roles: rolesResult.rows,
      usersCount: usersResult.rows[0]?.count,
      usersWithRoles: usersWithRolesResult.rows,
      locationManagerUsers: specificRoleResult.rows
    });
    
  } catch (error) {
    console.error('🔍 DEBUG: Error in test endpoint:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Debug endpoint failed', details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Debug endpoint failed', details: 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
