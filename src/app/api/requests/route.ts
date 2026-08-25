import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department_id = searchParams.get('department_id');
    const status = searchParams.get('status');

    const conditions: string[] = [];
    const params: any[] = [];

    if (department_id) {
      params.push(parseInt(department_id, 10));
      conditions.push(`r.requesting_department_id = $${params.length}`);
    }

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        r.id,
        r.purpose_description,
        r.requested_quantity,
        r.fulfilled_quantity,
        r.urgency,
        r.status,
        r.notes,
        r.created_at,
        r.updated_at,
        d.id AS requesting_department_id,
        d.name AS requesting_department_name,
        d.code AS requesting_department_code,
        d.building AS requesting_department_building,
        u.id AS requested_by_user_id,
        u.full_name AS requester_name,
        c.id AS preferred_category_id,
        c.name AS preferred_category_name,
        c.icon_name AS preferred_category_icon
      FROM supply_requests r
      JOIN departments d ON r.requesting_department_id = d.id
      JOIN users u ON r.requested_by_user_id = u.id
      LEFT JOIN supply_categories c ON r.preferred_category_id = c.id
      ${whereClause}
      ORDER BY 
        CASE r.urgency 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        r.created_at DESC;
    `;

    const res = await query(sql, params);
    return NextResponse.json({ requests: res.rows, count: res.rows.length });
  } catch (error: any) {
    console.error('[Requests GET Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch requests.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      purpose_description,
      requested_quantity,
      urgency = 'MEDIUM',
      preferred_category_id,
      notes,
    } = body;

    if (!purpose_description || !requested_quantity) {
      return NextResponse.json({ error: 'Purpose description and requested quantity are required.' }, { status: 400 });
    }

    const qty = parseInt(requested_quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Requested quantity must be a positive integer.' }, { status: 400 });
    }

    const extCheck = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    const hasPgVector = extCheck.rows.length > 0;

    let catName = '';
    if (preferred_category_id) {
      const catRes = await query('SELECT name FROM supply_categories WHERE id = $1;', [preferred_category_id]);
      catName = catRes.rows[0]?.name || '';
    }

    const textToEmbed = `${purpose_description}. Category: ${catName}. Notes: ${notes || ''}.`;
    const vector = await generateEmbedding(textToEmbed);

    let insertSql = '';
    let insertParams: any[] = [];

    if (hasPgVector) {
      insertSql = `
        INSERT INTO supply_requests (
          requesting_department_id, requested_by_user_id, purpose_description,
          requested_quantity, fulfilled_quantity, urgency, preferred_category_id, status, notes, embedding
        ) VALUES ($1, $2, $3, $4, 0, $5, $6, 'OPEN', $7, $8::vector)
        RETURNING id, purpose_description, requested_quantity, urgency, status, created_at;
      `;
      insertParams = [
        user.department_id, user.id, purpose_description, qty, urgency,
        preferred_category_id || null, notes || null, formatVectorForPg(vector)
      ];
    } else {
      insertSql = `
        INSERT INTO supply_requests (
          requesting_department_id, requested_by_user_id, purpose_description,
          requested_quantity, fulfilled_quantity, urgency, preferred_category_id, status, notes, embedding
        ) VALUES ($1, $2, $3, $4, 0, $5, $6, 'OPEN', $7, $8)
        RETURNING id, purpose_description, requested_quantity, urgency, status, created_at;
      `;
      insertParams = [
        user.department_id, user.id, purpose_description, qty, urgency,
        preferred_category_id || null, notes || null, vector
      ];
    }

    const res = await query(insertSql, insertParams);
    const newRequest = res.rows[0];

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'CREATE_REQUEST', 'supply_requests', $2, $3);`,
      [user.id, newRequest.id, JSON.stringify({ qty, urgency, department_id: user.department_id })]
    );

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: 'Supply need registered successfully. Matching with existing campus surplus...',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Requests POST Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit request.' }, { status: 500 });
  }
}
