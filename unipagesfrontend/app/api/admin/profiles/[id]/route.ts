import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';
import { cache } from '@/utils/cache';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get profile by name (using id parameter to avoid Next.js conflicts)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const pool = await getPgPool();
    
    const result = await pool.query(
      `SELECT id, name, description, type, created_at, updated_at
       FROM public.profiles 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = result.rows[0];
    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      type: profile.type,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch profile', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Update profile by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 DEBUG: PUT request received for profile update');
    const { id } = await context.params;
    const body = await request.json();
    const { name, description = '' } = body;

    console.log('🔍 DEBUG: Request data:', { id, name, description });

    if (!id || !name) {
      console.log('❌ DEBUG: Validation failed - missing ID or name');
      return NextResponse.json({ error: 'Profile ID and new name are required' }, { status: 400 });
    }

    console.log('✅ DEBUG: Validation passed');

    const pool = await getPgPool();
    console.log('🔍 DEBUG: Database pool obtained');

    // First, get the current profile to verify it exists
    console.log('🔍 DEBUG: Querying for current profile with ID:', id);
    const currentProfile = await pool.query(
      'SELECT id, name FROM public.profiles WHERE id = $1',
      [id]
    );

    console.log('🔍 DEBUG: Current profile query result:', currentProfile.rows);

    if (currentProfile.rows.length === 0) {
      console.log('❌ DEBUG: Profile not found in database');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentProfileId = currentProfile.rows[0].id;
    const currentProfileName = currentProfile.rows[0].name;

    console.log('🔍 DEBUG: Current profile found:', { currentProfileId, currentProfileName });

    // Check if new profile name already exists for a different profile
    console.log('🔍 DEBUG: Checking for duplicate name:', name);
    const existingProfile = await pool.query(
      'SELECT id FROM public.profiles WHERE name = $1 AND id != $2',
      [name, currentProfileId]
    );

    console.log('🔍 DEBUG: Duplicate check result:', existingProfile.rows);

    if (existingProfile.rows.length > 0) {
      console.log('❌ DEBUG: Duplicate name found');
      return NextResponse.json({ error: 'Profile name already exists' }, { status: 409 });
    }

    console.log('✅ DEBUG: No duplicate name found, proceeding with update');

    // Update profile in database using the ID (removed type field)
    console.log('🔍 DEBUG: Executing UPDATE query with params:', [name, description, currentProfileId]);
    const result = await pool.query(
      `UPDATE public.profiles 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, description, created_at, updated_at`,
      [name, description, currentProfileId]
    );

    console.log('🔍 DEBUG: UPDATE query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('❌ DEBUG: UPDATE query returned no rows');
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
    }

    console.log('✅ DEBUG: Profile updated successfully');

    // Clear server-side cache to ensure fresh data on next request
    console.log('🗑️ Clearing server-side cache after profile update...');
    cache.delete('profiles-list');
    console.log('✅ Server-side cache cleared');

    const updatedProfile = result.rows[0];
    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: {
        id: updatedProfile.id,
        name: updatedProfile.name,
        description: updatedProfile.description,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      }
    });
  } catch (error) {
    console.error('❌ DEBUG: Error in PUT method:', error);
    console.error('❌ DEBUG: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    // Clear server-side cache even on error to ensure fresh data
    console.log('🗑️ Clearing server-side cache due to update error...');
    cache.delete('profiles-list');
    console.log('✅ Server-side cache cleared');
    
    return NextResponse.json({ 
      error: 'Failed to update profile', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  if (!id) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
  }

  console.log('=== PROFILE DELETION REQUEST START ===');
  console.log('Deleting profile ID:', id);

  const pool = await getPgPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔒 Transaction started');
  
    // Check if profile exists
    const profileResult = await client.query('SELECT id, name FROM public.profiles WHERE id = $1', [id]);
  
    if (profileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileResult.rows[0];
    console.log('Profile found:', profile.name);

    // Step 1: Remove all user assignments for this profile
    console.log('🔧 Step 1: Removing user assignments...');
    const userProfileCheck = await client.query('SELECT COUNT(*) as user_count FROM public.user_profiles WHERE profile_id = $1', [id]);
    const userCount = parseInt(userProfileCheck.rows[0]?.user_count || '0');
    
    if (userCount > 0) {
      console.log(`Found ${userCount} user assignment(s) to remove`);
      
      // Remove all user assignments
      const userDeleteResult = await client.query(
        'DELETE FROM public.user_profiles WHERE profile_id = $1',
        [id]
      );
      
      console.log(`Removed ${userDeleteResult.rowCount} user assignment(s)`);
      
      // Verify user assignments are removed
      const verifyUserResult = await client.query(
        'SELECT COUNT(*) as user_count FROM public.user_profiles WHERE profile_id = $1', 
        [id]
      );
      const remainingUsers = parseInt(verifyUserResult.rows[0]?.user_count || '0');
      
      if (remainingUsers > 0) {
        console.error('❌ Failed to remove all user assignments. Remaining:', remainingUsers);
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Failed to remove all user assignments' },
          { status: 500 }
        );
      }
    } else {
      console.log('No user assignments to remove');
    }

    // Step 2: Remove all permission set assignments for this profile
    console.log('🔧 Step 2: Removing permission set assignments...');
    const permissionSetCheck = await client.query(
      'SELECT COUNT(*) as permission_set_count FROM public.profile_permission_sets WHERE profile_id = $1', 
      [id]
    );
    const permissionSetCount = parseInt(permissionSetCheck.rows[0]?.permission_set_count || '0');
    
    if (permissionSetCount > 0) {
      console.log(`Found ${permissionSetCount} permission set assignment(s) to remove`);
      
      // Remove all permission set assignments
      const permissionSetDeleteResult = await client.query(
        'DELETE FROM public.profile_permission_sets WHERE profile_id = $1',
        [id]
      );
      
      console.log(`Removed ${permissionSetDeleteResult.rowCount} permission set assignment(s)`);
      
      // Verify permission set assignments are removed
      const verifyPermissionSetResult = await client.query(
        'SELECT COUNT(*) as permission_set_count FROM public.profile_permission_sets WHERE profile_id = $1', 
        [id]
      );
      const remainingPermissionSets = parseInt(verifyPermissionSetResult.rows[0]?.permission_set_count || '0');
      
      if (remainingPermissionSets > 0) {
        console.error('❌ Failed to remove all permission set assignments. Remaining:', remainingPermissionSets);
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Failed to remove all permission set assignments' },
          { status: 500 }
        );
      }
    } else {
      console.log('No permission set assignments to remove');
    }

    // Step 3: Delete the profile itself
    console.log('🗑️ Step 3: Deleting profile...');
    
    // First, let's check if there are any remaining dependencies
    console.log('🔍 Checking for remaining dependencies...');
    
    // Check for any remaining user assignments
    const remainingUsers = await client.query('SELECT COUNT(*) as count FROM public.user_profiles WHERE profile_id = $1', [id]);
    console.log('🔍 Remaining user assignments:', remainingUsers.rows[0].count);
    
    // Check for any remaining permission set assignments
    const remainingPerms = await client.query('SELECT COUNT(*) as count FROM public.profile_permission_sets WHERE profile_id = $1', [id]);
    console.log('🔍 Remaining permission set assignments:', remainingPerms.rows[0].count);
    
    // Check for any other potential dependencies (users table doesn't have profile_id column)
    // The relationship is through user_profiles table, which we already checked above
    console.log('🔍 No direct profile_id column in users table - relationship is through user_profiles table');
    
    console.log('🗑️ Attempting to delete profile from database...');
    const deleteResult = await client.query('DELETE FROM public.profiles WHERE id = $1 RETURNING id, name', [id]);
    console.log('🗑️ Delete result:', deleteResult);
    console.log('🗑️ Delete result rows:', deleteResult.rows);
    console.log('🗑️ Delete result rowCount:', deleteResult.rowCount);
    
    if (deleteResult.rows.length === 0) {
      console.error('❌ Profile deletion failed - no rows affected');
      console.error('❌ This could be due to foreign key constraints or the profile not existing');
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back due to no rows affected');
      return NextResponse.json({ 
        error: 'Profile deletion failed - profile not found or has dependencies that prevent deletion',
        details: 'Check for remaining user assignments or other dependencies'
      }, { status: 409 });
    }
    
    console.log('✅ Profile deleted from database successfully:', deleteResult.rows[0]);

    // Commit the transaction
    console.log('💾 Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    console.log('=== PROFILE DELETION COMPLETED SUCCESSFULLY ===');
    
    // Clear server-side cache to ensure fresh data on next request
    console.log('🗑️ Clearing server-side cache...');
    cache.delete('profiles-list');
    console.log('✅ Server-side cache cleared');
    
    const response = { 
      success: true, 
      message: 'Profile deleted successfully',
      removedUsers: userCount,
      removedPermissionSets: permissionSetCount
    };
    
    console.log('📤 Sending success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('=== PROFILE DELETION ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    // Rollback transaction
    try {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Error during rollback:', rollbackError);
    }
    
    // Clear server-side cache even on error to ensure fresh data
    console.log('🗑️ Clearing server-side cache due to error...');
    cache.delete('profiles-list');
    console.log('✅ Server-side cache cleared');
    
    return NextResponse.json(
      { error: 'Failed to delete profile', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  } finally {
    // Ensure client is always released
    if (client) {
      console.log('🔓 Releasing database client');
      client.release();
    }
  }
}
