const pg = require('pg');

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Usage: DATABASE_URL=postgresql://user:pass@host:5432/dbname node lib/db/enable_vector.cjs');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('Connecting to Cloud SQL...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension enabled successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

setup();
