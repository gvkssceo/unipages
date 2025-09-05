import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 DEBUG: ===== /field-permissions API route POST method called =====');
    const { id } = await params;
    const { tableName, fieldPermissions } = await request.json();
    
    console.log('🔧 DEBUG: Permission set ID:', id);
    console.log('🔧 DEBUG: Table name:', tableName);
    console.log('🔧 DEBUG: Field permissions:', fieldPermissions);
    
    const pool = await getPgPool();

    // Test database connection and check table structure
    console.log('🔧 DEBUG: Testing database connection...');
    try {
      const testResult = await pool.query('SELECT 1 as test');
      console.log('🔧 DEBUG: Database connection test result:', testResult.rows[0]);
    } catch (dbError) {
      console.error('🔧 DEBUG: Database connection test failed:', dbError);
      throw dbError;
    }

    // Check if the table exists and show its structure
    console.log('🔧 DEBUG: Checking table structure...');
    try {
      const tableInfoResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'permission_set_field_access' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('🔧 DEBUG: Table structure:', tableInfoResult.rows);
    } catch (tableError) {
      console.error('🔧 DEBUG: Failed to get table structure:', tableError);
    }

    // First, get the table_access_id for this table in this permission set
    console.log('🔧 DEBUG: Querying for table_access_id...');
    console.log('🔧 DEBUG: Query parameters - permission_set_id:', id, 'table_name:', tableName);
    
    const tableAccessResult = await pool.query(`
      SELECT id FROM public.permission_set_table_access 
      WHERE permission_set_id = $1 AND table_name = $2
    `, [id, tableName]);

    console.log('🔧 DEBUG: Table access query result:', tableAccessResult.rows);
    console.log('🔧 DEBUG: Query executed successfully, rows found:', tableAccessResult.rows.length);

    if (tableAccessResult.rows.length === 0) {
      console.log('🔧 DEBUG: Table not found in permission set');
      return NextResponse.json(
        { success: false, error: 'Table not found in permission set' },
        { status: 404 }
      );
    }

    const tableAccessId = tableAccessResult.rows[0].id;
    console.log('🔧 DEBUG: Table access ID:', tableAccessId);
    console.log('🔧 DEBUG: Table access ID type:', typeof tableAccessId);
    console.log('🔧 DEBUG: Table access ID value:', tableAccessId);

    // Update field permissions for the table
    console.log('🔧 DEBUG: Starting to update field permissions...');
    for (const [fieldName, permissions] of Object.entries(fieldPermissions)) {
      console.log('🔧 DEBUG: Processing field:', fieldName, 'with permissions:', permissions);
      console.log('🔧 DEBUG: Field permissions type check - can_view:', typeof (permissions as any).can_view, 'can_edit:', typeof (permissions as any).can_edit);
      
      try {
        const insertResult = await pool.query(`
          INSERT INTO public.permission_set_field_access 
            (id, table_access_id, field_name, can_view, can_edit)
          VALUES (gen_random_uuid(), $1, $2, $3, $4)
          ON CONFLICT (table_access_id, field_name)
          DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit
        `, [
          tableAccessId,
          fieldName,
          (permissions as any).can_view ?? true,
          (permissions as any).can_edit ?? true
        ]);
        
        console.log('🔧 DEBUG: Insert/update result for field', fieldName, ':', insertResult.rows[0]);
        console.log('🔧 DEBUG: Insert/update successful for field:', fieldName);
      } catch (insertError) {
        console.error('🔧 DEBUG: Failed to insert/update field:', fieldName, 'Error:', insertError);
        console.error('🔧 DEBUG: Insert parameters:', {
          tableAccessId,
          fieldName,
          can_view: (permissions as any).can_view ?? true,
          can_edit: (permissions as any).can_edit ?? true
        });
        throw insertError;
      }
    }

    console.log('🔧 DEBUG: All field permissions updated successfully');
    return NextResponse.json({
      success: true,
      message: 'Field permissions updated successfully'
    });
  } catch (error) {
    console.error('🔧 DEBUG: Error updating field permissions:', error);
    console.error('🔧 DEBUG: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update field permissions' },
      { status: 500 }
    );
  }
}
