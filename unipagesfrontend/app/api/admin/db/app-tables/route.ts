import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

// Get all application tables (excluding system tables)
export async function GET(request: NextRequest) {
  try {
    console.log('Starting GET app-tables request...');
    
    const pool = await getPgPool();
    console.log('Database pool obtained successfully');
    
    // Get all tables from the public schema, excluding system tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN (
          'schema_migrations',
          'ar_internal_metadata',
          'pg_stat_statements',
          'pg_stat_statements_info'
        )
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map((row: any) => row.table_name);
    console.log('Found tables:', tables);
    
    return NextResponse.json({ tables: tables });
  } catch (error) {
    console.error('Error fetching app tables:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: 'Failed to fetch app tables', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}


