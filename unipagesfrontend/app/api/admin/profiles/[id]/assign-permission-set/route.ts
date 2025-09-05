import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(session.user as any)?.roles?.includes('admin')) return null;
  return session as any;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🔍 POST method started');
    
    const session = await requireAdmin();
    if (!session) {
      console.log('❌ Authentication failed - no session or not admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.log('✅ Authentication successful');
    
    const { permission_set_id } = await request.json();
    const resolvedParams = await params;
    
    console.log(`🔍 POST request - Profile ID: ${resolvedParams.id}, Permission Set ID: ${permission_set_id}`);
    
    if (!permission_set_id) {
      console.log('❌ Error: permission_set_id is required');
      return NextResponse.json({ error: 'permission_set_id is required' }, { status: 400 });
    }
    
    console.log('🔍 Getting database pool...');
    const pool = await getPgPool();
    console.log('✅ Database pool obtained');
    
    // Simple test query first
    console.log('🔍 Testing simple query...');
    const testResult = await pool.query('SELECT 1 as test');
    console.log('✅ Simple query successful:', testResult.rows[0]);
    
    const insertResult = await pool.query(
      `INSERT INTO public.profile_permission_sets (id, profile_id, permission_set_id)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (profile_id, permission_set_id) DO NOTHING
       RETURNING id`,
      [resolvedParams.id, permission_set_id]
    );
    
    console.log(`✅ Successfully inserted/updated record. Rows affected: ${insertResult.rowCount || 0}`);
    
    return NextResponse.json({ 
      success: true, 
      inserted: (insertResult.rowCount || 0) > 0,
      recordId: insertResult.rows[0]?.id 
    });
  } catch (error) {
    console.error('❌ Error in POST method:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('🔍 DELETE method started');
    
    const session = await requireAdmin();
    if (!session) {
      console.log('❌ Authentication failed - no session or not admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.log('✅ Authentication successful');
    
    const { searchParams } = new URL(request.url);
    const permission_set_id = searchParams.get('permission_set_id');
    const resolvedParams = await params;
    
    console.log(`🔍 DELETE request - Profile ID: ${resolvedParams.id}, Permission Set ID: ${permission_set_id}`);
    
    if (!permission_set_id) {
      console.log('❌ Error: permission_set_id is required');
      return NextResponse.json({ error: 'permission_set_id is required' }, { status: 400 });
    }
    
    console.log('🔍 Getting database pool...');
    const pool = await getPgPool();
    console.log('✅ Database pool obtained');
    
    // Simple test query first
    console.log('🔍 Testing simple query...');
    const testResult = await pool.query('SELECT 1 as test');
    console.log('✅ Simple query successful:', testResult.rows[0]);
    
    // Check if the record exists
    console.log('🔍 Checking if record exists...');
    const checkResult = await pool.query(
      `SELECT COUNT(*) FROM public.profile_permission_sets WHERE profile_id = $1 AND permission_set_id = $2`,
      [resolvedParams.id, permission_set_id]
    );
    console.log('✅ Check query successful, count:', checkResult.rows[0].count);
    
    // Try the delete
    console.log('🔍 Attempting delete...');
    const deleteResult = await pool.query(
      `DELETE FROM public.profile_permission_sets WHERE profile_id = $1 AND permission_set_id = $2`,
      [resolvedParams.id, permission_set_id]
    );
    
    console.log(`✅ Successfully deleted ${deleteResult.rowCount} record(s)`);
    
    return NextResponse.json({ success: true, deletedCount: deleteResult.rowCount });
  } catch (error) {
    console.error('❌ Error in DELETE method:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}


