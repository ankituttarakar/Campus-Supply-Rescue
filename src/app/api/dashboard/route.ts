import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Overall Campus Impact KPI Summary
    const statsRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM supplies WHERE status IN ('AVAILABLE', 'PARTIALLY_RESERVED')) AS active_listings_count,
        (SELECT COALESCE(SUM(quantity_available), 0) FROM supplies WHERE status IN ('AVAILABLE', 'PARTIALLY_RESERVED')) AS active_available_units,
        (SELECT COUNT(*) FROM supply_requests WHERE status IN ('OPEN', 'PARTIALLY_FULFILLED')) AS open_requests_count,
        (SELECT COUNT(*) FROM transfers) AS total_transfers_count,
        (SELECT COALESCE(SUM(quantity), 0) FROM transfers) AS total_units_rescued,
        (SELECT COALESCE(SUM(t.quantity * COALESCE(s.estimated_replacement_value / NULLIF(s.quantity_total, 0), 0)), 0)::NUMERIC(10,2)
         FROM transfers t
         JOIN supplies s ON t.supply_id = s.id) AS total_avoided_procurement_value;
    `);

    // 2. Department-level Statistics from Relational View
    const deptStatsRes = await query(`
      SELECT * FROM view_department_rescue_stats
      ORDER BY total_items_donated DESC;
    `);

    // 3. Category Surplus Analysis from Relational View
    const categoryStatsRes = await query(`
      SELECT * FROM view_category_surplus_analysis
      ORDER BY active_listings_count DESC;
    `);

    // 4. Live Global Rescue Timeline from View
    const timelineRes = await query(`
      SELECT * FROM view_recent_rescue_timeline
      LIMIT 10;
    `);

    return NextResponse.json({
      summary: statsRes.rows[0] || {
        active_listings_count: 0,
        active_available_units: 0,
        open_requests_count: 0,
        total_transfers_count: 0,
        total_units_rescued: 0,
        total_avoided_procurement_value: '0.00',
      },
      departments: deptStatsRes.rows,
      categories: categoryStatsRes.rows,
      recent_timeline: timelineRes.rows,
    });
  } catch (error: any) {
    console.error('[Dashboard API Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load dashboard metrics.' }, { status: 500 });
  }
}
