/**
 * KRL.KR — PostgreSQL client with D1-compatible interface
 * Runs on VPS with PostgreSQL database
 */
import { Pool, type QueryResultRow } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    _pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err);
    });
  }
  return _pool;
}

// Convert SQLite ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql: string): string {
  let count = 0;
  return sql.replace(/\?/g, () => `$${++count}`);
}

// Convert SQLite date functions to PostgreSQL
function convertSqliteToPg(sql: string): string {
  // SQLite: date(clicked_at / 1000, 'unixepoch') → PG: to_char(to_timestamp(clicked_at / 1000.0), 'YYYY-MM-DD')
  sql = sql.replace(
    /date\((\w+)\s*\/\s*1000,\s*'unixepoch'\)/gi,
    "to_char(to_timestamp($1 / 1000.0), 'YYYY-MM-DD')"
  );
  // SQLite: strftime('%Y-%m-%d', ...) → PG equivalent
  sql = sql.replace(
    /strftime\('%Y-%m-%d',\s*(.+?)\)/gi,
    "to_char($1::timestamptz, 'YYYY-MM-DD')"
  );
  return sql;
}

class PostgresPreparedStatement {
  private params: unknown[] = [];

  constructor(private sql: string) {}

  bind(...values: unknown[]): this {
    this.params = [...this.params, ...values];
    return this;
  }

  async first<T extends QueryResultRow = Record<string, unknown>>(
    col?: string
  ): Promise<T | null> {
    const pool = getPool();
    const pgSql = convertPlaceholders(convertSqliteToPg(this.sql + " LIMIT 1"));
    try {
      const result = await pool.query<T>(pgSql, this.params as unknown[]);
      if (result.rows.length === 0) return null;
      if (col) return (result.rows[0] as Record<string, unknown>)[col] as T;
      return result.rows[0];
    } catch (err) {
      console.error("DB query error:", pgSql, this.params, err);
      throw err;
    }
  }

  async all<T extends QueryResultRow = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }> {
    const pool = getPool();
    const pgSql = convertPlaceholders(convertSqliteToPg(this.sql));
    try {
      const result = await pool.query<T>(pgSql, this.params as unknown[]);
      return { results: result.rows, success: true };
    } catch (err) {
      console.error("DB query error:", pgSql, this.params, err);
      throw err;
    }
  }

  async run<T extends QueryResultRow = Record<string, unknown>>(): Promise<{
    results: T[];
    success: boolean;
    meta: { changes: number; last_row_id?: number };
  }> {
    const pool = getPool();
    const pgSql = convertPlaceholders(convertSqliteToPg(this.sql));
    try {
      const result = await pool.query<T>(pgSql, this.params as unknown[]);
      return {
        results: result.rows,
        success: true,
        meta: { changes: result.rowCount ?? 0 },
      };
    } catch (err) {
      console.error("DB query error:", pgSql, this.params, err);
      throw err;
    }
  }
}

export class PostgresDatabase {
  prepare(sql: string): PostgresPreparedStatement {
    return new PostgresPreparedStatement(sql);
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    const pool = getPool();
    const start = Date.now();
    await pool.query(sql);
    return { count: 0, duration: Date.now() - start };
  }

  async batch(
    statements: PostgresPreparedStatement[]
  ): Promise<Array<{ results: unknown[]; success: boolean; meta: { changes: number } }>> {
    return Promise.all(statements.map((s) => s.run()));
  }
}

// Singleton database instance
const db = new PostgresDatabase();
export { db };

// Export the type for use in other files
export type KRLDatabase = PostgresDatabase;
