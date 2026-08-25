-- ==============================================================================
-- CAMPUS SUPPLY RESCUE & REDISTRIBUTION SYSTEM
-- RELATIONAL VIEWS & ANALYTICAL DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VIEW: view_available_supplies
-- Provides a clean catalog abstraction of currently available surplus supplies
-- with department, category, and contributor joins
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_available_supplies AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.condition,
    s.location_details,
    s.quantity_total,
    s.quantity_available,
    s.quantity_reserved,
    s.quantity_transferred_out,
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
WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
  AND s.quantity_available > 0;


-- ------------------------------------------------------------------------------
-- 2. VIEW: view_department_rescue_stats
-- Aggregates departmental contributions, receipts, and estimated avoided procurement cost
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_department_rescue_stats AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    d.code AS department_code,
    d.building AS department_building,
    COUNT(DISTINCT s.id) AS total_supplies_listed,
    COALESCE(SUM(s.quantity_total), 0) AS total_units_listed,
    COALESCE((
        SELECT SUM(t.quantity) 
        FROM transfers t 
        WHERE t.source_department_id = d.id
    ), 0) AS total_units_transferred_out,
    COALESCE((
        SELECT SUM(t.quantity) 
        FROM transfers t 
        WHERE t.receiving_department_id = d.id
    ), 0) AS total_units_received,
    COALESCE((
        SELECT SUM(t.quantity * COALESCE(sup.estimated_replacement_value / NULLIF(sup.quantity_total, 0), 0))
        FROM transfers t
        JOIN supplies sup ON t.supply_id = sup.id
        WHERE t.receiving_department_id = d.id
    ), 0)::NUMERIC(10, 2) AS estimated_avoided_procurement_value
FROM departments d
LEFT JOIN supplies s ON d.id = s.department_id
GROUP BY d.id, d.name, d.code, d.building;


-- ------------------------------------------------------------------------------
-- 3. VIEW: view_category_surplus_analysis
-- Identifies patterns in surplus supply accumulation and active request pressure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_category_surplus_analysis AS
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.icon_name AS category_icon,
    COUNT(DISTINCT s.id) AS active_listings_count,
    COALESCE(SUM(s.quantity_available), 0) AS current_available_units,
    COALESCE(SUM(s.quantity_transferred_out), 0) AS total_rescued_units,
    COUNT(DISTINCT r.id) AS open_requests_count
FROM supply_categories c
LEFT JOIN supplies s ON c.id = s.category_id AND s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
LEFT JOIN supply_requests r ON c.id = r.preferred_category_id AND r.status IN ('OPEN', 'PARTIALLY_FULFILLED')
GROUP BY c.id, c.name, c.slug, c.icon_name;


-- ------------------------------------------------------------------------------
-- 4. VIEW: view_recent_rescue_timeline
-- Renders the global live Rescue Chain activity stream across the institution
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_recent_rescue_timeline AS
SELECT 
    e.id AS event_id,
    e.supply_id,
    s.title AS supply_title,
    c.name AS category_name,
    e.event_type,
    e.quantity,
    e.notes,
    e.created_at,
    d_from.name AS from_department_name,
    d_from.code AS from_department_code,
    d_to.name AS to_department_name,
    d_to.code AS to_department_code,
    u.full_name AS actor_name
FROM rescue_chain_events e
JOIN supplies s ON e.supply_id = s.id
JOIN supply_categories c ON s.category_id = c.id
JOIN departments d_from ON e.from_department_id = d_from.id
JOIN departments d_to ON e.to_department_id = d_to.id
JOIN users u ON e.user_id = u.id
ORDER BY e.created_at DESC;
