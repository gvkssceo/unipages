import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Delete profile by name
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if profile exists
    const profileCheck = await pool.query(
      'SELECT id, name, type FROM public.profiles WHERE name = $1',
      [name]
    );

    if (profileCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileId = profileCheck.rows[0].id;
    const profileType = profileCheck.rows[0].type;
    
    // Check if profile is a system profile
    if (profileType === 'System') {
      return NextResponse.json({ 
        error: 'Cannot delete system profiles', 
        details: 'System profiles are protected and cannot be deleted' 
      }, { status: 403 });
    }

    // Check if profile has users assigned
    const userCheck = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.users WHERE profile_id = $1',
      [profileId]
    );

    const userCount = parseInt(userCheck.rows[0].user_count);
    if (userCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete profile with assigned users', 
        details: `Profile has ${userCount} user(s) assigned. Remove users from this profile before deleting.` 
      }, { status: 409 });
    }

    // Delete the profile
    const deleteResult = await pool.query(
      'DELETE FROM public.profiles WHERE name = $1 RETURNING id',
      [name]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile deleted successfully',
      deletedProfileId: deleteResult.rows[0].id
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to delete profile', 
      details: errorMessage 
    }, { status: 500 });
  }
}
