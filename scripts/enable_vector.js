const pg = require('pg');

async function setup() {
  const pool = new pg.Pool({
    connectionString: "postgresql://REDACTED_USER:REDACTED_PASSWORD@REDACTED_IP:5432/cropmind"
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
