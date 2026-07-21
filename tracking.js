const tracking = {
  user: null,
  patients: [],
  selectedPatient: null,
  assessments: [],
  comparison: null,
};

const t = {
  banner: document.querySelector("#trackingAuthBanner"),
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
};

const axisMeta = [
  ["glucoseScore", "당대사"],
  ["lipidScore", "지질대사"],
  ["liverScore", "간대사"],
  ["inflammationScore", "만성염증"],
  ["autonomicScore", "자율신경·회복"],
];

const metricMeta = [
  { key: "hba1c", label: "HbA1c", unit: "%", direction: "down", value: (raw) => raw.hba1c },
  { key: "tg", label: "TG", unit: "mg/dL", direction: "down", value: (raw) => raw.tg },
  { key: "tgHdl", label: "TG/HDL-C", unit: "", direction: "down", value: (raw) => raw.tg && raw.hdl ? raw.tg / raw.hdl : null },
  { key: "nonHdl", label: "non-HDL-C", unit: "mg/dL", direction: "down", value: (raw) => raw.totalChol && raw.hdl ? raw.totalChol - raw.hdl : null },
  { key: "hsCrp", label: "hs-CRP", unit: "mg/L", direction: "down", value: (raw) => raw.hsCrp },
  { key: "visceralFat", label: "내장지방레벨", unit: "", direction: "down", value: (raw) => raw.visceralFat },
  { key: "sbp", label: "수축기혈압", unit: "mmHg", direction: "down", value: (raw) => raw.sbp },
  { key: "dbp", label: "이완기혈압", unit: "mmHg", direction: "down", value: (raw) => raw.dbp },
  { key: "hrvIndexValue", label: "HRV-Index", unit: "", direction: "up", value: (raw) => raw.hrvIndexValue },
  { key: "smi", label: "SMI", unit: "kg/m²", direction: "up", value: (raw) => raw.smi },
  { key: "gripStrength", label: "악력", unit: "kg", direction: "up", value: (raw) => raw.gripStrength },
  { key: "chairStandSeconds", label: "Chair Stand", unit: "초", direction: "down", value: (raw) => raw.chairStandSeconds },
];

function setBanner(text, tone = "") {
  t.banner.textContent = text;
  t.banner.className = `tracking-banner ${tone}`.trim();
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
    setBanner(`${data.user.name || data.user.email} 계정으로 서버 저장 기능이 활성화되었습니다. 권한: ${data.user.role}`, "ok");
    setTrackingEnabled(true);
    await loadPatients();
  } catch (error) {
    tracking.user = null;
    setTrackingEnabled(false);
    const signInPath = error.data?.signInPath || "/signin-with-chatgpt?return_to=/";
    const message = error.status === 503
      ? "서버 데이터베이스가 아직 연결되지 않아 환자 저장 기능을 사용할 수 없습니다."
      : "환자 저장 기능을 사용하려면 로그인과 접근 권한이 필요합니다.";
    t.banner.innerHTML = `${message} <a href="${signInPath}">로그인</a>`;
    t.table.innerHTML = `<tr><td colspan="8">${message}</td></tr>`;
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
      <td>${patient.chart_number}</td>
      <td>${patient.name}</td>
      <td>${patient.sex || "--"}</td>
      <td>${ageAt(patient.birth_date)}</td>
      <td>${formatDate(patient.latest_assessment_date)}</td>
      <td>${scoreText(patient.latest_total_score)}</td>
      <td>${patient.latest_primary_type || "--"}</td>
      <td><button class="mini-button" type="button" data-open-patient="${patient.id}">열기</button></td>
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
    t.createButton.disabled = false;
  }
}

async function openPatient(patientId) {
  tracking.selectedPatient = tracking.patients.find((patient) => patient.id === patientId) || null;
  if (!tracking.selectedPatient) return;
  t.detailPanel.hidden = false;
  t.selectedTitle.textContent = tracking.selectedPatient.name;
  t.selectedMeta.textContent = patientDisplay(tracking.selectedPatient);
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
      <td>${assessment.primaryType || "--"}</td>
      <td>
        <button class="mini-button" type="button" data-open-assessment="${assessment.id}">열기</button>
        <button class="mini-button danger" type="button" data-delete-assessment="${assessment.id}">삭제</button>
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
  return "맥락 확인";
}

function metricRows(base, compare) {
  return metricMeta.map((meta) => {
    const before = meta.value(base.rawValues);
    const after = meta.value(compare.rawValues);
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
  const parts = [
    `대사건강 종합점수는 ${numberText(base.totalScore)}점에서 ${numberText(compare.totalScore)}점으로 ${totalDiff >= 0 ? "+" : ""}${numberText(totalDiff)}점 변화했습니다.`,
    improvedAxis ? `가장 큰 변화는 ${improvedAxis.label} 영역에서 확인되었습니다.` : "",
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
    ? `<p class="comparison-note">두 검사의 채혈 조건이 달라 TG 및 TG/HDL-C 변화 해석에 제한이 있을 수 있습니다. 기준 검사: ${base.fastingStatus}, 비교 검사: ${compare.fastingStatus}</p>`
    : "";
  t.comparisonReport.innerHTML = `
    <div class="comparison-pages">
      <section class="comparison-page">
        <p class="eyebrow">BEFORE & AFTER REPORT</p>
        <h2>치료 전후 비교 리포트</h2>
        <p>${tracking.selectedPatient ? patientDisplay(tracking.selectedPatient) : ""}</p>
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
        <p>${base.primaryType || "--"} → ${compare.primaryType || "--"}</p>
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
  const values = assessments.map((assessment) => ({ assessment, value: assessment[key] })).filter((item) => item.value !== null && item.value !== undefined);
  if (values.length < 2) return false;
  const padding = 46;
  const max = key === "totalScore" ? 100 : 20;
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
  const diff = latest[key] - first[key];
  t.trendSummary.textContent = `${first.assessmentStage || "초기"} ${numberText(first[key])}점 · 최근 ${numberText(latest[key])}점 · 총 ${diff >= 0 ? "+" : ""}${numberText(diff)}점`;
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

loadMe();
