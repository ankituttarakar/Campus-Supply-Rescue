import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const category_id = searchParams.get('category_id');
    const department_id = searchParams.get('department_id');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status') || 'AVAILABLE';
    const min_qty = parseInt(searchParams.get('min_qty') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const conditions: string[] = [];
    const params: any[] = [];

    if (status === 'AVAILABLE') {
      conditions.push(`s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')`);
      conditions.push(`s.quantity_available > 0`);
    } else if (status !== 'ALL') {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    if (category_id) {
      params.push(parseInt(category_id, 10));
      conditions.push(`s.category_id = $${params.length}`);
    }

    if (department_id) {
      params.push(parseInt(department_id, 10));
      conditions.push(`s.department_id = $${params.length}`);
    }

    if (condition) {
      params.push(condition);
      conditions.push(`s.condition = $${params.length}`);
    }

    if (min_qty > 0) {
      params.push(min_qty);
      conditions.push(`s.quantity_available >= $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const pIdx = params.length;
      conditions.push(`(s.title ILIKE $${pIdx} OR s.description ILIKE $${pIdx} OR s.location_details ILIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const limitIdx = params.length;

    const sql = `
      SELECT 
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
        u.email AS contributor_email
      FROM supplies s
      JOIN departments d ON s.department_id = d.id
      JOIN supply_categories c ON s.category_id = c.id
      JOIN users u ON s.created_by_user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${limitIdx};
    `;

    const res = await query(sql, params);
    return NextResponse.json({ supplies: res.rows, count: res.rows.length });
  } catch (error: any) {
    console.error('[Supplies GET API Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch supplies.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      title,
      description,
      category_id,
      quantity_total,
      condition,
      location_details,
      estimated_replacement_value,
      availability_until,
    } = body;

    if (!title || !description || !category_id || !quantity_total || !condition || !location_details) {
      return NextResponse.json({ error: 'Missing required supply fields.' }, { status: 400 });
    }

    const qty = parseInt(quantity_total, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer greater than zero.' }, { status: 400 });
    }

    const extCheck = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    const hasPgVector = extCheck.rows.length > 0;

    // Fetch category name for embedding text construction
    const catRes = await query('SELECT name FROM supply_categories WHERE id = $1;', [category_id]);
    const categoryName = catRes.rows[0]?.name || 'Supplies';

    // Construct text representation and compute 384-dimensional vector embedding
    const textToEmbed = `${title}. Category: ${categoryName}. Description: ${description}. Condition: ${condition}. Location: ${location_details}.`;
    const vector = await generateEmbedding(textToEmbed);

    const estVal = estimated_replacement_value ? parseFloat(estimated_replacement_value) : null;

    let insertSql = '';
    let insertParams: any[] = [];

    if (hasPgVector) {
      insertSql = `
        INSERT INTO supplies (
          department_id, created_by_user_id, category_id, title, description,
          quantity_total, quantity_available, quantity_reserved, quantity_transferred_out,
          condition, location_details, estimated_replacement_value, availability_until, status, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $6, 0, 0, $7, $8, $9, $10, 'AVAILABLE', $11::vector)
        RETURNING id, title, quantity_total, status, created_at;
      `;
      insertParams = [
        user.department_id, user.id, category_id, title, description,
        qty, condition, location_details, estVal, availability_until || null, formatVectorForPg(vector)
      ];
    } else {
      insertSql = `
        INSERT INTO supplies (
          department_id, created_by_user_id, category_id, title, description,
          quantity_total, quantity_available, quantity_reserved, quantity_transferred_out,
          condition, location_details, estimated_replacement_value, availability_until, status, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $6, 0, 0, $7, $8, $9, $10, 'AVAILABLE', $11)
        RETURNING id, title, quantity_total, status, created_at;
      `;
      insertParams = [
        user.department_id, user.id, category_id, title, description,
        qty, condition, location_details, estVal, availability_until || null, vector
      ];
    }

    const res = await query(insertSql, insertParams);
    const newSupply = res.rows[0];

    // Record initial LISTED event in the Rescue Chain
    await query(
      `INSERT INTO rescue_chain_events (
         supply_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
       ) VALUES ($1, $2, $2, $3, 'LISTED', 'Initial surplus registration by department staff', $4);`,
      [newSupply.id, user.department_id, qty, user.id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'CREATE_SUPPLY', 'supplies', $2, $3);`,
      [user.id, newSupply.id, JSON.stringify({ title, quantity: qty, department_id: user.department_id })]
    );

    return NextResponse.json({
      success: true,
      supply: newSupply,
      message: `Surplus listing "${title}" registered successfully with semantic embedding.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Supplies POST API Error]', error);
    return NextResponse.json({ error: error?.message || 'Failed to register surplus supply.' }, { status: 500 });
  }
}
