import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Remove all user assignments for a profile
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    console.log('=== REMOVING USER ASSIGNMENTS FOR PROFILE ===');
    console.log('Profile ID:', id);

    const pool = await getPgPool();
    
    // Check if profile exists
    const profileResult = await pool.query('SELECT id, name FROM public.profiles WHERE id = $1', [id]);
    
    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileResult.rows[0];
    console.log('Profile found:', profile.name);

    // Get count of current user assignments
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.user_profiles WHERE profile_id = $1', 
      [id]
    );
    const currentUserCount = parseInt(userCountResult.rows[0]?.user_count || '0');
    
    console.log('Current user assignments:', currentUserCount);

    if (currentUserCount === 0) {
      console.log('No user assignments to remove');
      return NextResponse.json({ 
        success: true, 
        message: 'No user assignments to remove',
        removedUsers: 0
      });
    }

    // Remove all user assignments for this profile
    const deleteResult = await pool.query(
      'DELETE FROM public.user_profiles WHERE profile_id = $1',
      [id]
    );

    console.log('User assignments removed:', deleteResult.rowCount);

    // Verify removal
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.user_profiles WHERE profile_id = $1', 
      [id]
    );
    const remainingUsers = parseInt(verifyResult.rows[0]?.user_count || '0');

    if (remainingUsers > 0) {
      console.error('❌ Failed to remove all user assignments. Remaining:', remainingUsers);
      return NextResponse.json(
        { error: 'Failed to remove all user assignments' },
        { status: 500 }
      );
    }

    console.log('=== USER ASSIGNMENTS REMOVED SUCCESSFULLY ===');
    return NextResponse.json({ 
      success: true, 
      message: `Successfully removed ${deleteResult.rowCount} user assignment(s)`,
      removedUsers: deleteResult.rowCount
    });

  } catch (error) {
    console.error('=== ERROR REMOVING USER ASSIGNMENTS ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to remove user assignments', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
