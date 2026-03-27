import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,   // Fail fast (5s) if AlloyDB is stopped/unreachable
  idle_in_transaction_session_timeout: 30000,
  statement_timeout: 30000,        // Kill queries that take longer than 30s
  max: 10,                         // Max pool connections
});
export const db = drizzle(pool, { schema });

export * from "./schema";
