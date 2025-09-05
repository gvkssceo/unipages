import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPgPool } from '@/utils/db';
import { logApiResponse } from '@/lib/api-logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Temporarily comment out authentication for testing
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const pool = await getPgPool();
    
    // Query to get all tables from the database
    const { rows } = await pool.query(`
      SELECT 
        table_name as name,
        table_name as id,
        COALESCE(
          (SELECT string_agg(column_name, ', ') 
           FROM information_schema.columns 
           WHERE table_name = t.table_name), 
          'No columns found'
        ) as description
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = rows.map((row: any) => ({
      id: row.name, // Using table name as ID since we don't have a separate ID
      name: row.name,
      description: row.description
    }));

    const response = NextResponse.json(tables);
    logApiResponse(request, 200, startTime);
    return response;
  } catch (error) {
    console.error('Error fetching tables:', error);
    logApiResponse(request, 500, startTime);
    return NextResponse.json(
      { error: 'Failed to fetch tables', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
