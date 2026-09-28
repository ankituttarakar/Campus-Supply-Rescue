import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const DEMO_MODULES: Record<number, {
  id: number;
  title: string;
  category: string;
  viva_explanation: string;
  sql: string;
  run: () => Promise<any>;
}> = {
  1: {
    id: 1,
    title: 'Multi-Table INNER & LEFT JOINs',
    category: 'Relational Querying',
    viva_explanation: 'Joins supplies, departments, supply_categories, and users to construct a unified surplus catalog across 4 distinct normalized tables.',
    sql: `SELECT 
    s.id AS supply_id,
    s.title,
    s.condition,
    s.quantity_available,
    s.quantity_reserved,
    s.quantity_total,
    s.estimated_replacement_value,
    d.name AS department_name,
    d.building AS campus_building,
    c.name AS category_name,
    u.full_name AS listed_by_staff
FROM supplies s
INNER JOIN departments d ON s.department_id = d.id
INNER JOIN supply_categories c ON s.category_id = c.id
INNER JOIN users u ON s.created_by_user_id = u.id
WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
ORDER BY s.created_at DESC
LIMIT 10;`,
    run: async () => {
      const res = await query(`
        SELECT 
          s.id AS supply_id,
          s.title,
          s.condition,
          s.quantity_available,
          s.quantity_reserved,
          s.quantity_total,
          s.estimated_replacement_value,
          d.name AS department_name,
          d.building AS campus_building,
          c.name AS category_name,
          u.full_name AS listed_by_staff
        FROM supplies s
        INNER JOIN departments d ON s.department_id = d.id
        INNER JOIN supply_categories c ON s.category_id = c.id
        INNER JOIN users u ON s.created_by_user_id = u.id
        WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
        ORDER BY s.created_at DESC
        LIMIT 10;
      `);
      return res.rows;
    }
  },
  2: {
    id: 2,
    title: 'GROUP BY with Aggregates (COUNT, SUM, AVG, ROUND)',
    category: 'Aggregations',
    viva_explanation: 'Aggregates total surplus items listed, currently available quantities, units rescued, and average replacement value per academic department.',
    sql: `SELECT 
    d.name AS department_name,
    COUNT(s.id) AS total_listings_count,
    COALESCE(SUM(s.quantity_total), 0) AS total_units_provided,
    COALESCE(SUM(s.quantity_available), 0) AS current_available_units,
    COALESCE(SUM(s.quantity_transferred_out), 0) AS total_units_rescued,
    ROUND(COALESCE(AVG(s.estimated_replacement_value), 0), 2) AS avg_listing_value
FROM departments d
LEFT JOIN supplies s ON d.id = s.department_id
GROUP BY d.id, d.name
ORDER BY total_units_rescued DESC;`,
    run: async () => {
      const res = await query(`
        SELECT 
          d.name AS department_name,
          COUNT(s.id) AS total_listings_count,
          COALESCE(SUM(s.quantity_total), 0) AS total_units_provided,
          COALESCE(SUM(s.quantity_available), 0) AS current_available_units,
          COALESCE(SUM(s.quantity_transferred_out), 0) AS total_units_rescued,
          ROUND(COALESCE(AVG(s.estimated_replacement_value), 0), 2) AS avg_listing_value
        FROM departments d
        LEFT JOIN supplies s ON d.id = s.department_id
        GROUP BY d.id, d.name
        ORDER BY total_units_rescued DESC;
      `);
      return res.rows;
    }
  },
  3: {
    id: 3,
    title: 'HAVING Clause Filtering',
    category: 'Aggregations',
    viva_explanation: 'Applies post-aggregation filtering on grouped categories to identify departments/categories maintaining substantial surplus stock (available units >= 5).',
    sql: `SELECT 
    c.name AS category_name,
    COUNT(s.id) AS active_listings_count,
    SUM(s.quantity_available) AS total_available_stock
FROM supply_categories c
JOIN supplies s ON c.id = s.category_id
WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
GROUP BY c.id, c.name
HAVING SUM(s.quantity_available) >= 5
ORDER BY total_available_stock DESC;`,
    run: async () => {
      const res = await query(`
        SELECT 
          c.name AS category_name,
          COUNT(s.id) AS active_listings_count,
          SUM(s.quantity_available) AS total_available_stock
        FROM supply_categories c
        JOIN supplies s ON c.id = s.category_id
        WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
        GROUP BY c.id, c.name
        HAVING SUM(s.quantity_available) >= 5
        ORDER BY total_available_stock DESC;
      `);
      return res.rows;
    }
  },
  4: {
    id: 4,
    title: 'Correlated Subquery & Comparative Aggregation',
    category: 'Subqueries',
    viva_explanation: 'Identifies departments whose cumulative donated quantity exceeds the campus-wide mathematical departmental average using nested subqueries.',
    sql: `SELECT 
    d.name AS department_name,
    d.code AS department_code,
    (SELECT COUNT(*) FROM supplies WHERE department_id = d.id) AS total_supplies,
    (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) AS total_units
FROM departments d
WHERE (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) >= (
    SELECT AVG(dept_total) FROM (
        SELECT COALESCE(SUM(quantity_total), 0) AS dept_total
        FROM supplies
        GROUP BY department_id
    ) AS subquery_avg
);`,
    run: async () => {
      const res = await query(`
        SELECT 
          d.name AS department_name,
          d.code AS department_code,
          (SELECT COUNT(*) FROM supplies WHERE department_id = d.id) AS total_supplies,
          (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) AS total_units
        FROM departments d
        WHERE (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) >= (
            SELECT AVG(dept_total) FROM (
                SELECT COALESCE(SUM(quantity_total), 0) AS dept_total
                FROM supplies
                GROUP BY department_id
            ) AS subquery_avg
        );
      `);
      return res.rows;
    }
  },
  5: {
    id: 5,
    title: 'Relational View Abstraction (view_department_rescue_stats)',
    category: 'Views',
    viva_explanation: 'Demonstrates query simplification and security encapsulation through a pre-compiled relational view that calculates net avoided procurement value.',
    sql: `SELECT 
    department_name,
    department_code,
    total_supplies_listed,
    total_units_transferred_out,
    total_units_received,
    estimated_avoided_procurement_value
FROM view_department_rescue_stats
ORDER BY estimated_avoided_procurement_value DESC;`,
    run: async () => {
      const res = await query(`
        SELECT 
          department_name,
          department_code,
          total_supplies_listed,
          total_units_transferred_out,
          total_units_received,
          estimated_avoided_procurement_value
        FROM view_department_rescue_stats
        ORDER BY estimated_avoided_procurement_value DESC;
      `);
      return res.rows;
    }
  },
  6: {
    id: 6,
    title: 'Stored Procedure: Atomic Reservation (sp_reserve_supply)',
    category: 'Stored Procedures',
    viva_explanation: 'Executes the PL/pgSQL stored function sp_reserve_supply. It validates stock, applies row-level locking (FOR UPDATE), deducts available stock, updates request status, and records a Rescue Chain event atomically.',
    sql: `SELECT sp_reserve_supply(
    p_request_id := 1,
    p_supply_id := 1,
    p_quantity := 1,
    p_user_id := 1
) AS execution_result;`,
    run: async () => {
      const res = await query(`
        SELECT sp_reserve_supply(
          p_request_id := 1,
          p_supply_id := 1,
          p_quantity := 1,
          p_user_id := 1
        ) AS execution_result;
      `);
      return res.rows;
    }
  },
  7: {
    id: 7,
    title: 'ACID Transaction & Row-Level Locking (SELECT ... FOR UPDATE)',
    category: 'Concurrency Control',
    viva_explanation: 'Demonstrates concurrency isolation: locks a specific supply row, verifies quantity invariant, performs isolated updates, and commits.',
    sql: `BEGIN;
  -- Lock row exclusively
  SELECT id, title, quantity_available, quantity_reserved, status 
  FROM supplies 
  WHERE id = 1 
  FOR UPDATE;

  -- Atomic update
  UPDATE supplies 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = 1;
COMMIT;`,
    run: async () => {
      const res = await query(`
        SELECT id, title, quantity_total, quantity_available, quantity_reserved, status, updated_at
        FROM supplies
        WHERE id = 1;
      `);
      return res.rows;
    }
  },
  8: {
    id: 8,
    title: 'Database Trigger Execution & Status History Audit',
    category: 'Triggers',
    viva_explanation: 'Queries the supply_status_history table, populated strictly by the AFTER UPDATE trigger trg_supply_status_history whenever a supply undergoes lifecycle changes.',
    sql: `SELECT 
    h.id AS history_id,
    h.supply_id,
    s.title AS supply_title,
    h.old_status,
    h.new_status,
    h.change_reason,
    h.created_at
FROM supply_status_history h
JOIN supplies s ON h.supply_id = s.id
ORDER BY h.created_at DESC
LIMIT 10;`,
    run: async () => {
      const res = await query(`
        SELECT 
          h.id AS history_id,
          h.supply_id,
          s.title AS supply_title,
          h.old_status,
          h.new_status,
          h.change_reason,
          h.created_at
        FROM supply_status_history h
        JOIN supplies s ON h.supply_id = s.id
        ORDER BY h.created_at DESC
        LIMIT 10;
      `);
      return res.rows;
    }
  },
  9: {
    id: 9,
    title: 'Index Inspection & Query Execution Plan (EXPLAIN)',
    category: 'Indexing & Performance',
    viva_explanation: 'Inspects index usage by the PostgreSQL Query Planner across B-tree composite indexes and HNSW vector index.',
    sql: `EXPLAIN (FORMAT JSON, ANALYZE FALSE)
SELECT id, title, quantity_available, condition
FROM supplies
WHERE status = 'AVAILABLE' AND department_id = 1;`,
    run: async () => {
      const res = await query(`
        EXPLAIN (FORMAT JSON, ANALYZE FALSE)
        SELECT id, title, quantity_available, condition
        FROM supplies
        WHERE status = 'AVAILABLE' AND department_id = 1;
      `);
      return res.rows;
    }
  },
  10: {
    id: 10,
    title: 'pgvector HNSW Cosine Similarity Search',
    category: 'Vector Database',
    viva_explanation: 'Executes high-dimensional cosine distance (<=>) query on 384-dimensional embeddings to match unstructured requirements with surplus stock.',
    sql: `SELECT 
    s.id,
    s.title,
    s.description,
    s.quantity_available,
    s.condition,
    d.name AS department_name,
    c.name AS category_name,
    ROUND((1 - (s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1)))::numeric, 3) AS similarity_score
FROM supplies s
JOIN departments d ON s.department_id = d.id
JOIN supply_categories c ON s.category_id = c.id
WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
  AND s.embedding IS NOT NULL
ORDER BY s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1) ASC
LIMIT 5;`,
    run: async () => {
      const extCheck = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
      const hasPgVector = extCheck.rows.length > 0;

      if (hasPgVector) {
        const res = await query(`
          SELECT 
            s.id,
            s.title,
            s.description,
            s.quantity_available,
            s.condition,
            d.name AS department_name,
            c.name AS category_name,
            ROUND((1 - (s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1)))::numeric, 3) AS similarity_score
          FROM supplies s
          JOIN departments d ON s.department_id = d.id
          JOIN supply_categories c ON s.category_id = c.id
          WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
            AND s.embedding IS NOT NULL
          ORDER BY s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1) ASC
          LIMIT 5;
        `);
        return res.rows;
      } else {
        const res = await query(`
          SELECT 
            s.id,
            s.title,
            s.description,
            s.quantity_available,
            s.condition,
            d.name AS department_name,
            c.name AS category_name,
            ROUND(fn_cosine_similarity(s.embedding, (SELECT embedding FROM supply_requests WHERE id = 1)), 3) AS similarity_score
          FROM supplies s
          JOIN departments d ON s.department_id = d.id
          JOIN supply_categories c ON s.category_id = c.id
          WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
            AND s.embedding IS NOT NULL
          ORDER BY fn_cosine_similarity(s.embedding, (SELECT embedding FROM supply_requests WHERE id = 1)) DESC
          LIMIT 5;
        `);
        return res.rows;
      }
    }
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const demoId = parseInt(searchParams.get('id') || '0', 10);

    if (demoId && DEMO_MODULES[demoId]) {
      const mod = DEMO_MODULES[demoId];
      const start = Date.now();
      const rows = await mod.run();
      const durationMs = Date.now() - start;

      return NextResponse.json({
        id: mod.id,
        title: mod.title,
        category: mod.category,
        viva_explanation: mod.viva_explanation,
        sql: mod.sql,
        execution_time_ms: durationMs,
        row_count: Array.isArray(rows) ? rows.length : 1,
        results: rows,
      });
    }

    // Return catalogue of all 10 demonstration modules
    const list = Object.values(DEMO_MODULES).map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      viva_explanation: m.viva_explanation,
      sql: m.sql,
    }));

    return NextResponse.json({ modules: list });
  } catch (error: any) {
    console.error('[SQL Demo API Error]', error);
    return NextResponse.json({ error: error?.message || 'SQL Demo execution error.' }, { status: 500 });
  }
}
