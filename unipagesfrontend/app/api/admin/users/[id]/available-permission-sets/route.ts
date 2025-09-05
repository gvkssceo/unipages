import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get available permission sets for a specific user (excluding already assigned ones)
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

    console.log(`🔍 Fetching available permission sets for user: ${id}`);

    // Get database pool
    const pool = await getPgPool();
    
    // Get all permission sets that are not already assigned to this user
    const availablePermissionSetsResult = await pool.query(`
      SELECT 
        ps.id,
        ps.name,
        ps.description
      FROM permission_sets ps
      WHERE ps.id NOT IN (
        SELECT ups.permission_set_id 
        FROM user_permission_sets ups 
        WHERE ups.user_id = $1
      )
      ORDER BY ps.name
    `, [id]);

    const availablePermissionSets = availablePermissionSetsResult.rows;
    
    console.log(`✅ Found ${availablePermissionSets.length} available permission sets for user ${id}`);
    
    return NextResponse.json({
      userId: id,
      availablePermissionSets,
      count: availablePermissionSets.length
    });

  } catch (error) {
    console.error('❌ Error fetching available permission sets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch available permission sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
