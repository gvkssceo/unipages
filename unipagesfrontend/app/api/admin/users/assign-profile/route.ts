import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(session.user as any)?.roles?.includes('admin')) return null;
  return session as any;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { user_id, profile_id } = await request.json();
  if (!user_id || !profile_id) return NextResponse.json({ error: 'user_id and profile_id are required' }, { status: 400 });
  const pool = await getPgPool();
  await pool.query(
    `INSERT INTO public.user_profiles (id, user_id, profile_id)
     VALUES (gen_random_uuid(), $1, $2)
     ON CONFLICT (user_id) DO UPDATE SET profile_id = EXCLUDED.profile_id`,
    [user_id, profile_id]
  );
  return NextResponse.json({ success: true });
}


