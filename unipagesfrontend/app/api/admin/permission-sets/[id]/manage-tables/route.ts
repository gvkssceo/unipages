import { NextRequest, NextResponse } from 'next/server';
import { getPgPool, runInTransaction } from '@/utils/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, tableIds, permissions } = await request.json();
    
    console.log('🔧 DEBUG: Manage tables API called with:', { id, action, tableIds, permissions });

    if (!id || !action || !tableIds || !Array.isArray(tableIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    if (action === 'list') {
      // List all tables for this permission set (for debugging)
      try {
        console.log('🔧 DEBUG: Listing tables for permission set:', id);
        const pool = await getPgPool();
        
        // First, let's check the table structure
        try {
          const schemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'permission_set_table_access' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
          `);
          console.log('🔧 DEBUG: Table schema:', schemaResult.rows);
        } catch (schemaError) {
          console.error('🔧 DEBUG: Error checking table schema:', schemaError);
        }
        
        const listResult = await pool.query(`
          SELECT 
            id,
            table_name,
            can_create,
            can_delete,
            can_read,
            can_update,
            created_at
          FROM public.permission_set_table_access
          WHERE permission_set_id = $1
          ORDER BY table_name
        `, [id]);
        
        console.log('🔧 DEBUG: List query result:', listResult.rows);
        console.log('🔧 DEBUG: Total tables found:', listResult.rows.length);
        
        return NextResponse.json({
          success: true,
          action: 'list',
          tables: listResult.rows,
          count: listResult.rows.length
        });
      } catch (listError) {
        console.error('🔧 DEBUG: Error listing tables:', listError);
        return NextResponse.json(
          { success: false, error: 'Failed to list tables' },
          { status: 500 }
        );
      }
    } else if (action === 'add' || action === 'remove' || action === 'update') {
      // Use explicit transaction for add/remove operations
      const result = await runInTransaction(async (client) => {
        console.log('🔧 DEBUG: Starting transaction for action:', action);
        
        if (action === 'add') {
          // Add tables to permission set
          for (const tableName of tableIds) {
            try {
              console.log(`🔧 DEBUG: Adding table ${tableName} to permission set ${id}`);
              
              const insertResult = await client.query(`
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
                permissions?.can_create ?? true,
                permissions?.can_delete ?? true,
                permissions?.can_read ?? true,
                permissions?.can_update ?? true
              ]);
              
              console.log(`🔧 DEBUG: Insert result for ${tableName}:`, insertResult.rows[0]);
              console.log(`🔧 DEBUG: Successfully added/updated table: ${tableName}`);
            } catch (tableError) {
              console.error(`🔧 DEBUG: Error adding table ${tableName}:`, tableError);
              throw tableError; // Rollback the entire transaction if any table fails
            }
          }
        } else if (action === 'remove') {
          // Remove tables from permission set
          const result = await client.query(`
            DELETE FROM public.permission_set_table_access 
            WHERE permission_set_id = $1 AND table_name = ANY($2)
          `, [id, tableIds]);
          console.log(`🔧 DEBUG: Removed ${result.rowCount} tables from permission set`);
        } else if (action === 'update') {
          // Update existing table permissions
          for (const tableId of tableIds) {
            try {
              console.log(`🔧 DEBUG: Updating permissions for table ${tableId} in permission set ${id}`);
              console.log(`🔧 DEBUG: New permissions:`, permissions);
              
              const updateResult = await client.query(`
                UPDATE public.permission_set_table_access 
                SET 
                  can_create = $3,
                  can_delete = $4,
                  can_read = $5,
                  can_update = $6
                WHERE permission_set_id = $1 AND id = $2
                RETURNING *
              `, [
                id,
                tableId,
                permissions?.can_create ?? true,
                permissions?.can_delete ?? true,
                permissions?.can_read ?? true,
                permissions?.can_update ?? true
              ]);
              
              if (updateResult.rowCount === 0) {
                console.warn(`🔧 WARNING: No rows were updated for table ${tableId}. This might mean the table doesn't exist or the ID is wrong.`);
              } else {
                console.log(`🔧 DEBUG: Update result for table ${tableId}:`, updateResult.rows[0]);
                console.log(`🔧 DEBUG: Successfully updated permissions for table: ${tableId}`);
              }
            } catch (tableError) {
              console.error(`🔧 DEBUG: Error updating table ${tableId}:`, tableError);
              console.error(`🔧 DEBUG: SQL Error details:`, tableError);
              throw tableError; // Rollback the entire transaction if any table fails
            }
          }
        }

        // Update table count
        await client.query(`
          UPDATE public.permission_sets
          SET table_count = (
            SELECT COUNT(*) FROM public.permission_set_table_access
            WHERE permission_set_id = $1
          )
          WHERE id = $1
        `, [id]);
        
        console.log('🔧 DEBUG: Successfully updated table count');
        
        // Verify the tables were actually added/removed
        const verifyResult = await client.query(`
          SELECT table_name, can_create, can_delete
          FROM public.permission_set_table_access
          WHERE permission_set_id = $1
          ORDER BY table_name
        `, [id]);
        
        console.log('🔧 DEBUG: Verification query result:', verifyResult.rows);
        console.log('🔧 DEBUG: Total tables after operation:', verifyResult.rows.length);
        
        return verifyResult.rows.length;
      });

      console.log('🔧 DEBUG: Transaction completed successfully. Total tables:', result);

      return NextResponse.json({
        success: true,
        message: `Tables ${action === 'add' ? 'added to' : 'removed from'} permission set successfully`,
        tableCount: result
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "add", "remove", "update", or "list"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('🔧 DEBUG: Error managing tables:', error);
    return NextResponse.json(
      { success: false, error: `Failed to manage tables: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
