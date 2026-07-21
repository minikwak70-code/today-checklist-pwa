CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS clinic_members (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  user_id TEXT,
  invited_email TEXT,
  invited_name TEXT,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  invited_by TEXT,
  invited_at TEXT,
  joined_at TEXT,
  deactivated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS clinic_members_user_idx ON clinic_members (user_id, is_active);
CREATE INDEX IF NOT EXISTS clinic_members_clinic_idx ON clinic_members (clinic_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_members_invite_email_idx ON clinic_members (clinic_id, invited_email);

ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE patients ADD COLUMN clinic_id TEXT;
ALTER TABLE patients ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE patients ADD COLUMN updated_by TEXT;
ALTER TABLE patients ADD COLUMN deleted_at TEXT;
ALTER TABLE patients ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assessments ADD COLUMN clinic_id TEXT;
ALTER TABLE assessments ADD COLUMN updated_by TEXT;
ALTER TABLE assessments ADD COLUMN deleted_at TEXT;
ALTER TABLE assessments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN clinic_id TEXT;
ALTER TABLE audit_logs ADD COLUMN user_id TEXT;
ALTER TABLE audit_logs ADD COLUMN target_type TEXT;
ALTER TABLE audit_logs ADD COLUMN target_id TEXT;
ALTER TABLE audit_logs ADD COLUMN before_data TEXT;
ALTER TABLE audit_logs ADD COLUMN after_data TEXT;
ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;

CREATE INDEX IF NOT EXISTS patients_clinic_idx ON patients (clinic_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS patients_clinic_chart_unique ON patients (clinic_id, chart_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS assessments_clinic_idx ON assessments (clinic_id, patient_id, assessment_date);
CREATE INDEX IF NOT EXISTS audit_logs_clinic_idx ON audit_logs (clinic_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id);

INSERT OR IGNORE INTO clinics (
  id,
  name,
  business_name,
  is_active,
  created_at,
  updated_at,
  created_by
) VALUES (
  'clinic_gongdeok_kyunghee',
  '공덕경희한의원',
  '공덕경희한의원',
  1,
  datetime('now'),
  datetime('now'),
  'system'
);

UPDATE patients
SET clinic_id = 'clinic_gongdeok_kyunghee'
WHERE clinic_id IS NULL OR clinic_id = '';

UPDATE assessments
SET clinic_id = COALESCE(
  (SELECT clinic_id FROM patients WHERE patients.id = assessments.patient_id),
  'clinic_gongdeok_kyunghee'
)
WHERE clinic_id IS NULL OR clinic_id = '';

UPDATE patients
SET updated_by = created_by
WHERE updated_by IS NULL OR updated_by = '';

UPDATE assessments
SET updated_by = created_by
WHERE updated_by IS NULL OR updated_by = '';
