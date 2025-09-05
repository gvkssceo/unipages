import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const pool = await getPgPool();

    console.log('🔍 DEBUG: Role ID received:', roleId);
    console.log('🔍 DEBUG: Role ID type:', typeof roleId);

    // First, get the role name from the role ID
    const roleQuery = 'SELECT name FROM public.roles WHERE id = $1';
    const roleResult = await pool.query(roleQuery, [roleId]);
    
    if (roleResult.rows.length === 0) {
      console.log('🔍 DEBUG: No role found with ID:', roleId);
      return NextResponse.json({ users: [] });
    }
    
    const roleName = roleResult.rows[0].name;
    console.log('🔍 DEBUG: Role name found:', roleName);

    // Get admin token from Keycloak
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token response not ok:', tokenResponse.status, tokenResponse.statusText);
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Fetch all users from Keycloak
    const usersResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users from Keycloak');
    }

    const users = await usersResponse.json();
    console.log('🔍 DEBUG: Total users from Keycloak:', users.length);

    // Filter users who have the specific role
    const usersWithRole = [];
    
    for (const user of users) {
      try {
        // Get user roles from Keycloak
        const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${user.id}/role-mappings/realm`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (rolesResponse.ok) {
          const roles = await rolesResponse.json();
          const userRoles = roles.map((role: any) => role.name);
          
          // Check if user has the specific role
          if (userRoles.includes(roleName)) {
            console.log('🔍 DEBUG: User has role:', user.username, 'Roles:', userRoles);
            
            // Get profile information from local database
            let profile = null;
            try {
              const profileResult = await pool.query(
                'SELECT profile_id FROM user_profiles WHERE user_id = $1',
                [user.id]
              );
              
              if (profileResult.rows.length > 0 && profileResult.rows[0].profile_id) {
                const profileNameResult = await pool.query(
                  'SELECT name FROM profiles WHERE id = $1',
                  [profileResult.rows[0].profile_id]
                );
                
                if (profileNameResult.rows.length > 0) {
                  profile = profileNameResult.rows[0].name;
                }
              }
            } catch (error) {
              console.log('🔍 DEBUG: No profile found for user:', user.username);
            }
            
            usersWithRole.push({
              id: user.id,
              username: user.username,
              email: user.email,
              enabled: user.enabled,
              profile: profile
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching roles for user ${user.id}:`, error);
      }
    }

    console.log('🔍 DEBUG: Users with role found:', usersWithRole.length);
    console.log('🔍 DEBUG: Users:', usersWithRole);

    return NextResponse.json({
      users: usersWithRole
    });

  } catch (error) {
    console.error('🔍 DEBUG: Error details:', error);
    if (error instanceof Error) {
      console.error('🔍 DEBUG: Error message:', error.message);
      console.error('🔍 DEBUG: Error stack:', error.stack);
      return NextResponse.json(
        { error: 'Failed to fetch role users', details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to fetch role users', details: 'Unknown error' },
        { status: 500 }
      );
    }
  }
}

// Remove all user assignments for a role
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    console.log('=== REMOVING USER ASSIGNMENTS FOR ROLE ===');
    console.log('Role ID:', id);

    const pool = await getPgPool();
    
    // Check if role exists
    const roleResult = await pool.query('SELECT id, name FROM public.roles WHERE id = $1', [id]);
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roleResult.rows[0];
    console.log('Role found:', role.name);

    // Get count of current user assignments for this role
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.user_roles WHERE role_id = $1', 
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

    // Remove all user assignments for this role
    const deleteResult = await pool.query(
      'DELETE FROM public.user_roles WHERE role_id = $1',
      [id]
    );

    console.log('User assignments removed:', deleteResult.rowCount);

    // Verify removal
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as user_count FROM public.user_roles WHERE role_id = $1', 
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
