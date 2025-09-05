import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get profiles for a specific user
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

    console.log(`🔍 Fetching profiles for user: ${id}`);

    // Get database pool
    const pool = await getPgPool();
    
    // Get profiles for the specified user
    const profilesResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.type
      FROM user_profiles up
      JOIN profiles p ON up.profile_id = p.id
      WHERE up.user_id = $1
      ORDER BY p.name
    `, [id]);

    const profiles = profilesResult.rows;
    
    console.log(`✅ Found ${profiles.length} profiles for user ${id}`);
    
    return NextResponse.json({
      userId: id,
      profiles,
      count: profiles.length
    });

  } catch (error) {
    console.error('❌ Error fetching user profiles:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user profiles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Assign profiles to a user
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
    const { profileId } = body;
    
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    console.log(`🔍 Assigning profile ${profileId} to user ${id}`);

    const pool = await getPgPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if already exists to avoid duplicates
      const existing = await client.query(
        'SELECT id FROM public.user_profiles WHERE user_id = $1 AND profile_id = $2',
        [id, profileId]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO public.user_profiles (id, user_id, profile_id) VALUES (gen_random_uuid(), $1, $2)',
          [id, profileId]
        );
      }
      
      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Profile assigned successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning profile to user:', error);
    return NextResponse.json({
      error: 'Failed to assign profile to user',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Remove a specific profile assignment for a user
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
    const { profileId } = body;
    
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    console.log(`🔍 Removing profile ${profileId} from user ${id}`);

    const pool = await getPgPool();
    
    // Check if user exists in local database
    const userResult = await pool.query('SELECT id FROM public.users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the profile assignment exists
    const profileAssignmentResult = await pool.query(
      'SELECT id FROM public.user_profiles WHERE user_id = $1 AND profile_id = $2', 
      [id, profileId]
    );
    
    if (profileAssignmentResult.rows.length === 0) {
      console.log('Profile assignment not found');
      return NextResponse.json({ 
        success: true, 
        message: 'Profile assignment not found',
        removedProfiles: 0
      });
    }

    // Remove the specific profile assignment
    const deleteResult = await pool.query(
      'DELETE FROM public.user_profiles WHERE user_id = $1 AND profile_id = $2',
      [id, profileId]
    );

    console.log('Profile assignment removed:', deleteResult.rowCount);

    console.log('=== PROFILE ASSIGNMENT REMOVED SUCCESSFULLY ===');
    return NextResponse.json({ 
      success: true, 
      message: 'Profile assignment removed successfully',
      removedProfiles: deleteResult.rowCount
    });

  } catch (error) {
    console.error('=== ERROR REMOVING PROFILE ASSIGNMENT ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to remove profile assignment', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
