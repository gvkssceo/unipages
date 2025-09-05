import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== INDIVIDUAL USER UPDATE ROUTE CALLED ===');
    
    const { id: userId } = await params;
    console.log('User ID from params:', userId);
    const updateData = await request.json();
    
    console.log('Update data received:', JSON.stringify(updateData, null, 2));

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
    console.log('✅ Admin token obtained successfully');

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    
    console.log('Realm info:', { realm, baseUrl });

    // Update user basic information if provided
    if (updateData.firstName || updateData.lastName || updateData.email || updateData.username || updateData.enabled !== undefined) {
      const userUpdateData: any = {};
      
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.email) userUpdateData.email = updateData.email;
      if (updateData.username) userUpdateData.username = updateData.username;
      if (updateData.enabled !== undefined) userUpdateData.enabled = updateData.enabled;

      console.log('Updating user in Keycloak with data:', userUpdateData);

      const userUpdateResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userUpdateData),
      });

      if (!userUpdateResponse.ok) {
        console.error('Failed to update user:', userUpdateResponse.status, userUpdateResponse.statusText);
        throw new Error('Failed to update user information');
      }
      
      console.log('✅ User basic information updated in Keycloak');
    }

    // Update user roles if provided
    if (updateData.roles && Array.isArray(updateData.roles)) {
      // First, get current roles
      const currentRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (currentRolesResponse.ok) {
        const currentRoles = await currentRolesResponse.json();
        
        // Remove all current roles
        if (currentRoles.length > 0) {
          const removeRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentRoles),
          });

          if (!removeRolesResponse.ok) {
            console.error('Failed to remove current roles:', removeRolesResponse.status);
          }
        }

        // Add new roles
        if (updateData.roles.length > 0) {
          // Get role details for each role name
          const rolesToAdd = [];
          for (const roleName of updateData.roles) {
            try {
              const roleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(roleName)}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (roleResponse.ok) {
                const role = await roleResponse.json();
                rolesToAdd.push(role);
              }
            } catch (error) {
              console.error(`Error fetching role ${roleName}:`, error);
            }
          }

          if (rolesToAdd.length > 0) {
            const addRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(rolesToAdd),
            });

            if (!addRolesResponse.ok) {
              console.error('Failed to add new roles:', addRolesResponse.status);
            }
          }
        }
      }
    }

         // Store additional user data (profile) in custom database table
    if (updateData.profile !== undefined || updateData.phone !== undefined) {
      console.log('=== UPDATING USER PROFILE AND PHONE IN DATABASE ===');
       console.log('Profile to update:', updateData.profile);
      console.log('Phone to update:', updateData.phone);
       console.log('Note: Permissions are now handled separately via permission sets API');
       
       try {
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
             AND table_name IN ('profiles', 'user_profiles')
           `);
                       console.log('🔍 Available tables:', tablesCheck.rows.map((row: any) => row.table_name));
           
           if (tablesCheck.rows.length < 2) {
                           console.error('❌ Required tables missing:', {
                profiles: tablesCheck.rows.some((row: any) => row.table_name === 'profiles'),
                user_profiles: tablesCheck.rows.some((row: any) => row.table_name === 'user_profiles')
              });
             throw new Error('Required database tables (profiles, user_profiles) do not exist');
           }
           console.log('✅ Required tables exist');
         } catch (error) {
           console.error('❌ Error checking database tables:', error);
           throw new Error(`Database table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
         }
           
        // Update profile if provided
                       if (updateData.profile !== undefined) {
              console.log('Updating profile in user_profiles table...');
              
              // First, get the profile ID from the profiles table using the profile name
              console.log(`🔍 Looking up profile "${updateData.profile}" in profiles table...`);
              const profileIdResult = await pool.query(
                'SELECT id FROM profiles WHERE name = $1',
                [updateData.profile]
              );
              
              console.log(`🔍 Profile lookup result:`, profileIdResult.rows);
              
              if (profileIdResult.rows.length === 0) {
                console.error(`❌ Profile "${updateData.profile}" not found in profiles table`);
                throw new Error(`Profile "${updateData.profile}" not found`);
              }
              
              const profileId = profileIdResult.rows[0].id;
              console.log(`✅ Found profile ID for "${updateData.profile}":`, profileId);
              
              // Check if user already has a profile record
              console.log(`🔍 Checking if user ${userId} already has a profile record...`);
              const existingProfile = await pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
              );
              
              console.log(`🔍 Existing profile check result:`, existingProfile.rows);
              
              if (existingProfile.rows.length > 0) {
                // Update existing profile
                console.log(`🔄 Updating existing profile record for user ${userId}...`);
                await pool.query(
                  'UPDATE user_profiles SET profile_id = $1 WHERE user_id = $2',
                  [profileId, userId]
                );
                console.log('✅ Profile updated in database');
              } else {
                // Insert new profile record with generated UUID
                console.log(`🔄 Inserting new profile record for user ${userId}...`);
                await pool.query(
                  'INSERT INTO user_profiles (id, user_id, profile_id) VALUES (gen_random_uuid(), $1, $2)',
                  [userId, profileId]
                );
                console.log('✅ Profile inserted in database');
              }
               
               // 🚀 NEW: Sync permission sets from the new profile
               try {
                 console.log('🔄 Syncing permission sets from new profile...');
                 await pool.query(
                   'SELECT update_user_profile_permission_sets($1, $2)',
                   [userId, profileId]
                 );
                 console.log('✅ Permission sets synced successfully from profile');
               } catch (error) {
                 console.log('⚠️ Could not sync permission sets - this is not critical, continuing...');
                 console.log('Error details:', error);
                 // Don't throw error - this is not critical for user update
               }
            }
           
        // Update phone number if provided
        if (updateData.phone !== undefined) {
          console.log('Updating phone number in user_profiles table...');
          
          // Check if user_profiles table has a phone column, if not, add it
          try {
            const phoneColumnCheck = await pool.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'user_profiles' 
              AND column_name = 'phone'
            `);
            
            if (phoneColumnCheck.rows.length === 0) {
              console.log('📱 Phone column does not exist, adding it...');
              await pool.query('ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20)');
              console.log('✅ Phone column added to user_profiles table');
            }
            
            // Update or insert phone number
            const existingPhone = await pool.query(
              'SELECT phone FROM user_profiles WHERE user_id = $1',
              [userId]
            );
            
            if (existingPhone.rows.length > 0) {
              // Update existing phone
              await pool.query(
                'UPDATE user_profiles SET phone = $1 WHERE user_id = $2',
                [updateData.phone, userId]
              );
              console.log('✅ Phone number updated in database');
            } else {
              // Insert new record with phone
              await pool.query(
                'INSERT INTO user_profiles (id, user_id, phone) VALUES (gen_random_uuid(), $1, $2)',
                [userId, updateData.phone]
              );
              console.log('✅ Phone number inserted in database');
            }
          } catch (error) {
            console.error('❌ Error updating phone number:', error);
            // Don't throw error - phone update is not critical
          }
        }

        // Update extra permission sets if provided
        if (updateData.extraPermissionSets && Array.isArray(updateData.extraPermissionSets)) {
          console.log('🔄 Updating extra permission sets in user_permission_sets table...');
          console.log('📝 Extra permission set IDs to save:', updateData.extraPermissionSets);
          
          try {
            // First, remove any existing extra permission sets for this user
            const deleteResult = await pool.query(
              'DELETE FROM user_permission_sets WHERE user_id = $1 AND source_type = $2',
              [userId, 'direct']
            );
            console.log('✅ Removed existing extra permission sets:', deleteResult.rowCount);
            
            // Add new extra permission sets
            if (updateData.extraPermissionSets.length > 0) {
              for (const permissionSetId of updateData.extraPermissionSets) {
                const insertResult = await pool.query(
                  'INSERT INTO user_permission_sets (id, user_id, permission_set_id, source_type, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())',
                  [userId, permissionSetId, 'direct']
                );
                console.log(`✅ Inserted extra permission set ${permissionSetId}:`, insertResult.rowCount);
              }
              console.log(`✅ Added ${updateData.extraPermissionSets.length} extra permission sets`);
            } else {
              console.log('ℹ️ No extra permission sets to add');
            }
            
            // Verify the saved extra permissions
            const verifyResult = await pool.query(`
              SELECT 
                ps.name,
                ps.description,
                ups.source_type
              FROM user_permission_sets ups
              JOIN permission_sets ps ON ups.permission_set_id = ps.id
              WHERE ups.user_id = $1 AND ups.source_type = 'direct'
              ORDER BY ps.name
            `, [userId]);
            
            console.log('🔍 Verification - Saved extra permissions:', verifyResult.rows.map((row: any) => row.name));
            
          } catch (error) {
            console.error('❌ Error updating extra permission sets:', error);
            // Don't throw error - permission sets update is not critical
          }
        } else {
          console.log('ℹ️ No extra permission sets provided in update data');
        }
        
        console.log('✅ User profile and phone updated successfully in database');
                } catch (error) {
        console.error('❌ Error updating user profile/phone in database:', error);
           console.error('❌ Error details:', {
             message: error instanceof Error ? error.message : 'Unknown error',
             stack: error instanceof Error ? error.stack : 'No stack trace',
             userId,
          profile: updateData.profile,
          phone: updateData.phone
           });
           
        // For now, let's not fail the entire user update if profile/phone update fails
           // This allows users to still update their basic info and roles
        console.log('⚠️ Profile/phone update failed, but continuing with user update...');
        console.log('⚠️ User will be updated in Keycloak but profile/phone may not be synced to database');
         }
     }

    // Fetch updated user data to return
    const updatedUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!updatedUserResponse.ok) {
      throw new Error('Failed to fetch updated user data');
    }

    const updatedUser = await updatedUserResponse.json();

    // Get updated roles
    let userRoles: string[] = [];
    try {
      const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (rolesResponse.ok) {
        const roles = await rolesResponse.json();
        const systemRoles = ['admin', 'default-roles-unipages', 'uma_authorization', 'offline_access'];
        userRoles = roles
          .map((role: any) => role.name)
          .filter((roleName: string) => !systemRoles.includes(roleName));
      }
    } catch (error) {
      console.error(`Error fetching updated roles for user ${userId}:`, error);
    }

    // Get profile and permissions from custom database table
    let profile = null;
    let phone = null;
    let permissions: string[] = [];
    let extraPermissions: string[] = [];
    
                 try {
          // Get database pool
          const pool = await getPgPool();
       
       // Get profile and permission sets from the new user_permission_sets table
       const profileResult = await pool.query(
        'SELECT profile_id, phone FROM user_profiles WHERE user_id = $1',
         [userId]
       );
       
       if (profileResult.rows.length > 0) {
         const profileData = profileResult.rows[0];
         
         if (profileData.profile_id) {
           // Get profile name from profiles table
           const profileNameResult = await pool.query(
             'SELECT name FROM profiles WHERE id = $1',
             [profileData.profile_id]
           );
           
           if (profileNameResult.rows.length > 0) {
             profile = profileNameResult.rows[0].name;
             console.log('✅ Profile retrieved from database:', profile);
           }
         }
         
        // Get phone number
        if (profileData.phone) {
          phone = profileData.phone;
          console.log('✅ Phone number retrieved from database:', phone);
        }
        
        // Get all permission sets from the user's profile
         try {
           const permissionsResult = await pool.query(`
             SELECT 
               ps.name,
              ps.description,
              'profile' as source_type
            FROM profile_permission_sets pps
            JOIN permission_sets ps ON pps.permission_set_id = ps.id
            WHERE pps.profile_id = $1
            ORDER BY ps.name
          `, [profileData.profile_id]);
           
           if (permissionsResult.rows.length > 0) {
             permissions = permissionsResult.rows.map((row: any) => row.name);
            console.log('✅ Permission sets retrieved from profile:', permissions);
             console.log('Permission details:', permissionsResult.rows);
          } else {
            console.log('ℹ️ No permission sets found in profile');
           }
         } catch (error) {
          console.log('⚠️ profile_permission_sets table not found yet - using empty permissions');
           console.log('💡 Run the database schema setup to enable permission management');
         }

        // Get extra permission sets (directly assigned to user)
        try {
          const extraPermissionsResult = await pool.query(`
            SELECT 
              ps.name,
              ps.description,
              'direct' as source_type
            FROM user_permission_sets ups
            JOIN permission_sets ps ON ups.permission_set_id = ps.id
            WHERE ups.user_id = $1 AND ups.source_type = 'direct'
            ORDER BY ps.name
          `, [userId]);
          
          if (extraPermissionsResult.rows.length > 0) {
            extraPermissions = extraPermissionsResult.rows.map((row: any) => row.name);
            console.log('✅ Extra permission sets retrieved:', extraPermissions);
          } else {
            console.log('ℹ️ No extra permission sets found');
          }
        } catch (error) {
          console.log('⚠️ user_permission_sets table not found yet - using empty extra permissions');
         }
       } else {
         console.log('No profile data found in database for user:', userId);
       }
     } catch (error) {
       console.error('❌ Error retrieving profile from database:', error);
       console.error('❌ This might be due to missing database tables or connection issues');
       console.error('❌ Error details:', {
         message: error instanceof Error ? error.message : 'Unknown error',
         stack: error instanceof Error ? error.stack : 'No stack trace'
       });
       
       // Continue without profile/permissions rather than failing completely
       console.log('⚠️ Continuing without profile and permissions data');
     }

    const transformedUser = {
      id: updatedUser.id,
      name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      username: updatedUser.username,
      phone: phone,
      roles: userRoles,
      profile: profile,
      permissions: permissions,
      extraPermissions: extraPermissions,
      enabled: updatedUser.enabled,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdTimestamp,
      lastLogin: updatedUser.lastLoginTimestamp,
    };

    return NextResponse.json(transformedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Check if required environment variables are set
    if (!process.env.KEYCLOAK_ISSUER) {
      console.error('❌ Missing environment variable: KEYCLOAK_ISSUER');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ISSUER not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_ID) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_ID');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_ID not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_SECRET not set' },
        { status: 500 }
      );
    }

    console.log('🔍 Environment variables check passed');
    console.log('🔍 KEYCLOAK_ISSUER:', process.env.KEYCLOAK_ISSUER);
    console.log('🔍 KEYCLOAK_ADMIN_CLIENT_ID:', process.env.KEYCLOAK_ADMIN_CLIENT_ID);

    // Get admin token from Keycloak
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get realm info
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Fetch user from Keycloak
    const userResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = await userResponse.json();

    // Get user roles
    let userRoles: string[] = [];
    try {
      const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (rolesResponse.ok) {
        const roles = await rolesResponse.json();
        const systemRoles = ['admin', 'default-roles-unipages', 'uma_authorization', 'offline_access'];
        userRoles = roles
          .map((role: any) => role.name)
          .filter((roleName: string) => !systemRoles.includes(roleName));
      }
    } catch (error) {
      console.error(`Error fetching roles for user ${userId}:`, error);
    }

         // Get profile and permission sets from the new user_permission_sets table
     let profile = null;
     let phone = null;
     let permissions: string[] = [];
     let extraPermissions: string[] = [];
     
     try {
       // Get database pool
       console.log('🔍 Attempting to connect to database...');
       const pool = await getPgPool();
       console.log('✅ Database connection successful');
       
       // Get profile and permission sets from the new user_permission_sets table
       const profileResult = await pool.query(
         'SELECT profile_id, phone FROM user_profiles WHERE user_id = $1',
         [userId]
       );
       
       if (profileResult.rows.length > 0) {
         const profileData = profileResult.rows[0];
         
         if (profileData.profile_id) {
           // Get profile name from profiles table
           const profileNameResult = await pool.query(
             'SELECT name FROM profiles WHERE id = $1',
             [profileData.profile_id]
           );
           
           if (profileNameResult.rows.length > 0) {
             profile = profileNameResult.rows[0].name;
             console.log('✅ Profile retrieved from database:', profile);
           }
         }
         
         // Get phone number
         if (profileData.phone) {
           phone = profileData.phone;
           console.log('✅ Phone number retrieved from database:', phone);
         }
         
         // Get all permission sets from the user's profile
         try {
           const permissionsResult = await pool.query(`
             SELECT 
               ps.name,
               ps.description,
               'profile' as source_type
             FROM profile_permission_sets pps
             JOIN permission_sets ps ON pps.permission_set_id = ps.id
             WHERE pps.profile_id = $1
             ORDER BY ps.name
           `, [profileData.profile_id]);
           
           if (permissionsResult.rows.length > 0) {
             permissions = permissionsResult.rows.map((row: any) => row.name);
             console.log('✅ Permission sets retrieved from profile:', permissions);
             console.log('Permission details:', permissionsResult.rows);
           } else {
             console.log('ℹ️ No permission sets found in profile');
           }
         } catch (error) {
           console.log('⚠️ profile_permission_sets table not found yet - using empty permissions');
           console.log('💡 Run the database schema setup to enable permission management');
         }

         // Get extra permission sets (directly assigned to user)
         let extraPermissions: string[] = [];
         try {
           const extraPermissionsResult = await pool.query(`
             SELECT 
               ps.name,
               ps.description,
               'direct' as source_type
             FROM user_permission_sets ups
             JOIN permission_sets ps ON ups.permission_set_id = ps.id
             WHERE ups.user_id = $1 AND ups.source_type = 'direct'
             ORDER BY ps.name
           `, [userId]);
           
           if (extraPermissionsResult.rows.length > 0) {
             extraPermissions = extraPermissionsResult.rows.map((row: any) => row.name);
             console.log('✅ Extra permission sets retrieved:', extraPermissions);
           } else {
             console.log('ℹ️ No extra permission sets found');
           }
         } catch (error) {
           console.log('⚠️ user_permission_sets table not found yet - using empty extra permissions');
         }
       } else {
         console.log('No profile data found in database for user:', userId);
       }
     } catch (error) {
       console.error('Error retrieving profile from database:', error);
     }

    const transformedUser = {
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phone: phone,
      roles: userRoles,
      profile: profile,
      permissions: permissions,
      extraPermissions: extraPermissions,
      enabled: user.enabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdTimestamp,
      lastLogin: user.lastLoginTimestamp,
    };

         return NextResponse.json(transformedUser);

   } catch (error) {
     console.error('Error fetching user:', error);
     return NextResponse.json(
       { error: 'Failed to fetch user' },
       { status: 500 }
     );
   }
 }

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== INDIVIDUAL USER DELETE ROUTE CALLED ===');
    
    const { id: userId } = await params;
    console.log('User ID to delete:', userId);

    // Check if required environment variables are set
    if (!process.env.KEYCLOAK_ISSUER) {
      console.error('❌ Missing environment variable: KEYCLOAK_ISSUER');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ISSUER not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_ID) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_ID');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_ID not set' },
        { status: 500 }
      );
    }

    if (!process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      console.error('❌ Missing environment variable: KEYCLOAK_ADMIN_CLIENT_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error: KEYCLOAK_ADMIN_CLIENT_SECRET not set' },
        { status: 500 }
      );
    }

    console.log('🔍 Environment variables check passed');

    // Get admin token from Keycloak
    const tokenResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token response not ok:', tokenResponse.status, tokenResponse.statusText);
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Admin token obtained successfully');

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    
    console.log('Realm info:', { realm, baseUrl });

    // Delete user from Keycloak
    const deleteUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!deleteUserResponse.ok) {
      console.error('Failed to delete user from Keycloak:', deleteUserResponse.status, deleteUserResponse.statusText);
      throw new Error('Failed to delete user from Keycloak');
    }

    console.log('✅ User deleted from Keycloak successfully');

    // Also remove user data from custom database tables if they exist
    let removedProfiles = 0;
    let removedRoles = 0;
    let removedPermissionSets = 0;
    
    try {
      console.log('🔍 Attempting to clean up user data from database...');
      const pool = await getPgPool();
      console.log('✅ Database connection successful');

      // Remove user profile
      const profileResult = await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
      removedProfiles = profileResult.rowCount || 0;
      console.log('✅ User profile removed from database');

      // Remove user roles
      const rolesResult = await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      removedRoles = rolesResult.rowCount || 0;
      console.log('✅ User roles removed from database');

      // Remove user permission sets
      const permissionSetsResult = await pool.query('DELETE FROM user_permission_sets WHERE user_id = $1', [userId]);
      removedPermissionSets = permissionSetsResult.rowCount || 0;
      console.log('✅ User permission sets removed from database');

    } catch (error) {
      console.log('⚠️ Could not clean up database data - this is not critical');
      console.log('⚠️ Error details:', error);
      // Don't throw error - user deletion from Keycloak is the main operation
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      userId: userId,
      removedProfiles,
      removedRoles,
      removedPermissionSets
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
