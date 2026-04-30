import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idle_in_transaction_session_timeout: 30000,
    statement_timeout: 30000,
    max: 10,
  });
  db = drizzle(pool, { schema });
  console.log("[db] PostgreSQL pool created");
} else {
  console.warn("[db] DATABASE_URL not set — database features disabled. MCP tools use embedded data.");
}

export { pool, db };
export * from "./schema";
