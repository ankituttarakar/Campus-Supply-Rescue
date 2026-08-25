import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplyId = parseInt(params.id, 10);
    if (isNaN(supplyId)) {
      return NextResponse.json({ error: 'Invalid supply ID.' }, { status: 400 });
    }

    // 1. Fetch Supply Details
    const supplyRes = await query(
      `SELECT 
        s.id,
        s.title,
        s.description,
        s.quantity_total,
        s.quantity_available,
        s.quantity_reserved,
        s.quantity_transferred_out,
        s.condition,
        s.location_details,
        s.estimated_replacement_value,
        s.availability_until,
        s.status,
        s.created_at,
        s.updated_at,
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        d.building AS department_building,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.icon_name AS category_icon,
        u.id AS contributor_user_id,
        u.full_name AS contributor_name,
        u.email AS contributor_email,
        u.phone AS contributor_phone
      FROM supplies s
      JOIN departments d ON s.department_id = d.id
      JOIN supply_categories c ON s.category_id = c.id
      JOIN users u ON s.created_by_user_id = u.id
      WHERE s.id = $1;`,
      [supplyId]
    );

    if (supplyRes.rows.length === 0) {
      return NextResponse.json({ error: 'Supply not found.' }, { status: 404 });
    }

    const supply = supplyRes.rows[0];

    // 2. Fetch Rescue Chain Events (Multi-Hop Provenance Timeline)
    const eventsRes = await query(
      `SELECT 
        e.id,
        e.supply_id,
        e.allocation_id,
        e.transfer_id,
        e.quantity,
        e.event_type,
        e.notes,
        e.created_at,
        d_from.name AS from_department_name,
        d_from.code AS from_department_code,
        d_to.name AS to_department_name,
        d_to.code AS to_department_code,
        u.full_name AS actor_name
      FROM rescue_chain_events e
      JOIN departments d_from ON e.from_department_id = d_from.id
      JOIN departments d_to ON e.to_department_id = d_to.id
      JOIN users u ON e.user_id = u.id
      WHERE e.supply_id = $1
      ORDER BY e.created_at ASC;`,
      [supplyId]
    );

    // 3. Fetch Related Supplies from the same category
    const relatedRes = await query(
      `SELECT s.id, s.title, s.quantity_available, s.condition, d.name AS department_name, c.name AS category_name
       FROM supplies s
       JOIN departments d ON s.department_id = d.id
       JOIN supply_categories c ON s.category_id = c.id
       WHERE s.category_id = $1 AND s.id != $2 AND s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
       LIMIT 4;`,
      [supply.category_id, supplyId]
    );

    return NextResponse.json({
      supply,
      rescue_chain: eventsRes.rows,
      related_supplies: relatedRes.rows,
    });
  } catch (error: any) {
    console.error('[Supply Detail API Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to retrieve supply details.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const supplyId = parseInt(params.id, 10);
    const body = await req.json();

    // Check ownership
    const checkRes = await query('SELECT department_id, status FROM supplies WHERE id = $1;', [supplyId]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Supply not found.' }, { status: 404 });
    }

    const existing = checkRes.rows[0];
    if (user.role !== 'ADMIN' && user.department_id !== existing.department_id) {
      return NextResponse.json({ error: 'Unauthorized: You can only edit supplies registered by your department.' }, { status: 403 });
    }

    const { location_details, estimated_replacement_value, status } = body;

    const updates: string[] = [];
    const paramsList: any[] = [supplyId];

    if (location_details) {
      paramsList.push(location_details);
      updates.push(`location_details = $${paramsList.length}`);
    }

    if (estimated_replacement_value !== undefined) {
      paramsList.push(estimated_replacement_value ? parseFloat(estimated_replacement_value) : null);
      updates.push(`estimated_replacement_value = $${paramsList.length}`);
    }

    if (status && ['AVAILABLE', 'WITHDRAWN'].includes(status)) {
      paramsList.push(status);
      updates.push(`status = $${paramsList.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No valid update fields supplied.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateSql = `
      UPDATE supplies 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, title, status, location_details, updated_at;
    `;

    const res = await query(updateSql, paramsList);

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'UPDATE_SUPPLY', 'supplies', $2, $3);`,
      [user.id, supplyId, JSON.stringify(body)]
    );

    return NextResponse.json({
      success: true,
      supply: res.rows[0],
      message: 'Supply record updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update supply.' }, { status: 500 });
  }
}
