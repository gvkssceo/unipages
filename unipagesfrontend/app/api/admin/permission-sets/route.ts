import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/utils/cache';
import { auth } from '@/auth';
import { getPgPool } from '@/utils/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(session.user as any)?.roles?.includes('admin')) {
    return null;
  }
  return session as any;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`🚀 [${requestId}] Permission Sets API Request Started at ${new Date().toISOString()}`);
    
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const forceRefresh = searchParams.get('t'); // Cache busting parameter
    
    // Check cache first (skip cache if force refresh is requested)
    const cacheKey = 'permission-sets-list';
    const cached = cache.get(cacheKey);
    if (cached && !forceRefresh) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] CACHE HIT - Returning cached permission sets data in ${cacheTime}ms`);
      return NextResponse.json(cached);
    }
    
    if (forceRefresh) {
      console.log(`🔄 [${requestId}] FORCE REFRESH - Cache busting parameter detected, fetching fresh data`);
    } else {
      console.log(`🔄 [${requestId}] CACHE MISS - Fetching fresh data from database`);
    }
    console.log(`Starting GET permission-sets request... [${requestId}]`);
    
    // Temporarily comment out authentication for testing
    // const session = await requireAdmin();
    // if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const dbStartTime = Date.now();
    const pool = await getPgPool();
    const dbConnectTime = Date.now() - dbStartTime;
    console.log(`🔗 [${requestId}] Database pool obtained successfully in ${dbConnectTime}ms`);
    
    if (!includeDetails) {
      const queryStartTime = Date.now();
      const { rows } = await pool.query(`SELECT * FROM public.permission_sets ORDER BY created_at DESC`);
      const queryTime = Date.now() - queryStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log(`📊 [${requestId}] Permission sets query executed successfully in ${queryTime}ms, rows: ${rows.length}`);
      console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
      console.log(`   - Database connection: ${dbConnectTime}ms`);
      console.log(`   - Query execution: ${queryTime}ms`);
      console.log(`   - TOTAL TIME: ${totalTime}ms`);
      
      // Cache the result for 5 minutes (reduced from 10 minutes for better responsiveness)
      cache.set(cacheKey, rows, 5 * 60 * 1000);
      console.log(`💾 [${requestId}] Data cached for 5 minutes`);
      
      return NextResponse.json(rows);
    }
    
    const queryStartTime = Date.now();
    const { rows } = await pool.query(
      `SELECT ps.*, 
              COALESCE(ta_cnt.cnt,0) AS tables_count,
              COALESCE(fa_cnt.cnt,0) AS fields_count
       FROM public.permission_sets ps
       LEFT JOIN (
         SELECT permission_set_id, COUNT(*) AS cnt
          FROM public.permission_set_table_access
         GROUP BY permission_set_id
       ) ta_cnt ON ta_cnt.permission_set_id = ps.id
       LEFT JOIN (
         SELECT ta.permission_set_id, COUNT(*) AS cnt
          FROM public.permission_set_field_access fa
          JOIN public.permission_set_table_access ta ON ta.id = fa.table_access_id
         GROUP BY ta.permission_set_id
       ) fa_cnt ON fa_cnt.permission_set_id = ps.id
       ORDER BY ps.created_at DESC`
    );
    
    const queryTime = Date.now() - queryStartTime;
    const totalTime = Date.now() - startTime;
    console.log(`📊 [${requestId}] Permission sets with details query executed successfully in ${queryTime}ms, rows: ${rows.length}`);
    console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
    console.log(`   - Database connection: ${dbConnectTime}ms`);
    console.log(`   - Query execution: ${queryTime}ms`);
    console.log(`   - TOTAL TIME: ${totalTime}ms`);
    
    // Cache the result for 5 minutes (reduced from 10 minutes for better responsiveness)
    cache.set(cacheKey, rows, 5 * 60 * 1000);
    console.log(`💾 [${requestId}] Data cached for 5 minutes`);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching permission sets:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: 'Failed to fetch permission sets', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`➕ [API-CREATE] [${requestId}] POST request started at ${new Date().toISOString()}`);
  
  try {
    const session = await requireAdmin();
    if (!session) {
      console.log(`❌ [API-CREATE] [${requestId}] No admin session found`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { name, description } = await request.json();
    console.log(`➕ [API-CREATE] [${requestId}] Request data:`, { name, description });
    
    if (!name) {
      console.log(`❌ [API-CREATE] [${requestId}] Name is required`);
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const pool = await getPgPool();
    const permissionSetId = randomUUID();
    console.log(`➕ [API-CREATE] [${requestId}] Generated ID:`, permissionSetId);
    
    const { rows } = await pool.query(
      `INSERT INTO public.permission_sets (id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [permissionSetId, name, description || null]
    );
    
    console.log(`➕ [API-CREATE] [${requestId}] Database insert successful, rows:`, rows.length);
    console.log(`➕ [API-CREATE] [${requestId}] Created permission set:`, rows[0]);
    
    // Invalidate cache after permission set creation
    cache.delete('permission-sets-list');
    console.log(`🗑️ [API-CREATE] [${requestId}] Cache invalidated after permission set creation`);
    
    console.log(`✅ [API-CREATE] [${requestId}] POST request completed successfully`);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(`❌ [API-CREATE] [${requestId}] Error creating permission set:`, error);
    console.error(`❌ [API-CREATE] [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      error: 'Failed to create permission set', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { id, name, description } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    
    const pool = await getPgPool();
    const { rowCount, rows } = await pool.query(
      `UPDATE public.permission_sets SET name=$2, description=$3 WHERE id=$1 RETURNING *`,
      [id, name, description || null]
    );
    if (rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Invalidate cache after permission set update
    cache.delete('permission-sets-list');
    console.log('🗑️ Cache invalidated after permission set update');
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating permission set:', error);
    return NextResponse.json({ 
      error: 'Failed to update permission set', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🗑️ [API-DELETE] [${requestId}] DELETE request started at ${new Date().toISOString()}`);
  
  try {
    const session = await requireAdmin();
    if (!session) {
      console.log(`❌ [API-DELETE] [${requestId}] No admin session found`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log(`🗑️ [API-DELETE] [${requestId}] Permission set ID to delete:`, id);
    
    if (!id) {
      console.log(`❌ [API-DELETE] [${requestId}] ID is required`);
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    const pool = await getPgPool();
    console.log(`🗑️ [API-DELETE] [${requestId}] Executing delete query...`);
    
    const result = await pool.query(`DELETE FROM public.permission_sets WHERE id=$1`, [id]);
    console.log(`🗑️ [API-DELETE] [${requestId}] Delete query result:`, result.rowCount, 'rows affected');
    
    // Invalidate cache after permission set deletion
    cache.delete('permission-sets-list');
    console.log(`🗑️ [API-DELETE] [${requestId}] Cache invalidated after permission set deletion`);
    
    console.log(`✅ [API-DELETE] [${requestId}] DELETE request completed successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ [API-DELETE] [${requestId}] Error deleting permission set:`, error);
    console.error(`❌ [API-DELETE] [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      error: 'Failed to delete permission set', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}


