CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS crop_cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL UNIQUE,
  crop_type VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  region VARCHAR(200) NOT NULL,
  symptoms_text TEXT NOT NULL,
  diagnosis VARCHAR(300) NOT NULL,
  treatment_applied TEXT NOT NULL,
  outcome_score REAL NOT NULL CHECK (outcome_score BETWEEN 0 AND 1),
  resolved_at TIMESTAMP NOT NULL,
  embedding vector(1536) NOT NULL
);

CREATE INDEX IF NOT EXISTS crop_cases_crop_type_idx ON crop_cases (crop_type);
CREATE INDEX IF NOT EXISTS crop_cases_country_idx ON crop_cases (country);
