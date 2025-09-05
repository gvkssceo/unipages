import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';
import { logApiRequest, logApiResponse } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logApiRequest(request);
  
  try {
    // Test database connection
    let dbStatus = 'unknown';
    let dbTables: string[] = [];
    let dbError = null;
    
    try {
      const pool = await getPgPool();
      const client = await pool.connect();
      
      // Test basic connection
      await client.query('SELECT 1');
      dbStatus = 'connected';
      
      // Check what tables exist
      try {
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        dbTables = tablesResult.rows.map((row: any) => row.table_name);
      } catch (tableError) {
        // Could not check tables
      }
      
      client.release();
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }
    
    const responseTime = Date.now() - startTime;
    
    const response = NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        api: 'healthy',
        database: {
          status: dbStatus,
          tables: dbTables,
          error: dbError
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasKeycloakIssuer: !!process.env.KEYCLOAK_ISSUER,
        hasKeycloakAdminClient: !!process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        hasDatabaseUrl: !!(process.env.POSTGRES_URL || process.env.DATABASE_URL)
      }
    });
    
    logApiResponse(request, 200, startTime);
    return response;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiResponse(request, 500, startTime);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        api: 'error',
        database: 'unknown'
      }
    }, { status: 500 });
  }
}
