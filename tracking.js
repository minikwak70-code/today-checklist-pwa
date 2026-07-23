const tracking = {
  user: null,
  clinic: null,
  member: null,
  permissions: {},
  members: [],
  patients: [],
  selectedPatient: null,
  assessments: [],
  comparison: null,
};

const t = {
  banner: document.querySelector("#trackingAuthBanner"),
  workspaceIdentity: document.querySelector("#workspaceIdentity"),
  adminOnly: document.querySelectorAll(".admin-only"),
  search: document.querySelector("#patientSearch"),
  typeFilter: document.querySelector("#patientTypeFilter"),
  sort: document.querySelector("#patientSort"),
  refresh: document.querySelector("#refreshPatientsButton"),
  createForm: document.querySelector("#patientCreateForm"),
  createButton: document.querySelector("#createPatientButton"),
  table: document.querySelector("#patientTableBody"),
  detailPanel: document.querySelector("#patientDetailPanel"),
  selectedTitle: document.querySelector("#selectedPatientTitle"),
  selectedMeta: document.querySelector("#selectedPatientMeta"),
  selectedLatestDate: document.querySelector("#selectedLatestDate"),
  selectedLatestScore: document.querySelector("#selectedLatestScore"),
  selectedDelta: document.querySelector("#selectedDelta"),
  selectedPriority: document.querySelector("#selectedPriority"),
  saveAssessment: document.querySelector("#saveAssessmentButton"),
  historySort: document.querySelector("#historySort"),
  assessmentTable: document.querySelector("#assessmentTableBody"),
  trendAxis: document.querySelector("#trendAxisSelect"),
  trendCanvas: document.querySelector("#trendCanvas"),
  trendSummary: document.querySelector("#trendSummary"),
  baselineSelect: document.querySelector("#baselineAssessmentSelect"),
  comparisonSelect: document.querySelector("#comparisonAssessmentSelect"),
  compareButton: document.querySelector("#compareButton"),
  comparisonPrint: document.querySelector("#comparisonPrintButton"),
  comparisonReport: document.querySelector("#comparisonReport"),
  refreshMembers: document.querySelector("#refreshMembersButton"),
  memberInviteForm: document.querySelector("#memberInviteForm"),
  inviteMemberButton: document.querySelector("#inviteMemberButton"),
  inviteResult: document.querySelector("#inviteResult"),
  memberTable: document.querySelector("#memberTableBody"),
};

const axisMeta = [
  ["glucoseScore", "당대사"],
  ["lipidScore", "지질대사"],
  ["liverScore", "간대사"],
  ["inflammationScore", "만성염증"],
  ["autonomicScore", "자율신경(스트레스)"],
];

const metricMeta = [
  { key: "hba1c", label: "HbA1c", unit: "%", direction: "down", value: (raw) => raw.hba1c },
  { key: "tg", label: "TG", unit: "mg/dL", direction: "down", value: (raw) => raw.tg },
  { key: "tgHdl", label: "TG/HDL-C", unit: "", direction: "down", value: (raw) => raw.tg && raw.hdl ? raw.tg / raw.hdl : null },
  { key: "nonHdl", label: "non-HDL-C", unit: "mg/dL", direction: "down", value: (raw) => raw.totalChol && raw.hdl ? raw.totalChol - raw.hdl : null },
  { key: "hsCrp", label: "hs-CRP", unit: "mg/L", direction: "down", value: (raw) => raw.hsCrp },
  { key: "visceralFat", label: "내장지방레벨", unit: "", direction: "down", value: (raw) => raw.visceralFat },
  { key: "hrvIndexScore", label: "HRV-Index 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "hrvIndexScore", "autonomic:HRV-Index") },
  { key: "ansActivityScore", label: "ANS Activity 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "ansActivityScore", "autonomic:ANS Activity") },
  { key: "stressScore", label: "Stress 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "stressScore", "autonomic:Stress") },
  { key: "snsPercent", label: "SNS 비율", unit: "%", direction: "center50", value: (raw, assessment) => raw.snsPercent ?? calculatedValue(assessment, "snsPercent") },
  { key: "pnsPercent", label: "PNS 비율", unit: "%", direction: "center50", value: (raw, assessment) => raw.pnsPercent ?? calculatedValue(assessment, "pnsPercent") },
  { key: "smi", label: "SMI", unit: "kg/m²", direction: "up", value: (raw) => raw.smi },
  { key: "gripStrength", label: "악력", unit: "kg", direction: "up", value: (raw) => raw.gripStrength },
  { key: "chairStandSeconds", label: "Chair Stand", unit: "초", direction: "down", value: (raw) => raw.chairStandSeconds },
];

function setBanner(text, tone = "") {
  t.banner.textContent = text;
  t.banner.className = `tracking-banner ${tone}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function roleLabel(role) {
  return {
    admin: "관리자",
    staff: "직원",
    readOnly: "조회 전용",
  }[role] || role || "--";
}

function setTrackingEnabled(enabled) {
  [
    t.search,
    t.typeFilter,
    t.sort,
    t.refresh,
    t.createButton,
    t.saveAssessment,
    t.historySort,
    t.trendAxis,
    t.baselineSelect,
    t.comparisonSelect,
    t.compareButton,
    t.comparisonPrint,
  ].forEach((item) => {
    if (item) item.disabled = !enabled;
  });
}

function setFormControls(form, enabled) {
  form?.querySelectorAll("input, select, textarea, button").forEach((item) => {
    item.disabled = !enabled;
  });
}

function applyPermissions() {
  const permissions = tracking.permissions || {};
  const isAdmin = Boolean(permissions.canManageMembers);
  t.adminOnly.forEach((item) => {
    item.hidden = !isAdmin;
  });
  setFormControls(t.createForm, Boolean(permissions.canCreatePatient));
  if (t.saveAssessment) t.saveAssessment.disabled = !permissions.canCreateAssessment || !tracking.selectedPatient;
  if (t.comparisonPrint) t.comparisonPrint.disabled = !permissions.canRead;
  if (t.compareButton) t.compareButton.disabled = !permissions.canRead;
  if (t.workspaceIdentity) {
    const clinic = tracking.clinic?.name || "작업공간 없음";
    const name = tracking.user?.name || tracking.user?.email || "로그인 필요";
    t.workspaceIdentity.textContent = `${clinic} · ${name} · ${roleLabel(tracking.member?.role)}`;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "요청을 처리하지 못했습니다.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function formatDate(value) {
  return value || "--";
}

function numberText(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "--";
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function scoreText(value) {
  return value === null || value === undefined ? "--" : `${numberText(value)}점`;
}

function calculatedValue(assessment, key, itemKey = "") {
  const scores = assessment?.calculatedScores || {};
  if (scores[key] !== null && scores[key] !== undefined) return scores[key];
  if (itemKey && scores.itemScores && scores.itemScores[itemKey] !== null && scores.itemScores[itemKey] !== undefined) return scores.itemScores[itemKey];
  if (assessment?.[key] !== null && assessment?.[key] !== undefined) return assessment[key];
  return null;
}

function trendValue(assessment, key) {
  if (key === "snsPnsPercent") return assessment?.rawValues?.snsPercent ?? calculatedValue(assessment, "snsPercent");
  if (["hrvIndexScore", "ansActivityScore", "stressScore", "snsPnsBalanceScore", "snsPercent", "pnsPercent"].includes(key)) {
    const itemMap = {
      hrvIndexScore: "autonomic:HRV-Index",
      ansActivityScore: "autonomic:ANS Activity",
      stressScore: "autonomic:Stress",
      snsPnsBalanceScore: "autonomic:SNS:PNS 균형",
    };
    return calculatedValue(assessment, key, itemMap[key]);
  }
  return assessment?.[key];
}

function ageAt(birthDate, atDate = new Date().toISOString().slice(0, 10)) {
  if (!birthDate) return "--";
  const birth = new Date(`${birthDate}T00:00:00`);
  const at = new Date(`${atDate || new Date().toISOString().slice(0, 10)}T00:00:00`);
  let age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < birth.getDate())) age -= 1;
  return Number.isFinite(age) && age >= 0 ? age : "--";
}

function patientDisplay(patient) {
  return `${patient.name} · ${patient.sex || "성별 미입력"} · ${ageAt(patient.birth_date)}세 · 차트 ${patient.chart_number}`;
}

async function loadMe() {
  setTrackingEnabled(false);
  try {
    const data = await api("/api/me");
    tracking.user = data.user;
    tracking.clinic = data.clinic;
    tracking.member = data.member;
    tracking.permissions = data.permissions || {};
    setBanner(`${data.clinic.name} 공동 작업공간이 활성화되었습니다. ${data.user.name || data.user.email} · ${data.member.roleLabel}`, "ok");
    setTrackingEnabled(true);
    applyPermissions();
    await loadPatients();
    if (tracking.permissions.canManageMembers) await loadMembers();
  } catch (error) {
    tracking.user = null;
    tracking.clinic = null;
    tracking.member = null;
    tracking.permissions = {};
    setTrackingEnabled(false);
    applyPermissions();
    const signInPath = error.data?.signInPath || "/signin-with-chatgpt?return_to=/";
    const message = error.status === 503
      ? "서버 데이터베이스가 아직 연결되지 않아 환자 저장 기능을 사용할 수 없습니다."
      : "환자 저장 기능을 사용하려면 로그인과 접근 권한이 필요합니다.";
    t.banner.innerHTML = `${message} <a href="${signInPath}">로그인</a>`;
    t.table.innerHTML = `<tr><td colspan="8">${message}</td></tr>`;
    if (t.workspaceIdentity) t.workspaceIdentity.textContent = "로그인 필요";
  }
}

async function loadPatients() {
  const params = new URLSearchParams({
    search: t.search.value || "",
    type: t.typeFilter.value || "",
    sort: t.sort.value || "recent",
  });
  const data = await api(`/api/patients?${params}`);
  tracking.patients = data.patients || [];
  renderPatientTable();
}

function renderPatientTable() {
  if (!tracking.patients.length) {
    t.table.innerHTML = `<tr><td colspan="8">등록된 환자가 없습니다.</td></tr>`;
    return;
  }
  t.table.innerHTML = tracking.patients.map((patient) => `
    <tr>
      <td>${escapeHtml(patient.chart_number)}</td>
      <td>${escapeHtml(patient.name)}</td>
      <td>${escapeHtml(patient.sex || "--")}</td>
      <td>${ageAt(patient.birth_date)}</td>
      <td>${formatDate(patient.latest_assessment_date)}</td>
      <td>${scoreText(patient.latest_total_score)}</td>
      <td>${escapeHtml(patient.latest_primary_type || "--")}</td>
      <td><button class="mini-button" type="button" data-open-patient="${escapeHtml(patient.id)}">열기</button></td>
    </tr>
  `).join("");
}

async function createPatient(event) {
  event.preventDefault();
  const payload = {
    chartNumber: document.querySelector("#newChartNumber").value.trim(),
    name: document.querySelector("#newPatientName").value.trim(),
    sex: document.querySelector("#newPatientSex").value,
    birthDate: document.querySelector("#newBirthDate").value,
    memo: document.querySelector("#newPatientMemo").value.trim(),
  };
  if (!payload.chartNumber || !payload.name) return;
  t.createButton.disabled = true;
  try {
    await api("/api/patients", { method: "POST", body: JSON.stringify(payload) });
    t.createForm.reset();
    await loadPatients();
    setBanner("환자가 등록되었습니다.", "ok");
  } catch (error) {
    setBanner(error.message, "warning");
  } finally {
    applyPermissions();
  }
}

async function openPatient(patientId) {
  tracking.selectedPatient = tracking.patients.find((patient) => patient.id === patientId) || null;
  if (!tracking.selectedPatient) return;
  t.detailPanel.hidden = false;
  t.selectedTitle.textContent = tracking.selectedPatient.name;
  t.selectedMeta.textContent = patientDisplay(tracking.selectedPatient);
  applyPermissions();
  window.metabolicReportApp?.setValues({
    patientName: tracking.selectedPatient.name,
    chartNumber: tracking.selectedPatient.chart_number,
    sex: tracking.selectedPatient.sex || "",
    birthDate: tracking.selectedPatient.birth_date || "",
    age: ageAt(tracking.selectedPatient.birth_date, document.querySelector("#testDate").value),
  });
  await loadAssessments();
}

async function loadAssessments() {
  if (!tracking.selectedPatient) return;
  const sort = t.historySort.value || "desc";
  const data = await api(`/api/patients/${tracking.selectedPatient.id}/assessments?sort=${sort}`);
  tracking.assessments = data.assessments || [];
  renderSelectedSummary();
  renderAssessmentTable();
  renderAssessmentSelectors();
  renderTrend();
}

function sortedAssessmentsAsc() {
  return [...tracking.assessments].sort((a, b) => `${a.assessmentDate}${a.createdAt}`.localeCompare(`${b.assessmentDate}${b.createdAt}`));
}

function renderSelectedSummary() {
  const ordered = sortedAssessmentsAsc();
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const delta = first && latest ? latest.totalScore - first.totalScore : null;
  const lowest = latest ? lowestAxis(latest) : null;
  t.selectedLatestDate.textContent = `최근 검사: ${latest?.assessmentDate || "--"}`;
  t.selectedLatestScore.textContent = `최근 총점: ${latest ? scoreText(latest.totalScore) : "--"}`;
  t.selectedDelta.textContent = `초진 대비: ${delta === null ? "--" : `${delta >= 0 ? "+" : ""}${numberText(delta)}점`}`;
  t.selectedPriority.textContent = `현재 우선 관리영역: ${lowest?.label || "--"}`;
}

function renderAssessmentTable() {
  if (!tracking.assessments.length) {
    t.assessmentTable.innerHTML = `<tr><td colspan="10">저장된 검사기록이 없습니다.</td></tr>`;
    return;
  }
  t.assessmentTable.innerHTML = tracking.assessments.map((assessment) => `
    <tr>
      <td>${assessment.assessmentDate}</td>
      <td>${assessment.assessmentStage || "--"}</td>
      <td>${scoreText(assessment.totalScore)}</td>
      <td>${scoreText(assessment.glucoseScore)}</td>
      <td>${scoreText(assessment.lipidScore)}</td>
      <td>${scoreText(assessment.liverScore)}</td>
      <td>${scoreText(assessment.inflammationScore)}</td>
      <td>${scoreText(assessment.autonomicScore)}</td>
      <td>${escapeHtml(assessment.primaryType || "--")}</td>
      <td>
        <button class="mini-button" type="button" data-open-assessment="${escapeHtml(assessment.id)}">열기</button>
        ${tracking.permissions.canDeleteAssessment ? `<button class="mini-button danger" type="button" data-delete-assessment="${escapeHtml(assessment.id)}">삭제</button>` : ""}
        <small class="byline">${escapeHtml(assessment.createdByName || "작성자 미상")} · ${escapeHtml((assessment.createdAt || "").slice(0, 10))}</small>
      </td>
    </tr>
  `).join("");
}

function renderAssessmentSelectors() {
  const ordered = sortedAssessmentsAsc();
  const options = ordered.map((assessment) => `<option value="${assessment.id}">${assessment.assessmentDate} · ${assessment.assessmentStage || "단계 미입력"} · ${scoreText(assessment.totalScore)}</option>`).join("");
  t.baselineSelect.innerHTML = options || `<option value="">검사 없음</option>`;
  t.comparisonSelect.innerHTML = options || `<option value="">검사 없음</option>`;
  if (ordered.length >= 2) {
    t.baselineSelect.value = ordered[0].id;
    t.comparisonSelect.value = ordered[ordered.length - 1].id;
  }
}

function rawForSave(data) {
  const excluded = new Set(["patientName", "chartNumber", "age", "clinicianNote", "manualPrimaryType", "manualSecondaryType"]);
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => !excluded.has(key) && value !== null && value !== ""));
}

async function saveAssessment() {
  if (!tracking.selectedPatient) {
    setBanner("먼저 환자 목록에서 저장할 환자를 선택해 주세요.", "warning");
    return;
  }
  const snapshot = window.metabolicReportApp?.snapshot();
  if (!snapshot || snapshot.validation.errors.length) {
    setBanner("입력 오류를 먼저 확인한 뒤 저장해 주세요.", "warning");
    return;
  }
  if (!confirm("이 검사결과를 환자 기록에 저장하시겠습니까?\n저장 후에도 수정할 수 있으며 수정 이력은 기록됩니다.")) return;
  const payload = {
    assessmentDate: snapshot.data.testDate || window.metabolicReportApp.localDateKey(),
    assessmentStage: snapshot.data.assessmentStage || "",
    fastingStatus: snapshot.data.mealStatus || "",
    rawValues: rawForSave(snapshot.data),
    calculatedScores: snapshot.calculatedScores,
    scoreRuleVersion: snapshot.scoreRuleVersion,
    primaryType: snapshot.primaryType,
    secondaryType: snapshot.secondaryType,
    typeStrengths: snapshot.typeResult.candidates || [],
    tags: snapshot.typeResult.tags || [],
    warnings: [...snapshot.flags.map((flag) => flag.text), ...snapshot.validation.warnings.map((warning) => warning.text)],
    clinicianNote: snapshot.data.clinicianNote || "",
    reportSnapshot: snapshot.reportSnapshot,
  };
  t.saveAssessment.disabled = true;
  try {
    await api(`/api/patients/${tracking.selectedPatient.id}/assessments`, { method: "POST", body: JSON.stringify(payload) });
    await loadAssessments();
    await loadPatients();
    setBanner("검사결과가 환자 기록에 저장되었습니다.", "ok");
  } catch (error) {
    setBanner(error.message, "warning");
  } finally {
    t.saveAssessment.disabled = false;
  }
}

function openAssessment(assessmentId) {
  const assessment = tracking.assessments.find((item) => item.id === assessmentId);
  if (!assessment || !tracking.selectedPatient) return;
  window.metabolicReportApp.setValues({
    ...assessment.rawValues,
    patientName: tracking.selectedPatient.name,
    chartNumber: tracking.selectedPatient.chart_number,
    sex: tracking.selectedPatient.sex || assessment.rawValues.sex || "",
    birthDate: tracking.selectedPatient.birth_date || assessment.rawValues.birthDate || "",
    age: ageAt(tracking.selectedPatient.birth_date, assessment.assessmentDate),
    testDate: assessment.assessmentDate,
    assessmentStage: assessment.assessmentStage || "",
    clinicianNote: assessment.clinicianNote || "",
  });
  window.metabolicReportApp.generateReport();
}

async function deleteAssessment(assessmentId) {
  if (!tracking.selectedPatient) return;
  if (!tracking.permissions.canDeleteAssessment) {
    setBanner("검사 삭제는 관리자만 가능합니다.", "warning");
    return;
  }
  if (!confirm("이 검사기록을 삭제 처리할까요?\n기록은 즉시 영구삭제하지 않고 삭제 이력으로 남깁니다.")) return;
  try {
    await api(`/api/patients/${tracking.selectedPatient.id}/assessments/${assessmentId}`, { method: "DELETE" });
    await loadAssessments();
    await loadPatients();
    setBanner("검사기록이 삭제 처리되었습니다.", "ok");
  } catch (error) {
    setBanner(error.message, "warning");
  }
}

async function loadMembers() {
  if (!tracking.permissions.canManageMembers) return;
  const data = await api("/api/members");
  tracking.members = data.members || [];
  renderMembers();
}

function renderMembers() {
  if (!t.memberTable) return;
  if (!tracking.members.length) {
    t.memberTable.innerHTML = `<tr><td colspan="6">등록된 구성원이 없습니다.</td></tr>`;
    return;
  }
  t.memberTable.innerHTML = tracking.members.map((member) => `
    <tr>
      <td>${escapeHtml(member.name || "--")}</td>
      <td>${escapeHtml(member.email || "--")}</td>
      <td>
        <select class="member-role-select" data-member-role="${escapeHtml(member.id)}" ${member.isActive ? "" : "disabled"}>
          <option value="admin" ${member.role === "admin" ? "selected" : ""}>관리자</option>
          <option value="staff" ${member.role === "staff" ? "selected" : ""}>직원</option>
          <option value="readOnly" ${member.role === "readOnly" ? "selected" : ""}>조회 전용</option>
        </select>
      </td>
      <td>${member.isActive ? "활성" : "비활성"}</td>
      <td>${escapeHtml(member.joinedAt ? member.joinedAt.slice(0, 10) : "초대 대기")}</td>
      <td>
        ${member.isActive ? `<button class="mini-button danger" type="button" data-deactivate-member="${escapeHtml(member.id)}">비활성화</button>` : ""}
      </td>
    </tr>
  `).join("");
}

async function inviteMember(event) {
  event.preventDefault();
  if (!tracking.permissions.canManageMembers) return;
  const payload = {
    name: document.querySelector("#inviteName").value.trim(),
    email: document.querySelector("#inviteEmail").value.trim(),
    role: document.querySelector("#inviteRole").value,
  };
  t.inviteMemberButton.disabled = true;
  try {
    const data = await api("/api/members/invite", { method: "POST", body: JSON.stringify(payload) });
    t.memberInviteForm.reset();
    t.inviteResult.textContent = `초대가 생성되었습니다. 직원은 로그인 후 자동으로 ${tracking.clinic.name} 작업공간에 연결됩니다.`;
    if (data.member?.inviteLink) t.inviteResult.textContent += ` 초대 링크: ${location.origin}${data.member.inviteLink}`;
    await loadMembers();
  } catch (error) {
    t.inviteResult.textContent = error.message;
  } finally {
    t.inviteMemberButton.disabled = false;
  }
}

async function changeMemberRole(memberId, role) {
  await api(`/api/members/${memberId}`, { method: "PATCH", body: JSON.stringify({ role }) });
  await loadMembers();
  setBanner("구성원 역할이 변경되었습니다.", "ok");
}

async function deactivateMember(memberId) {
  if (!confirm("이 구성원의 공덕경희한의원 접근을 비활성화할까요?\n과거 작성기록은 유지됩니다.")) return;
  await api(`/api/members/${memberId}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) });
  await loadMembers();
  setBanner("구성원이 비활성화되었습니다.", "ok");
}

function lowestAxis(assessment) {
  return axisMeta
    .map(([key, label]) => ({ key, label, value: assessment[key] }))
    .filter((axis) => axis.value !== null && axis.value !== undefined)
    .sort((a, b) => a.value - b.value)[0];
}

function improvementLabel(meta, before, after) {
  const diff = after - before;
  if (Math.abs(diff) < 0.01) return "유지";
  if (meta.direction === "up") return diff > 0 ? "개선" : "악화";
  if (meta.direction === "down") return diff < 0 ? "개선" : "악화";
  if (meta.direction === "center50") return Math.abs(after - 50) < Math.abs(before - 50) ? "개선" : "맥락 확인";
  return "맥락 확인";
}

function metricRows(base, compare) {
  return metricMeta.map((meta) => {
    const before = meta.value(base.rawValues || {}, base);
    const after = meta.value(compare.rawValues || {}, compare);
    if (before === null || before === undefined || after === null || after === undefined) return null;
    const diff = after - before;
    return {
      ...meta,
      metricLabel: meta.label,
      before,
      after,
      diff,
      impact: Math.abs(diff),
      evaluation: improvementLabel(meta, before, after),
    };
  }).filter(Boolean).sort((a, b) => b.impact - a.impact).slice(0, 10);
}

function makeComparisonSummary(base, compare, improvedAxis, lowAxis, rows) {
  const totalDiff = compare.totalScore - base.totalScore;
  const majorMetric = rows.find((row) => row.evaluation === "개선");
  const autonomicBefore = calculatedValue(base, "autonomicScore") ?? base.autonomicScore;
  const autonomicAfter = calculatedValue(compare, "autonomicScore") ?? compare.autonomicScore;
  const snsBefore = base.rawValues?.snsPercent ?? calculatedValue(base, "snsPercent");
  const snsAfter = compare.rawValues?.snsPercent ?? calculatedValue(compare, "snsPercent");
  const stressBefore = base.rawValues?.stressGrade;
  const stressAfter = compare.rawValues?.stressGrade;
  const autonomicSentence = autonomicBefore !== null && autonomicBefore !== undefined && autonomicAfter !== null && autonomicAfter !== undefined
    ? `자율신경 총점이 ${numberText(autonomicBefore)}점에서 ${numberText(autonomicAfter)}점으로 ${autonomicAfter >= autonomicBefore ? "개선" : "변화"}되었습니다.`
    : "";
  const balanceSentence = snsBefore !== null && snsBefore !== undefined && snsAfter !== null && snsAfter !== undefined
    ? `SNS:PNS 균형이 ${numberText(snsBefore, 1)}:${numberText(100 - snsBefore, 1)}에서 ${numberText(snsAfter, 1)}:${numberText(100 - snsAfter, 1)}로 ${Math.abs(snsAfter - 50) < Math.abs(snsBefore - 50) ? "균형점에 가까워졌습니다" : "변화했습니다"}.`
    : "";
  const stressSentence = stressBefore && stressAfter && stressBefore !== stressAfter
    ? `스트레스 단계가 ${escapeHtml(stressBefore)}에서 ${escapeHtml(stressAfter)}로 변화했습니다.`
    : "";
  const parts = [
    `대사건강 종합점수는 ${numberText(base.totalScore)}점에서 ${numberText(compare.totalScore)}점으로 ${totalDiff >= 0 ? "+" : ""}${numberText(totalDiff)}점 변화했습니다.`,
    improvedAxis ? `가장 큰 변화는 ${improvedAxis.label} 영역에서 확인되었습니다.` : "",
    autonomicSentence,
    balanceSentence,
    stressSentence,
    majorMetric ? `${majorMetric.metricLabel} 지표는 ${numberText(majorMetric.before, 1)}에서 ${numberText(majorMetric.after, 1)}${majorMetric.unit ? ` ${majorMetric.unit}` : ""}로 변화했습니다.` : "",
    lowAxis ? `비교 시점에서 아직 우선 관리가 필요한 영역은 ${lowAxis.label}입니다.` : "",
  ].filter(Boolean);
  return parts.slice(0, 4).join(" ");
}

function renderComparison() {
  const base = tracking.assessments.find((item) => item.id === t.baselineSelect.value);
  const compare = tracking.assessments.find((item) => item.id === t.comparisonSelect.value);
  if (!base || !compare || base.id === compare.id) {
    t.comparisonReport.innerHTML = `<p>서로 다른 두 검사 회차를 선택해 주세요.</p>`;
    return;
  }
  const axisRows = axisMeta.map(([key, label]) => {
    const before = base[key];
    const after = compare[key];
    return { key, label, before, after, diff: after - before };
  }).filter((row) => row.before !== null && row.after !== null && row.before !== undefined && row.after !== undefined);
  const improvedAxis = [...axisRows].sort((a, b) => b.diff - a.diff)[0];
  const lowAxis = lowestAxis(compare);
  const rows = metricRows(base, compare);
  const totalDiff = compare.totalScore - base.totalScore;
  const conditionNote = base.fastingStatus && compare.fastingStatus && base.fastingStatus !== compare.fastingStatus
    ? `<p class="comparison-note">두 검사의 채혈 조건이 달라 TG 및 TG/HDL-C 변화 해석에 제한이 있을 수 있습니다. 기준 검사: ${escapeHtml(base.fastingStatus)}, 비교 검사: ${escapeHtml(compare.fastingStatus)}</p>`
    : "";
  t.comparisonReport.innerHTML = `
    <div class="comparison-pages">
      <section class="comparison-page">
        <p class="eyebrow">BEFORE & AFTER REPORT</p>
        <h2>치료 전후 비교 리포트</h2>
        <p>${tracking.selectedPatient ? escapeHtml(patientDisplay(tracking.selectedPatient)) : ""}</p>
        <div class="comparison-score">
          <span>종합점수</span>
          <strong>${numberText(base.totalScore)}점 → ${numberText(compare.totalScore)}점</strong>
          <em>${totalDiff >= 0 ? "+" : ""}${numberText(totalDiff)}점 변화</em>
        </div>
        ${comparisonRadar(axisRows)}
        <p><strong>가장 많이 개선된 영역:</strong> ${improvedAxis ? `${improvedAxis.label} ${improvedAxis.diff >= 0 ? "+" : ""}${numberText(improvedAxis.diff)}점` : "--"}</p>
        <p><strong>현재 우선 관리영역:</strong> ${lowAxis?.label || "--"}</p>
        <p class="comparison-summary">${makeComparisonSummary(base, compare, improvedAxis, lowAxis, rows)}</p>
      </section>
      <section class="comparison-page">
        <h3>5개 축 비교</h3>
        <table class="tracking-table compact-table">
          <thead><tr><th>축</th><th>기준</th><th>비교</th><th>변화</th></tr></thead>
          <tbody>${axisRows.map((row) => `<tr><td>${row.label}</td><td>${scoreText(row.before)}</td><td>${scoreText(row.after)}</td><td>${row.diff >= 0 ? "+" : ""}${numberText(row.diff)}점</td></tr>`).join("")}</tbody>
        </table>
        <h3>주요 검사 변화표</h3>
        <table class="tracking-table compact-table">
          <thead><tr><th>지표</th><th>기준</th><th>비교</th><th>변화</th><th>평가</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${row.metricLabel}</td><td>${numberText(row.before, 2)} ${row.unit}</td><td>${numberText(row.after, 2)} ${row.unit}</td><td>${row.diff >= 0 ? "+" : ""}${numberText(row.diff, 2)} ${row.unit}</td><td>${row.evaluation}</td></tr>`).join("")}</tbody>
        </table>
        <h3>주된 관리 패턴의 변화</h3>
        <p>${escapeHtml(base.primaryType || "--")} → ${escapeHtml(compare.primaryType || "--")}</p>
      </section>
      <section class="comparison-page">
        <h3>해석 제한</h3>
        ${conditionNote || "<p>두 검사 간 주요 측정조건 차이는 저장된 정보상 확인되지 않았습니다.</p>"}
        <p>본 비교는 동일 환자의 검사기록 추적을 돕는 관리도구이며, 진단이나 완치 판정을 대신하지 않습니다.</p>
      </section>
    </div>
  `;
}

function comparisonRadar(rows) {
  if (!rows.length) return "";
  const center = 105;
  const radius = 80;
  const points = (kind) => rows.map((row, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / rows.length;
    const value = Math.max(0, Math.min(20, row[kind])) / 20;
    return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`;
  }).join(" ");
  const grid = rows.map((row, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / rows.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const lx = center + Math.cos(angle) * (radius + 24);
    const ly = center + Math.sin(angle) * (radius + 24);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" /><text x="${lx}" y="${ly}">${row.label}</text>`;
  }).join("");
  return `
    <figure class="comparison-radar">
      <svg viewBox="0 0 210 210" role="img" aria-label="기준 검사와 비교 검사의 5개 축 레이더차트">
        <g class="radar-grid">${grid}</g>
        <polygon class="radar-before" points="${points("before")}"></polygon>
        <polygon class="radar-after" points="${points("after")}"></polygon>
      </svg>
      <figcaption><span class="legend-before"></span> 기준 검사 <span class="legend-after"></span> 비교 검사 · 각 축 0~20점</figcaption>
    </figure>
  `;
}

function drawTrend(canvas, assessments, key) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (key === "snsPnsPercent") return drawSnsPnsTrend(ctx, width, height, assessments);
  const values = assessments.map((assessment) => ({ assessment, value: trendValue(assessment, key) })).filter((item) => item.value !== null && item.value !== undefined);
  if (values.length < 2) return false;
  const padding = 46;
  const max = key === "totalScore" ? 100 : key.includes("Percent") ? 100 : 20;
  ctx.strokeStyle = "#d5ddd4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.strokeStyle = "#ec6d51";
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((item, index) => {
    const x = padding + ((width - padding * 2) * index) / (values.length - 1);
    const y = height - padding - ((height - padding * 2) * item.value) / max;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#25312f";
  ctx.font = "13px sans-serif";
  values.forEach((item, index) => {
    const x = padding + ((width - padding * 2) * index) / (values.length - 1);
    const y = height - padding - ((height - padding * 2) * item.value) / max;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`${numberText(item.value)}점`, x - 14, y - 12);
    ctx.fillText(item.assessment.assessmentStage || item.assessment.assessmentDate.slice(5), x - 22, height - 18);
  });
  return true;
}

function drawSnsPnsTrend(ctx, width, height, assessments) {
  const values = assessments.map((assessment) => {
    const sns = trendValue(assessment, "snsPercent");
    const pns = trendValue(assessment, "pnsPercent") ?? (sns !== null && sns !== undefined ? 100 - sns : null);
    return { assessment, sns, pns };
  }).filter((item) => item.sns !== null && item.sns !== undefined && item.pns !== null && item.pns !== undefined);
  if (values.length < 2) return false;
  const padding = 46;
  const point = (value, index) => ({
    x: padding + ((width - padding * 2) * index) / (values.length - 1),
    y: height - padding - ((height - padding * 2) * value) / 100,
  });
  ctx.strokeStyle = "#d5ddd4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  const baseY = point(50, 0).y;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#9aa9a2";
  ctx.beginPath();
  ctx.moveTo(padding, baseY);
  ctx.lineTo(width - padding, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  [
    { key: "sns", color: "#23745a", label: "SNS" },
    { key: "pns", color: "#ec6d51", label: "PNS" },
  ].forEach((line) => {
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((item, index) => {
      const p = point(item[line.key], index);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.fillStyle = line.color;
    values.forEach((item, index) => {
      const p = point(item[line.key], index);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`${line.label} ${numberText(item[line.key], 1)}%`, p.x - 28, p.y + (line.key === "sns" ? -10 : 18));
    });
  });
  ctx.fillStyle = "#25312f";
  ctx.font = "13px sans-serif";
  ctx.fillText("50% 균형선", width - padding - 80, baseY - 8);
  values.forEach((item, index) => {
    const p = point(0, index);
    ctx.fillText(item.assessment.assessmentStage || item.assessment.assessmentDate.slice(5), p.x - 22, height - 18);
  });
  return true;
}

function renderTrend() {
  const ordered = sortedAssessmentsAsc();
  const key = t.trendAxis.value || "totalScore";
  const ok = drawTrend(t.trendCanvas, ordered, key);
  if (!ok) {
    const ctx = t.trendCanvas.getContext("2d");
    ctx.clearRect(0, 0, t.trendCanvas.width, t.trendCanvas.height);
    t.trendSummary.textContent = "검사가 2회 이상이면 추이 그래프가 표시됩니다.";
    return;
  }
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  if (key === "snsPnsPercent") {
    const firstSns = trendValue(first, "snsPercent");
    const latestSns = trendValue(latest, "snsPercent");
    const direction = Math.abs(latestSns - 50) < Math.abs(firstSns - 50) ? "균형점에 가까워졌습니다" : "균형 변화를 함께 확인해 주세요";
    t.trendSummary.textContent = `SNS:PNS 균형이 ${numberText(firstSns, 1)}:${numberText(100 - firstSns, 1)}에서 ${numberText(latestSns, 1)}:${numberText(100 - latestSns, 1)}로 변화해 ${direction}.`;
    return;
  }
  const firstValue = trendValue(first, key);
  const latestValue = trendValue(latest, key);
  const diff = latestValue - firstValue;
  t.trendSummary.textContent = `${first.assessmentStage || "초기"} ${numberText(firstValue)}점 · 최근 ${numberText(latestValue)}점 · 총 ${diff >= 0 ? "+" : ""}${numberText(diff)}점`;
}

function printComparison() {
  if (!t.comparisonReport.querySelector(".comparison-page")) renderComparison();
  document.body.classList.add("comparison-print-mode");
  alert("비교 PDF 저장을 위해 인쇄 설정에서 '머리글과 바닥글' 옵션을 해제해 주세요.");
  setTimeout(() => {
    window.print();
    setTimeout(() => document.body.classList.remove("comparison-print-mode"), 500);
  }, 80);
}

t.createForm.addEventListener("submit", createPatient);
t.refresh.addEventListener("click", loadPatients);
t.search.addEventListener("input", () => loadPatients().catch((error) => setBanner(error.message, "warning")));
t.typeFilter.addEventListener("change", () => loadPatients().catch((error) => setBanner(error.message, "warning")));
t.sort.addEventListener("change", () => loadPatients().catch((error) => setBanner(error.message, "warning")));
t.table.addEventListener("click", (event) => {
  const id = event.target.closest("[data-open-patient]")?.dataset.openPatient;
  if (id) openPatient(id).catch((error) => setBanner(error.message, "warning"));
});
t.saveAssessment.addEventListener("click", saveAssessment);
t.historySort.addEventListener("change", () => loadAssessments().catch((error) => setBanner(error.message, "warning")));
t.assessmentTable.addEventListener("click", (event) => {
  const openId = event.target.closest("[data-open-assessment]")?.dataset.openAssessment;
  const deleteId = event.target.closest("[data-delete-assessment]")?.dataset.deleteAssessment;
  if (openId) openAssessment(openId);
  if (deleteId) deleteAssessment(deleteId);
});
t.trendAxis.addEventListener("change", renderTrend);
t.compareButton.addEventListener("click", renderComparison);
t.comparisonPrint.addEventListener("click", printComparison);
t.refreshMembers?.addEventListener("click", () => loadMembers().catch((error) => setBanner(error.message, "warning")));
t.memberInviteForm?.addEventListener("submit", inviteMember);
t.memberTable?.addEventListener("change", (event) => {
  const memberId = event.target.closest("[data-member-role]")?.dataset.memberRole;
  if (memberId) changeMemberRole(memberId, event.target.value).catch((error) => setBanner(error.message, "warning"));
});
t.memberTable?.addEventListener("click", (event) => {
  const memberId = event.target.closest("[data-deactivate-member]")?.dataset.deactivateMember;
  if (memberId) deactivateMember(memberId).catch((error) => setBanner(error.message, "warning"));
});

setInterval(() => {
  if (!tracking.user) return;
  loadPatients().catch(() => {});
  if (tracking.selectedPatient) loadAssessments().catch(() => {});
}, 60000);

loadMe();
