import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '@/utils/db';

// Ensure Node.js runtime (required for 'pg')
export const runtime = 'nodejs';

// Update profile by name
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description = '', type = 'Standard' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    const pool = await getPgPool();

    // Check if profile exists
    const profileCheck = await pool.query(
      'SELECT id FROM public.profiles WHERE name = $1',
      [name]
    );

    if (profileCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update profile in database
    const result = await pool.query(
      `UPDATE public.profiles 
       SET description = $1, type = $2, updated_at = CURRENT_TIMESTAMP
       WHERE name = $3
       RETURNING id, name, description, type, created_at, updated_at`,
      [description, type, name]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updatedProfile = result.rows[0];
    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: {
        id: updatedProfile.id,
        name: updatedProfile.name,
        description: updatedProfile.description,
        type: updatedProfile.type,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update profile', 
      details: errorMessage 
    }, { status: 500 });
  }
}
