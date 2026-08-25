import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { generateEmbedding, formatVectorForPg } from '../src/lib/embeddings';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campus_supply_rescue';

async function seedDatabase() {
  console.log('🌱 Starting Campus Supply Rescue Database Seeding...');
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database.');

    // Check if pgvector is enabled or using REAL[]
    const extCheck = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    const hasPgVector = extCheck.rows.length > 0;

    // 1. Clean existing records in reverse dependency order
    console.log('🧹 Cleaning existing tables...');
    await client.query(`
      TRUNCATE TABLE audit_logs, supply_status_history, rescue_chain_events, transfers, 
                     supply_allocations, supply_requests, supplies, supply_categories, 
                     users, departments RESTART IDENTITY CASCADE;
    `);

    // 2. Seed Departments
    console.log('🏢 Seeding Departments...');
    const deptRows = [
      { name: 'Computer Science & Engineering', code: 'CSE', building: 'Alan Turing Block, Floor 3', contact_email: 'cse-supplies@campus.edu', phone: '+91-11-2345-0101' },
      { name: 'Electronics & Communication', code: 'ECE', building: 'Nikola Tesla Hall, Ground Floor', contact_email: 'ece-lab@campus.edu', phone: '+91-11-2345-0102' },
      { name: 'Robotics & Automation Research Lab', code: 'RAL', building: 'Michael Faraday Complex, Room 204', contact_email: 'robotics@campus.edu', phone: '+91-11-2345-0103' },
      { name: 'Media & Digital Design Studio', code: 'MDS', building: 'Ramanujan Creative Wing, Studio B', contact_email: 'media-studio@campus.edu', phone: '+91-11-2345-0104' },
      { name: 'Chemistry & Material Sciences', code: 'CHM', building: 'Marie Curie Science Block, Lab 4', contact_email: 'chemlab@campus.edu', phone: '+91-11-2345-0105' },
      { name: 'Campus Administration & Events Cell', code: 'ADM', building: 'Central Administrative Building, Wing A', contact_email: 'admin-events@campus.edu', phone: '+91-11-2345-0106' },
    ];

    const depts: Record<string, number> = {};
    for (const d of deptRows) {
      const res = await client.query(
        `INSERT INTO departments (name, code, building, contact_email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
        [d.name, d.code, d.building, d.contact_email, d.phone]
      );
      depts[d.code] = res.rows[0].id;
    }

    // 3. Seed Users
    console.log('👥 Seeding Users with secure hashed credentials...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const userRows = [
      { dept: 'ADM', name: 'Ankit Uttarakar', email: 'ankit.uttarakar@gmail.com', role: 'ADMIN', phone: '+91-7337789583' },
      { dept: 'CSE', name: 'Ankit Verma', email: 'ankitverma291206@gmail.com', role: 'DEPARTMENT_STAFF', phone: '+91-9876543210' },
    ];

    const users: Record<string, number> = {};
    for (const u of userRows) {
      const res = await client.query(
        `INSERT INTO users (department_id, full_name, email, password_hash, role, phone) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
        [depts[u.dept], u.name, u.email, passwordHash, u.role, u.phone]
      );
      users[u.email] = res.rows[0].id;
    }

    // 4. Seed Supply Categories
    console.log('🏷️ Seeding Supply Categories...');
    const catRows = [
      { name: 'Cables & Adapters', slug: 'cables-adapters', desc: 'HDMI, DisplayPort, VGA, Ethernet, USB-C cords, and connector converters', icon: 'Cable' },
      { name: 'Computing Peripherals', slug: 'peripherals', desc: 'Keyboards, mice, USB hubs, webcams, headsets, barcode scanners', icon: 'Monitor' },
      { name: 'Lab Hardware & Power', slug: 'lab-hardware', desc: 'Regulated DC power supplies, multimeters, breadboards, jumper wires, sensors', icon: 'Cpu' },
      { name: 'Presentation & Event Supplies', slug: 'presentation-event', desc: 'Wireless presentation clickers, podium mics, easels, display stands, banners', icon: 'Presentation' },
      { name: 'Stationery & Documentation', slug: 'stationery', desc: 'A4 paper reams, spiral notebooks, whiteboard marker boxes, lanyards, folders', icon: 'FileText' },
      { name: 'Electrical & Power Accessories', slug: 'electrical-power', desc: 'Multi-outlet extension surge protectors, heavy duty power cords, converters', icon: 'Zap' },
    ];

    const categories: Record<string, number> = {};
    for (const c of catRows) {
      const res = await client.query(
        `INSERT INTO supply_categories (name, slug, description, icon_name) VALUES ($1, $2, $3, $4) RETURNING id;`,
        [c.name, c.slug, c.desc, c.icon]
      );
      categories[c.slug] = res.rows[0].id;
    }

    // 5. Seed Supplies with Real-Time Vector Embeddings
    console.log('📦 Seeding Surplus Supplies with 384-dimensional Embeddings...');
    const supplyItems = [
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'cables-adapters',
        title: '10x High-Speed 2-Meter HDMI Cables (Black, Gold-Plated)',
        desc: 'Brand new surplus HDMI 2.0 cables purchased for annual tech symposium seminar rooms. Completely unused in original zip packaging. Supports 4K 60Hz video audio transmission.',
        qty_total: 10, qty_avail: 6, qty_res: 4, qty_trans: 0,
        cond: 'NEW', loc: 'Turing Block, CSE Lab 3, Cabinet C2',
        val: 3500.00, status: 'PARTIALLY_RESERVED'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'lab-hardware',
        title: '5x Regulated Variable DC Benchtop Power Supplies (0-30V, 5A)',
        desc: 'Digital display variable DC power source units with dual voltage and current control knobs. Excellent condition from concluded robotic arm research project.',
        qty_total: 5, qty_avail: 3, qty_res: 2, qty_trans: 0,
        cond: 'LIKE_NEW', loc: 'Turing Block, Hardware Lab, Shelf 4',
        val: 18500.00, status: 'PARTIALLY_RESERVED'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'cables-adapters',
        title: '12x USB-C Multi-Port Hub Adapters (HDMI, USB 3.0, Gigabit Ethernet)',
        desc: 'Aluminum dongle adapters allowing modern ultra-thin laptops and MacBooks to connect to wired campus LAN, external HDMI projectors, and legacy USB flash drives.',
        qty_total: 12, qty_avail: 12, qty_res: 0, qty_trans: 0,
        cond: 'NEW', loc: 'Turing Block, 3rd Floor Hardware Lab, Locker 7',
        val: 14400.00, status: 'AVAILABLE'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'presentation-event',
        title: '4x Wireless Presentation Slide Remote Clickers with Red Laser Pointer',
        desc: 'USB RF wireless handheld clickers for advancing PowerPoint slides and keynote presentations smoothly from up to 15 meters away. Batteries included.',
        qty_total: 4, qty_avail: 2, qty_res: 0, qty_trans: 2,
        cond: 'LIKE_NEW', loc: 'Admin Building, Events Store, Box E-1',
        val: 3200.00, status: 'AVAILABLE'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'electrical-power',
        title: '8x Heavy-Duty 6-Outlet Power Extension Boards (Surge Protected, 3m Cord)',
        desc: 'Multi-plug spike guards with individual indicator switches. Perfect for powering multiple student laptops and equipment workbenches during hackathons and workshops.',
        qty_total: 8, qty_avail: 8, qty_res: 0, qty_trans: 0,
        cond: 'GOOD', loc: 'Admin Complex, Central Storage, Rack 3',
        val: 4800.00, status: 'AVAILABLE'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'peripherals',
        title: '15x Dell USB Optical Scroll Mouse and Keyboard Sets',
        desc: 'Standard wired USB keyboards and optical mice removed during computer lab upgrade. All keys and scroll wheels tested and functional.',
        qty_total: 15, qty_avail: 15, qty_res: 0, qty_trans: 0,
        cond: 'GOOD', loc: 'Turing Block, Server Room Storage, Bay 2',
        val: 7500.00, status: 'AVAILABLE'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'stationery',
        title: '20x A4 Ruled Laboratory Experiment Record Notebooks (Hardbound, 200 Pages)',
        desc: 'Unused hardcover lab record books with index page and graph paper inserts. Leftover from previous academic semester cohort.',
        qty_total: 20, qty_avail: 20, qty_res: 0, qty_trans: 0,
        cond: 'NEW', loc: 'Admin Building, Stationary Store, Cupboard A',
        val: 2400.00, status: 'AVAILABLE'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'lab-hardware',
        title: '25x Arduino Uno R3 Compatible Development Boards with USB Cable',
        desc: 'Microcontroller prototyping boards with ATmega328P chips. Ideal for IoT, sensor interfacing, and introductory robotics experiments.',
        qty_total: 25, qty_avail: 15, qty_res: 0, qty_trans: 10,
        cond: 'GOOD', loc: 'Turing Block, IoT Lab, Tray M3',
        val: 12500.00, status: 'AVAILABLE'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'presentation-event',
        title: '6x Adjustable Wooden Display Easel Tripod Stands (150cm)',
        desc: 'Collapsible easel stands for mounting poster boards, student design portfolios, and project showcase displays in exhibition halls.',
        qty_total: 6, qty_avail: 6, qty_res: 0, qty_trans: 0,
        cond: 'LIKE_NEW', loc: 'Admin Building, Events Wing, Wall Rack',
        val: 5400.00, status: 'AVAILABLE'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'cables-adapters',
        title: '8x Cat6 Gigabit Ethernet Patch Cables (5-Meter, Blue, RJ45)',
        desc: 'High quality molded twisted pair networking cables for connecting desktops and switch panels. Excess stock from administrative office relocation.',
        qty_total: 8, qty_avail: 8, qty_res: 0, qty_trans: 0,
        cond: 'NEW', loc: 'Central Admin, IT Support Desk, Bin 12',
        val: 1600.00, status: 'AVAILABLE'
      }
    ];

    const supplyIds: number[] = [];
    for (const s of supplyItems) {
      const textToEmbed = `${s.title}. Category: ${s.cat}. Description: ${s.desc}. Condition: ${s.cond}. Location: ${s.loc}.`;
      const vector = await generateEmbedding(textToEmbed);

      let insertSql = '';
      let insertParams: any[] = [];

      if (hasPgVector) {
        insertSql = `INSERT INTO supplies (
           department_id, created_by_user_id, category_id, title, description,
           quantity_total, quantity_available, quantity_reserved, quantity_transferred_out,
           condition, location_details, estimated_replacement_value, status, embedding
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::vector)
         RETURNING id;`;
        insertParams = [
          depts[s.dept], users[s.user], categories[s.cat], s.title, s.desc,
          s.qty_total, s.qty_avail, s.qty_res, s.qty_trans,
          s.cond, s.loc, s.val, s.status, formatVectorForPg(vector)
        ];
      } else {
        insertSql = `INSERT INTO supplies (
           department_id, created_by_user_id, category_id, title, description,
           quantity_total, quantity_available, quantity_reserved, quantity_transferred_out,
           condition, location_details, estimated_replacement_value, status, embedding
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id;`;
        insertParams = [
          depts[s.dept], users[s.user], categories[s.cat], s.title, s.desc,
          s.qty_total, s.qty_avail, s.qty_res, s.qty_trans,
          s.cond, s.loc, s.val, s.status, vector
        ];
      }

      const res = await client.query(insertSql, insertParams);
      supplyIds.push(res.rows[0].id);

      // Record initial LISTED event in Rescue Chain
      await client.query(
        `INSERT INTO rescue_chain_events (
           supply_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
         ) VALUES ($1, $2, $2, $3, 'LISTED', 'Initial surplus registration on campus portal', $4);`,
        [res.rows[0].id, depts[s.dept], s.qty_total, users[s.user]]
      );
    }

    // 6. Seed Requests with Real-Time Vector Embeddings
    console.log('📝 Seeding Supply Requests with Semantic Query Vectors...');
    const requestItems = [
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'cables-adapters',
        purpose: 'We need display video cables for connecting laptops to classroom projectors during semester end presentations.',
        qty: 4, fulfilled: 4, urgency: 'HIGH', status: 'FULFILLED',
        notes: 'Required urgently for final year project defense in Seminar Hall B.'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'lab-hardware',
        purpose: 'Looking for variable voltage DC power source modules for hardware prototyping and analog circuit verification.',
        qty: 3, fulfilled: 2, urgency: 'MEDIUM', status: 'PARTIALLY_FULFILLED',
        notes: 'Benchtop power for student embedded systems course lab.'
      },
      {
        dept: 'ADM', user: 'ankit.uttarakar@gmail.com', cat: 'cables-adapters',
        purpose: 'Dongles and multi-port adapters for new laptops to connect to wired campus network and HDMI monitors.',
        qty: 5, fulfilled: 0, urgency: 'HIGH', status: 'OPEN',
        notes: 'Administration team needs reliable wired gigabit ethernet.'
      },
      {
        dept: 'CSE', user: 'ankitverma291206@gmail.com', cat: 'electrical-power',
        purpose: 'Need extension power cords and surge protectors for upcoming 24-hour inter-college hackathon workbenches.',
        qty: 6, fulfilled: 0, urgency: 'URGENT', status: 'OPEN',
        notes: 'Expected 120 participants across 30 tables in Central Auditorium.'
      }
    ];

    const requestIds: number[] = [];
    for (const r of requestItems) {
      const textToEmbed = `${r.purpose}. Category: ${r.cat}. Notes: ${r.notes}.`;
      const vector = await generateEmbedding(textToEmbed);

      let reqSql = '';
      let reqParams: any[] = [];

      if (hasPgVector) {
        reqSql = `INSERT INTO supply_requests (
           requesting_department_id, requested_by_user_id, purpose_description,
           requested_quantity, fulfilled_quantity, urgency, preferred_category_id, status, notes, embedding
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
         RETURNING id;`;
        reqParams = [
          depts[r.dept], users[r.user], r.purpose,
          r.qty, r.fulfilled, r.urgency, categories[r.cat], r.status, r.notes, formatVectorForPg(vector)
        ];
      } else {
        reqSql = `INSERT INTO supply_requests (
           requesting_department_id, requested_by_user_id, purpose_description,
           requested_quantity, fulfilled_quantity, urgency, preferred_category_id, status, notes, embedding
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id;`;
        reqParams = [
          depts[r.dept], users[r.user], r.purpose,
          r.qty, r.fulfilled, r.urgency, categories[r.cat], r.status, r.notes, vector
        ];
      }

      const res = await client.query(reqSql, reqParams);
      requestIds.push(res.rows[0].id);
    }

    // 7. Seed Supply Allocations
    console.log('🔗 Seeding Supply Allocations...');
    const alloc1 = await client.query(
      `INSERT INTO supply_allocations (
         request_id, supply_id, allocated_quantity, allocation_status, reserved_by_user_id
       ) VALUES ($1, $2, $3, 'RESERVED', $4) RETURNING id;`,
      [requestIds[0], supplyIds[0], 4, users['ankit.uttarakar@gmail.com']]
    );

    await client.query(
      `INSERT INTO rescue_chain_events (
         supply_id, allocation_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
       ) VALUES ($1, $2, $3, $4, 4, 'RESERVED', 'Reserved 4 units for project defense in Seminar Hall B', $5);`,
      [supplyIds[0], alloc1.rows[0].id, depts['CSE'], depts['ADM'], users['ankit.uttarakar@gmail.com']]
    );

    const alloc2 = await client.query(
      `INSERT INTO supply_allocations (
         request_id, supply_id, allocated_quantity, allocation_status, reserved_by_user_id
       ) VALUES ($1, $2, $3, 'RESERVED', $4) RETURNING id;`,
      [requestIds[1], supplyIds[1], 2, users['ankitverma291206@gmail.com']]
    );

    await client.query(
      `INSERT INTO rescue_chain_events (
         supply_id, allocation_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
       ) VALUES ($1, $2, $3, $4, 2, 'RESERVED', 'Reserved 2 units for analog circuit lab', $5);`,
      [supplyIds[1], alloc2.rows[0].id, depts['CSE'], depts['CSE'], users['ankitverma291206@gmail.com']]
    );

    // 8. Seed Completed Transfers & Multi-Hop Rescue Chain
    console.log('🚚 Seeding Completed Transfers & Historical Provenance...');
    const allocCompleted1 = await client.query(
      `INSERT INTO supply_allocations (
         request_id, supply_id, allocated_quantity, allocation_status, reserved_by_user_id, completed_at
       ) VALUES ($1, $2, 2, 'HANDED_OVER', $3, CURRENT_TIMESTAMP) RETURNING id;`,
      [requestIds[0], supplyIds[3], users['ankitverma291206@gmail.com']]
    );

    const trans1 = await client.query(
      `INSERT INTO transfers (
         allocation_id, supply_id, source_department_id, receiving_department_id,
         quantity, initiated_by_user_id, completed_by_user_id, handover_notes
       ) VALUES ($1, $2, $3, $4, 2, $5, $6, 'Handed over in person at Admin Events Desk')
       RETURNING id;`,
      [
        allocCompleted1.rows[0].id, supplyIds[3], depts['ADM'], depts['CSE'],
        users['ankitverma291206@gmail.com'], users['ankit.uttarakar@gmail.com']
      ]
    );

    await client.query(
      `INSERT INTO rescue_chain_events (
         supply_id, allocation_id, transfer_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
       ) VALUES ($1, $2, $3, $4, $5, 2, 'HANDED_OVER', 'Handed over 2 slide remotes for Faculty Conference', $6);`,
      [supplyIds[3], allocCompleted1.rows[0].id, trans1.rows[0].id, depts['ADM'], depts['CSE'], users['ankit.uttarakar@gmail.com']]
    );

    const allocCompleted2 = await client.query(
      `INSERT INTO supply_allocations (
         request_id, supply_id, allocated_quantity, allocation_status, reserved_by_user_id, completed_at
       ) VALUES ($1, $2, 10, 'HANDED_OVER', $3, CURRENT_TIMESTAMP) RETURNING id;`,
      [requestIds[1], supplyIds[7], users['ankit.uttarakar@gmail.com']]
    );

    const trans2 = await client.query(
      `INSERT INTO transfers (
         allocation_id, supply_id, source_department_id, receiving_department_id,
         quantity, initiated_by_user_id, completed_by_user_id, handover_notes
       ) VALUES ($1, $2, $3, $4, 10, $5, $6, 'Transferred surplus Arduino kits to research team')
       RETURNING id;`,
      [
        allocCompleted2.rows[0].id, supplyIds[7], depts['CSE'], depts['ADM'],
        users['ankit.uttarakar@gmail.com'], users['ankitverma291206@gmail.com']
      ]
    );

    await client.query(
      `INSERT INTO rescue_chain_events (
         supply_id, allocation_id, transfer_id, from_department_id, to_department_id, quantity, event_type, notes, user_id
       ) VALUES ($1, $2, $3, $4, $5, 10, 'HANDED_OVER', 'Batch of 10 microcontrollers successfully transferred', $6);`,
      [supplyIds[7], allocCompleted2.rows[0].id, trans2.rows[0].id, depts['CSE'], depts['ADM'], users['ankitverma291206@gmail.com']]
    );

    // 9. Seed Audit Logs
    console.log('🛡️ Seeding Audit Trail...');
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES
       ($1, 'SEED_DATABASE', 'system', NULL, '{"status": "Database initialized with realistic dataset"}'),
       ($2, 'CREATE_SUPPLY', 'supplies', $3, '{"title": "10x High-Speed 2-Meter HDMI Cables", "qty": 10}'),
       ($4, 'RESERVE_ALLOCATION', 'supply_allocations', $5, '{"qty": 4, "request_id": 1}');`,
      [
        users['ankit.uttarakar@gmail.com'],
        users['ankitverma291206@gmail.com'], supplyIds[0],
        users['ankit.uttarakar@gmail.com'], alloc1.rows[0].id
      ]
    );

    client.release();
    console.log('\n🎉 Realistic Database Seeding Complete!');
    console.log('----------------------------------------------------');
    console.log('📌 Sample Demo Credentials:');
    console.log('   - Admin (Ankit Uttarakar):        ankit.uttarakar@gmail.com (Password: password123)');
    console.log('   - Faculty/Staff (Ankit Verma):    ankitverma291206@gmail.com (Password: password123)');
    console.log('----------------------------------------------------');
  } catch (error: any) {
    console.error('\n❌ Seeding Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
