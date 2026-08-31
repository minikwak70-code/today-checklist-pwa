CREATE TABLE IF NOT EXISTS questionnaire_requests (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  assessment_date TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  response_data TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  submitted_at TEXT,
  applied_at TEXT,
  applied_by TEXT,
  revoked_at TEXT,
  verification_failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS questionnaire_requests_patient_idx
  ON questionnaire_requests (clinic_id, patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS questionnaire_requests_status_idx
  ON questionnaire_requests (clinic_id, status, expires_at);
