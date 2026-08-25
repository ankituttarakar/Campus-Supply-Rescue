import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth('ADMIN');
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const conditions: string[] = [];
    const params: any[] = [];

    if (action) {
      params.push(`%${action}%`);
      conditions.push(`a.action ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const limitIdx = params.length;

    const sql = `
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.created_at,
        u.id AS user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        d.name AS department_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${limitIdx};
    `;

    const res = await query(sql, params);
    return NextResponse.json({ audit_logs: res.rows, count: res.rows.length });
  } catch (error: any) {
    console.error('[Admin Audit API Error]', error);
    const status = error?.message?.includes('FORBIDDEN') ? 403 : error?.message?.includes('UNAUTHORIZED') ? 401 : 500;
    return NextResponse.json({ error: error?.message || 'Access denied.' }, { status });
  }
}
