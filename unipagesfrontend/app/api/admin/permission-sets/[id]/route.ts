import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';
import { cache } from '@/utils/cache';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Get permission set by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Permission set ID is required' }, { status: 400 });
    }

    const pool = await getPgPool();
    
    const result = await pool.query(
      `SELECT id, name, description, table_count, created_at, updated_at
       FROM public.permission_sets 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    const permissionSet = result.rows[0];
    return NextResponse.json({
      id: permissionSet.id,
      name: permissionSet.name,
      description: permissionSet.description,
      table_count: permissionSet.table_count,
      createdAt: permissionSet.created_at,
      updatedAt: permissionSet.updated_at,
    });
  } catch (error) {
    console.error('Error fetching permission set:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch permission set', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Update permission set by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, table_count } = body;

    // Debug logging
    console.log('🔍 DEBUG: PUT request received');
    console.log('🔍 DEBUG: Permission set ID:', id);
    console.log('🔍 DEBUG: Request body:', body);
    console.log('🔍 DEBUG: Name field:', { name, type: typeof name, length: name?.length });
    console.log('🔍 DEBUG: Description field:', { description, type: typeof description, length: description?.length });

    // Allow empty strings for updates - they are valid values
    // Only reject if name is undefined/null (not being updated)
    if (name !== undefined && name !== null) {
      console.log('✅ DEBUG: Name validation passed - allowing update');
    }

    console.log('✅ DEBUG: Validation passed');

    const pool = await getPgPool();

    // If updating name, check if new name already exists for a different permission set
    if (name !== undefined && name !== null && name.trim() !== '') {
      console.log('🔍 DEBUG: Checking for duplicate name:', name.trim());
      const existingPermissionSet = await pool.query(
        'SELECT id FROM public.permission_sets WHERE name = $1 AND id != $2',
        [name.trim(), id]
      );

      if (existingPermissionSet.rows.length > 0) {
        console.log('❌ DEBUG: Duplicate name found');
        return NextResponse.json({ error: 'Permission set name already exists' }, { status: 409 });
      }
      console.log('✅ DEBUG: No duplicate name found');
    }

    // Build dynamic update query based on provided fields
    let updateQuery = 'UPDATE public.permission_sets SET updated_at = CURRENT_TIMESTAMP';
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (name !== undefined && name !== null) {
      updateQuery += `, name = $${paramIndex}`;
      queryParams.push(name.trim() || ''); // Use trimmed name or empty string
      paramIndex++;
      console.log('🔍 DEBUG: Adding name to update query:', name.trim() || '');
    }

    if (description !== undefined && description !== null) {
      updateQuery += `, description = $${paramIndex}`;
      queryParams.push(description.trim() || ''); // Use trimmed description or empty string
      paramIndex++;
      console.log('🔍 DEBUG: Adding description to update query:', description.trim() || '');
    }

    if (table_count !== undefined && table_count !== null) {
      updateQuery += `, table_count = $${paramIndex}`;
      queryParams.push(table_count);
      paramIndex++;
      console.log('🔍 DEBUG: Adding table_count to update query:', table_count);
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, name, description, table_count, created_at, updated_at`;
    queryParams.push(id);

    console.log('🔍 DEBUG: Final update query:', updateQuery);
    console.log('🔍 DEBUG: Query parameters:', queryParams);

    // Update permission set in database
    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      console.log('❌ DEBUG: No rows updated - permission set not found');
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    console.log('✅ DEBUG: Update successful, rows affected:', result.rows.length);

    // Invalidate cache after permission set update
    cache.delete('permission-sets-list');
    console.log('🗑️ Cache invalidated after permission set update');

    const updatedPermissionSet = result.rows[0];
    return NextResponse.json({ 
      success: true, 
      message: 'Permission set updated successfully',
      permissionSet: {
        id: updatedPermissionSet.id,
        name: updatedPermissionSet.name,
        description: updatedPermissionSet.description,
        table_count: updatedPermissionSet.table_count,
        createdAt: updatedPermissionSet.created_at,
        updatedAt: updatedPermissionSet.updated_at,
      }
    });
  } catch (error) {
    console.error('❌ DEBUG: Error in PUT method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update permission set', 
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🗑️ [API-DELETE-ID] [${requestId}] DELETE request started at ${new Date().toISOString()}`);
  
  try {
    const { id } = await context.params;
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Permission set ID from params:`, id);
    
    if (!id) {
      console.log(`❌ [API-DELETE-ID] [${requestId}] Permission set ID is required`);
      return NextResponse.json({ error: 'Permission set ID is required' }, { status: 400 });
    }

    console.log(`🗑️ [API-DELETE-ID] [${requestId}] === PERMISSION SET DELETION REQUEST START ===`);
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Deleting permission set ID:`, id);

    const pool = await getPgPool();
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Database pool obtained`);
    
    // Check if permission set exists
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Checking if permission set exists...`);
    const permissionSetResult = await pool.query('SELECT id, name FROM public.permission_sets WHERE id = $1', [id]);
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Permission set check result:`, permissionSetResult.rows.length, 'rows found');
    
    if (permissionSetResult.rows.length === 0) {
      console.log(`❌ [API-DELETE-ID] [${requestId}] Permission set not found`);
      return NextResponse.json({ error: 'Permission set not found' }, { status: 404 });
    }

    const permissionSet = permissionSetResult.rows[0];
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Found permission set:`, permissionSet);

    // Check if permission set is assigned to any profiles
    const profileCheck = await pool.query('SELECT COUNT(*) as profile_count FROM public.profile_permission_sets WHERE permission_set_id = $1', [id]);
    const profileCount = parseInt(profileCheck.rows[0]?.profile_count || '0');
    
    if (profileCount > 0) {
      console.log(`⚠️ Warning: ${profileCount} profile(s) are assigned to this permission set. Attempting to remove assignments...`);
      
      // Try to remove profile assignments first
      try {
        await pool.query('DELETE FROM public.profile_permission_sets WHERE permission_set_id = $1', [id]);
        console.log('✅ Profile assignments removed successfully');
        
        // Also remove any table and field permissions
        await pool.query('DELETE FROM public.permission_set_table_access WHERE permission_set_id = $1', [id]);
        console.log('✅ Table access permissions removed');
        
        // Remove from permission_set_tables if it exists
        try {
          await pool.query('DELETE FROM public.permission_set_tables WHERE permission_set_id = $1', [id]);
          console.log('✅ Table permissions removed');
        } catch (e) {
          console.log('ℹ️ Table permissions table might not exist, continuing...');
        }
        
        // Remove from permission_set_fields if it exists
        try {
          await pool.query('DELETE FROM public.permission_set_fields WHERE permission_set_id = $1', [id]);
          console.log('✅ Field permissions removed');
        } catch (e) {
          console.log('ℹ️ Field permissions table might not exist, continuing...');
        }
        
      } catch (assignmentError) {
        console.error('❌ Failed to remove profile assignments:', assignmentError);
        return NextResponse.json(
          { error: `Cannot delete permission set: Failed to remove ${profileCount} profile assignment(s)` },
          { status: 400 }
        );
      }
    }

    // Delete permission set from database
    try {
      // Delete from permission_set_table_access first (foreign key constraint)
      try {
        await pool.query('DELETE FROM public.permission_set_table_access WHERE permission_set_id = $1', [id]);
        console.log('✅ Permission set table access deleted');
      } catch (e) {
        console.log('ℹ️ Table access permissions already removed or table doesn\'t exist');
      }
      
      // Delete from permission_sets table
      await pool.query('DELETE FROM public.permission_sets WHERE id = $1', [id]);
      console.log('✅ Permission set deleted');
      
    } catch (dbError) {
      console.error('❌ Error deleting permission set from database:', dbError);
      throw new Error(`Failed to delete permission set from database: ${dbError}`);
    }

    // Invalidate cache after permission set deletion
    cache.delete('permission-sets-list');
    console.log(`🗑️ [API-DELETE-ID] [${requestId}] Cache invalidated after permission set deletion`);

    console.log(`✅ [API-DELETE-ID] [${requestId}] === PERMISSION SET DELETION COMPLETED SUCCESSFULLY ===`);
    const response = { 
      success: true, 
      message: 'Permission set deleted successfully',
      removedProfiles: profileCount
    };
    console.log(`✅ [API-DELETE-ID] [${requestId}] Returning response:`, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('=== PERMISSION SET DELETION ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json(
      { error: 'Failed to delete permission set', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
