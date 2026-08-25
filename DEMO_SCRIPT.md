# Campus Supply Rescue & Redistribution System
## 5–8 Minute Live Viva Demonstration Script

This script outlines the exact chronological sequence to follow during your DBMS Level 3 project presentation and viva examination.

---

### Step 1 (Minute 1): Institutional Problem Statement & System Overview
1. Open the landing page (`http://localhost:3000`).
2. **Present the Problem:** 
   > *"In colleges and universities, departments purchase supplies independently. When projects or events finish, usable supplies (HDMI cords, benchtop power sources, USB-C adapters, stationery) remain locked in departmental cupboards, while adjacent departments buy the same items. Campus Supply Rescue unifies campus inventory with pgvector semantic matching and ACID transactions."*
3. Highlight the tagline: **“Use what already exists before buying what doesn’t.”**
4. Point out the live metrics ledger dynamically aggregating data from PostgreSQL views.

---

### Step 2 (Minute 2): Login as Department Staff / Faculty
1. Click **Log In** or use the **Quick-Demo Switcher** in the top bar.
2. Select **Ankit Verma (Faculty / CSE Staff)** (`ankitverma291206@gmail.com`).
3. Point out how the top bar immediately reflects the authenticated department: **CSE Block**.

---

### Step 3 (Minute 3): Discover Surplus & Demonstrate Semantic Matching (pgvector)
1. Navigate to **Discover Surplus** (`/supplies`).
2. Show the existing surplus listing: *“10x High-Speed 2-Meter HDMI Cables (Black, Gold-Plated)”*.
3. Click the **Semantic Search (pgvector)** mode.
4. Enter the natural language query:
   > *"I need something to connect my laptop to a classroom projector"*
5. Click **Vector Match** (or click the Preset prompt button).
6. **Explain to Evaluator:**
   > *"Notice that we did not type the keyword 'HDMI' or 'cable'. PostgreSQL with pgvector converted the sentence into a 384-dimensional dense vector locally, computed cosine similarity against supply embeddings using the HNSW index, and returned the HDMI cables with an 88% semantic similarity score."*

---

### Step 4 (Minute 4): Smart Needs Hub & “You May Already Have This” Feature
1. Switch role via the top bar to **Ankit Uttarakar (Admin / Events)** (`ankit.uttarakar@gmail.com`).
2. Navigate to **Needs Hub** (`/requests`).
3. In the input box, type:
   > *"Need display video cables for connecting laptops to projector in seminar hall"*
4. **Point out the dynamic alert:**
   > *“You May Already Have This” instantly runs vector similarity as the user types and displays CSE's surplus HDMI cables BEFORE submitting a new procurement request!*

---

### Step 5 (Minute 5): Transactional Concurrency Control & Row-Level Locking
1. Click on the detected HDMI listing or open `/supplies/1`.
2. Click **Reserve Available Units**.
3. Choose quantity: **4 units**. Purpose: *"Final year project defense in Seminar Hall B"*.
4. Click **Confirm Reservation**.
5. **Explain to Evaluator:**
   > *"This executed the PL/pgSQL stored procedure `sp_reserve_supply`. It opened an isolated transaction, applied a row-level lock (`SELECT ... FOR UPDATE`) on the supply record, verified that stock >= 4, decremented `quantity_available` from 10 to 6, incremented `quantity_reserved` to 4, and updated request status to FULFILLED without race conditions."*

---

### Step 6 (Minute 6): Physical Handover & The Rescue Chain Timeline
1. Switch back to **Ankit Verma (CSE Staff)**.
2. Navigate to **Handover Center** (`/transfers`).
3. Locate the incoming reservation from Administration.
4. Click **Confirm Physical Handover**, enter staff notes, and submit.
5. Navigate to the supply details page (`/supplies/1`).
6. **Show the Rescue Chain Timeline:**
   > *"The Rescue Chain visually renders the multi-hop relational history: LISTED by CSE $\to$ RESERVED by Admin $\to$ HANDED OVER $\to$ RECEIVED. Quantities and staff sign-offs are immutably logged."*

---

### Step 7 (Minute 7): Admin Dashboard & Surplus Pattern Analysis
1. Switch role to **Ankit Uttarakar (ADMIN)** (`ankit.uttarakar@gmail.com`).
2. Navigate to **Dashboard** (`/dashboard`) and **Admin & Audit** (`/admin`).
3. **Show:**
   - Department contribution table from view `view_department_rescue_stats`.
   - Estimated avoided procurement value (₹15,700+).
   - Surplus Pattern Analysis identifying high-idle categories.
   - Comprehensive audit trail populated by trigger `trg_audit_allocations`.

---

### Step 8 (Minute 8): Interactive Live DBMS Viva Studio (`/sql-demo`)
1. Click on **DBMS Viva Studio** (`/sql-demo`) in the top navigation.
2. Run **Demo 1 (Multi-table JOIN)** $\to$ Shows 4-table inner join.
3. Run **Demo 6 (Stored Procedure sp_reserve_supply)** $\to$ Shows PL/pgSQL execution.
4. Run **Demo 7 (ACID Transaction with FOR UPDATE lock)** $\to$ Explains concurrency safety.
5. Run **Demo 8 (Database Trigger)** $\to$ Shows `supply_status_history` populated by trigger.
6. Run **Demo 10 (pgvector HNSW Cosine Search)** $\to$ Demonstrates `<=>` vector query in SQL.

---

### Conclusion
> *“This concludes the demonstration of Campus Supply Rescue. Every feature demonstrated corresponds directly to our PostgreSQL schema, stored procedures, triggers, views, and pgvector semantic indexing.”*
