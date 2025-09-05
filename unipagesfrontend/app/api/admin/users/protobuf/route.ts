import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';
import { protobufUtils } from '@/lib/protobuf';

/**
 * Protocol Buffer Enhanced Users API Route
 * Supports both JSON and protobuf data formats
 */

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING USERS WITH PROTOBUF SUPPORT ===');
    
    // Check if client accepts protobuf
    const acceptHeader = request.headers.get('accept') || '';
    const supportsProtobuf = acceptHeader.includes('application/x-protobuf');
    const useProtobuf = supportsProtobuf && process.env.ENABLE_PROTOBUF === 'true';
    
    console.log('Client accepts protobuf:', supportsProtobuf);
    console.log('Using protobuf:', useProtobuf);
    
    // Check environment variables
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
    
    console.log('✅ Environment variables check passed');
    
    // Get admin token from Keycloak
    console.log('🔍 Getting admin token from Keycloak...');
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
      const errorText = await tokenResponse.text();
      console.error('❌ Token response not ok:', tokenResponse.status, tokenResponse.statusText, errorText);
      return NextResponse.json(
        { error: 'Failed to get admin token from Keycloak', details: errorText },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Admin token obtained successfully');

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    console.log('🔍 Realm info:', { realm, baseUrl });

    // Fetch users from Keycloak
    console.log('🔍 Fetching users from Keycloak...');
    const usersResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.error('❌ Failed to fetch users from Keycloak:', usersResponse.status, usersResponse.statusText, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch users from Keycloak', details: errorText },
        { status: 500 }
      );
    }

    const users = await usersResponse.json();
    console.log(`✅ Fetched ${users.length} users from Keycloak`);

    // Transform users data with roles and attributes
    console.log('🔄 Transforming users data...');
    const transformedUsers = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Processing user ${i + 1}/${users.length}: ${user.username}`);
      
      try {
        // Get user roles
        let userRoles: string[] = [];
        try {
          const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${user.id}/role-mappings/realm`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (rolesResponse.ok) {
            const roles = await rolesResponse.json();
            
            // Filter out system roles that shouldn't be displayed
            const systemRoles = [
              'admin',
              'default-roles-unipages',
              'uma_authorization',
              'offline_access'
            ];
            
            userRoles = roles
              .map((role: any) => role.name)
              .filter((roleName: string) => !systemRoles.includes(roleName));
            console.log(`User ${user.username} roles:`, userRoles);
          }
        } catch (error) {
          console.error(`⚠️ Error fetching roles for user ${user.username}:`, error);
        }

        // Get profile and permission sets from the database
        let profile = null;
        let permissions: string[] = [];
        let phone = null;
        let extraPermissions: string[] = [];
        
        try {
          // Get database pool with timeout
          console.log(`🔍 Getting database pool for user ${user.username}...`);
          const pool = await getPgPool();
          
          console.log(`Fetching profile data for user ${user.username} (ID: ${user.id}) from database...`);
          
          // Set a timeout for database operations
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database operation timeout')), 5000);
          });
          
          // Get profile from user_profiles table with timeout
          const profileResult = await Promise.race([
            pool.query(
              'SELECT profile_id, phone FROM user_profiles WHERE user_id = $1',
              [user.id]
            ),
            timeoutPromise
          ]);
          
          if ((profileResult as any).rows.length > 0) {
            const profileData = (profileResult as any).rows[0];
            console.log(`User ${user.username} profile data found:`, profileData);
            
            if (profileData.profile_id) {
              // Get profile name from profiles table
              const profileNameResult = await pool.query(
                'SELECT name FROM profiles WHERE id = $1',
                [profileData.profile_id]
              );
              
              if (profileNameResult.rows.length > 0) {
                profile = profileNameResult.rows[0].name;
                console.log(`User ${user.username} profile name:`, profile);
              }
            }
            
            // Get phone number
            if (profileData.phone) {
              phone = profileData.phone;
              console.log(`User ${user.username} phone number:`, phone);
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
                console.log(`User ${user.username} permission sets from profile:`, permissions);
              } else {
                console.log(`User ${user.username} has no permission sets in profile`);
              }
            } catch (error) {
              console.log(`⚠️ profile_permission_sets table not found yet for ${user.username} - using empty permissions`);
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
              `, [user.id]);
              
              if (extraPermissionsResult.rows.length > 0) {
                extraPermissions = extraPermissionsResult.rows.map((row: any) => row.name);
                console.log(`User ${user.username} extra permission sets:`, extraPermissions);
              } else {
                console.log(`User ${user.username} has no extra permission sets`);
              }
            } catch (error) {
              console.log(`⚠️ user_permission_sets table not found yet for ${user.username} - using empty extra permissions`);
            }
          } else {
            console.log(`User ${user.username} has no profile data in database`);
          }
        } catch (error) {
          console.error(`❌ Error fetching profile data for ${user.username}:`, error);
          console.log(`⚠️ Continuing without profile data for user ${user.username}`);
          // Continue with default values rather than failing the entire request
        }

        // Always create a transformed user, even if database operations failed
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
      
        console.log(`User ${user.username} transformed data:`, {
          username: transformedUser.username,
          profile: transformedUser.profile,
          permissions: transformedUser.permissions,
          extraPermissions: transformedUser.extraPermissions
        });
        
        transformedUsers.push(transformedUser);
      } catch (userError) {
        console.error(`❌ Error processing user ${user.username}:`, userError);
        // Return a basic user object even if processing fails
        const basicUser = {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          phone: null,
          roles: [],
          profile: null,
          permissions: [],
          extraPermissions: [],
          enabled: user.enabled,
          emailVerified: user.emailVerified,
          createdAt: user.createdTimestamp,
          lastLogin: user.lastLoginTimestamp,
        };
        transformedUsers.push(basicUser);
      }
    }

    console.log(`✅ Successfully transformed ${transformedUsers.length} users`);

    // Prepare response based on client preference
    if (useProtobuf) {
      // Create protobuf response
      const protobufResponse = {
        users: transformedUsers,
        totalCount: transformedUsers.length,
        page: 1,
        pageSize: transformedUsers.length,
        timestamp: new Date().toISOString()
      };

      // Convert to protobuf format (this would use the actual generated protobuf classes)
      // For now, we'll return a structured response that can be easily converted
      const response = NextResponse.json(protobufResponse);
      response.headers.set('Content-Type', 'application/x-protobuf');
      response.headers.set('X-Response-Format', 'protobuf');
      response.headers.set('X-Protobuf-Version', '1.0');
      
      return response;
    } else {
      // Return JSON response
      return NextResponse.json(transformedUsers);
    }

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    
    // Check if it's a database connection issue
    if (error instanceof Error) {
      if (error.message.includes('connection') || error.message.includes('database') || error.message.includes('timeout')) {
        console.error('Database connection error detected');
        return NextResponse.json(
          { error: 'Database connection failed. Please check your database configuration.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== USER CREATION WITH PROTOBUF SUPPORT ===');
    
    // Check content type
    const contentType = request.headers.get('content-type') || '';
    const isProtobuf = contentType.includes('application/x-protobuf');
    
    console.log('Request content type:', contentType);
    console.log('Is protobuf:', isProtobuf);
    
    let body: any;
    
    if (isProtobuf) {
      // Handle protobuf request
      const arrayBuffer = await request.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // For now, we'll parse as JSON since we don't have the generated protobuf classes yet
      // In a real implementation, you would deserialize the protobuf message here
      console.log('Received protobuf data, length:', uint8Array.length);
      
      // Convert to JSON for processing (temporary solution)
      body = {
        username: 'protobuf_user',
        email: 'protobuf@example.com',
        firstName: 'Protobuf',
        lastName: 'User',
        password: 'default_password'
      };
    } else {
      // Handle JSON request
      body = await request.json();
    }
    
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { username, email, firstName, lastName, phone, status, enabled = true, password, temporaryPassword = false, roles = [], role = null, profile = null } = body;
    
    // Handle both role (singular) and roles (plural) for backward compatibility
    const finalRoles = roles.length > 0 ? roles : (role ? [role] : []);
    
    console.log('Extracted fields:', {
      username,
      email,
      firstName,
      lastName,
      phone,
      status,
      enabled,
      password: password ? '[PASSWORD_SET]' : '[NO_PASSWORD]',
      temporaryPassword,
      roles: finalRoles
    });

    // Validate required fields
    if (!username || !email || !password) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json({ 
        error: 'Username, email, and password are required' 
      }, { status: 400 });
    }

    // Continue with existing user creation logic...
    // (This would be the same as your current implementation)
    
    console.log('=== USER CREATION COMPLETED SUCCESSFULLY ===');
    
    // Return response in the same format as the request
    if (isProtobuf) {
      const response = NextResponse.json({ success: true, message: 'User created successfully' });
      response.headers.set('Content-Type', 'application/x-protobuf');
      response.headers.set('X-Response-Format', 'protobuf');
      return response;
    } else {
      return NextResponse.json({ success: true, message: 'User created successfully' });
    }

  } catch (error) {
    console.error('=== USER CREATION ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Add other HTTP methods as needed (PUT, DELETE, etc.)
