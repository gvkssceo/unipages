import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Check if table_count column exists in permission_sets table
export async function GET(request: NextRequest) {
  try {
    const pool = await getPgPool();
    
    // Check if table_count column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'permission_sets' 
        AND column_name = 'table_count'
    `);

    console.log('🔧 DEBUG: Column check result:', columnCheck.rows);

    // Get all columns in permission_sets table for reference
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'permission_sets'
      ORDER BY ordinal_position
    `);

    console.log('🔧 DEBUG: All columns in permission_sets:', allColumns.rows);

    // Try to get a sample permission set
    const sampleData = await pool.query(`
      SELECT * FROM public.permission_sets LIMIT 1
    `);

    console.log('🔧 DEBUG: Sample permission set data:', sampleData.rows);

    return NextResponse.json({
      table_count_column_exists: columnCheck.rows.length > 0,
      table_count_column_info: columnCheck.rows[0] || null,
      all_columns: allColumns.rows,
      sample_data: sampleData.rows[0] || null
    });

  } catch (error) {
    console.error('Error checking table_count column:', error);
    return NextResponse.json({
      error: 'Failed to check table_count column',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
