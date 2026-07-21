const SCORE_RULE_VERSION = "metabolic-score-v3.0";

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

async function ensureSchema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, role TEXT NOT NULL DEFAULT 'clinician', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, chart_number TEXT NOT NULL UNIQUE, name TEXT NOT NULL, sex TEXT, birth_date TEXT, memo TEXT, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (name)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_chart_number_idx ON patients (chart_number)"),
    db.prepare("CREATE INDEX IF NOT EXISTS patients_created_by_idx ON patients (created_by)"),
    db.prepare("CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, assessment_date TEXT NOT NULL, assessment_stage TEXT, fasting_status TEXT, raw_values TEXT NOT NULL, calculated_scores TEXT NOT NULL, total_score REAL, glucose_score REAL, lipid_score REAL, liver_score REAL, inflammation_score REAL, autonomic_score REAL, score_rule_version TEXT NOT NULL, primary_type TEXT, secondary_type TEXT, type_strengths TEXT, tags TEXT, warnings TEXT, clinician_note TEXT, report_snapshot TEXT, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assessments_patient_date_idx ON assessments (patient_id, assessment_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assessments_created_by_idx ON assessments (created_by)"),
    db.prepare("CREATE TABLE IF NOT EXISTS score_rule_versions (id TEXT PRIMARY KEY, version TEXT NOT NULL UNIQUE, effective_date TEXT NOT NULL, rules TEXT NOT NULL, description TEXT, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, before_values TEXT, after_values TEXT, reason TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_created_by_idx ON audit_logs (created_by)"),
  ]);
  await db.prepare(
    "INSERT OR IGNORE INTO score_rule_versions (id, version, effective_date, rules, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(
    makeId("rule"),
    SCORE_RULE_VERSION,
    "2026-07-21",
    JSON.stringify({ source: "embedded-client-scoring", preservesSnapshot: true }),
    "Current embedded metabolic score rules with hs-CRP, visceral fat and SMI reference logic.",
    nowIso(),
  ).run();
}

async function getCurrentUser(request, env) {
  if (!env.DB) return { error: json({ error: "D1 database binding DB is not configured." }, 503) };
  const email = getEmail(request);
  if (!email) return { error: json({ error: "Authentication is required.", signInPath: "/signin-with-chatgpt?return_to=/" }, 401) };
  await ensureSchema(env.DB);
  const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  const displayName = decodeMaybeName(request) || email;
  if (existing) {
    if (!existing.is_active) return { error: json({ error: "User account is inactive." }, 403) };
    await env.DB.prepare("UPDATE users SET name = COALESCE(?, name), updated_at = ? WHERE id = ?").bind(displayName, nowIso(), existing.id).run();
    return { user: { ...existing, name: displayName || existing.name } };
  }
  const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
  const role = Number(countRow?.count || 0) === 0 ? "admin" : "clinician";
  const user = {
    id: makeId("usr"),
    email,
    name: displayName,
    role,
    is_active: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(user.id, user.email, user.name, user.role, user.is_active, user.created_at, user.updated_at).run();
  return { user };
}

function canSeeAll(user) {
  return user.role === "admin";
}

async function getPatient(db, user, patientId) {
  const patient = await db.prepare("SELECT * FROM patients WHERE id = ? AND is_deleted = 0").bind(patientId).first();
  if (!patient) return null;
  if (!canSeeAll(user) && patient.created_by !== user.id) return null;
  return patient;
}

async function audit(db, user, entityType, entityId, action, beforeValues, afterValues, reason = null) {
  await db.prepare(
    "INSERT INTO audit_logs (id, entity_type, entity_id, action, before_values, after_values, reason, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    makeId("aud"),
    entityType,
    entityId,
    action,
    beforeValues ? JSON.stringify(beforeValues) : null,
    afterValues ? JSON.stringify(afterValues) : null,
    reason,
    nowIso(),
    user.id,
  ).run();
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function assessmentRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    assessmentDate: row.assessment_date,
    assessmentStage: row.assessment_stage,
    fastingStatus: row.fasting_status,
    rawValues: JSON.parse(row.raw_values || "{}"),
    calculatedScores: JSON.parse(row.calculated_scores || "{}"),
    totalScore: row.total_score,
    glucoseScore: row.glucose_score,
    lipidScore: row.lipid_score,
    liverScore: row.liver_score,
    inflammationScore: row.inflammation_score,
    autonomicScore: row.autonomic_score,
    scoreRuleVersion: row.score_rule_version,
    primaryType: row.primary_type,
    secondaryType: row.secondary_type,
    typeStrengths: JSON.parse(row.type_strengths || "[]"),
    tags: JSON.parse(row.tags || "[]"),
    warnings: JSON.parse(row.warnings || "[]"),
    clinicianNote: row.clinician_note,
    reportSnapshot: JSON.parse(row.report_snapshot || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

async function handleApi(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const url = new URL(request.url);
  const current = await getCurrentUser(request, env);
  if (current.error) return current.error;
  const user = current.user;
  const db = env.DB;

  if (url.pathname === "/api/me") {
    return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  if (url.pathname === "/api/patients" && request.method === "GET") {
    const search = `%${(url.searchParams.get("search") || "").trim()}%`;
    const order = url.searchParams.get("sort") === "score"
      ? "latest_total_score DESC"
      : url.searchParams.get("sort") === "chart"
        ? "p.chart_number ASC"
        : url.searchParams.get("sort") === "name"
          ? "p.name ASC"
          : "latest_assessment_date DESC";
    const accessSql = canSeeAll(user) ? "1 = 1" : "p.created_by = ?";
    const params = canSeeAll(user) ? [search, search] : [user.id, search, search];
    const query = `
      SELECT
        p.id, p.chart_number, p.name, p.sex, p.birth_date, p.memo, p.created_at, p.updated_at, p.created_by,
        a.assessment_date AS latest_assessment_date,
        a.total_score AS latest_total_score,
        a.primary_type AS latest_primary_type
      FROM patients p
      LEFT JOIN assessments a ON a.id = (
        SELECT id FROM assessments
        WHERE patient_id = p.id AND is_deleted = 0
        ORDER BY assessment_date DESC, created_at DESC
        LIMIT 1
      )
      WHERE p.is_deleted = 0
        AND ${accessSql}
        AND (p.name LIKE ? OR p.chart_number LIKE ?)
      ORDER BY ${order}, p.updated_at DESC
    `;
    const result = await db.prepare(query).bind(...params).all();
    const type = url.searchParams.get("type") || "";
    const patients = type ? (result.results || []).filter((patient) => patient.latest_primary_type === type) : (result.results || []);
    return json({ patients });
  }

  if (url.pathname === "/api/patients" && request.method === "POST") {
    const body = await readJson(request);
    if (!body?.chartNumber || !body?.name) return json({ error: "Chart number and name are required." }, 400);
    const patient = {
      id: makeId("pat"),
      chartNumber: String(body.chartNumber).trim(),
      name: String(body.name).trim(),
      sex: body.sex || "",
      birthDate: body.birthDate || "",
      memo: body.memo || "",
      now: nowIso(),
    };
    try {
      await db.prepare(
        "INSERT INTO patients (id, chart_number, name, sex, birth_date, memo, is_deleted, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
      ).bind(patient.id, patient.chartNumber, patient.name, patient.sex, patient.birthDate, patient.memo, patient.now, patient.now, user.id).run();
    } catch (error) {
      return json({ error: "Chart number already exists or patient could not be saved." }, 409);
    }
    await audit(db, user, "patient", patient.id, "create", null, patient);
    return json({ patient: { id: patient.id, chart_number: patient.chartNumber, name: patient.name, sex: patient.sex, birth_date: patient.birthDate, memo: patient.memo } }, 201);
  }

  const patientMatch = url.pathname.match(/^\/api\/patients\/([^/]+)\/assessments$/);
  if (patientMatch && request.method === "GET") {
    const patient = await getPatient(db, user, patientMatch[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const order = url.searchParams.get("sort") === "asc" ? "ASC" : "DESC";
    const result = await db.prepare(
      `SELECT * FROM assessments WHERE patient_id = ? AND is_deleted = 0 ORDER BY assessment_date ${order}, created_at ${order}`,
    ).bind(patient.id).all();
    return json({ patient, assessments: (result.results || []).map(assessmentRow) });
  }

  if (patientMatch && request.method === "POST") {
    const patient = await getPatient(db, user, patientMatch[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const body = await readJson(request);
    if (!body?.assessmentDate || !body?.rawValues || !body?.calculatedScores) return json({ error: "Assessment date, raw values and calculated scores are required." }, 400);
    const scores = body.calculatedScores || {};
    const id = makeId("asm");
    const createdAt = nowIso();
    await db.prepare(
      `INSERT INTO assessments (
        id, patient_id, assessment_date, assessment_stage, fasting_status, raw_values, calculated_scores,
        total_score, glucose_score, lipid_score, liver_score, inflammation_score, autonomic_score,
        score_rule_version, primary_type, secondary_type, type_strengths, tags, warnings, clinician_note,
        report_snapshot, is_deleted, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    ).bind(
      id,
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
    ).run();
    await audit(db, user, "assessment", id, "create", null, body);
    return json({ assessment: { id, patientId: patient.id, createdAt } }, 201);
  }

  const assessmentDelete = url.pathname.match(/^\/api\/patients\/([^/]+)\/assessments\/([^/]+)$/);
  if (assessmentDelete && request.method === "DELETE") {
    const patient = await getPatient(db, user, assessmentDelete[1]);
    if (!patient) return json({ error: "Patient not found." }, 404);
    const before = await db.prepare("SELECT * FROM assessments WHERE id = ? AND patient_id = ? AND is_deleted = 0").bind(assessmentDelete[2], patient.id).first();
    if (!before) return json({ error: "Assessment not found." }, 404);
    await db.prepare("UPDATE assessments SET is_deleted = 1, updated_at = ? WHERE id = ?").bind(nowIso(), before.id).run();
    await audit(db, user, "assessment", before.id, "soft_delete", before, { is_deleted: 1 }, "user requested deletion");
    return json({ ok: true });
  }

  return json({ error: "API route not found." }, 404);
}
