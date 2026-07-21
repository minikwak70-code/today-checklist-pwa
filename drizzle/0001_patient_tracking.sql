CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'clinician',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  chart_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sex TEXT,
  birth_date TEXT,
  memo TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (name);
CREATE INDEX IF NOT EXISTS patients_chart_number_idx ON patients (chart_number);
CREATE INDEX IF NOT EXISTS patients_created_by_idx ON patients (created_by);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  assessment_date TEXT NOT NULL,
  assessment_stage TEXT,
  fasting_status TEXT,
  raw_values TEXT NOT NULL,
  calculated_scores TEXT NOT NULL,
  total_score REAL,
  glucose_score REAL,
  lipid_score REAL,
  liver_score REAL,
  inflammation_score REAL,
  autonomic_score REAL,
  score_rule_version TEXT NOT NULL,
  primary_type TEXT,
  secondary_type TEXT,
  type_strengths TEXT,
  tags TEXT,
  warnings TEXT,
  clinician_note TEXT,
  report_snapshot TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS assessments_patient_date_idx ON assessments (patient_id, assessment_date);
CREATE INDEX IF NOT EXISTS assessments_created_by_idx ON assessments (created_by);

CREATE TABLE IF NOT EXISTS score_rule_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  effective_date TEXT NOT NULL,
  rules TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_values TEXT,
  after_values TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_by_idx ON audit_logs (created_by);
