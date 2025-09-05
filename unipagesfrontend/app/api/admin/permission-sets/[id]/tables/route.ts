import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const pool = await getPgPool();

    // Get tables for this permission set
    const result = await pool.query(`
      SELECT 
        id,
        table_name as name,
        table_name as description,
        can_create,
        can_delete,
        can_read,
        can_update
      FROM public.permission_set_table_access
      WHERE permission_set_id = $1
      ORDER BY table_name
    `, [id]);

    const response = {
      success: true,
      tables: result.rows || []
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching permission set tables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tableName, permissions } = await request.json();
    const pool = await getPgPool();

    // Insert or update table permissions
    const result = await pool.query(`
      INSERT INTO public.permission_set_table_access 
        (id, permission_set_id, table_name, can_create, can_delete, can_read, can_update)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      ON CONFLICT (permission_set_id, table_name)
      DO UPDATE SET
        can_create = EXCLUDED.can_create,
        can_delete = EXCLUDED.can_delete,
        can_read = EXCLUDED.can_read,
        can_update = EXCLUDED.can_update
      RETURNING *
    `, [
      id,
      tableName,
      permissions.can_create || false,
      permissions.can_delete || false,
      permissions.can_read || false,
      permissions.can_update || false
    ]);

    const tableAccessId = result.rows[0].id;

    // Get all columns from the table
    const { rows: columns } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    // Automatically assign all fields with default permissions
    for (const column of columns) {
      try {
        await pool.query(`
          INSERT INTO public.permission_set_field_access 
            (id, table_access_id, field_name, can_view, can_edit)
          VALUES (gen_random_uuid(), $1, $2, $3, $4)
          ON CONFLICT (table_access_id, field_name) DO NOTHING
        `, [
          tableAccessId,
          column.column_name,
          true,  // can_view = true by default
          false  // can_edit = false by default (safer)
        ]);
      } catch (fieldError) {
        console.warn(`Failed to assign field ${column.column_name}:`, fieldError);
        // Continue with other fields even if one fails
      }
    }

    // Update table count
    await pool.query(`
      UPDATE public.permission_sets
      SET table_count = (
        SELECT COUNT(*) FROM public.permission_set_table_access
        WHERE permission_set_id = $1
      )
      WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      fieldsAssigned: columns.length
    });
  } catch (error) {
    console.error('Error updating table permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 PUT /api/admin/permission-sets/[id]/tables called');
    const { id } = await params;
    const { tableId, permissions } = await request.json();
    console.log('📋 Request data:', { id, tableId, permissions });
    const pool = await getPgPool();

    // First, check if the table access record exists
    const existingRecord = await pool.query(`
      SELECT id FROM public.permission_set_table_access 
      WHERE id = $1 AND permission_set_id = $2
    `, [tableId, id]);

    let result;
    
    if (existingRecord.rows.length === 0) {
      // Record doesn't exist, create it first
      console.log('💾 Creating new table access record...');
      result = await pool.query(`
        INSERT INTO public.permission_set_table_access 
        (id, permission_set_id, can_create, can_delete, can_read, can_update)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        tableId,
        id,
        permissions.can_create || false,
        permissions.can_delete || false,
        permissions.can_read || false,
        permissions.can_update || false
      ]);
    } else {
      // Record exists, update it
      console.log('💾 Updating existing table access record...');
      result = await pool.query(`
        UPDATE public.permission_set_table_access 
        SET 
          can_create = $3,
          can_delete = $4,
          can_read = $5,
          can_update = $6
        WHERE id = $1 AND permission_set_id = $2
        RETURNING *
      `, [
        tableId,
        id,
        permissions.can_create || false,
        permissions.can_delete || false,
        permissions.can_read || false,
        permissions.can_update || false
      ]);
    }
    
    console.log('✅ Database operation result:', result.rows[0]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create/update table access' },
        { status: 500 }
      );
    }
    
    // Update the table count in permission_sets
    await pool.query(`
      UPDATE public.permission_sets
      SET table_count = (
        SELECT COUNT(*) FROM public.permission_set_table_access
        WHERE permission_set_id = $1
      )
      WHERE id = $1
    `, [id]);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating table access:', error);
    return NextResponse.json(
      { error: 'Failed to update table access' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { tableId } = await request.json();
    
    const pool = await getPgPool();
    
    // First, get the table access record to find the table name
    const tableAccess = await pool.query(`
      SELECT table_name FROM public.permission_set_table_access 
      WHERE id = $1 AND permission_set_id = $2
    `, [tableId, id]);
    
    if (tableAccess.rows.length === 0) {
      return NextResponse.json(
        { error: 'Table access not found' },
        { status: 404 }
      );
    }
    
    // Delete all field access records for this table
    await pool.query(`
      DELETE FROM public.permission_set_field_access 
      WHERE table_access_id = $1
    `, [tableId]);
    
    // Delete table access by ID
    const result = await pool.query(`
      DELETE FROM public.permission_set_table_access 
      WHERE id = $1 AND permission_set_id = $2
      RETURNING *
    `, [tableId, id]);
    
    // Update table count
    await pool.query(`
      UPDATE public.permission_sets
      SET table_count = (
        SELECT COUNT(*) FROM public.permission_set_table_access
        WHERE permission_set_id = $1
      )
      WHERE id = $1
    `, [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Table and all its fields removed successfully',
      tableName: tableAccess.rows[0].table_name
    });
  } catch (error) {
    console.error('Error removing table from permission set:', error);
    return NextResponse.json({
      error: 'Failed to remove table from permission set',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}


