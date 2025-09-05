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

export async function GET() {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`🚀 [${requestId}] Profiles API Request Started at ${new Date().toISOString()}`);
    
    // Check cache first
    const cacheKey = 'profiles-list';
    const cached = cache.get(cacheKey);
    if (cached) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] CACHE HIT - Returning cached profiles data in ${cacheTime}ms`);
      return NextResponse.json(cached);
    }
    
    console.log(`🔄 [${requestId}] CACHE MISS - Fetching fresh data from database`);
    console.log(`Starting GET profiles request... [${requestId}]`);
    
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const dbStartTime = Date.now();
    const pool = await getPgPool();
    const dbConnectTime = Date.now() - dbStartTime;
    console.log(`🔗 [${requestId}] Database pool obtained successfully in ${dbConnectTime}ms`);
    
    const queryStartTime = Date.now();
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(ps_count.cnt, 0) AS permission_set_count
       FROM public.profiles p
       LEFT JOIN (
         SELECT profile_id, COUNT(*) AS cnt
         FROM public.profile_permission_sets
         GROUP BY profile_id
       ) ps_count ON ps_count.profile_id = p.id
       ORDER BY p.created_at DESC`
    );
    
    const queryTime = Date.now() - queryStartTime;
    const totalTime = Date.now() - startTime;
    console.log(`📊 [${requestId}] Profiles query executed successfully in ${queryTime}ms, rows: ${rows.length}`);
    console.log(`📊 [${requestId}] PERFORMANCE BREAKDOWN:`);
    console.log(`   - Database connection: ${dbConnectTime}ms`);
    console.log(`   - Query execution: ${queryTime}ms`);
    console.log(`   - TOTAL TIME: ${totalTime}ms`);
    
    // Cache the result for 10 minutes
    cache.set(cacheKey, rows, 10 * 60 * 1000);
    console.log(`💾 [${requestId}] Data cached for 10 minutes`);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: 'Failed to fetch profiles', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    
    const pool = await getPgPool();
    const { rows } = await pool.query(
      `INSERT INTO public.profiles (id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [randomUUID(), name, description || null]
    );
    
    // Invalidate cache after profile creation
    cache.delete('profiles-list');
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ 
      error: 'Failed to create profile', 
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
      `UPDATE public.profiles SET name=$2, description=$3 WHERE id=$1 RETURNING *`,
      [id, name, description || null]
    );
    if (rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Invalidate cache after profile update
    cache.delete('profiles-list');
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ 
      error: 'Failed to update profile', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    
    const pool = await getPgPool();
    await pool.query(`DELETE FROM public.profiles WHERE id=$1`, [id]);
    
    // Invalidate cache after profile deletion
    cache.delete('profiles-list');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ 
      error: 'Failed to delete profile', 
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}


