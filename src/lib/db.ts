import { Pool, types } from 'pg';

// Automatically parse INT8 (bigint) and NUMERIC/DECIMAL as numbers
types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));

// Global connection pool for PostgreSQL on Hostinger VPS / Local.
// DATABASE_URL wajib di-set lewat environment (.env), jangan pernah hardcode kredensial.
const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  globalForDb.pgPool ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  if (!connectionString) {
    throw new Error('DATABASE_URL belum dikonfigurasi di environment server.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[SQL]', { text, duration, rows: res.rowCount });
  }
  return { rows: res.rows, rowCount: res.rowCount };
}
