import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting GET available-tables request...');
    
    const pool = await getPgPool();
    console.log('Database pool obtained successfully');

    // Get all possible tables from the database schema
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename as name,
        'Table: ' || tablename as description
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      ORDER BY tablename
    `);

    const allTables = result.rows.map((row: any) => ({
      id: row.name,
      name: row.name,
      description: row.description
    }));

    console.log('Available tables query executed successfully, tables:', allTables.length);
    return NextResponse.json({
      success: true,
      tables: allTables
    });
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available tables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tableName } = await request.json();
    
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      );
    }

    const pool = await getPgPool();
    
    // Get fields for the specific table
    const result = await pool.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as default_value
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const fields = result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default_value: row.default_value
    }));

    return NextResponse.json({
      success: true,
      tableName,
      fields
    });
  } catch (error) {
    console.error('Error fetching table fields:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table fields' },
      { status: 500 }
    );
  }
}
