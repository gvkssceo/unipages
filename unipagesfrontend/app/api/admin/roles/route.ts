import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/utils/cache';
import { getPgPool } from '@/utils/db';
import { randomUUID } from 'crypto';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

const SYSTEM_ROLES = new Set([
  'admin',
]);

// Get all roles
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`🚀 [${requestId}] Roles API Request Started at ${new Date().toISOString()}`);
    const { searchParams } = new URL(request.url);
    const forceRefresh = ['1', 'true', 'yes'].includes((searchParams.get('refresh') || '').toLowerCase());
    
    // Check cache first
    const cacheKey = 'roles-list';
    if (forceRefresh) {
      console.log(`🧹 [${requestId}] FORCE REFRESH - Invalidating roles cache`);
      cache.delete(cacheKey);
    }
    const cached = cache.get(cacheKey);
    if (cached && !forceRefresh) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] CACHE HIT - Returning cached roles data in ${cacheTime}ms`);
      return NextResponse.json(cached);
    }
    
    console.log(`🔄 [${requestId}] CACHE MISS - Fetching fresh data from database`);
    const dbStartTime = Date.now();
    const pool = await getPgPool();
    
    // Test basic database connection first
    const testResult = await pool.query('SELECT NOW() as current_time');
    const dbConnectTime = Date.now() - dbStartTime;
    console.log(`🔗 [${requestId}] Database connection established in ${dbConnectTime}ms`);
    
    // First, let's check what columns actually exist in the roles table
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'roles'
      ORDER BY ordinal_position
    `);
    
    // Build a dynamic query based on available columns
    let selectColumns = ['r.id', 'r.name', 'r.description'];
    let hasCreatedAt = false;
    let hasUpdatedAt = false;
    
    tableInfo.rows.forEach((col: any) => {
      if (col.column_name === 'created_at') hasCreatedAt = true;
      if (col.column_name === 'updated_at') hasUpdatedAt = true;
    });
    
    if (hasCreatedAt) selectColumns.push('r.created_at as "createdAt"');
    if (hasUpdatedAt) selectColumns.push('r.updated_at as "updatedAt"');
    
    const selectClause = selectColumns.join(', ');
    
    // Get all roles from the database
    const rolesQueryStartTime = Date.now();
    const rolesResult = await pool.query(`
      SELECT ${selectClause}
      FROM public.roles r
      ORDER BY r.name
    `);
    const rolesQueryTime = Date.now() - rolesQueryStartTime;
    console.log(`📊 [${requestId}] Roles query executed in ${rolesQueryTime}ms, found ${rolesResult.rows.length} roles`);

    // Get user counts for all roles in a single batch query
    const userCountStartTime = Date.now();
    console.log(`🔍 [${requestId}] Fetching user counts for all roles in batch...`);
    
    const rolesWithUserCounts: any[] = [];
    
    try {
      // Use a single query to get user counts for all roles at once
      const userCountsResult = await pool.query(`
        SELECT 
          ur.role_id,
          COUNT(*) as user_count
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        WHERE u.enabled = true
        GROUP BY ur.role_id
      `);
      
      // Create a map of role_id to user_count for quick lookup
      const userCountMap = new Map();
      userCountsResult.rows.forEach((row: any) => {
        userCountMap.set(row.role_id, parseInt(row.user_count || '0'));
      });
      
      // Add user counts to roles
      rolesResult.rows.forEach((role: any) => {
        const userCount = userCountMap.get(role.id) || 0;
        rolesWithUserCounts.push({
          ...role,
          userCount
        });
      });
      
      const userCountTime = Date.now() - userCountStartTime;
      console.log(`✅ [${requestId}] User counts fetched for ${rolesResult.rows.length} roles in ${userCountTime}ms`);
      
    } catch (error) {
      console.error(`❌ [${requestId}] Error fetching user counts:`, error);
      // Fallback: add roles without user counts
      rolesResult.rows.forEach((role: any) => {
        rolesWithUserCounts.push({
          ...role,
          userCount: 0
        });
      });
    }

    const totalTime = Date.now() - startTime;
    const userCountTime = Date.now() - userCountStartTime;
    console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
    console.log(`   - Database connection: ${dbConnectTime}ms`);
    console.log(`   - Roles query: ${rolesQueryTime}ms`);
    console.log(`   - User count batch query: ${userCountTime}ms`);
    console.log(`   - TOTAL TIME: ${totalTime}ms`);
    
    // Cache the result for 10 minutes
    cache.set(cacheKey, rolesWithUserCounts, 10 * 60 * 1000);
    console.log(`💾 [${requestId}] Data cached for 10 minutes`);
    
    return NextResponse.json(rolesWithUserCounts);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// Create a new role
export async function POST(request: NextRequest) {
  try {
    const { name, description, phoneNumber, status, profileId } = await request.json();
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name must be a non-empty string' },
        { status: 400 }
      );
    }

    // Step 1: Create role in Keycloak first
    let keycloakRoleId = null;
    try {
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
        throw new Error(`Failed to get Keycloak admin token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Extract realm name from issuer URL
      const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
      const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
      const realm = realmMatch ? realmMatch[1] : 'unipages';
      const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

      // Create role in Keycloak
      const createRoleResponse = await fetch(
        `${baseUrl}/admin/realms/${realm}/roles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description?.trim() || '',
            composite: false,
            clientRole: false
          }),
        }
      );

      if (!createRoleResponse.ok) {
        const errorData = await createRoleResponse.text();
        
        // Check if role already exists (409 Conflict)
        if (createRoleResponse.status === 409) {
          // Role already exists, try to get it and update it
          try {
            const getRoleResponse = await fetch(
              `${baseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(name.trim())}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (getRoleResponse.ok) {
              const existingRole = await getRoleResponse.json();
              keycloakRoleId = existingRole.id;
              
              // Update the existing role description if different
              if (existingRole.description !== (description?.trim() || '')) {
                const updateResponse = await fetch(
                  `${baseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(name.trim())}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      ...existingRole,
                      description: description?.trim() || ''
                    }),
                  }
                );
                
                if (!updateResponse.ok) {
                  console.warn('Failed to update existing role description in Keycloak');
                }
              }
            } else {
              throw new Error('Failed to get existing role from Keycloak');
            }
          } catch (getError) {
            throw new Error(`Role already exists but failed to retrieve: ${getError instanceof Error ? getError.message : 'Unknown error'}`);
          }
        } else {
          // Other error
          throw new Error(`Failed to create role in Keycloak: ${createRoleResponse.status} - ${errorData}`);
        }
      } else {
        // Role was created successfully, get its ID
        try {
          const getRoleResponse = await fetch(
            `${baseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(name.trim())}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (getRoleResponse.ok) {
            const roleData = await getRoleResponse.json();
            keycloakRoleId = roleData.id;
          }
        } catch (getError) {
          console.warn('Failed to get newly created role ID from Keycloak');
        }
      }

    } catch (keycloakError) {
      console.error('Keycloak role creation failed:', keycloakError);
      return NextResponse.json(
        { error: `Failed to create role in Keycloak: ${keycloakError instanceof Error ? keycloakError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Sync to local roles table
    try {
      const pool = await getPgPool();
      
      // Check if roles table exists, if not create it
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'roles'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // Create the roles table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY,
            keycloak_id VARCHAR(255) UNIQUE,
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            phone_number VARCHAR(50),
            status VARCHAR(20) DEFAULT 'active',
            profile_id UUID,
            level VARCHAR(50) DEFAULT 'realm',
            parent_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        // Check if new columns exist, if not add them
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'roles'
        `);
        
        const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
        
        if (!existingColumns.includes('phone_number')) {
          await pool.query('ALTER TABLE roles ADD COLUMN phone_number VARCHAR(50)');
        }
        if (!existingColumns.includes('status')) {
          await pool.query('ALTER TABLE roles ADD COLUMN status VARCHAR(20) DEFAULT \'active\'');
        }
        if (!existingColumns.includes('profile_id')) {
          await pool.query('ALTER TABLE roles ADD COLUMN profile_id UUID');
        }
      }

      // Insert into local roles table
    const roleId = randomUUID();
    const insertQuery = `
        INSERT INTO roles (id, keycloak_id, name, description, phone_number, status, profile_id, level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          phone_number = EXCLUDED.phone_number,
          status = EXCLUDED.status,
          profile_id = EXCLUDED.profile_id,
          keycloak_id = EXCLUDED.keycloak_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, description, phone_number, status, profile_id, level, created_at, updated_at
      `;
      
      const insertValues = [
        roleId, 
        keycloakRoleId, 
        name.trim(), 
        description?.trim() || '', 
        phoneNumber || null,
        status || 'active',
        profileId || null,
        'realm'
      ];
      
      const newRoleResult = await pool.query(insertQuery, insertValues);
      
      if (newRoleResult.rows.length === 0) {
        throw new Error('Failed to insert role into local table');
      }

      const newRole = newRoleResult.rows[0];
      
      // Return the created role
      const roleWithUserCount = {
        ...newRole,
        userCount: 0
      };

      // Invalidate cache after role creation
      cache.delete('roles-list');
      
      return NextResponse.json(roleWithUserCount, { status: 201 });
      
    } catch (dbError) {
      console.error('Database sync failed:', dbError);
      // Even if local sync fails, the role was created in Keycloak
      return NextResponse.json(
        { 
          error: 'Role created in Keycloak but failed to sync locally',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Role creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

// Update a role
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description } = await request.json();
    
    if (!id || !name || !description) {
      return NextResponse.json(
        { error: 'Role ID, name, and description are required' },
        { status: 400 }
      );
    }

    const pool = await getPgPool();

    // Check if role exists
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE id = $1',
      [id]
    );

    if (existingRole.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing role
    const nameConflict = await pool.query(
      'SELECT id FROM roles WHERE name = $1 AND id != $2',
      [name.trim(), id]
    );

    if (nameConflict.rows.length > 0) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      );
    }

    // Update role
    const updateResult = await pool.query(
      'UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description',
      [name.trim(), description.trim(), id]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role update failed' },
        { status: 500 }
      );
    }

    const updatedRole = updateResult.rows[0];
    
    // Add user count (will be fetched separately if needed)
    const roleWithUserCount = {
      ...updatedRole,
      userCount: 0
    };

    // Invalidate cache after role update
    cache.delete('roles-list');
    
    return NextResponse.json(roleWithUserCount);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// Note: DELETE method is handled in /api/admin/roles/[id]/route.ts for individual role deletion

// Manage user role assignment
export async function PATCH(request: NextRequest) {
  try {
    const { userId, roleId, action } = await request.json();
    
    if (!userId || !roleId || !action) {
      return NextResponse.json(
        { error: 'User ID, role ID, and action are required' },
        { status: 400 }
      );
    }

    if (!['assign', 'unassign'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "assign" or "unassign"' },
        { status: 400 }
      );
    }

    const pool = await getPgPool();

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if role exists
    const roleCheck = await pool.query(
      'SELECT id FROM roles WHERE id = $1',
      [roleId]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    if (action === 'assign') {
      // Check if user already has this role
      const existingAssignment = await pool.query(
        'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      );

      if (existingAssignment.rows.length > 0) {
        return NextResponse.json(
          { error: 'User already has this role' },
          { status: 409 }
        );
      }

      // Assign role to user
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );

      return NextResponse.json({ message: 'Role assigned successfully' });
    } else {
      // Unassign role from user
      const deleteResult = await pool.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      );

      if (deleteResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'User does not have this role' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Role unassigned successfully' });
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to manage user role' },
      { status: 500 }
    );
  }
}

// Get users for a specific role
export async function OPTIONS(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const pool = await getPgPool();
    
    // Check if role exists
    const roleCheck = await pool.query(
      'SELECT id, name FROM roles WHERE id = $1',
      [roleId]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Get users with this role
    const usersResult = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.enabled
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY u.username
    `, [roleId]);

    const users = usersResult.rows.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      enabled: user.enabled
    }));

    return NextResponse.json({ users });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users for role' },
      { status: 500 }
    );
  }
} 