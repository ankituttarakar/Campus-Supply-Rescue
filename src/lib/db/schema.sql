-- ==============================================================================
-- CAMPUS SUPPLY RESCUE & REDISTRIBUTION SYSTEM
-- DATABASE DEFINITION LANGUAGE (DDL) SCHEMA
-- PostgreSQL 15+ with pgvector
-- ==============================================================================

-- Enable the pgvector extension for high-dimensional semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------------------
-- 1. DEPARTMENTS
-- Academic departments, laboratories, student clubs, and administrative units
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    building VARCHAR(120) NOT NULL,
    contact_email VARCHAR(120) NOT NULL,
    phone VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. USERS
-- Staff members, laboratory technicians, department heads, and system administrators
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'DEPARTMENT_STAFF')),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. SUPPLY_CATEGORIES
-- Taxonomies classifying campus supplies (Cables, Adapters, Stationery, Lab Gear, etc.)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50) NOT NULL DEFAULT 'Package'
);

-- ------------------------------------------------------------------------------
-- 4. SUPPLIES (Surplus Listings)
-- Usable items registered by donor departments with explicit quantity tracking & vector embeddings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplies (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES supply_categories(id) ON DELETE RESTRICT,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    quantity_total INTEGER NOT NULL CHECK (quantity_total > 0),
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_transferred_out INTEGER NOT NULL DEFAULT 0 CHECK (quantity_transferred_out >= 0),
    condition VARCHAR(30) NOT NULL CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR')),
    location_details VARCHAR(250) NOT NULL,
    estimated_replacement_value NUMERIC(10, 2) CHECK (estimated_replacement_value >= 0),
    availability_until DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PARTIALLY_RESERVED', 'FULLY_RESERVED', 'TRANSFERRED', 'WITHDRAWN', 'EXPIRED')),
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quantity_sum CHECK (quantity_total = quantity_available + quantity_reserved + quantity_transferred_out)
);

-- ------------------------------------------------------------------------------
-- 5. SUPPLY_REQUESTS
-- Open department requirements described in natural language (NOT coupled to a pre-selected supply)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_requests (
    id SERIAL PRIMARY KEY,
    requesting_department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    requested_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    purpose_description TEXT NOT NULL,
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
    urgency VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    preferred_category_id INTEGER REFERENCES supply_categories(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')),
    notes TEXT,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fulfilled_qty CHECK (fulfilled_quantity <= requested_quantity)
);

-- ------------------------------------------------------------------------------
-- 6. SUPPLY_ALLOCATIONS
-- Junction linking a request to a specific surplus supply for reservation & handover
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_allocations (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES supply_requests(id) ON DELETE CASCADE,
    supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
    allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity > 0),
    allocation_status VARCHAR(30) NOT NULL DEFAULT 'RESERVED' CHECK (allocation_status IN ('RESERVED', 'HANDED_OVER', 'CANCELLED')),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reserved_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. TRANSFERS
-- Materialized record of a physical handover between departments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    allocation_id INTEGER NOT NULL UNIQUE REFERENCES supply_allocations(id) ON DELETE RESTRICT,
    supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
    source_department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    receiving_department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    initiated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    completed_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    handover_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handover_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. RESCUE_CHAIN_EVENTS
-- Complete historical timeline showing the multi-hop lifecycle of resources across campus
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rescue_chain_events (
    id SERIAL PRIMARY KEY,
    supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES supply_allocations(id) ON DELETE SET NULL,
    transfer_id INTEGER REFERENCES transfers(id) ON DELETE SET NULL,
    from_department_id INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
    to_department_id INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('LISTED', 'REQUESTED', 'RESERVED', 'HANDED_OVER', 'RECEIVED', 'REDISTRIBUTED', 'WITHDRAWN', 'EXPIRED')),
    notes TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. SUPPLY_STATUS_HISTORY
-- Trigger-maintained audit ledger recording all supply status transitions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_status_history (
    id SERIAL PRIMARY KEY,
    supply_id INTEGER NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 10. AUDIT_LOGS
-- System-wide administrative security & operation log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & VECTOR RETRIEVAL
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_supplies_status_dept ON supplies(status, department_id);
CREATE INDEX IF NOT EXISTS idx_supplies_category ON supplies(category_id);
CREATE INDEX IF NOT EXISTS idx_supplies_created_at ON supplies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_dept ON supply_requests(status, requesting_department_id);
CREATE INDEX IF NOT EXISTS idx_allocations_req_sup ON supply_allocations(request_id, supply_id);
CREATE INDEX IF NOT EXISTS idx_rescue_chain_supply ON rescue_chain_events(supply_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_transfers_source_recv ON transfers(source_department_id, receiving_department_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- HNSW Vector Index for 384-dimensional cosine similarity nearest-neighbor lookup
CREATE INDEX IF NOT EXISTS idx_supplies_embedding_hnsw 
ON supplies 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
