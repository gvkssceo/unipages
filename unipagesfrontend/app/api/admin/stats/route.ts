import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for stats (in production, use Redis or similar)
const statsCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (increased for better performance)

interface CachedStats {
  data: any[];
  timestamp: number;
}

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    // Check cache first
    const cacheKey = 'admin-stats';
    const cached = statsCache.get(cacheKey) as CachedStats | undefined;
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data);
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

    // Get realm info to extract realm name from issuer
    const issuerUrl = process.env.KEYCLOAK_ISSUER || '';
    const realmMatch = issuerUrl.match(/\/realms\/([^\/]+)/);
    const realm = realmMatch ? realmMatch[1] : 'unipages';
    const baseUrl = issuerUrl.replace(/\/realms\/[^\/]+/, '');

    // Fetch users and roles in parallel for better performance
    const [usersResponse, rolesResponse] = await Promise.all([
      fetch(`${baseUrl}/admin/realms/${realm}/users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${baseUrl}/admin/realms/${realm}/roles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users from Keycloak');
    }

    if (!rolesResponse.ok) {
      throw new Error('Failed to fetch roles from Keycloak');
    }

    const [users, roles] = await Promise.all([
      usersResponse.json(),
      rolesResponse.json()
    ]);

    // Calculate basic user statistics
    const totalUsers = users.length;
    const enabledUsers = users.filter((user: any) => user.enabled).length;
    const emailVerifiedUsers = users.filter((user: any) => user.emailVerified).length;

    // Filter out system roles early to reduce processing
    const systemRoles = new Set([
      'default-roles-unipages',
      'uma_authorization', 
      'offline_access',
      'admin'
    ]);

    const displayRoles = roles.filter((role: any) => !systemRoles.has(role.name));

    // OPTIMIZATION: Batch fetch role user counts more efficiently
    console.log(`🔄 [${requestId}] Fetching role user counts for ${displayRoles.length} roles...`);
    const roleCountsStartTime = Date.now();
    
    // Use Promise.allSettled for better error handling and parallel execution
    const roleCounts = await Promise.allSettled(
      displayRoles.map(async (role: any) => {
        try {
          const roleUsersResponse = await fetch(
            `${baseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(role.name)}/users`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (roleUsersResponse.ok) {
            const roleUsers = await roleUsersResponse.json();
            return { 
              role: role.name, 
              count: roleUsers.length,
              description: role.description || '',
              composite: role.composite || false
            };
          }
          return { 
            role: role.name, 
            count: 0,
            description: role.description || '',
            composite: role.composite || false
          };
        } catch (error) {
          console.warn(`⚠️ Error fetching users for role ${role.name}:`, error);
          return { 
            role: role.name, 
            count: 0,
            description: role.description || '',
            composite: role.composite || false
          };
        }
      })
    );
    
    // Process results and handle failures gracefully
    const processedRoleCounts = roleCounts.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn(`⚠️ Failed to fetch users for role ${displayRoles[index].name}:`, result.reason);
        return { 
          role: displayRoles[index].name, 
          count: 0,
          description: displayRoles[index].description || '',
          composite: displayRoles[index].composite || false
        };
      }
    });
    
    const roleCountsTime = Date.now() - roleCountsStartTime;
    console.log(`✅ [${requestId}] Role user counts fetched in ${roleCountsTime}ms`);

    // Calculate total role users for percentage calculations
    const totalRoleUsers = processedRoleCounts.reduce((sum, r) => sum + r.count, 0);

    // Generate meaningful growth indicators
    const getGrowthIndicator = (count: number, total: number) => {
      if (total === 0) return '+0%';
      const percentage = Math.round((count / total) * 100);
      return `+${percentage}%`;
    };

    // Create stats array with Total Users first, then all roles
    const stats = [
      // Total Users card
      { 
        title: 'Total Users', 
        value: totalUsers.toString(), 
        change: getGrowthIndicator(enabledUsers, totalUsers), 
        changeType: enabledUsers > 0 ? 'positive' : 'neutral',
        subtitle: `${enabledUsers} enabled, ${emailVerifiedUsers} verified`
      },
      // All roles cards - filter out system roles and sort by user count
      ...processedRoleCounts
        .sort((a, b) => b.count - a.count) // Sort by user count descending
        .map(role => {
          const percentage = totalRoleUsers > 0 ? Math.round((role.count / totalRoleUsers) * 100) : 0;
          return {
            title: role.role.charAt(0).toUpperCase() + role.role.slice(1), // Capitalize first letter
            value: role.count.toString(),
            change: getGrowthIndicator(role.count, totalRoleUsers),
            changeType: role.count > 0 ? 'positive' : 'neutral',
            subtitle: `${percentage}% of role users${role.composite ? ' (composite)' : ''}`,
            roleName: role.role // Keep original role name for reference
          };
        })
    ];

    // Cache the results
    statsCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    // Set cache headers for browser caching
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    // Return cached data if available, even if expired
    const cacheKey = 'admin-stats';
    const cached = statsCache.get(cacheKey) as CachedStats | undefined;
    
    if (cached) {
      return NextResponse.json(cached.data);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 