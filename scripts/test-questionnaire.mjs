import assert from "node:assert/strict";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";

class D1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.bindings = [];
  }

  bind(...bindings) {
    this.bindings = bindings;
    return this;
  }

  async run() {
    return this.database.prepare(this.sql).run(...this.bindings);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.bindings) };
  }
}

class D1Database {
  constructor() {
    this.database = new DatabaseSync(":memory:");
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    return statements.map((statement) => statement.database.prepare(statement.sql).run(...statement.bindings));
  }
}

const DB = new D1Database();
const authHeaders = {
  "content-type": "application/json",
  "oai-authenticated-user-email": "clinician@example.com",
};

async function call(path, options = {}, authenticated = false) {
  const request = new Request(`http://local.test${path}`, {
    ...options,
    headers: {
      ...(authenticated ? authHeaders : { "content-type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const response = await worker.fetch(request, { DB });
  const data = await response.json();
  return { response, data };
}

const patientCreated = await call("/api/patients", {
  method: "POST",
  body: JSON.stringify({ chartNumber: "Q-001", name: "테스트환자", sex: "여성", birthDate: "1980-02-03" }),
}, true);
assert.equal(patientCreated.response.status, 201);
const patientId = patientCreated.data.patient.id;

const questionnaireCreated = await call(`/api/patients/${patientId}/questionnaires`, {
  method: "POST",
  body: JSON.stringify({ assessmentDate: "2026-08-29" }),
}, true);
assert.equal(questionnaireCreated.response.status, 201);
const questionnaireId = questionnaireCreated.data.questionnaire.id;
const token = new URL(questionnaireCreated.data.link).searchParams.get("questionnaire");
assert.ok(token);

const publicInfo = await call(`/api/questionnaire/${token}`);
assert.equal(publicInfo.response.status, 200);
assert.equal(publicInfo.data.status, "draft");

const wrongVerification = await call(`/api/questionnaire/${token}/verify`, {
  method: "POST",
  body: JSON.stringify({ birthDate: "1981-02-03" }),
});
assert.equal(wrongVerification.response.status, 403);

const verified = await call(`/api/questionnaire/${token}/verify`, {
  method: "POST",
  body: JSON.stringify({ birthDate: "1980-02-03" }),
});
assert.equal(verified.response.status, 200);
assert.equal(verified.data.patientLabel, "테***자");

const fields = [
  "inflammationFatigue", "inflammationRecovery", "inflammationMusculoskeletal", "inflammationOral",
  "inflammationRespiratory", "inflammationSkin", "inflammationGut", "inflammationInfectionRecovery",
  "appetiteReduced", "earlySatiety", "frequentIndigestion", "foodAvoidanceDueDiscomfort",
  "fatigueActivityReduced", "walkingStairsDifficulty",
];
const responses = Object.fromEntries(fields.map((field, index) => [field, index % 6]));
const autosaved = await call(`/api/questionnaire/${token}`, {
  method: "PATCH",
  body: JSON.stringify({ birthDate: "1980-02-03", responses: { inflammationFatigue: 3 } }),
});
assert.equal(autosaved.response.status, 200);
assert.equal(autosaved.data.answeredCount, 1);

const incompleteSubmission = await call(`/api/questionnaire/${token}/submit`, {
  method: "POST",
  body: JSON.stringify({ birthDate: "1980-02-03", responses: { inflammationFatigue: 3 } }),
});
assert.equal(incompleteSubmission.response.status, 400);

const submitted = await call(`/api/questionnaire/${token}/submit`, {
  method: "POST",
  body: JSON.stringify({ birthDate: "1980-02-03", responses }),
});
assert.equal(submitted.response.status, 200);

const questionnaireList = await call(`/api/patients/${patientId}/questionnaires`, {}, true);
assert.equal(questionnaireList.data.questionnaires[0].status, "submitted");

const applied = await call(`/api/questionnaires/${questionnaireId}/apply`, { method: "POST", body: "{}" }, true);
assert.equal(applied.response.status, 200);
assert.deepEqual(applied.data.questionnaire.responses, responses);

if (process.argv.includes("--serve")) {
  const preview = await call(`/api/patients/${patientId}/questionnaires`, {
    method: "POST",
    body: JSON.stringify({ assessmentDate: "2026-08-29" }),
  }, true);
  const previewToken = new URL(preview.data.link).searchParams.get("questionnaire");
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers(incoming.headers);
    if (incoming.url.startsWith("/api/") && !incoming.url.startsWith("/api/questionnaire/")) {
      headers.set("oai-authenticated-user-email", "clinician@example.com");
    }
    const request = new Request(`http://127.0.0.1:4175${incoming.url}`, {
      method: incoming.method,
      headers,
      body: ["GET", "HEAD"].includes(incoming.method) ? undefined : body,
    });
    const response = await worker.fetch(request, { DB });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  server.listen(4175, "127.0.0.1", () => {
    console.log(`questionnaire-preview=http://127.0.0.1:4175/?questionnaire=${previewToken}`);
  });
} else {
  console.log("questionnaire-flow-ok");
}
