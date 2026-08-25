import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      text,
      category_id,
      department_id,
      condition,
      min_qty = 1,
      threshold = 0.25,
      limit = 20,
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Search text query is required for semantic matching.' }, { status: 400 });
    }

    // Check if pgvector is enabled
    const extCheck = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    const hasPgVector = extCheck.rows.length > 0;

    // 1. Generate dense 384d vector embedding locally
    const vector = await generateEmbedding(text);

    let sql = '';
    const params: any[] = [];
    const conditions: string[] = [
      `s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')`,
      `s.quantity_available >= $2`,
      `s.embedding IS NOT NULL`
    ];

    if (hasPgVector) {
      params.push(formatVectorForPg(vector), min_qty, threshold);
      conditions.push(`(1 - (s.embedding <=> $1::vector)) >= $3`);

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
      params.push(limit);
      const limitIdx = params.length;

      sql = `
        SELECT 
          s.id,
          s.title,
          s.description,
          s.quantity_total,
          s.quantity_available,
          s.quantity_reserved,
          s.condition,
          s.location_details,
          s.estimated_replacement_value,
          s.availability_until,
          s.status,
          s.created_at,
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
          ROUND((1 - (s.embedding <=> $1::vector))::numeric, 3) AS similarity_score
        FROM supplies s
        JOIN departments d ON s.department_id = d.id
        JOIN supply_categories c ON s.category_id = c.id
        JOIN users u ON s.created_by_user_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.embedding <=> $1::vector ASC
        LIMIT $${limitIdx};
      `;
    } else {
      // Adaptive mode: Pure PostgreSQL vector calculation using fn_cosine_similarity
      params.push(vector, min_qty, threshold);
      conditions.push(`fn_cosine_similarity(s.embedding, $1) >= $3`);

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
      params.push(limit);
      const limitIdx = params.length;

      sql = `
        SELECT 
          s.id,
          s.title,
          s.description,
          s.quantity_total,
          s.quantity_available,
          s.quantity_reserved,
          s.condition,
          s.location_details,
          s.estimated_replacement_value,
          s.availability_until,
          s.status,
          s.created_at,
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
          ROUND(fn_cosine_similarity(s.embedding, $1), 3) AS similarity_score
        FROM supplies s
        JOIN departments d ON s.department_id = d.id
        JOIN supply_categories c ON s.category_id = c.id
        JOIN users u ON s.created_by_user_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY fn_cosine_similarity(s.embedding, $1) DESC
        LIMIT $${limitIdx};
      `;
    }

    const res = await query(sql, params);
    const queryDurationMs = Date.now() - startTime;

    return NextResponse.json({
      query: text,
      results: res.rows,
      count: res.rows.length,
      execution_time_ms: queryDurationMs,
      similarity_metric: hasPgVector ? 'pgvector HNSW Cosine Distance (<=>)' : 'PostgreSQL Cosine Similarity Function',
      embedding_dimensions: 384,
    });
  } catch (error: any) {
    console.error('[Semantic Search API Error]', error);
    return NextResponse.json({ error: error?.message || 'Semantic search failed.' }, { status: 500 });
  }
}
