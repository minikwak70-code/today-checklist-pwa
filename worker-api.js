const SCORE_RULE_VERSION = "metabolic-score-v3.0";
const DEFAULT_CLINIC_ID = "clinic_gongdeok_kyunghee";
const DEFAULT_CLINIC_NAME = "공덕경희한의원";

const ROLE_LABELS = {
  admin: "관리자",
  staff: "직원",
  readOnly: "조회 전용",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function makeId(prefix) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random.replace(/-/g, "")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function requestIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
}

function decodeMaybeName(request) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  if (!encoded || encoding !== "percent-encoded-utf-8") return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function getEmail(request) {
  return request.headers.get("oai-authenticated-user-email") ||
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("x-authenticated-user-email");
}

function permissionsFor(role) {
  return {
    canRead: ["admin", "staff", "readOnly"].includes(role),
    canCreatePatient: ["admin", "staff"].includes(role),
    canCreateAssessment: ["admin", "staff"].includes(role),
    canEdit: ["admin", "staff"].includes(role),
    canDeleteAssessment: role === "admin",
    canManageMembers: role === "admin",
    canManageSettings: role === "admin",
    canExport: role === "admin",
  };
}

async function safeRun(db, sql, bindings = []) {
  try {
    return await db.prepare(sql).bind(...bindings).run();
  } catch {
    return null;
  }
}

async function addColumn(db, table, definition) {
  await safeRun(db, `ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, role TEXT NOT NULL DEFAULT 'staff', is_active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS clinics (id TEXT PRIMARY KEY, name TEXT NOT NULL, business_name TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS clinic_members (id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, user_id TEXT, invited_email TEXT, invited_name TEXT, role TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, invited_by TEXT, invited_at TEXT, joined_at TEXT, deactivated_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS clinic_members_user_idx ON clinic_members (user_id, is_active)"),
    db.prepare("CREATE INDEX IF NOT EXISTS clinic_members_clinic_idx ON clinic_members (clinic_id, is_active)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS clinic_members_invite_email_idx ON clinic_members (clinic_id, invited_email)"),
    db.prepare("CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, clinic_id TEXT, chart_number TEXT NOT NULL, name TEXT NOT NULL, sex TEXT, birth_date TEXT, memo TEXT, is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, created_by TEXT NOT NULL, updated_by TEXT, version INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (name)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_chart_number_idx ON patients (chart_number)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_clinic_idx ON patients (clinic_id, is_active)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS patients_clinic_chart_unique ON patients (clinic_id, chart_number) WHERE deleted_at IS NULL"),
    db.prepare("CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, clinic_id TEXT, patient_id TEXT NOT NULL, assessment_date TEXT NOT NULL, assessment_stage TEXT, fasting_status TEXT, raw_values TEXT NOT NULL, calculated_scores TEXT NOT NULL, total_score REAL, glucose_score REAL, lipid_score REAL, liver_score REAL, inflammation_score REAL, autonomic_score REAL, score_rule_version TEXT NOT NULL, primary_type TEXT, secondary_type TEXT, type_strengths TEXT, tags TEXT, warnings TEXT, clinician_note TEXT, report_snapshot TEXT, is_deleted INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_by TEXT, version INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assessments_patient_date_idx ON assessments (patient_id, assessment_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assessments_clinic_idx ON assessments (clinic_id, patient_id, assessment_date)"),
    db.prepare("CREATE TABLE IF NOT EXISTS score_rule_versions (id TEXT PRIMARY KEY, version TEXT NOT NULL UNIQUE, effective_date TEXT NOT NULL, rules TEXT NOT NULL, description TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, clinic_id TEXT, user_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, before_data TEXT, after_data TEXT, ip_address TEXT, user_agent TEXT, entity_type TEXT, entity_id TEXT, before_values TEXT, after_values TEXT, reason TEXT, created_at TEXT NOT NULL, created_by TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_clinic_idx ON audit_logs (clinic_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id)"),
  ]);

  await addColumn(db, "users", "last_login_at TEXT");
  await addColumn(db, "patients", "clinic_id TEXT");
  await addColumn(db, "patients", "is_active INTEGER NOT NULL DEFAULT 1");
  await addColumn(db, "patients", "updated_by TEXT");
  await addColumn(db, "patients", "deleted_at TEXT");
  await addColumn(db, "patients", "version INTEGER NOT NULL DEFAULT 1");
  await addColumn(db, "assessments", "clinic_id TEXT");
  await addColumn(db, "assessments", "updated_by TEXT");
  await addColumn(db, "assessments", "deleted_at TEXT");
  await addColumn(db, "assessments", "version INTEGER NOT NULL DEFAULT 1");
  await addColumn(db, "audit_logs", "clinic_id TEXT");
  await addColumn(db, "audit_logs", "user_id TEXT");
  await addColumn(db, "audit_logs", "target_type TEXT");
  await addColumn(db, "audit_logs", "target_id TEXT");
  await addColumn(db, "audit_logs", "before_data TEXT");
  await addColumn(db, "audit_logs", "after_data TEXT");
  await addColumn(db, "audit_logs", "ip_address TEXT");
  await addColumn(db, "audit_logs", "user_agent TEXT");

  const now = nowIso();
  await db.prepare(
    "INSERT OR IGNORE INTO clinics (id, name, business_name, is_active, created_at, updated_at, created_by) VALUES (?, ?, ?, 1, ?, ?, ?)",
  ).bind(DEFAULT_CLINIC_ID, DEFAULT_CLINIC_NAME, DEFAULT_CLINIC_NAME, now, now, "system").run();
  await db.prepare("UPDATE patients SET clinic_id = ? WHERE clinic_id IS NULL OR clinic_id = ''").bind(DEFAULT_CLINIC_ID).run();
  await db.prepare(
    "UPDATE assessments SET clinic_id = COALESCE((SELECT clinic_id FROM patients WHERE patients.id = assessments.patient_id), ?) WHERE clinic_id IS NULL OR clinic_id = ''",
  ).bind(DEFAULT_CLINIC_ID).run();
  await db.prepare("UPDATE patients SET updated_by = created_by WHERE updated_by IS NULL OR updated_by = ''").run();
  await db.prepare("UPDATE assessments SET updated_by = created_by WHERE updated_by IS NULL OR updated_by = ''").run();
  await db.prepare(
    "INSERT OR IGNORE INTO score_rule_versions (id, version, effective_date, rules, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(
    makeId("rule"),
    SCORE_RULE_VERSION,
    "2026-07-21",
    JSON.stringify({ source: "embedded-client-scoring", preservesSnapshot: true }),
    "Current embedded metabolic score rules with hs-CRP, visceral fat and SMI reference logic.",
    now,
  ).run();
}

async function getOrCreateUser(request, db) {
  const email = normalizeEmail(getEmail(request));
  if (!email) {
    await auditAuthFailure(db, request, null, "missing authenticated user email");
    return { error: json({ error: "Authentication is required.", signInPath: "/signin-with-chatgpt?return_to=/" }, 401) };
  }
  const displayName = decodeMaybeName(request) || email;
  const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    if (!existing.is_active) {
      await auditAuthFailure(db, request, existing, "inactive user account");
      return { error: json({ error: "User account is inactive." }, 403) };
    }
    await db.prepare("UPDATE users SET name = COALESCE(?, name), last_login_at = ?, updated_at = ? WHERE id = ?").bind(displayName, nowIso(), nowIso(), existing.id).run();
    return { user: { ...existing, name: displayName || existing.name, email } };
  }
  const user = {
    id: makeId("usr"),
    email,
    name: displayName,
    role: "staff",
    is_active: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.prepare(
    "INSERT INTO users (id, email, name, role, is_active, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)",
  ).bind(user.id, user.email, user.name, user.role, nowIso(), user.created_at, user.updated_at).run();
  return { user };
}

async function ensureMembership(db, user) {
  const pending = await db.prepare(
    "SELECT * FROM clinic_members WHERE lower(invited_email) = ? AND is_active = 1 AND (user_id IS NULL OR user_id = '') ORDER BY invited_at DESC LIMIT 1",
  ).bind(user.email).first();
  if (pending) {
    await db.prepare("UPDATE clinic_members SET user_id = ?, joined_at = COALESCE(joined_at, ?), updated_at = ? WHERE id = ?").bind(user.id, nowIso(), nowIso(), pending.id).run();
  }

  let member = await db.prepare(
    "SELECT cm.*, c.name AS clinic_name, c.business_name, c.is_active AS clinic_is_active FROM clinic_members cm JOIN clinics c ON c.id = cm.clinic_id WHERE cm.user_id = ? AND cm.is_active = 1 AND c.is_active = 1 ORDER BY cm.created_at ASC LIMIT 1",
  ).bind(user.id).first();
  if (member) return member;

  const memberCount = await db.prepare("SELECT COUNT(*) AS count FROM clinic_members WHERE clinic_id = ?").bind(DEFAULT_CLINIC_ID).first();
  const legacyRole = user.role === "admin" || Number(memberCount?.count || 0) === 0 ? "admin" : "";
  if (!legacyRole) return null;

  const memberId = makeId("mem");
  await db.prepare(
    "INSERT INTO clinic_members (id, clinic_id, user_id, invited_email, invited_name, role, is_active, invited_by, invited_at, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)",
  ).bind(memberId, DEFAULT_CLINIC_ID, user.id, user.email, user.name, legacyRole, "system", nowIso(), nowIso(), nowIso(), nowIso()).run();
  member = await db.prepare(
    "SELECT cm.*, c.name AS clinic_name, c.business_name, c.is_active AS clinic_is_active FROM clinic_members cm JOIN clinics c ON c.id = cm.clinic_id WHERE cm.id = ?",
  ).bind(memberId).first();
  return member;
}

async function getContext(request, env) {
  if (!env.DB) return { error: json({ error: "D1 database binding DB is not configured." }, 503) };
  await ensureSchema(env.DB);
  const userResult = await getOrCreateUser(request, env.DB);
  if (userResult.error) return userResult;
  const user = userResult.user;
  const member = await ensureMembership(env.DB, user);
  if (!member) {
    await auditAuthFailure(env.DB, request, user, "no active clinic membership");
    return { error: json({ error: "No active clinic membership.", signInPath: "/signin-with-chatgpt?return_to=/" }, 403) };
  }
  return {
    db: env.DB,
    user,
    member,
    clinic: { id: member.clinic_id, name: member.clinic_name, businessName: member.business_name },
    permissions: permissionsFor(member.role),
  };
}

function requirePermission(context, key) {
  if (!context.permissions[key]) return json({ error: "Permission denied." }, 403);
  return null;
}

async function audit(db, context, request, action, targetType, targetId, beforeData, afterData, reason = null) {
  const beforeJson = beforeData ? JSON.stringify(minimizeAuditData(beforeData)) : null;
  const afterJson = afterData ? JSON.stringify(minimizeAuditData(afterData)) : null;
  await db.prepare(
    `INSERT INTO audit_logs (
      id, clinic_id, user_id, action, target_type, target_id, before_data, after_data,
      ip_address, user_agent, entity_type, entity_id, before_values, after_values, reason, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    makeId("aud"),
    context.clinic.id,
    context.user.id,
    action,
    targetType,
    targetId,
    beforeJson,
    afterJson,
    requestIp(request),
    request.headers.get("user-agent") || "",
    targetType,
    targetId,
    beforeJson,
    afterJson,
    reason,
    nowIso(),
    context.user.id,
  ).run();
}

async function auditAuthFailure(db, request, user, reason) {
  const now = nowIso();
  await db.prepare(
    `INSERT INTO audit_logs (
      id, clinic_id, user_id, action, target_type, target_id, before_data, after_data,
      ip_address, user_agent, entity_type, entity_id, before_values, after_values, reason, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    makeId("aud"),
    DEFAULT_CLINIC_ID,
    user?.id || null,
    "auth.login_fail",
    "user",
    user?.id || user?.email || "anonymous",
    null,
    user ? JSON.stringify({ email: user.email }) : null,
    requestIp(request),
    request.headers.get("user-agent") || "",
    "user",
    user?.id || user?.email || "anonymous",
    null,
    user ? JSON.stringify({ email: user.email }) : null,
    reason,
    now,
    user?.id || "anonymous",
  ).run();
}

function minimizeAuditData(value) {
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const key of ["id", "clinic_id", "chart_number", "name", "assessment_date", "assessment_stage", "role", "is_active", "deleted_at", "version"]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return Object.keys(result).length ? result : { changed: true };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseJsonField(value, fallback) {
  try {
    return JSON.parse(value || fallback);
  } catch {
    return JSON.parse(fallback);
  }
}

function patientRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    chart_number: row.chart_number,
    name: row.name,
    sex: row.sex,
    birth_date: row.birth_date,
    memo: row.memo,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_by_name: row.created_by_name,
    updated_by_name: row.updated_by_name,
    latest_assessment_date: row.latest_assessment_date,
    latest_total_score: row.latest_total_score,
    latest_primary_type: row.latest_primary_type,
    version: row.version,
  };
}

function assessmentRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    assessmentDate: row.assessment_date,
    assessmentStage: row.assessment_stage,
    fastingStatus: row.fasting_status,
    rawValues: parseJsonField(row.raw_values, "{}"),
    calculatedScores: parseJsonField(row.calculated_scores, "{}"),
    totalScore: row.total_score,
    glucoseScore: row.glucose_score,
    lipidScore: row.lipid_score,
    liverScore: row.liver_score,
    inflammationScore: row.inflammation_score,
    autonomicScore: row.autonomic_score,
    scoreRuleVersion: row.score_rule_version,
    primaryType: row.primary_type,
    secondaryType: row.secondary_type,
    typeStrengths: parseJsonField(row.type_strengths, "[]"),
    tags: parseJsonField(row.tags, "[]"),
    warnings: parseJsonField(row.warnings, "[]"),
    clinicianNote: row.clinician_note,
    reportSnapshot: parseJsonField(row.report_snapshot, "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdByName: row.created_by_name || row.created_by,
    updatedByName: row.updated_by_name || row.updated_by,
    version: row.version,
  };
}

async function getPatient(db, context, patientId) {
  return db.prepare(
    "SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL AND COALESCE(is_deleted, 0) = 0",
  ).bind(patientId, context.clinic.id).first();
}

function memberRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    userId: row.user_id,
    email: row.user_email || row.invited_email,
    name: row.user_name || row.invited_name || row.invited_email,
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] || row.role,
    isActive: Boolean(row.is_active),
    invitedAt: row.invited_at,
    joinedAt: row.joined_at,
    deactivatedAt: row.deactivated_at,
  };
}

async function handleApi(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const url = new URL(request.url);
  const context = await getContext(request, env);
  if (context.error) return context.error;
  const { db, user, member, clinic, permissions } = context;

  if (url.pathname === "/api/me") {
    return json({
      user: { id: user.id, email: user.email, name: user.name },
      clinic,
      member: { id: member.id, role: member.role, roleLabel: ROLE_LABELS[member.role] || member.role, isActive: Boolean(member.is_active) },
      permissions,
    });
  }

  if (url.pathname === "/api/patients" && request.method === "GET") {
    const denied = requirePermission(context, "canRead");
    if (denied) return denied;
    const search = `%${(url.searchParams.get("search") || "").trim()}%`;
    const order = url.searchParams.get("sort") === "score"
      ? "latest_total_score DESC"
      : url.searchParams.get("sort") === "chart"
        ? "p.chart_number ASC"
        : url.searchParams.get("sort") === "name"
          ? "p.name ASC"
          : "latest_assessment_date DESC";
    const query = `
      SELECT
        p.id, p.clinic_id, p.chart_number, p.name, p.sex, p.birth_date, p.memo, p.created_at, p.updated_at,
        p.created_by, p.updated_by, p.version,
        cu.name AS created_by_name, uu.name AS updated_by_name,
        a.assessment_date AS latest_assessment_date,
        a.total_score AS latest_total_score,
        a.primary_type AS latest_primary_type
      FROM patients p
      LEFT JOIN users cu ON cu.id = p.created_by
      LEFT JOIN users uu ON uu.id = p.updated_by
      LEFT JOIN assessments a ON a.id = (
        SELECT id FROM assessments
        WHERE patient_id = p.id AND clinic_id = ? AND deleted_at IS NULL AND COALESCE(is_deleted, 0) = 0
        ORDER BY assessment_date DESC, created_at DESC
        LIMIT 1
      )
      WHERE p.clinic_id = ?
        AND p.deleted_at IS NULL
        AND COALESCE(p.is_deleted, 0) = 0
        AND (p.name LIKE ? OR p.chart_number LIKE ?)
      ORDER BY ${order}, p.updated_at DESC
    `;
    const result = await db.prepare(query).bind(clinic.id, clinic.id, search, search).all();
    const type = url.searchParams.get("type") || "";
    const patients = (result.results || []).map(patientRow);
    return json({ clinic, patients: type ? patients.filter((patient) => patient.latest_primary_type === type) : patients });
  }

  if (url.pathname === "/api/patients" && request.method === "POST") {
    const denied = requirePermission(context, "canCreatePatient");
    if (denied) return denied;
    const body = await readJson(request);
    if (!body?.chartNumber || !body?.name) return json({ error: "Chart number and name are required." }, 400);
    const now = nowIso();
    const patient = {
      id: makeId("pat"),
      clinicId: clinic.id,
      chartNumber: String(body.chartNumber).trim(),
      name: String(body.name).trim(),
      sex: body.sex || "",
      birthDate: body.birthDate || "",
      memo: body.memo || "",
      version: 1,
    };
    const duplicate = await db.prepare(
      "SELECT id FROM patients WHERE clinic_id = ? AND chart_number = ? AND deleted_at IS NULL AND COALESCE(is_deleted, 0) = 0",
    ).bind(clinic.id, patient.chartNumber).first();
    if (duplicate) return json({ error: "Chart number already exists in this clinic." }, 409);
    await db.prepare(
      "INSERT INTO patients (id, clinic_id, chart_number, name, sex, birth_date, memo, is_active, is_deleted, created_at, updated_at, created_by, updated_by, version) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, 1)",
    ).bind(patient.id, clinic.id, patient.chartNumber, patient.name, patient.sex, patient.birthDate, patient.memo, now, now, user.id, user.id).run();
    await audit(db, context, request, "patient.create", "patient", patient.id, null, patient);
    return json({ patient: { id: patient.id, clinic_id: clinic.id, chart_number: patient.chartNumber, name: patient.name, sex: patient.sex, birth_date: patient.birthDate, memo: patient.memo, version: 1 } }, 201);
  }

  const patientBaseMatch = url.pathname.match(/^\/api\/patients\/([^/]+)$/);
  if (patientBaseMatch && request.method === "PATCH") {
    const denied = requirePermission(context, "canEdit");
    if (denied) return denied;
    const existing = await getPatient(db, context, patientBaseMatch[1]);
    if (!existing) return json({ error: "Patient not found." }, 404);
    const body = await readJson(request);
    const next = {
      chartNumber: String(body.chartNumber || "").trim(),
      name: String(body.name || "").trim(),
      sex: body.sex || "",
      birthDate: body.birthDate || "",
      memo: body.memo || "",
    };
    if (!next.chartNumber || !next.name) return json({ error: "Chart number and name are required." }, 400);
    const duplicate = await db.prepare(
      "SELECT id FROM patients WHERE clinic_id = ? AND chart_number = ? AND id <> ? AND deleted_at IS NULL AND COALESCE(is_deleted, 0) = 0",
    ).bind(clinic.id, next.chartNumber, existing.id).first();
    if (duplicate) return json({ error: "Chart number already exists in this clinic." }, 409);
    const now = nowIso();
    await db.prepare(
      "UPDATE patients SET chart_number = ?, name = ?, sex = ?, birth_date = ?, memo = ?, updated_at = ?, updated_by = ?, version = COALESCE(version, 1) + 1 WHERE id = ? AND clinic_id = ?",
    ).bind(next.chartNumber, next.name, next.sex, next.birthDate, next.memo, now, user.id, existing.id, clinic.id).run();
    const updated = await getPatient(db, context, existing.id);
    await audit(db, context, request, "patient.update", "patient", existing.id, existing, updated);
    return json({ patient: patientRow(updated) });
  }

  const patientMatch = url.pathname.match(/^\/api\/patients\/([^/]+)\/assessments$/);
  if (patientMatch && request.method === "GET") {
    const denied = requirePermission(context, "canRead");
    if (denied) return denied;
    const patient = await getPatient(db, context, patientMatch[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const order = url.searchParams.get("sort") === "asc" ? "ASC" : "DESC";
    const result = await db.prepare(
      `SELECT a.*, cu.name AS created_by_name, uu.name AS updated_by_name
       FROM assessments a
       LEFT JOIN users cu ON cu.id = a.created_by
       LEFT JOIN users uu ON uu.id = a.updated_by
       WHERE a.patient_id = ? AND a.clinic_id = ? AND a.deleted_at IS NULL AND COALESCE(a.is_deleted, 0) = 0
       ORDER BY a.assessment_date ${order}, a.created_at ${order}`,
    ).bind(patient.id, clinic.id).all();
    return json({ clinic, patient, assessments: (result.results || []).map(assessmentRow) });
  }

  if (patientMatch && request.method === "POST") {
    const denied = requirePermission(context, "canCreateAssessment");
    if (denied) return denied;
    const patient = await getPatient(db, context, patientMatch[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const body = await readJson(request);
    if (!body?.assessmentDate || !body?.rawValues || !body?.calculatedScores) return json({ error: "Assessment date, raw values and calculated scores are required." }, 400);
    const scores = body.calculatedScores || {};
    const id = makeId("asm");
    const createdAt = nowIso();
    await db.prepare(
      `INSERT INTO assessments (
        id, clinic_id, patient_id, assessment_date, assessment_stage, fasting_status, raw_values, calculated_scores,
        total_score, glucose_score, lipid_score, liver_score, inflammation_score, autonomic_score,
        score_rule_version, primary_type, secondary_type, type_strengths, tags, warnings, clinician_note,
        report_snapshot, is_deleted, deleted_at, created_at, updated_at, created_by, updated_by, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, 1)`,
    ).bind(
      id,
      clinic.id,
      patient.id,
      body.assessmentDate,
      body.assessmentStage || "",
      body.fastingStatus || "",
      JSON.stringify(body.rawValues),
      JSON.stringify(scores),
      scores.totalScore ?? null,
      scores.glucoseScore ?? null,
      scores.lipidScore ?? null,
      scores.liverScore ?? null,
      scores.inflammationScore ?? null,
      scores.autonomicScore ?? null,
      body.scoreRuleVersion || SCORE_RULE_VERSION,
      body.primaryType || "",
      body.secondaryType || "",
      JSON.stringify(body.typeStrengths || []),
      JSON.stringify(body.tags || []),
      JSON.stringify(body.warnings || []),
      body.clinicianNote || "",
      JSON.stringify(body.reportSnapshot || {}),
      createdAt,
      createdAt,
      user.id,
      user.id,
    ).run();
    await audit(db, context, request, "assessment.create", "assessment", id, null, { id, clinic_id: clinic.id, patient_id: patient.id, assessment_date: body.assessmentDate });
    return json({ assessment: { id, patientId: patient.id, clinicId: clinic.id, createdAt, version: 1 } }, 201);
  }

  const assessmentDelete = url.pathname.match(/^\/api\/patients\/([^/]+)\/assessments\/([^/]+)$/);
  if (assessmentDelete && request.method === "DELETE") {
    const denied = requirePermission(context, "canDeleteAssessment");
    if (denied) return denied;
    const patient = await getPatient(db, context, assessmentDelete[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const before = await db.prepare(
      "SELECT * FROM assessments WHERE id = ? AND patient_id = ? AND clinic_id = ? AND deleted_at IS NULL AND COALESCE(is_deleted, 0) = 0",
    ).bind(assessmentDelete[2], patient.id, clinic.id).first();
    if (!before) return json({ error: "Assessment not found." }, 404);
    await db.prepare("UPDATE assessments SET is_deleted = 1, deleted_at = ?, updated_at = ?, updated_by = ?, version = version + 1 WHERE id = ? AND clinic_id = ?").bind(nowIso(), nowIso(), user.id, before.id, clinic.id).run();
    await audit(db, context, request, "assessment.soft_delete", "assessment", before.id, before, { id: before.id, deleted_at: nowIso(), version: Number(before.version || 1) + 1 }, "user requested deletion");
    return json({ ok: true });
  }

  if (url.pathname === "/api/members" && request.method === "GET") {
    const denied = requirePermission(context, "canManageMembers");
    if (denied) return denied;
    const result = await db.prepare(
      `SELECT cm.*, u.email AS user_email, u.name AS user_name
       FROM clinic_members cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.clinic_id = ?
       ORDER BY cm.is_active DESC, cm.role ASC, COALESCE(u.name, cm.invited_name, cm.invited_email) ASC`,
    ).bind(clinic.id).all();
    return json({ members: (result.results || []).map(memberRow) });
  }

  if (url.pathname === "/api/members/invite" && request.method === "POST") {
    const denied = requirePermission(context, "canManageMembers");
    if (denied) return denied;
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const role = ["admin", "staff", "readOnly"].includes(body?.role) ? body.role : "staff";
    const name = String(body?.name || email).trim();
    if (!email) return json({ error: "Email is required." }, 400);
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    const existingMember = await db.prepare("SELECT * FROM clinic_members WHERE clinic_id = ? AND lower(invited_email) = ?").bind(clinic.id, email).first();
    const now = nowIso();
    if (existingMember) {
      await db.prepare(
        "UPDATE clinic_members SET user_id = COALESCE(user_id, ?), invited_name = ?, role = ?, is_active = 1, deactivated_at = NULL, updated_at = ? WHERE id = ?",
      ).bind(existingUser?.id || null, name, role, now, existingMember.id).run();
      await audit(db, context, request, "member.invite_update", "clinicMember", existingMember.id, existingMember, { email, role, is_active: 1 });
      return json({ member: { id: existingMember.id, email, name, role, inviteLink: `/signin-with-chatgpt?return_to=/` } });
    }
    const id = makeId("mem");
    await db.prepare(
      "INSERT INTO clinic_members (id, clinic_id, user_id, invited_email, invited_name, role, is_active, invited_by, invited_at, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)",
    ).bind(id, clinic.id, existingUser?.id || null, email, name, role, user.id, now, existingUser ? now : null, now, now).run();
    await audit(db, context, request, "member.invite", "clinicMember", id, null, { id, email, role });
    return json({ member: { id, email, name, role, inviteLink: `/signin-with-chatgpt?return_to=/` } }, 201);
  }

  const memberPatch = url.pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberPatch && request.method === "PATCH") {
    const denied = requirePermission(context, "canManageMembers");
    if (denied) return denied;
    const body = await readJson(request);
    const before = await db.prepare("SELECT * FROM clinic_members WHERE id = ? AND clinic_id = ?").bind(memberPatch[1], clinic.id).first();
    if (!before) return json({ error: "Member not found." }, 404);
    const role = ["admin", "staff", "readOnly"].includes(body?.role) ? body.role : before.role;
    const active = body?.isActive === undefined ? Boolean(before.is_active) : Boolean(body.isActive);
    const deactivatedAt = active ? null : nowIso();
    await db.prepare(
      "UPDATE clinic_members SET role = ?, is_active = ?, deactivated_at = ?, updated_at = ? WHERE id = ? AND clinic_id = ?",
    ).bind(role, active ? 1 : 0, deactivatedAt, nowIso(), before.id, clinic.id).run();
    await audit(db, context, request, active ? "member.role_change" : "member.deactivate", "clinicMember", before.id, before, { id: before.id, role, is_active: active ? 1 : 0, deactivated_at: deactivatedAt });
    return json({ ok: true });
  }

  if (url.pathname === "/api/audit-logs" && request.method === "GET") {
    const denied = requirePermission(context, "canManageMembers");
    if (denied) return denied;
    const result = await db.prepare(
      "SELECT * FROM audit_logs WHERE clinic_id = ? ORDER BY created_at DESC LIMIT 100",
    ).bind(clinic.id).all();
    return json({ logs: result.results || [] });
  }

  return json({ error: "API route not found." }, 404);
}
