import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

// Get columns for a specific table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    console.log('Starting GET columns request for table:', tableName);
    
    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }
    
    const pool = await getPgPool();
    console.log('Database pool obtained successfully');
    
    // Get columns for the specified table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columns = columnsResult.rows.map((row: any) => row.column_name);
    console.log(`Found ${columns.length} columns for table ${tableName}:`, columns);
    
    return NextResponse.json(columns);
  } catch (error) {
    console.error('Error fetching table columns:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: 'Failed to fetch table columns', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
