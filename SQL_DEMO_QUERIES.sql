-- ==============================================================================
-- CAMPUS SUPPLY RESCUE & REDISTRIBUTION SYSTEM
-- COMPREHENSIVE DBMS LEVEL 3 VIVA DEMONSTRATION SCRIPT
-- ==============================================================================
-- This file contains all primary SQL queries demonstrating every required DBMS concept:
-- 1. Multi-table JOINs
-- 2. GROUP BY and Aggregate Functions
-- 3. HAVING clause filtering
-- 4. Subqueries & Correlated Subqueries
-- 5. Relational Views
-- 6. Stored Functions / Procedures (sp_reserve_supply, sp_complete_handover)
-- 7. ACID Transactions with Row-Level Locking (SELECT ... FOR UPDATE)
-- 8. Database Triggers (Status history, Audit trail, Quantity integrity)
-- 9. Index Inspection & Performance Plan (EXPLAIN ANALYZE)
-- 10. Vector Similarity Cosine Search via pgvector HNSW index
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- DEMO 1: MULTI-TABLE INNER & LEFT JOINs
-- Purpose: Retrieves complete surplus listings with department, category, and contributor details
-- ------------------------------------------------------------------------------
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
ORDER BY s.created_at DESC;


-- ------------------------------------------------------------------------------
-- DEMO 2: GROUP BY WITH AGGREGATE FUNCTIONS (COUNT, SUM, AVG, ROUND)
-- Purpose: Aggregates departmental contribution volume and estimated value
-- ------------------------------------------------------------------------------
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


-- ------------------------------------------------------------------------------
-- DEMO 3: HAVING CLAUSE
-- Purpose: Identifies categories with high surplus volume (available > 5 units)
-- ------------------------------------------------------------------------------
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


-- ------------------------------------------------------------------------------
-- DEMO 4: SUBQUERY / CORRELATED SUBQUERY
-- Purpose: Finds departments whose donated units exceed the campus-wide department average
-- ------------------------------------------------------------------------------
SELECT 
    d.name AS department_name,
    d.code AS department_code,
    (SELECT COUNT(*) FROM supplies WHERE department_id = d.id) AS total_supplies,
    (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) AS total_units
FROM departments d
WHERE (SELECT COALESCE(SUM(quantity_total), 0) FROM supplies WHERE department_id = d.id) > (
    SELECT AVG(dept_total) FROM (
        SELECT COALESCE(SUM(quantity_total), 0) AS dept_total
        FROM supplies
        GROUP BY department_id
    ) AS subquery_avg
);


-- ------------------------------------------------------------------------------
-- DEMO 5: RELATIONAL VIEW QUERY
-- Purpose: Demonstrates abstraction via view_department_rescue_stats
-- ------------------------------------------------------------------------------
SELECT 
    department_name,
    total_supplies_listed,
    total_items_donated,
    total_items_transferred_out,
    total_items_received,
    estimated_avoided_procurement_value
FROM view_department_rescue_stats
ORDER BY estimated_avoided_procurement_value DESC;


-- ------------------------------------------------------------------------------
-- DEMO 6: STORED PROCEDURE EXECUTION — sp_reserve_supply
-- Purpose: Executes atomic reservation for Request #1, allocating 2 units of Supply #1
-- ------------------------------------------------------------------------------
SELECT sp_reserve_supply(
    p_request_id := 1,
    p_supply_id := 1,
    p_quantity := 2,
    p_user_id := 2
);


-- ------------------------------------------------------------------------------
-- DEMO 7: ACID TRANSACTION WITH ROW-LEVEL LOCKING (FOR UPDATE)
-- Purpose: Demonstrates concurrency protection against simultaneous over-allocation
-- ------------------------------------------------------------------------------
BEGIN;
    -- 1. Lock the supply row to guarantee exclusive modification
    SELECT id, title, quantity_available, status 
    FROM supplies 
    WHERE id = 1 
    FOR UPDATE;

    -- 2. Verify stock availability (application logic) and deduct
    UPDATE supplies 
    SET quantity_available = quantity_available - 1,
        quantity_reserved = quantity_reserved + 1
    WHERE id = 1 AND quantity_available >= 1;

    -- 3. Log audit event
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (1, 'CONCURRENCY_TEST_RESERVE', 'supplies', 1, '{"qty": 1}');
COMMIT;


-- ------------------------------------------------------------------------------
-- DEMO 8: DATABASE TRIGGER VERIFICATION
-- Purpose: Updates supply status and verifies automatic insertion into supply_status_history
-- ------------------------------------------------------------------------------
-- Step A: Perform an update
UPDATE supplies 
SET status = 'AVAILABLE' 
WHERE id = 1;

-- Step B: Inspect the history table populated automatically by trg_supply_status_history
SELECT 
    h.id,
    h.supply_id,
    s.title,
    h.old_status,
    h.new_status,
    h.change_reason,
    h.created_at
FROM supply_status_history h
JOIN supplies s ON h.supply_id = s.id
ORDER BY h.created_at DESC
LIMIT 5;


-- ------------------------------------------------------------------------------
-- DEMO 9: INDEX INSPECTION & QUERY EXECUTION PLAN (EXPLAIN ANALYZE)
-- Purpose: Demonstrates query planner utilizing the composite B-tree index
-- ------------------------------------------------------------------------------
EXPLAIN ANALYZE
SELECT id, title, quantity_available, condition
FROM supplies
WHERE status = 'AVAILABLE' AND department_id = 1;


-- ------------------------------------------------------------------------------
-- DEMO 10: PGVECTOR HNSW COSINE SIMILARITY SEARCH
-- Purpose: Finds supplies matching natural language request: "cables for laptop projector connection"
-- ------------------------------------------------------------------------------
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
