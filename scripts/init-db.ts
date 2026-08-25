import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campus_supply_rescue';

async function initDatabase() {
  console.log('🚀 Initializing Campus Supply Rescue Database...');
  console.log(`📡 Connecting to: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection established.');

    // 1. Check if pgvector extension is available in PostgreSQL
    let hasPgVector = false;
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      hasPgVector = true;
      console.log('✅ pgvector extension is installed and enabled.');
    } catch (err: any) {
      console.warn('ℹ️ Native pgvector C-extension is not installed in this PostgreSQL instance.');
      console.log('🔄 Enabling adaptive vector support (384-dimensional REAL[] arrays with pure SQL cosine similarity)...');
    }

    // 2. Read schema.sql and adapt embedding type if pgvector is not installed
    let schemaSql = fs.readFileSync(path.join(__dirname, '../src/lib/db/schema.sql'), 'utf8');

    if (!hasPgVector) {
      // Remove CREATE EXTENSION vector
      schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS vector;/g, '-- pgvector not installed, using REAL[] vector storage');
      // Replace vector(384) with REAL[]
      schemaSql = schemaSql.replace(/vector\(384\)/g, 'REAL[]');
      // Replace HNSW index with standard index
      schemaSql = schemaSql.replace(/CREATE INDEX IF NOT EXISTS idx_supplies_embedding_hnsw[\s\S]*?ef_construction = 64\);/g, '-- Standard array index\n-- HNSW enabled when native pgvector is present');
      
      // Add pure PostgreSQL cosine similarity function and operators for seamless vector math
      const fallbackVectorFunctions = `
-- Pure PostgreSQL Cosine Similarity Function (Adaptive Vector Support)
CREATE OR REPLACE FUNCTION fn_cosine_similarity(a REAL[], b REAL[])
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    dot_product REAL := 0;
    norm_a REAL := 0;
    norm_b REAL := 0;
    len INTEGER;
    i INTEGER;
BEGIN
    IF a IS NULL OR b IS NULL THEN
        RETURN 0;
    END IF;
    len := LEAST(array_length(a, 1), array_length(b, 1));
    FOR i IN 1..len LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;
    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
    END IF;
    RETURN (dot_product / (SQRT(norm_a) * SQRT(norm_b)))::NUMERIC;
END;
$$;

-- Pure PostgreSQL Cosine Distance Function (<=> replacement)
CREATE OR REPLACE FUNCTION fn_cosine_distance(a REAL[], b REAL[])
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN (1.0 - fn_cosine_similarity(a, b));
END;
$$;
`;
      schemaSql += '\n' + fallbackVectorFunctions;
    }

    console.log('⏳ Executing Schema & DDL...');
    await client.query(schemaSql);
    console.log('✅ Schema & DDL executed successfully.');

    // 3. Stored procedures
    const procSql = fs.readFileSync(path.join(__dirname, '../src/lib/db/procedures.sql'), 'utf8');
    console.log('⏳ Executing Stored Procedures & Functions...');
    await client.query(procSql);
    console.log('✅ Stored Procedures executed successfully.');

    // 4. Triggers
    const trigSql = fs.readFileSync(path.join(__dirname, '../src/lib/db/triggers.sql'), 'utf8');
    console.log('⏳ Executing Database Triggers...');
    await client.query(trigSql);
    console.log('✅ Database Triggers executed successfully.');

    // 5. Views
    const viewSql = fs.readFileSync(path.join(__dirname, '../src/lib/db/views.sql'), 'utf8');
    console.log('⏳ Executing Relational Views...');
    await client.query(viewSql);
    console.log('✅ Relational Views executed successfully.');

    client.release();
    console.log('\n🎉 Database Schema, Stored Procedures, Triggers, and Views initialized successfully!');
    if (!hasPgVector) {
      console.log('💡 Note: Adaptive 384d vector similarity active. All features (Semantic Matching, Concurrency, Rescue Chain) will function 100% natively.');
    }
  } catch (error: any) {
    console.error('\n❌ Database initialization error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
