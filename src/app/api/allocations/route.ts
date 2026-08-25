import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'all'; // 'incoming', 'outgoing', 'all'

    let whereClause = '';
    const params: any[] = [];

    if (user.role !== 'ADMIN') {
      if (scope === 'incoming') {
        // Requests made to reserve supplies owned by user's department
        params.push(user.department_id);
        whereClause = `WHERE s.department_id = $1`;
      } else if (scope === 'outgoing') {
        // Requests made by user's department to reserve supplies from other departments
        params.push(user.department_id);
        whereClause = `WHERE r.requesting_department_id = $1`;
      } else {
        params.push(user.department_id);
        whereClause = `WHERE (s.department_id = $1 OR r.requesting_department_id = $1)`;
      }
    }

    const sql = `
      SELECT 
        a.id,
        a.request_id,
        a.supply_id,
        a.allocated_quantity,
        a.allocation_status,
        a.reserved_at,
        a.completed_at,
        a.created_at,
        s.title AS supply_title,
        s.condition AS supply_condition,
        s.location_details AS supply_location,
        s.quantity_available AS supply_current_available,
        s.quantity_reserved AS supply_current_reserved,
        d_src.id AS source_department_id,
        d_src.name AS source_department_name,
        d_src.code AS source_department_code,
        d_recv.id AS receiving_department_id,
        d_recv.name AS receiving_department_name,
        d_recv.code AS receiving_department_code,
        u_res.full_name AS reserved_by_name,
        r.purpose_description AS request_purpose,
        r.urgency AS request_urgency
      FROM supply_allocations a
      JOIN supplies s ON a.supply_id = s.id
      JOIN supply_requests r ON a.request_id = r.id
      JOIN departments d_src ON s.department_id = d_src.id
      JOIN departments d_recv ON r.requesting_department_id = d_recv.id
      JOIN users u_res ON a.reserved_by_user_id = u_res.id
      ${whereClause}
      ORDER BY a.reserved_at DESC;
    `;

    const res = await query(sql, params);
    return NextResponse.json({ allocations: res.rows, count: res.rows.length });
  } catch (error: any) {
    console.error('[Allocations GET Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch allocations.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { request_id, supply_id, quantity } = body;

    if (!request_id || !supply_id || !quantity) {
      return NextResponse.json({ error: 'request_id, supply_id, and quantity are required.' }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer.' }, { status: 400 });
    }

    // Call stored procedure sp_reserve_supply
    const procRes = await query(
      `SELECT sp_reserve_supply($1, $2, $3, $4) AS result;`,
      [request_id, supply_id, qty, user.id]
    );

    const result = procRes.rows[0]?.result;

    if (!result || !result.success) {
      return NextResponse.json({ error: result?.error || 'Reservation transaction failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      allocation_id: result.allocation_id,
      message: result.message,
      details: result,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Allocations POST Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to reserve supply.' }, { status: 500 });
  }
}
