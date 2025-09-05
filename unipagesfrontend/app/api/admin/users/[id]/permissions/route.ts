import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Add extra permission sets to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { permissionSetIds } = await request.json();
    
    if (!permissionSetIds || !Array.isArray(permissionSetIds)) {
      return NextResponse.json(
        { error: 'permissionSetIds array is required' },
        { status: 400 }
      );
    }
    
    const pool = await getPgPool();
    
    // Always ensure the function is up-to-date with correct syntax
    console.log('Creating/updating function add_extra_permission_sets_to_user...');
    
    // Create or replace the function with fixed column references
    await pool.query(`
      CREATE OR REPLACE FUNCTION add_extra_permission_sets_to_user(
        p_user_id character varying,
        p_permission_set_ids uuid[]
      ) RETURNS void AS $$
      DECLARE
        ps_id uuid;
      BEGIN
        -- Loop through each permission set ID
        FOREACH ps_id IN ARRAY p_permission_set_ids
        LOOP
          -- Check if permission set is already assigned
          IF NOT EXISTS (
            SELECT 1 FROM user_permission_sets ups
            WHERE ups.user_id = p_user_id AND ups.permission_set_id = ps_id
          ) THEN
            -- Insert new permission set assignment
            INSERT INTO user_permission_sets (
              id, user_id, permission_set_id, source_type, created_at
            ) VALUES (
              gen_random_uuid(), p_user_id, ps_id, 'direct', NOW()
            );
          END IF;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('Function created/updated successfully');
    
    // Add permission sets using the function
    await pool.query(
      'SELECT add_extra_permission_sets_to_user($1, $2)',
      [userId, permissionSetIds]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `Added ${permissionSetIds.length} permission sets to user` 
    });
    
  } catch (error) {
    console.error('Error adding permission sets:', error);
    return NextResponse.json(
      { error: `Failed to add permission sets: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Remove permission sets from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { permissionSetIds } = await request.json();
    
    if (!permissionSetIds || !Array.isArray(permissionSetIds)) {
      return NextResponse.json(
        { error: 'permissionSetIds array is required' },
        { status: 400 }
      );
    }
    
    const pool = await getPgPool();
    
    // Always ensure the function is up-to-date with correct syntax
    console.log('Creating/updating function remove_permission_sets_from_user...');
    
    // Create or replace the function with fixed column references
    await pool.query(`
      CREATE OR REPLACE FUNCTION remove_permission_sets_from_user(
        p_user_id character varying,
        p_permission_set_ids uuid[]
      ) RETURNS void AS $$
      BEGIN
        -- Remove only direct permission sets (not profile-based ones)
        DELETE FROM user_permission_sets 
        WHERE user_id = p_user_id 
          AND permission_set_id = ANY(p_permission_set_ids)
          AND source_type = 'direct';
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('Function created/updated successfully');
    
    // Remove permission sets using the function
    await pool.query(
      'SELECT remove_permission_sets_from_user($1, $2)',
      [userId, permissionSetIds]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `Removed ${permissionSetIds.length} permission sets from user` 
    });
    
  } catch (error) {
    console.error('Error removing permission sets:', error);
    return NextResponse.json(
      { error: `Failed to remove permission sets: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Get user's permission sets with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const pool = await getPgPool();
    
    const result = await pool.query(`
      SELECT 
        ups.id as ups_id,
        ups.permission_set_id,
        ps.id as ps_id,
        ps.name,
        ps.description,
        ups.source_type,
        p.name as profile_name,
        ups.created_at
      FROM user_permission_sets ups
      JOIN permission_sets ps ON ups.permission_set_id = ps.id
      LEFT JOIN profiles p ON ups.profile_id = p.id
      WHERE ups.user_id = $1
      ORDER BY ups.source_type, ps.name
    `, [userId]);
    
    return NextResponse.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching user permission sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user permission sets' },
      { status: 500 }
    );
  }
}
