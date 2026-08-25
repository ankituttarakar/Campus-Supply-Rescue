import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campus_supply_rescue';

// Global singleton pool for Next.js hot reloading
declare global {
  var __pg_pool: Pool | undefined;
}

const pool = global.__pg_pool || new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (process.env.NODE_ENV !== 'production') {
  global.__pg_pool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[Slow DB Query] ${duration}ms: ${text.substring(0, 100)}...`);
    }
    return res;
  } catch (error: any) {
    console.error('[PostgreSQL Query Error]', {
      query: text,
      params,
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  pgvectorEnabled: boolean;
  tableCount: number;
  error?: string;
}> {
  try {
    const timeRes = await query('SELECT NOW() as now');
    const extRes = await query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    const tablesRes = await query(
      "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    );

    return {
      connected: !!timeRes.rows[0]?.now,
      pgvectorEnabled: extRes.rows.length > 0,
      tableCount: parseInt(tablesRes.rows[0]?.count || '0', 10),
    };
  } catch (err: any) {
    return {
      connected: false,
      pgvectorEnabled: false,
      tableCount: 0,
      error: err?.message || 'Failed to connect to PostgreSQL database.',
    };
  }
}

export default pool;
