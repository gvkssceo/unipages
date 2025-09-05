import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Add table_count column to permission_sets table
export async function POST(request: NextRequest) {
  try {
    const pool = await getPgPool();
    
    console.log('🔧 DEBUG: Starting table_count column migration...');

    // First check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'permission_sets' 
        AND column_name = 'table_count'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('🔧 DEBUG: table_count column already exists');
      return NextResponse.json({
        success: true,
        message: 'table_count column already exists',
        already_exists: true
      });
    }

    console.log('🔧 DEBUG: Adding table_count column...');

    // Add the column with a default value of 0
    await pool.query(`
      ALTER TABLE public.permission_sets 
      ADD COLUMN table_count INTEGER DEFAULT 0
    `);

    console.log('🔧 DEBUG: Updating existing permission sets with current table counts...');

    // Update existing permission sets with their current table counts
    await pool.query(`
      UPDATE public.permission_sets 
      SET table_count = (
        SELECT COUNT(*) 
        FROM public.permission_set_table_access 
        WHERE permission_set_id = permission_sets.id
      )
    `);

    console.log('🔧 DEBUG: Making table_count NOT NULL...');

    // Make the column NOT NULL after updating existing records
    await pool.query(`
      ALTER TABLE public.permission_sets 
      ALTER COLUMN table_count SET NOT NULL
    `);

    console.log('🔧 DEBUG: Adding column comment...');

    // Add a comment to document the column
    await pool.query(`
      COMMENT ON COLUMN public.permission_sets.table_count IS 'Number of tables assigned to this permission set'
    `);

    console.log('🔧 DEBUG: Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'table_count column added successfully',
      steps_completed: [
        'Added table_count column with default value 0',
        'Updated existing permission sets with current table counts',
        'Made table_count NOT NULL',
        'Added column comment'
      ]
    });

  } catch (error) {
    console.error('Error adding table_count column:', error);
    return NextResponse.json({
      error: 'Failed to add table_count column',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
