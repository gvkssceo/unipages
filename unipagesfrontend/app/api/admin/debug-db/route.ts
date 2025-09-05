import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    const pool = await getPgPool();
    console.log('✅ Database pool obtained successfully');
    
    // Test a simple query
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0]);
    
    // Check if profile_permission_sets table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profile_permission_sets'
      )
    `);
    
    console.log('🔍 Table exists check:', tableCheck.rows[0]);
    
    return NextResponse.json({
      success: true,
      databaseConnected: true,
      currentTime: result.rows[0].current_time,
      tableExists: tableCheck.rows[0].exists
    });
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, { status: 500 });
  }
}
