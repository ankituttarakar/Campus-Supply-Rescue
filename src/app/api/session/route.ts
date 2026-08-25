import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, checkDatabaseHealth } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const health = await checkDatabaseHealth();

    // Fetch active departments & categories for app dropdowns
    let departments: any[] = [];
    let categories: any[] = [];

    if (health.connected) {
      const deptRes = await query('SELECT id, name, code, building FROM departments ORDER BY name ASC;');
      departments = deptRes.rows;

      const catRes = await query('SELECT id, name, slug, icon_name FROM supply_categories ORDER BY name ASC;');
      categories = catRes.rows;
    }

    return NextResponse.json({
      user: session?.user || null,
      database: health,
      departments,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({
      user: null,
      database: { connected: false, error: error?.message },
      departments: [],
      categories: [],
    });
  }
}
