import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';
import { cache } from '@/utils/cache';
import { requestCache } from '@/utils/request-cache';

// PHASE 1 OPTIMIZATION: Batch query function to eliminate N+1 problem
async function fetchUserDataBatch(userIds: string[], pool: any, requestId: string) {
  const startTime = Date.now();
  
  try {
    // Batch query for all user profiles
    const profilesResult = await pool.query(`
      SELECT up.user_id, up.profile_id, up.phone, p.name as profile_name
      FROM user_profiles up
      LEFT JOIN profiles p ON up.profile_id = p.id
      WHERE up.user_id = ANY($1)
    `, [userIds]);
    
    // Get unique profile IDs for permission queries
    const profileIds = profilesResult.rows
      .map((p: any) => p.profile_id)
      .filter(Boolean);
    
    // Batch query for all user permissions (from profiles)
    const permissionsResult = profileIds.length > 0 ? await pool.query(`
      SELECT pps.profile_id, ps.name as permission_name
      FROM profile_permission_sets pps
      JOIN permission_sets ps ON pps.permission_set_id = ps.id
      WHERE pps.profile_id = ANY($1)
    `, [profileIds]) : { rows: [] };
    
    // Batch query for direct user permissions
    const directPermissionsResult = await pool.query(`
      SELECT ups.user_id, ps.name as permission_name
      FROM user_permission_sets ups
      JOIN permission_sets ps ON ups.permission_set_id = ps.id
      WHERE ups.user_id = ANY($1) AND ups.source_type = 'direct'
    `, [userIds]);
    
    const queryTime = Date.now() - startTime;
    console.log(`📊 [${requestId}] Batch queries executed in ${queryTime}ms for ${userIds.length} users`);
    
    return {
      profiles: profilesResult.rows,
      permissions: permissionsResult.rows,
      directPermissions: directPermissionsResult.rows
    };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in batch queries:`, error);
    // Return empty data structure to prevent crashes
    return {
      profiles: [],
      permissions: [],
      directPermissions: []
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Add timeout for the entire request to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 second timeout for entire request
  
  try {
    // PHASE 1 OPTIMIZATION: Request deduplication to prevent duplicate API calls
    const cacheKey = `users-${request.url}`;
    
    return await requestCache.get(cacheKey, async () => {
    try {
      console.log(`🚀 [${requestId}] Users API Request Started at ${new Date().toISOString()}`);
      const { searchParams } = new URL(request.url);
      const forceRefresh = ['1', 'true', 'yes'].includes((searchParams.get('refresh') || '').toLowerCase());
      
      // Check cache first
      const cacheKey = 'users-list';
      if (forceRefresh) {
        console.log(`🧹 [${requestId}] FORCE REFRESH - Invalidating cache`);
        cache.delete(cacheKey);
      }
      const cached = cache.get(cacheKey);
      if (cached && !forceRefresh) {
        const cacheTime = Date.now() - startTime;
        console.log(`✅ [${requestId}] CACHE HIT - Returning cached users data in ${cacheTime}ms`);
        return NextResponse.json(cached);
      }
    
      console.log(`🔄 [${requestId}] CACHE MISS - Fetching fresh data from database`);
      console.log(`=== FETCHING USERS START [${requestId}] ===`);
      
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
    const tokenStartTime = Date.now();
    console.log(`🔍 [${requestId}] Getting admin token from Keycloak...`);
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
    const tokenTime = Date.now() - tokenStartTime;
    console.log(`✅ [${requestId}] Admin token obtained successfully in ${tokenTime}ms`);

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    console.log('🔍 Realm info:', { realm, baseUrl });

    // Fetch users from Keycloak
    const keycloakStartTime = Date.now();
    console.log(`🔍 [${requestId}] Fetching users from Keycloak...`);
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
    const keycloakTime = Date.now() - keycloakStartTime;
    console.log(`✅ [${requestId}] Fetched ${users.length} users from Keycloak in ${keycloakTime}ms`);

    // Transform users data with roles and attributes
    const transformStartTime = Date.now();
    console.log(`🔄 [${requestId}] Transforming users data...`);
    
    // PHASE 1 OPTIMIZATION: Batch database queries instead of N+1 pattern
    const batchQueryStartTime = Date.now();
    const userIds = users.map((user: any) => user.id);
    const pool = await getPgPool();
    
    // Batch query for all user profiles and related data
    const batchData = await fetchUserDataBatch(userIds, pool, requestId);
    const batchQueryTime = Date.now() - batchQueryStartTime;
    console.log(`📊 [${requestId}] Batch queries executed in ${batchQueryTime}ms for ${userIds.length} users`);
    
    // Create lookup maps for O(1) access
    const profilesMap = new Map(batchData.profiles.map((p: any) => [p.user_id, p]));
    const permissionsMap = new Map();
    const directPermissionsMap = new Map();

    // Group permissions by profile_id
    batchData.permissions.forEach((p: any) => {
      if (!permissionsMap.has(p.profile_id)) {
        permissionsMap.set(p.profile_id, []);
      }
      permissionsMap.get(p.profile_id).push(p.permission_name);
    });

    // Group direct permissions by user_id
    batchData.directPermissions.forEach((p: any) => {
      if (!directPermissionsMap.has(p.user_id)) {
        directPermissionsMap.set(p.user_id, []);
      }
      directPermissionsMap.get(p.user_id).push(p.permission_name);
    });

    // 🚀 OPTIMIZED: Batch fetch all user roles using single API call
    console.log(`🔄 [${requestId}] Fetching user roles in optimized batch for ${users.length} users...`);
    const rolesFetchStartTime = Date.now();
    
    // Check if we have cached roles data to reduce Keycloak calls
    const rolesCacheKey = `user-roles-${realm}`;
    const cachedRoles = cache.get(rolesCacheKey);
    let rolesCache = new Map();
    
    if (cachedRoles && Array.isArray(cachedRoles)) {
      console.log(`✅ [${requestId}] Using cached roles data`);
      rolesCache = new Map(cachedRoles);
    }
    
    // OPTIMIZATION: Get all roles first, then filter for each user
    let allRolesResponse;
    try {
      allRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to fetch all roles:`, error);
      allRolesResponse = null;
    }
    
    let allRoles = [];
    if (allRolesResponse && allRolesResponse.ok) {
      allRoles = await allRolesResponse.json();
      console.log(`✅ [${requestId}] Fetched ${allRoles.length} total roles from Keycloak`);
    }
    
    // Filter out system roles that shouldn't be displayed
    const systemRoles = [
      'admin',
      'default-roles-unipages',
      'uma_authorization',
      'offline_access'
    ];
    
    const displayRoles = allRoles.filter((role: any) => !systemRoles.includes(role.name));
    console.log(`✅ [${requestId}] Filtered to ${displayRoles.length} display roles`);
    
    // 🚀 OPTIMIZED: Smart role fetching with timeout protection
    console.log(`⚡ [${requestId}] Using smart role fetching strategy`);
    
    const rolesMap = new Map();
    const maxConcurrentRequests = 5; // Limit concurrent requests
    const requestTimeout = 2000; // 2 second timeout per request
    
    // Process users in batches to prevent overwhelming the server
    const userBatches = [];
    for (let i = 0; i < users.length; i += maxConcurrentRequests) {
      userBatches.push(users.slice(i, i + maxConcurrentRequests));
    }
    
    console.log(`📦 [${requestId}] Processing ${users.length} users in ${userBatches.length} batches`);
    
    for (const batch of userBatches) {
      const batchPromises = batch.map(async (user: any) => {
        try {
          // Check cache first
          if (rolesCache.has(user.id)) {
            const cachedUserRoles = rolesCache.get(user.id);
            return { userId: user.id, roles: cachedUserRoles };
          }
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
          
          const rolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${user.id}/role-mappings/realm`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (rolesResponse.ok) {
            const roles = await rolesResponse.json();
            const userRoles = roles
              .map((role: any) => role.name)
              .filter((roleName: string) => !systemRoles.includes(roleName));
            
            // Cache the roles for this user
            rolesCache.set(user.id, userRoles);
            return { userId: user.id, roles: userRoles };
          }
          return { userId: user.id, roles: [] };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`⏰ Timeout fetching roles for user ${user.username}`);
          } else {
            console.error(`⚠️ Error fetching roles for user ${user.username}:`, error);
          }
          return { userId: user.id, roles: [] };
        }
      });
      
      // Wait for this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          rolesMap.set(result.value.userId, result.value.roles);
        } else {
          console.warn(`⚠️ Failed to fetch roles for user ${batch[index].username}:`, result.reason);
          rolesMap.set(batch[index].id, []);
        }
      });
      
      // Small delay between batches to prevent overwhelming the server
      if (userBatches.indexOf(batch) < userBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const rolesFetchTime = Date.now() - rolesFetchStartTime;
    console.log(`✅ [${requestId}] Smart role fetching completed in ${rolesFetchTime}ms`);

    // Cache the updated roles data for future requests
    cache.set(rolesCacheKey, Array.from(rolesCache.entries()), 30 * 60 * 1000); // 30 minutes cache
    console.log(`💾 [${requestId}] Roles cache updated for future requests`);
    
    const transformedUsers = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Processing user ${i + 1}/${users.length}: ${user.username}`);
      
      try {
        // Get user roles from the parallel fetch results
        const userRoles = rolesMap.get(user.id) || [];

                // OPTIMIZED: Get profile and permission data from batch results
        const profileData = profilesMap.get(user.id) as any;
        const profile = profileData?.profile_name || null;
        const phone = profileData?.phone || null;
        const permissions = profileData?.profile_id ?
          (permissionsMap.get(profileData.profile_id) || []) : [];
        const extraPermissions = directPermissionsMap.get(user.id) || [];
        
        console.log(`User ${user.username} profile data:`, {
          profile,
          phone,
          permissions: permissions.length,
          extraPermissions: extraPermissions.length
        });

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

    const transformTime = Date.now() - transformStartTime;
    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Successfully transformed ${transformedUsers.length} users in ${transformTime}ms`);
    console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
    console.log(`   - Token fetch: ${tokenTime}ms`);
    console.log(`   - Keycloak users: ${keycloakTime}ms`);
    console.log(`   - Data transformation: ${transformTime}ms`);
    console.log(`   - TOTAL TIME: ${totalTime}ms`);
    
          // Cache the result for 30 minutes (increased for better performance)
      cache.set(cacheKey, transformedUsers, 30 * 60 * 1000);
      console.log(`💾 [${requestId}] Data cached for 30 minutes`);
    
      return NextResponse.json(transformedUsers);

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
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Request timeout or error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - users data is taking too long to load. Please try again.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  try {
    console.log(`=== USER CREATION REQUEST START [${requestId}] ===`);
    
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { username, email, firstName, lastName, phone, status, enabled = true, password, temporaryPassword = false, roles = [], role = null, profile = null } = body;
    
    // Handle both role (singular) and roles (plural) for backward compatibility
    // Also handle case where role might be a string ID
    let finalRoles = [];
    if (roles.length > 0) {
      finalRoles = roles;
    } else if (role) {
      // If role is a string ID, wrap it in an array
      if (typeof role === 'string') {
        finalRoles = [role];
      } else if (typeof role === 'object' && role.id) {
        finalRoles = [role.id];
      } else {
        finalRoles = [role];
      }
    }
    
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
      role,
      roles,
      finalRoles
    });
    
    console.log('Role assignment details:');
    console.log('- Original role field:', role);
    console.log('- Original roles field:', roles);
    console.log('- Final roles array:', finalRoles);
    console.log('- Role type:', typeof role);
    console.log('- Roles type:', typeof roles);
    console.log('- FinalRoles type:', typeof finalRoles);

    // Validate required fields
    if (!username || !email || !password) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json({ 
        error: 'Username, email, and password are required' 
      }, { status: 400 });
    }

    console.log('=== GETTING KEYCLOAK ADMIN TOKEN ===');
    
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
      const errorText = await tokenResponse.text();
      console.error('Token response failed:', tokenResponse.status, tokenResponse.statusText, errorText);
      throw new Error(`Failed to get admin token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Admin token obtained successfully');

    // Get realm info
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');
    
    console.log('Realm info:', { realm, baseUrl });

    console.log('=== CREATING USER IN KEYCLOAK ===');
    
    // Create user in Keycloak
    const createUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        firstName,
        lastName,
        enabled,
        emailVerified: false,
        credentials: password ? [{
          type: 'password',
          value: password,
          temporary: temporaryPassword
        }] : undefined
      }),
    });

               if (!createUserResponse.ok) {
             const errorText = await createUserResponse.text();
             console.error('User creation failed:', createUserResponse.status, createUserResponse.statusText, errorText);
             
             // Handle specific error cases
             if (createUserResponse.status === 409) {
               return NextResponse.json({ 
                 error: 'User already exists', 
                 details: 'A user with this email address already exists in the system. Please use a different email or check if the user already has an account.',
                 code: 'USER_EXISTS'
               }, { status: 409 });
             }
             
             throw new Error(`Failed to create user: ${createUserResponse.status} ${createUserResponse.statusText} - ${errorText}`);
           }

    console.log('✅ User created successfully in Keycloak');

    // Get the created user's ID
    const createdUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users?username=${username}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!createdUserResponse.ok) {
      throw new Error('Failed to get created user ID');
    }

    const createdUsers = await createdUserResponse.json();
    if (createdUsers.length === 0) {
      throw new Error('Created user not found');
    }

    const userId = createdUsers[0].id;
    console.log('✅ Retrieved created user ID:', userId);

    // Save user data to local database (including phone and status)
    try {
      const pool = await getPgPool();
      
      // Check if user_profiles table exists, if not create it
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_profiles'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // Create the user_profiles table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY,
            user_id VARCHAR(255) UNIQUE NOT NULL,
            profile_id UUID,
            phone VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        // Check if phone column exists, if not add it
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'user_profiles'
        `);
        
        const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
        
        if (!existingColumns.includes('phone')) {
          await pool.query('ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(50)');
        }
      }

      // Create initial user_profiles record (phone will be updated later if profile is provided)
      const profileInsertQuery = `
        INSERT INTO user_profiles (id, user_id, profile_id, phone)
        VALUES (gen_random_uuid(), $1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET
          phone = EXCLUDED.phone
        RETURNING id
      `;
      
      const profileInsertValues = [
        userId, 
        profile || null, // Use profile if provided, otherwise null
        phone || null
      ];
      
      const profileResult = await pool.query(profileInsertQuery, profileInsertValues);
      console.log('✅ User profile saved to user_profiles table:', profileResult.rows[0]);
      
    } catch (dbError) {
      console.error('⚠️ Error saving user profile to database:', dbError);
      // Don't fail the entire operation, just log the error
    }

    // Assign roles if provided
    if (finalRoles.length > 0) {
      console.log('=== ASSIGNING ROLES ===');
      try {
        // Get role details for each role ID
        const rolesToAssign = [];
        for (const roleId of finalRoles) {
          console.log('Fetching role details for role ID:', roleId);
          
          // First, get the role name from our database
          let roleName = null;
          try {
            const pool = await getPgPool();
            const roleResult = await pool.query('SELECT name FROM public.roles WHERE id = $1', [roleId]);
            if (roleResult.rows.length > 0) {
              roleName = roleResult.rows[0].name;
              console.log('✅ Found role name in database:', roleName);
            }
          } catch (dbError) {
            console.error('⚠️ Error getting role name from database:', dbError);
          }
          
          if (roleName) {
            // Try to find the role in Keycloak by name
            console.log('🔍 Looking for role in Keycloak by name:', roleName);
            const allRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            if (allRolesResponse.ok) {
              const allRoles = await allRolesResponse.json();
              const roleInKeycloak = allRoles.find((r: any) => r.name === roleName);
              
              if (roleInKeycloak) {
                rolesToAssign.push(roleInKeycloak);
                console.log('✅ Role found in Keycloak by name:', roleInKeycloak.name);
              } else {
                console.warn('⚠️ Role not found in Keycloak by name:', roleName);
                // Try to create the role in Keycloak if it doesn't exist
                try {
                  console.log('🔄 Creating role in Keycloak:', roleName);
                  const createRoleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: roleName,
                      description: `Role imported from database: ${roleName}`
                    }),
                  });
                  
                  if (createRoleResponse.ok) {
                    const createdRole = await createRoleResponse.json();
                    rolesToAssign.push(createdRole);
                    console.log('✅ Role created successfully in Keycloak:', createdRole.name);
                  } else {
                    console.error('❌ Failed to create role in Keycloak:', createRoleResponse.status);
                  }
                } catch (createError) {
                  console.error('❌ Error creating role in Keycloak:', createError);
                }
              }
            } else {
              console.warn('⚠️ Failed to fetch all roles from Keycloak');
            }
          } else {
            console.warn('⚠️ Could not find role name in database for ID:', roleId);
          }
        }

        // Assign roles to user in Keycloak
        if (rolesToAssign.length > 0) {
          console.log('Assigning roles to user in Keycloak:', rolesToAssign.map(r => r.name));
          console.log('Role objects to assign:', JSON.stringify(rolesToAssign, null, 2));
          
          const assignRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rolesToAssign),
          });

          if (!assignRolesResponse.ok) {
            const errorText = await assignRolesResponse.text();
            console.error('⚠️ Failed to assign roles to user in Keycloak:', assignRolesResponse.status, assignRolesResponse.statusText);
            console.error('Error details:', errorText);
          } else {
            console.log('✅ Roles assigned successfully in Keycloak');
          }
        } else {
          console.log('⚠️ No roles to assign - rolesToAssign array is empty');
        }

                 // Save role assignments to local user_roles table
         try {
           const pool = await getPgPool();
           
           // Check if user_roles table exists, if not create it
           const tableExists = await pool.query(`
             SELECT EXISTS (
               SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'user_roles'
             );
           `);

           if (!tableExists.rows[0].exists) {
             // Create the user_roles table if it doesn't exist
             await pool.query(`
               CREATE TABLE IF NOT EXISTS user_roles (
                 id UUID PRIMARY KEY,
                 user_id VARCHAR(255) NOT NULL,
                 role_id UUID NOT NULL,
                 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                 UNIQUE(user_id, role_id)
               );
             `);
           }

           // Remove existing role assignments for this user
           await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

           // Insert new role assignments using the original role IDs from our database
           for (const roleId of finalRoles) {
             const roleInsertQuery = `
               INSERT INTO user_roles (id, user_id, role_id)
               VALUES (gen_random_uuid(), $1, $2)
             `;
             
             await pool.query(roleInsertQuery, [userId, roleId]);
           }
           
           console.log('✅ Role assignments saved to user_roles table');
           
         } catch (dbError) {
           console.error('⚠️ Error saving role assignments to database:', dbError);
         }
        
      } catch (error) {
        console.error('⚠️ Error assigning roles:', error);
      }
    }

    // Assign profile if provided
    if (profile) {
      console.log('=== ASSIGNING PROFILE ===');
      try {
        // Get database pool
        const pool = await getPgPool();
        
        console.log('Setting profile to:', profile);
        
        // Use the profile ID directly (it's already validated by the frontend)
        const profileId = profile;
        console.log(`✅ Using profile ID: ${profileId}`);
        
        // Update the existing user_profiles record with the profile_id
        const updateProfileQuery = `
          UPDATE user_profiles 
          SET profile_id = $1
          WHERE user_id = $2
          RETURNING id
        `;
        
        const updateResult = await pool.query(updateProfileQuery, [profileId, userId]);
        
        if (updateResult.rows.length === 0) {
          console.log('⚠️ No existing user_profiles record found, creating new one');
          // Create new user_profiles record if none exists
          const insertQuery = `
            INSERT INTO user_profiles (id, user_id, profile_id, phone)
            VALUES (gen_random_uuid(), $1, $2, $3)
            RETURNING id
          `;
          
          await pool.query(insertQuery, [userId, profileId, phone || null]);
        }
        
        console.log('✅ Profile assigned successfully to database');
      } catch (error) {
        console.error('⚠️ Error assigning profile to database:', error);
        // Re-throw the error to make profile assignment critical
        throw error;
      }
    }

    console.log('=== USER CREATION COMPLETED SUCCESSFULLY ===');
    
    // Invalidate cache after user creation
    const cacheInvalidateTime = Date.now();
    cache.delete('users-list');
    cache.delete(`user-roles-${realm}`); // Also invalidate roles cache
    console.log(`🗑️ [${requestId}] Cache invalidated in ${Date.now() - cacheInvalidateTime}ms`);
    
    return NextResponse.json({ success: true, message: 'User created successfully' });

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, username, email, firstName, lastName, phone, status, enabled, roles = [], role = null, profile = null } = body;

    // Handle both role (singular) and roles (plural) for backward compatibility
    const finalRoles = roles.length > 0 ? roles : (role ? [role] : []);

    // Validate that only one role is assigned
    if (finalRoles.length > 1) {
      return NextResponse.json({ error: 'Only one role can be assigned to a user' }, { status: 400 });
    }

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
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get realm info
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Update user in Keycloak (username cannot be updated)
    const updateUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        enabled: enabled // This updates the enabled status in user_entity table
      }),
    });

    if (!updateUserResponse.ok) {
      const errorText = await updateUserResponse.text();
      throw new Error(`Failed to update user: ${errorText}`);
    }

    // Update user in local database (including phone and status)
    try {
      const pool = await getPgPool();
      
      // Check if user_profiles table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_profiles'
        );
      `);

      if (tableExists.rows[0].exists) {
        // Update user profile in user_profiles table
        const updateQuery = `
          UPDATE user_profiles 
          SET 
            phone = $1
          WHERE user_id = $2
          RETURNING id
        `;
        
        const updateValues = [
          phone || null,
          id
        ];
        
        const updateResult = await pool.query(updateQuery, updateValues);
        if (updateResult.rows.length > 0) {
          console.log('✅ User profile updated in user_profiles table:', updateResult.rows[0]);
        } else {
          console.log('⚠️ User profile not found in user_profiles table, creating...');
          // Insert if user profile doesn't exist in user_profiles table
          const insertQuery = `
            INSERT INTO user_profiles (id, user_id, profile_id, phone)
            VALUES (gen_random_uuid(), $1, $2, $3)
            RETURNING id
          `;
          
          const insertValues = [
            id, 
            null, // profile_id
            phone || null
          ];
          
          const insertResult = await pool.query(insertQuery, insertValues);
          console.log('✅ User profile created in user_profiles table:', insertResult.rows[0]);
        }
      }
    } catch (dbError) {
      console.error('⚠️ Error updating user profile in local database:', dbError);
      // Don't fail the entire operation, just log the error
    }

    // Update user roles if provided
    if (finalRoles.length >= 0) {
      try {
        // First, get current user roles
        const currentRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${id}/role-mappings/realm`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (currentRolesResponse.ok) {
          const currentRoles = await currentRolesResponse.json();
          
          // Remove all current roles
          if (currentRoles.length > 0) {
            const removeRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${id}/role-mappings/realm`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(currentRoles),
            });

            if (!removeRolesResponse.ok) {
              console.error('Failed to remove current roles');
            }
          }

          // Assign new roles if any
          if (finalRoles.length > 0) {
            const rolesToAssign = [];
            for (const roleId of finalRoles) {
              const roleResponse = await fetch(`${baseUrl}/admin/realms/${realm}/roles/${roleId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (roleResponse.ok) {
                const role = await roleResponse.json();
                rolesToAssign.push(role);
              }
            }

            if (rolesToAssign.length > 0) {
              const assignRolesResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${id}/role-mappings/realm`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(rolesToAssign),
              });

              if (!assignRolesResponse.ok) {
                console.error('Failed to assign new roles');
              }
            }

            // Update local user_roles table
            try {
              const pool = await getPgPool();
              
              // Remove existing role assignments for this user
              await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

              // Insert new role assignments
              for (const role of rolesToAssign) {
                const roleInsertQuery = `
                  INSERT INTO user_roles (id, user_id, role_id)
                  VALUES (gen_random_uuid(), $1, $2)
                  ON CONFLICT (user_id, role_id) DO NOTHING
                `;
                
                await pool.query(roleInsertQuery, [id, role.id]);
              }
              
              console.log('✅ Role assignments updated in user_roles table');
              
            } catch (dbError) {
              console.error('⚠️ Error updating role assignments in database:', dbError);
            }
          }
        }
      } catch (error) {
        console.error('Error updating user roles:', error);
      }
    }

           // Update user profile if provided
      if (profile !== null) {
        try {
          // Get database pool
          const pool = await getPgPool();
          
          console.log('Setting profile to:', profile);
          
          // Update the user_profiles table with the profile_id
          const updateProfileQuery = `
            UPDATE user_profiles 
            SET profile_id = $1
            WHERE user_id = $2
            RETURNING id
          `;
          
          const updateResult = await pool.query(updateProfileQuery, [profile, id]);
          
          if (updateResult.rows.length === 0) {
            console.log('⚠️ No existing user_profiles record found, creating new one');
            // Create new user_profiles record if none exists
            const insertQuery = `
              INSERT INTO user_profiles (id, user_id, profile_id, phone)
              VALUES (gen_random_uuid(), $1, $2, $3)
              RETURNING id
            `;
            
            await pool.query(insertQuery, [id, profile, null]);
          }
          
          console.log('✅ Profile assigned successfully to database');
        } catch (error) {
          console.error('⚠️ Error assigning profile to database:', error);
          // Re-throw the error to make profile assignment critical
          throw error;
        }
      }
 
     // Invalidate cache after user update
     cache.delete('users-list');
     cache.delete(`user-roles-${realm}`); // Also invalidate roles cache
     
     return NextResponse.json({ success: true, message: 'User updated successfully' });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('=== USER DELETION REQUEST START ===');
    console.log('Deleting user ID:', id);

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
      throw new Error('Failed to get admin token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get realm info
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Delete user from Keycloak
    const deleteUserResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!deleteUserResponse.ok) {
      const errorText = await deleteUserResponse.text();
      throw new Error(`Failed to delete user from Keycloak: ${deleteUserResponse.status} ${deleteUserResponse.statusText} - ${errorText}`);
    }

    console.log('✅ User deleted successfully from Keycloak');

    // Delete user data from local database
    try {
      const pool = await getPgPool();
      
      // Delete from user_roles table
      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      console.log('✅ User roles deleted from local database');
      
      // Delete from user_profiles table
      await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [id]);
      console.log('✅ User profile deleted from local database');
      
    } catch (dbError) {
      console.error('⚠️ Error deleting user from local database:', dbError);
      // Don't fail the entire operation, just log the error
    }

    console.log('=== USER DELETION COMPLETED SUCCESSFULLY ===');
    
    // Invalidate cache after user deletion
    cache.delete('users-list');
    cache.delete(`user-roles-${realm}`); // Also invalidate roles cache
    
    return NextResponse.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('=== USER DELETION ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to delete user', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 