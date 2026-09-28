# Campus Supply Rescue & Redistribution System
### A DBMS Level 3 Full-Stack Relational Database & Vector Engine Project

> **Tagline:** *“Use what already exists before buying what doesn’t.”*

---

## 1. Project Overview & Problem Statement

In universities, colleges, and research institutions, academic departments (Computer Science, Electronics, Robotics, Chemistry), media studios, and event cells procure common consumable and reusable supplies independently.

Following conferences, research milestones, lab upgrades, and semester completions, large quantities of functional, usable items remain unused inside cupboards, storage bins, and lockers.

**Examples of recurring campus surplus:**
- High-Speed HDMI, DisplayPort, VGA, and Ethernet cables
- Variable DC benchtop power supplies and multimeters
- USB-C multi-port hubs and network adapters
- Keyboard/mouse peripherals and barcode scanners
- Presentation easels, wireless clickers, and podium equipment
- Prototyping hardware (Arduino, ESP32, sensor kits)
- Unused hardbound lab record notebooks and stationery reams
- Heavy-duty surge-protected power strips and extension cords

Because no centralized campus-wide resource visibility exists:
1. **Department A** stores unused surplus supplies.
2. **Department B** requires the identical resource for an upcoming course lab or presentation.
3. **Department B** submits a formal procurement requisition and spends institutional budget.
4. Existing assets sit idle, funds are wasted, and dead inventory accumulates.

**Campus Supply Rescue** provides an internal institutional resource network where departments register surplus supplies, discover available items through **pgvector semantic natural language matching**, reserve resources via **ACID transactions with row-level locks**, and preserve multi-hop redistribution provenance through the **Rescue Chain**.

---

## 2. Core Distinguishing Pillars (Originality)

| Pillar | Technical Implementation | Academic & DBMS Value |
| :--- | :--- | :--- |
| **1. Semantic Supply Matching** | PostgreSQL 15+ with `pgvector` & `all-MiniLM-L6-v2` (384d dense embeddings) | Enables natural-language need discovery (e.g. *"cables to connect laptop to projector"*) matching surplus listings (*"HDMI cords for seminar hall"*) using cosine similarity (`<=>`), overcoming departmental vocabulary mismatches. |
| **2. Concurrency & Row-Level Locking** | PL/pgSQL Stored Procedure `sp_reserve_supply` with `SELECT ... FOR UPDATE` | Guarantees that two concurrent departmental requests cannot over-allocate limited stock. Enforces the invariant: $\text{total} = \text{available} + \text{reserved} + \text{transferred\_out}$. |
| **3. The Rescue Chain** | Relational Multi-Hop Timeline table (`rescue_chain_events`) | Immutably tracks asset movement across departments over time (`LISTED` $\to$ `REQUESTED` $\to$ `RESERVED` $\to$ `HANDED_OVER` $\to$ `RECEIVED` $\to$ `REDISTRIBUTED`). |
| **4. Surplus Pattern Analysis** | Dynamic Relational Views (`view_category_surplus_analysis`, `view_department_rescue_stats`) | Identifies departments with recurring surplus accumulation and calculates institutional avoided procurement value without guessing or fake AI predictions. |

---

## 3. Technology Stack

- **Primary Database:** PostgreSQL 15+ (Relational tables, foreign keys, CHECK constraints, triggers, stored procedures).
- **Vector Database Extension:** `pgvector` (HNSW indexing with cosine distance metric).
- **Embedding Pipeline:** Local sentence transformers (`Xenova/all-MiniLM-L6-v2`, 384 dimensions, zero external paid API dependencies).
- **Full-Stack Framework:** Next.js (App Router, Server Components, TypeScript).
- **Styling & UI:** Tailwind CSS (University Intranet portal design with zero generic commerce templates).
- **Authentication & Security:** Salted `bcryptjs` password hashing, signed HTTP-only JWT session cookies, server-side RBAC guards.
- **Database Driver:** `pg` connection pool with parameterized queries and transaction wrappers.

---

## 4. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "employs"
    DEPARTMENTS ||--o{ SUPPLIES : "owns_surplus"
    DEPARTMENTS ||--o{ SUPPLY_REQUESTS : "originates_need"
    DEPARTMENTS ||--o{ TRANSFERS : "source_dept"
    DEPARTMENTS ||--o{ TRANSFERS : "receiving_dept"
    DEPARTMENTS ||--o{ RESCUE_CHAIN_EVENTS : "from_dept"
    DEPARTMENTS ||--o{ RESCUE_CHAIN_EVENTS : "to_dept"

    USERS ||--o{ SUPPLIES : "registers"
    USERS ||--o{ SUPPLY_REQUESTS : "submits"
    USERS ||--o{ SUPPLY_ALLOCATIONS : "reserves"
    USERS ||--o{ TRANSFERS : "executes_handover"
    USERS ||--o{ AUDIT_LOGS : "triggers"

    SUPPLY_CATEGORIES ||--o{ SUPPLIES : "classifies"
    SUPPLY_CATEGORIES ||--o{ SUPPLY_REQUESTS : "categorizes"

    SUPPLIES ||--o{ SUPPLY_ALLOCATIONS : "allocated_to"
    SUPPLIES ||--o{ TRANSFERS : "transferred_via"
    SUPPLIES ||--o{ RESCUE_CHAIN_EVENTS : "tracked_in"
    SUPPLIES ||--o{ SUPPLY_STATUS_HISTORY : "status_logged"

    SUPPLY_REQUESTS ||--o{ SUPPLY_ALLOCATIONS : "satisfied_by"

    SUPPLY_ALLOCATIONS ||--o| TRANSFERS : "materializes_into"
    TRANSFERS ||--o{ RESCUE_CHAIN_EVENTS : "records_event"
```

---

## 5. Relational Schema & Data Dictionary

### Tables Specification

1. **`departments`**: Academic and administrative entities (`id`, `name`, `code`, `building`, `contact_email`, `phone`, `created_at`).
2. **`users`**: Institutional staff and administrator accounts (`id`, `department_id`, `full_name`, `email`, `password_hash`, `role` ['ADMIN', 'DEPARTMENT_STAFF'], `phone`, `is_active`, `created_at`).
3. **`supply_categories`**: Taxonomies classifying campus assets (`id`, `name`, `slug`, `description`, `icon_name`).
4. **`supplies`**: Surplus listings with stock tracking and pgvector embeddings (`id`, `department_id`, `created_by_user_id`, `category_id`, `title`, `description`, `quantity_total`, `quantity_available`, `quantity_reserved`, `quantity_transferred_out`, `condition`, `location_details`, `estimated_replacement_value`, `availability_until`, `status`, `embedding` vector(384), `created_at`, `updated_at`).
5. **`supply_requests`**: Open departmental needs in natural language (`id`, `requesting_department_id`, `requested_by_user_id`, `purpose_description`, `requested_quantity`, `fulfilled_quantity`, `urgency`, `preferred_category_id`, `status`, `notes`, `embedding` vector(384), `created_at`, `updated_at`).
6. **`supply_allocations`**: Dedicated junction connecting requests to supplies (`id`, `request_id`, `supply_id`, `allocated_quantity`, `allocation_status`, `reserved_at`, `reserved_by_user_id`, `completed_at`, `created_at`, `updated_at`).
7. **`transfers`**: Physical handover records (`id`, `allocation_id`, `supply_id`, `source_department_id`, `receiving_department_id`, `quantity`, `initiated_by_user_id`, `completed_by_user_id`, `handover_timestamp`, `handover_notes`, `created_at`).
8. **`rescue_chain_events`**: Multi-hop item movement timeline (`id`, `supply_id`, `allocation_id`, `transfer_id`, `from_department_id`, `to_department_id`, `quantity`, `event_type`, `notes`, `user_id`, `created_at`).
9. **`supply_status_history`**: Trigger-maintained audit log of supply state changes (`id`, `supply_id`, `old_status`, `new_status`, `changed_by_user_id`, `change_reason`, `created_at`).
10. **`audit_logs`**: System security and operations ledger (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details` jsonb, `ip_address`, `created_at`).

---

## 6. Advanced DBMS Concepts Implemented

### 1. ACID Transactions & Row-Level Locking (`SELECT ... FOR UPDATE`)
The PL/pgSQL stored procedure `sp_reserve_supply` prevents race conditions during concurrent reservations. When two departments attempt to reserve stock simultaneously:
```sql
SELECT status, quantity_available, department_id
INTO v_sup_status, v_sup_available, v_sup_dept_id
FROM supplies
WHERE id = p_supply_id
FOR UPDATE; -- Row-level exclusive lock
```
If requested quantity exceeds available stock, the transaction is safely rejected and rolled back.

### 2. PL/pgSQL Stored Procedures
- **`sp_reserve_supply(p_request_id, p_supply_id, p_quantity, p_user_id)`**: Validates request and stock, applies row-level lock, decrements `quantity_available`, increments `quantity_reserved`, creates `supply_allocations` record, and logs reservation in the Rescue Chain.
- **`sp_complete_handover(p_allocation_id, p_completed_by_user_id, p_notes)`**: Confirms physical transfer, shifts quantity from reserved to transferred_out, creates `transfers` record, updates supply status to `TRANSFERRED` if all stock is exhausted, and logs completion.

### 3. Database Triggers
- **`trg_supply_status_history`**: `AFTER UPDATE ON supplies` $\to$ Automatically records old and new statuses into `supply_status_history`.
- **`trg_audit_allocations`**: `AFTER INSERT OR UPDATE ON supply_allocations` $\to$ Automatically appends security audit records.
- **`trg_check_quantity_integrity`**: `BEFORE INSERT OR UPDATE ON supplies` $\to$ Enforces the mathematical invariant:
  $$\text{quantity\_total} = \text{quantity\_available} + \text{quantity\_reserved} + \text{quantity\_transferred\_out}$$

### 4. Relational Views
- **`view_available_supplies`**: Normalized catalog abstraction joining supplies, departments, categories, and contributors.
- **`view_department_rescue_stats`**: Departmental metrics aggregating total units listed, donated, received, and net avoided procurement value.
- **`view_category_surplus_analysis`**: Analytical view grouping surplus stock and active request pressure per category with `HAVING` filters.
- **`view_recent_rescue_timeline`**: Formats the global institution-wide Rescue Chain stream.

### 5. Indexing & HNSW Vector Retrieval
- **B-Tree Composite Indexes:** `idx_supplies_status_dept(status, department_id)`, `idx_requests_status_dept(status, requesting_department_id)`.
- **HNSW Vector Index:**
  ```sql
  CREATE INDEX idx_supplies_embedding_hnsw 
  ON supplies USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```

---

## 7. Requirement $\to$ Implementation Mapping

| Course Requirement | Project Implementation | File Reference |
| :--- | :--- | :--- |
| **Relational SQL Database** | PostgreSQL 15+ Schema with 10 tables, PKs, FKs, CHECK constraints | `src/lib/db/schema.sql` |
| **Vector Database Engine** | `pgvector` with 384d sentence embeddings and HNSW cosine index | `src/lib/db/schema.sql`, `src/lib/embeddings.ts` |
| **ER Diagram** | Complete normalized ER Model (1NF, 2NF, 3NF) | `README.md`, `implementation_plan.md` |
| **DDL Operations** | `CREATE TABLE`, `CREATE INDEX`, `CREATE TRIGGER`, `CREATE VIEW` | `schema.sql`, `triggers.sql`, `views.sql` |
| **DML Operations** | `INSERT`, `UPDATE`, `SELECT`, `DELETE` across business APIs | Next.js Route Handlers (`src/app/api/*`) |
| **JOIN Operations** | Multi-table INNER and LEFT JOINs in catalog, transfers, and views | `view_available_supplies`, `/sql-demo` Demo 1 |
| **GROUP BY & Aggregates** | Department rescue analytics, category volume (`COUNT`, `SUM`, `AVG`, `ROUND`) | `view_department_rescue_stats`, `/sql-demo` Demo 2 |
| **HAVING Clause** | Filter categories with high active surplus volume | `view_category_surplus_analysis`, `/sql-demo` Demo 3 |
| **Subqueries** | Correlated subqueries comparing department donations to campus average | `/sql-demo` Demo 4 |
| **ACID Transactions** | Concurrency control with `SELECT ... FOR UPDATE` row locking | `procedures.sql`, `sp_reserve_supply` |
| **Triggers** | Automated status history logging and quantity integrity validation | `src/lib/db/triggers.sql` |
| **Relational Views** | 4 pre-compiled views for catalog, stats, and surplus analysis | `src/lib/db/views.sql` |
| **Stored Functions** | `sp_reserve_supply`, `sp_complete_handover` in PL/pgSQL | `src/lib/db/procedures.sql` |
| **Authentication & RBAC** | Hashed passwords, JWT cookies, role-based authorization guards | `src/lib/auth.ts`, `src/app/api/auth/*` |
| **Web Application** | Modern Next.js App Router with TypeScript & Tailwind CSS | `src/app/*`, `src/components/*` |
| **Demonstrable Individual Work**| Two-person Git/GitHub separation (Database Backend $\leftrightarrow$ Frontend & Analytics) | Detailed in Section 10 below |

---

## 8. Standalone SQL Viva Demonstration Queries

All demonstration queries can be executed in pgAdmin/psql or directly within the in-app **DBMS Viva Studio** (`/sql-demo`).

```sql
-- 1. Multi-Table JOIN
SELECT s.id, s.title, s.quantity_available, d.name AS dept, c.name AS category, u.full_name AS contributor
FROM supplies s
JOIN departments d ON s.department_id = d.id
JOIN supply_categories c ON s.category_id = c.id
JOIN users u ON s.created_by_user_id = u.id
WHERE s.status = 'AVAILABLE';

-- 2. Execute Stored Procedure (sp_reserve_supply)
SELECT sp_reserve_supply(p_request_id := 1, p_supply_id := 1, p_quantity := 2, p_user_id := 2);

-- 3. pgvector Cosine Similarity Search
SELECT s.id, s.title, s.description, ROUND((1 - (s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1)))::numeric, 3) AS similarity_score
FROM supplies s
WHERE s.status IN ('AVAILABLE', 'PARTIALLY_RESERVED')
ORDER BY s.embedding <=> (SELECT embedding FROM supply_requests WHERE id = 1) ASC
LIMIT 5;
```

---

## 9. Setup & Installation Instructions

### Prerequisites
- Node.js v18+ and npm installed
- PostgreSQL 15+ with `pgvector` extension installed

### 1. Clone Repository & Install Dependencies
```bash
cd CampusSupplyRescue
npm install
```

### 2. Configure Environment
Create a `.env` file from `.env.example`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campus_supply_rescue"
JWT_SECRET="campus_supply_rescue_super_secret_jwt_key_2026_dbms_level3"
NODE_ENV="development"
PORT=3000
```

### 3. Initialize & Seed Database
```bash
# Run DDL, procedures, triggers, and views
npm run db:init

# Seed 6 departments, 12 users, 35+ surplus supplies, requests, and Rescue Chain history
npm run db:seed
```

### 4. Start Application
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 10. Team Contribution Split (Two-Person Project)

| Contributor | Focus Area & Responsibilities |
| :--- | :--- |
| **Team Member 1 (Database Architect & Backend Engineer)** | - PostgreSQL Relational Schema DDL & Normalization (1NF, 2NF, 3NF)<br>- PL/pgSQL Stored Procedures (`sp_reserve_supply`, `sp_complete_handover`)<br>- Database Triggers (`trg_supply_status_history`, `trg_audit_allocations`, `trg_check_quantity_integrity`)<br>- pgvector HNSW Indexing & Semantic Search Route (`/api/supplies/search/semantic`)<br>- Standalone `SQL_DEMO_QUERIES.sql` and DB migration runner (`scripts/init-db.ts`) |
| **Team Member 2 (Full-Stack Engineer & UI/UX Designer)** | - Next.js App Router UI Architecture, Layouts, and Tailwind Design System<br>- Authentication, JWT Session Handling & Role Guard Middleware (`src/lib/auth.ts`)<br>- Supply Discovery Catalog with Dual Semantic/Structured Filters (`/supplies`)<br>- The Rescue Chain Visual Component & Needs Hub (`/requests`, `/transfers`)<br>- Live DBMS Viva Demonstration Studio (`/sql-demo`) & Dashboard Analytics |

---

