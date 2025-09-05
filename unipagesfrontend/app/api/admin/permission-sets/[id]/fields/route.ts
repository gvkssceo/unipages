import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPgPool } from '@/utils/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(session.user as any)?.roles?.includes('admin')) return null;
  return session as any;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Temporarily comment out authentication for testing
  // const session = await requireAdmin();
  // if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  const pool = await getPgPool();
  const { rows } = await pool.query(
    `SELECT fa.*, ta.table_name
       FROM public.permission_set_field_access fa
       JOIN public.permission_set_table_access ta ON ta.id = fa.table_access_id
      WHERE ta.permission_set_id = $1
      ORDER BY ta.table_name, fa.field_name`,
    [id]
  );
  return NextResponse.json({ fields: rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  const { table_name, field_name, can_view, can_edit } = await request.json();
  if (!table_name || !field_name) return NextResponse.json({ error: 'table_name and field_name are required' }, { status: 400 });
  const pool = await getPgPool();
  // Ensure table access exists
  const { rows: taRows } = await pool.query(
    `INSERT INTO public.permission_set_table_access (id, permission_set_id, table_name)
     VALUES (gen_random_uuid(), $1, $2)
     ON CONFLICT (permission_set_id, table_name) DO UPDATE SET table_name = EXCLUDED.table_name
     RETURNING id`,
    [id, table_name]
  );
  const tableAccessId = taRows[0].id as string;
  const { rows } = await pool.query(
    `INSERT INTO public.permission_set_field_access (id, table_access_id, field_name, can_view, can_edit)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     ON CONFLICT (table_access_id, field_name) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit
     RETURNING *`,
    [tableAccessId, field_name, Boolean(can_view), Boolean(can_edit)]
  );
  return NextResponse.json(rows[0]);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  const { fieldId, permissions } = await request.json();
  
  if (!fieldId || !permissions) {
    return NextResponse.json({ error: 'fieldId and permissions are required' }, { status: 400 });
  }

  const pool = await getPgPool();
  
  // Update field permissions
  const result = await pool.query(`
    UPDATE public.permission_set_field_access 
    SET 
      can_view = $2,
      can_edit = $3
    WHERE id = $1
    RETURNING *
  `, [
    fieldId,
    permissions.can_view || false,
    permissions.can_edit || false
  ]);
  
  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'Field access not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const pool = await getPgPool();
  await pool.query(`DELETE FROM public.permission_set_field_access WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}


