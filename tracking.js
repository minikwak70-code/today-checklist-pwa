const tracking = {
  user: null,
  clinic: null,
  member: null,
  permissions: {},
  members: [],
  patients: [],
  patientsRequestId: 0,
  selectedPatient: null,
  assessments: [],
  questionnaires: [],
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
  editForm: document.querySelector("#patientEditForm"),
  updatePatientButton: document.querySelector("#updatePatientButton"),
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
  clinicianReviewDialog: document.querySelector("#clinicianReviewDialog"),
  clinicianReviewPatient: document.querySelector("#clinicianReviewPatient"),
  clinicianReviewContent: document.querySelector("#clinicianReviewContent"),
  createQuestionnaire: document.querySelector("#createQuestionnaireButton"),
  questionnaireLinkArea: document.querySelector("#questionnaireLinkArea"),
  questionnaireLink: document.querySelector("#questionnaireLink"),
  copyQuestionnaireLink: document.querySelector("#copyQuestionnaireLinkButton"),
  questionnaireStatus: document.querySelector("#questionnaireClinicianStatus"),
  questionnaireList: document.querySelector("#questionnaireRequestList"),
  newAssessmentLink: document.querySelector('.module-nav a[href="#inputHeading"]'),
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
  { key: "ldl", label: "LDL-C", unit: "mg/dL", direction: "down", value: (raw) => raw.ldl },
  { key: "hsCrp", label: "hs-CRP", unit: "mg/L", direction: "down", value: (raw) => raw.hsCrp },
  { key: "graLymRatio", label: "GRA/LYM 비율", unit: "", direction: "down", value: (raw, assessment) => inflammationRecord(assessment).graLymRatio },
  { key: "inflammationSymptoms", label: "염증 관련 증상부담률", unit: "%", direction: "down", value: (raw, assessment) => inflammationRecord(assessment).symptomPercent },
  { key: "visceralFat", label: "내장지방레벨", unit: "", direction: "down", value: (raw) => raw.visceralFat },
  { key: "hrvIndexScore", label: "HRV-Index 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "hrvIndexScore", "autonomic:HRV-Index") },
  { key: "ansActivityScore", label: "ANS Activity 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "ansActivityScore", "autonomic:ANS Activity") },
  { key: "stressScore", label: "Stress 점수", unit: "점", direction: "up", value: (_, assessment) => calculatedValue(assessment, "stressScore", "autonomic:Stress") },
  { key: "snsPercent", label: "SNS 비율", unit: "%", direction: "center50", value: (raw, assessment) => raw.snsPercent ?? calculatedValue(assessment, "snsPercent") },
  { key: "pnsPercent", label: "PNS 비율", unit: "%", direction: "center50", value: (raw, assessment) => raw.pnsPercent ?? calculatedValue(assessment, "pnsPercent") },
  { key: "currentWeight", label: "체중", unit: "kg", direction: "context", value: (raw) => raw.currentWeight },
  { key: "skeletalMuscleMass", label: "골격근량", unit: "kg", direction: "up", value: (raw) => raw.skeletalMuscleMass },
  { key: "smi", label: "SMI", unit: "kg/m²", direction: "up", value: (raw) => raw.smi },
  { key: "representativeGripStrength", label: "대표 악력", unit: "kg", direction: "up", value: (raw, assessment) => gripRecord(assessment).representativeGripStrength },
];

const inflammationSymptomMeta = [
  ["inflammationFatigue", "피로"],
  ["inflammationRecovery", "회복력"],
  ["inflammationMusculoskeletal", "근육·관절"],
  ["inflammationOral", "구강·치주"],
  ["inflammationRespiratory", "호흡기·알레르기"],
  ["inflammationSkin", "피부"],
  ["inflammationGut", "위장관"],
  ["inflammationInfectionRecovery", "감염·회복"],
];

const physicalFunctionScaleMeta = [
  ["appetiteReduced", "식욕·식사량"],
  ["earlySatiety", "조기포만"],
  ["frequentIndigestion", "소화불편"],
  ["foodAvoidanceDueDiscomfort", "섭취 제한"],
  ["fatigueActivityReduced", "피로·활동 유지"],
  ["walkingStairsDifficulty", "걷기·계단"],
];

function scoreVersionAtLeast(scoreRuleVersion, targetMajor, targetMinor) {
  const match = String(scoreRuleVersion || "").match(/metabolic-score-v(\d+)\.(\d+)/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > targetMajor || (major === targetMajor && minor >= targetMinor);
}

function symptomsForCurrentEditor(rawValues, scoreRuleVersion) {
  const values = { ...(rawValues || {}) };
  if (scoreVersionAtLeast(scoreRuleVersion, 4, 6)) return values;
  const legacyToCurrent = [0, 2, 3, 5];
  inflammationSymptomMeta.forEach(([key]) => {
    const legacyValue = Number(values[key]);
    if (Number.isInteger(legacyValue) && legacyValue >= 0 && legacyValue <= 3) values[key] = legacyToCurrent[legacyValue];
  });
  return values;
}

function scoreRuleAtLeast(assessment, targetMajor, targetMinor) {
  return scoreVersionAtLeast(assessment?.scoreRuleVersion, targetMajor, targetMinor);
}

function usesHealthSubscores(assessment) {
  return scoreRuleAtLeast(assessment, 3, 5);
}

function typeAGrade(score) {
  if (!Number.isFinite(Number(score))) return "";
  const normalizedScore = Math.max(0, Math.min(4, Math.round(Number(score))));
  return ["E", "D", "C", "B", "A"][normalizedScore];
}

function typeARecord(assessment) {
  const raw = assessment?.rawValues || {};
  const sex = raw.sex || tracking.selectedPatient?.sex || "";
  const heightValid = Number.isFinite(Number(raw.height)) && Number(raw.height) >= 100 && Number(raw.height) <= 220;
  const waistValid = Number.isFinite(Number(raw.waist)) && Number(raw.waist) >= 40 && Number(raw.waist) <= 200;
  const visceralValid = Number.isFinite(Number(raw.visceralFat)) && Number(raw.visceralFat) >= 1 && Number(raw.visceralFat) <= 20;
  const whtr = calculatedValue(assessment, "whtr") ?? (heightValid && waistValid ? Number(raw.waist) / Number(raw.height) : null);
  const waistHigh = waistValid && (sex === "남성" ? Number(raw.waist) >= 90 : sex === "여성" ? Number(raw.waist) >= 85 : false);
  const visceralHigh = visceralValid && Number(raw.visceralFat) >= 10;
  const riskScore = (whtr >= 0.5 ? 2 : 0) + (waistHigh ? 1 : 0) + (visceralHigh ? 1 : 0);
  const derivedScore = 4 - riskScore;
  const storedScore = calculatedValue(assessment, "typeAScore");
  const hasMetrics = whtr !== null || (waistValid && ["남성", "여성"].includes(sex)) || visceralValid;
  let compatibleStoredScore = null;
  if (storedScore !== null && storedScore !== undefined) {
    if (scoreRuleAtLeast(assessment, 3, 6)) compatibleStoredScore = Number(storedScore);
    else if (usesHealthSubscores(assessment)) compatibleStoredScore = Number(storedScore) * 0.4;
    else compatibleStoredScore = 4 - Number(storedScore);
  }
  const score = hasMetrics ? derivedScore : compatibleStoredScore;
  return {
    height: heightValid ? Number(raw.height) : null,
    waist: waistValid ? Number(raw.waist) : null,
    whtr: whtr === null || whtr === undefined ? null : Number(whtr),
    visceralFat: visceralValid ? Number(raw.visceralFat) : null,
    score,
  };
}

function typeAChangeLabel(key, before, after) {
  const diff = after - before;
  if (key === "waist") return `${diff > 0 ? "+" : ""}${numberText(diff, 1)}cm`;
  if (key === "whtr") return Math.abs(diff) < 0.0005 ? "유지" : diff < 0 ? "개선" : "증가";
  if (key === "visceralFat") {
    if (before >= 10 && after < 10) return "정상범위 진입";
    return Math.abs(diff) < 0.01 ? "유지" : diff < 0 ? "개선" : "증가";
  }
  if (key === "score") return Math.abs(diff) < 0.01 ? "유지" : diff > 0 ? "개선" : "감소";
  return `${diff > 0 ? "+" : ""}${numberText(diff, 0)}점`;
}

function typeAComparison(base, compare) {
  const before = typeARecord(base);
  const after = typeARecord(compare);
  const definitions = [
    { key: "waist", label: "허리둘레", unit: "cm", digits: 1 },
    { key: "whtr", label: "WHtR", unit: "", digits: 3 },
    { key: "visceralFat", label: "내장지방레벨", unit: "", digits: 0 },
    { key: "score", label: "복부비만 평가등급", unit: "", digits: 0 },
  ];
  const rows = definitions.filter((item) => before[item.key] !== null && after[item.key] !== null).map((item) => ({
    ...item,
    before: before[item.key],
    after: after[item.key],
    change: typeAChangeLabel(item.key, before[item.key], after[item.key]),
  }));
  if (!rows.length) return "";
  const waistImproved = before.waist !== null && after.waist !== null && after.waist < before.waist;
  const whtrImproved = before.whtr !== null && after.whtr !== null && after.whtr < before.whtr;
  const visceralImproved = before.visceralFat !== null && after.visceralFat !== null && after.visceralFat < before.visceralFat;
  let summary = "복부비만 관련 지표의 치료 전후 변화를 확인했습니다.";
  if (waistImproved && whtrImproved && visceralImproved && after.visceralFat < 10) {
    summary = "허리둘레와 허리-키 비율이 감소하고 InBody 내장지방레벨도 정상범위로 개선되었습니다.";
  } else {
    const improved = [waistImproved ? "허리둘레" : "", whtrImproved ? "허리-키 비율" : "", visceralImproved ? "내장지방레벨" : ""].filter(Boolean);
    if (improved.length) summary = `${improved.join(" · ")}에서 개선이 확인되었습니다.`;
  }
  return `
    <h3>복부비만 평가 변화</h3>
    <table class="tracking-table compact-table type-a-comparison-table">
      <thead><tr><th>지표</th><th>기준</th><th>비교</th><th>변화</th></tr></thead>
      <tbody>${rows.map((row) => {
        const beforeText = row.key === "score" ? `${typeAGrade(row.before)}등급` : `${numberText(row.before, row.digits)}${row.unit ? ` ${row.unit}` : ""}`;
        const afterText = row.key === "score" ? `${typeAGrade(row.after)}등급` : `${numberText(row.after, row.digits)}${row.unit ? ` ${row.unit}` : ""}`;
        return `<tr><td>${row.label}</td><td>${beforeText}</td><td>${afterText}</td><td>${row.change}</td></tr>`;
      }).join("")}</tbody>
    </table>
    <p class="comparison-summary">${summary}</p>
  `;
}

function inflammationRecord(assessment) {
  const raw = assessment?.rawValues || {};
  const numeric = (value) => value === null || value === undefined || value === "" ? null : Number(value);
  const storedRatio = calculatedValue(assessment, "graLymRatio") ?? assessment?.reportSnapshot?.inflammation?.graLymRatio;
  const graPercent = numeric(raw.graPercent);
  const lymPercent = numeric(raw.lymPercent);
  const derivedRatio = graPercent !== null && lymPercent !== null && Number.isFinite(graPercent) && Number.isFinite(lymPercent) && graPercent >= 0 && lymPercent > 0
    ? graPercent / lymPercent
    : null;
  const graLymRatio = storedRatio !== null && storedRatio !== undefined ? Number(storedRatio) : derivedRatio;
  const legacyNeutrophil = numeric(raw.neutrophil);
  const legacyLymphocyte = numeric(raw.lymphocyte);
  const legacyDirectNlr = numeric(raw.nlrDirect);
  const storedLegacyNlr = calculatedValue(assessment, "nlr") ?? assessment?.reportSnapshot?.inflammation?.nlr;
  const legacyNlr = storedLegacyNlr !== null && storedLegacyNlr !== undefined
    ? Number(storedLegacyNlr)
    : legacyNeutrophil !== null && legacyLymphocyte !== null && Number.isFinite(legacyNeutrophil) && Number.isFinite(legacyLymphocyte) && legacyLymphocyte > 0
      ? legacyNeutrophil / legacyLymphocyte
      : legacyDirectNlr !== null && Number.isFinite(legacyDirectNlr) && legacyDirectNlr >= 0
        ? legacyDirectNlr
        : null;
  const answers = inflammationSymptomMeta.map(([key, label]) => ({
    key,
    label,
    value: raw[key] === null || raw[key] === undefined || raw[key] === "" ? null : Number(raw[key]),
  }));
  const usesNewSymptomScale = scoreRuleAtLeast(assessment, 4, 6);
  const symptomMax = Number(calculatedValue(assessment, "inflammationSymptomMax") ?? assessment?.reportSnapshot?.inflammation?.symptomMax) || (usesNewSymptomScale ? 40 : 24);
  const itemMax = symptomMax === 40 ? 5 : 3;
  const answered = answers.filter((item) => Number.isInteger(item.value) && item.value >= 0 && item.value <= itemMax);
  const storedSymptomScore = calculatedValue(assessment, "inflammationSymptomScore");
  const symptomScore = storedSymptomScore !== null && storedSymptomScore !== undefined
    ? Number(storedSymptomScore)
    : answered.length
      ? answered.reduce((sum, item) => sum + item.value, 0)
      : null;
  const complete = answered.length === answers.length;
  const hsCrp = raw.hsCrp === null || raw.hsCrp === undefined || raw.hsCrp === "" ? null : Number(raw.hsCrp);
  const objectiveElevated = hsCrp !== null && hsCrp <= 10 && hsCrp >= 0.5;
  const symptomHigh = complete && (symptomMax === 40 ? symptomScore > 10 : symptomScore >= symptomMax / 2);
  let derivedSubtype = "해당 없음";
  if (hsCrp !== null && hsCrp > 10) derivedSubtype = "판정 보류";
  else if (objectiveElevated && symptomHigh) derivedSubtype = "만성염증형(종합형)";
  else if (objectiveElevated) derivedSubtype = "만성염증형(수치형)";
  else if (symptomHigh) derivedSubtype = "만성염증형(증상형)";
  return {
    hsCrp,
    graLymRatio,
    legacyNlr: graLymRatio === null ? legacyNlr : null,
    score: calculatedValue(assessment, "inflammationScore") ?? assessment?.inflammationScore ?? null,
    symptomScore,
    symptomMax,
    symptomPercent: symptomScore === null ? null : (symptomScore / symptomMax) * 100,
    answers,
    keyAreas: answered.filter((item) => item.value >= (itemMax === 5 ? 3 : 2)).map((item) => item.label),
    subtype: calculatedValue(assessment, "inflammationSubtype") || assessment?.reportSnapshot?.inflammation?.subtype || derivedSubtype,
  };
}

function inflammationComparison(base, compare) {
  const before = inflammationRecord(base);
  const after = inflammationRecord(compare);
  const rows = [
    ["hs-CRP", before.hsCrp, after.hsCrp, "mg/L", 2, false],
    ["GRA/LYM 비율", before.graLymRatio, after.graLymRatio, "", 2, false],
    ["기존 NLR", before.legacyNlr, after.legacyNlr, "", 2, false],
    ["만성염증 점수", before.score, after.score, "점", 0, true],
    ["염증 관련 증상점수", before.symptomScore, after.symptomScore, "", 0, false],
  ].filter(([, b, a]) => b !== null && b !== undefined && a !== null && a !== undefined);
  if (!rows.length && before.subtype === "해당 없음" && after.subtype === "해당 없음") return "";
  const rowHtml = rows.map(([label, b, a, unit, digits, higherBetter]) => {
    const improved = higherBetter ? a > b : a < b;
    const same = Math.abs(a - b) < 0.001;
    const beforeText = label === "염증 관련 증상점수" ? `${numberText(b, digits)}/${before.symptomMax}` : `${numberText(b, digits)}${unit ? ` ${unit}` : ""}`;
    const afterText = label === "염증 관련 증상점수" ? `${numberText(a, digits)}/${after.symptomMax}` : `${numberText(a, digits)}${unit ? ` ${unit}` : ""}`;
    const changeText = label === "염증 관련 증상점수" && before.symptomMax !== after.symptomMax
      ? "척도 변경"
      : same ? "유지" : improved ? "개선" : "변화";
    return `<tr><td>${label}</td><td>${beforeText}</td><td>${afterText}</td><td>${changeText}</td></tr>`;
  }).join("");
  return `
    <h3>만성염증 평가 변화</h3>
    ${rowHtml ? `<table class="tracking-table compact-table"><thead><tr><th>지표</th><th>기준</th><th>비교</th><th>변화</th></tr></thead><tbody>${rowHtml}</tbody></table>` : ""}
    <p><strong>세부유형:</strong> ${escapeHtml(before.subtype)} → ${escapeHtml(after.subtype)}</p>
    <p class="comparison-summary">hs-CRP와 염증 관련 증상 부담의 변화를 점수로 비교하고, GRA/LYM 비율은 백혈구 감별 참고지표로 함께 확인했습니다.${before.graLymRatio === null && after.graLymRatio !== null || before.graLymRatio !== null && after.graLymRatio === null ? " CBC 지표 변경 전후의 NLR과 GRA/LYM 비율은 서로 다른 지표이므로 직접 비교하지 않았습니다." : ""}</p>
  `;
}

function gripRecord(assessment) {
  const raw = assessment?.rawValues || {};
  const numeric = (value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0 ? null : Number(value);
  const rightGripStrength = numeric(raw.rightGripStrength);
  const leftGripStrength = numeric(raw.leftGripStrength);
  const legacyGripStrength = numeric(raw.gripStrength);
  const bothMeasured = rightGripStrength !== null && leftGripStrength !== null;
  const derivedRepresentative = rightGripStrength !== null || leftGripStrength !== null
    ? Math.max(...[rightGripStrength, leftGripStrength].filter((value) => value !== null))
    : legacyGripStrength;
  const storedRepresentative = calculatedValue(assessment, "representativeGripStrength") ?? assessment?.reportSnapshot?.physicalFunction?.representativeGripStrength;
  const representativeGripStrength = numeric(storedRepresentative) ?? derivedRepresentative;
  const derivedDifferenceKg = bothMeasured ? Math.abs(rightGripStrength - leftGripStrength) : null;
  const storedDifferenceKg = calculatedValue(assessment, "gripDifferenceKg") ?? assessment?.reportSnapshot?.physicalFunction?.gripDifferenceKg;
  const gripDifferenceKg = bothMeasured ? (storedDifferenceKg === null || storedDifferenceKg === undefined ? derivedDifferenceKg : Number(storedDifferenceKg)) : null;
  const derivedDifferencePercent = bothMeasured && representativeGripStrength > 0 ? (derivedDifferenceKg / representativeGripStrength) * 100 : null;
  const storedDifferencePercent = calculatedValue(assessment, "gripDifferencePercent") ?? assessment?.reportSnapshot?.physicalFunction?.gripDifferencePercent;
  const gripDifferencePercent = bothMeasured ? (storedDifferencePercent === null || storedDifferencePercent === undefined ? derivedDifferencePercent : Number(storedDifferencePercent)) : null;
  return {
    rightGripStrength,
    leftGripStrength,
    representativeGripStrength,
    gripDifferenceKg,
    gripDifferencePercent,
    legacyGripStrength: rightGripStrength === null && leftGripStrength === null ? legacyGripStrength : null,
  };
}

function physicalFunctionRecord(assessment) {
  const raw = assessment?.rawValues || {};
  const grip = gripRecord(assessment);
  const sex = raw.sex || tracking.selectedPatient?.sex || "";
  const height = Number(raw.height);
  const weight = Number(raw.currentWeight);
  const previousWeight = Number(raw.previousWeight);
  const bmi = calculatedValue(assessment, "bmi") ?? (
    Number.isFinite(height) && height >= 100 && height <= 220 && Number.isFinite(weight) && weight > 0
      ? weight / ((height / 100) ** 2)
      : null
  );
  const weightLossRate = calculatedValue(assessment, "weightLossRate") ?? (
    Number.isFinite(weight) && weight > 0 && Number.isFinite(previousWeight) && previousWeight > 0
      ? Math.max(0, ((previousWeight - weight) / previousWeight) * 100)
      : null
  );
  const lowBmi = bmi !== null && Number(bmi) < 18.5;
  const weightLossReported = ["있음", "비의도적"].includes(raw.weightLossContext) || (!raw.weightLossContext && raw.weightLossStatus === "있음");
  const weightLoss = weightLossReported && (weightLossRate === null || Number(weightLossRate) >= 5);
  const scaleValue = (key, legacyTriggered = false) => {
    const value = raw[key];
    if (value === true) return 5;
    if (value === false) return 0;
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) {
      return Math.max(0, Math.min(5, Math.round(Number(value))));
    }
    return legacyTriggered ? 5 : null;
  };
  const appetiteReduced = scaleValue("appetiteReduced", raw.mealAmountReduced || raw.difficultyFinishingMeal || raw.lowProteinStatus === "있음");
  const earlySatiety = scaleValue("earlySatiety");
  const frequentIndigestion = scaleValue("frequentIndigestion", raw.postMealDiscomfort);
  const foodAvoidanceDueDiscomfort = scaleValue("foodAvoidanceDueDiscomfort", raw.reducedIntakeDueDigestion || raw.recurrentDiarrhea);
  const fatigueActivityReduced = scaleValue("fatigueActivityReduced", raw.functionalDeclineStatus === "있음");
  const walkingStairsDifficulty = scaleValue("walkingStairsDifficulty");
  const intakeIssue = appetiteReduced !== null && appetiteReduced >= 3;
  const digestionIssue = [earlySatiety, frequentIndigestion, foodAvoidanceDueDiscomfort].some((value) => value !== null && value >= 3);
  const smiLow = Number.isFinite(Number(raw.smi)) && Number(raw.smi) > 0 && Boolean(sex) && Number(raw.smi) < (sex === "남성" ? 7 : 5.7);
  const gripLow = grip.representativeGripStrength !== null && Boolean(sex) && grip.representativeGripStrength < (sex === "남성" ? 28 : 18);
  const muscleCount = [smiLow, gripLow].filter(Boolean).length;
  const fatigueIssue = fatigueActivityReduced !== null && fatigueActivityReduced >= 3;
  const mobilityIssue = walkingStairsDifficulty !== null && walkingStairsDifficulty >= 3;
  const riskScore = (weightLoss ? 1 : 0) + (intakeIssue ? 1 : 0) + (digestionIssue ? 1 : 0)
    + (muscleCount >= 2 ? 2 : muscleCount === 1 ? 1 : 0) + (fatigueIssue ? 1 : 0) + (mobilityIssue ? 1 : 0);
  const derivedScore = 20 - (riskScore * 2.5);
  const hasAnyMetric = [raw.currentWeight, raw.previousWeight, raw.skeletalMuscleMass, raw.smi, grip.representativeGripStrength,
    appetiteReduced, earlySatiety, frequentIndigestion, foodAvoidanceDueDiscomfort, fatigueActivityReduced, walkingStairsDifficulty]
    .some((value) => value !== null && value !== undefined && value !== "");
  const storedScore = calculatedValue(assessment, "physicalFunctionScore");
  const compatibleStoredScore = storedScore === null || storedScore === undefined
    ? null
    : usesHealthSubscores(assessment) ? Number(storedScore) : 20 - (Number(storedScore) * 2.5);
  return {
    score: hasAnyMetric ? derivedScore : compatibleStoredScore,
    weight: Number.isFinite(weight) && weight > 0 ? weight : null,
    bmi: bmi === null ? null : Number(bmi),
    weightLossRate: weightLossRate === null ? null : Number(weightLossRate),
    skeletalMuscleMass: Number.isFinite(Number(raw.skeletalMuscleMass)) && Number(raw.skeletalMuscleMass) > 0 ? Number(raw.skeletalMuscleMass) : null,
    smi: Number.isFinite(Number(raw.smi)) && Number(raw.smi) > 0 ? Number(raw.smi) : null,
    rightGripStrength: grip.rightGripStrength,
    leftGripStrength: grip.leftGripStrength,
    representativeGripStrength: grip.representativeGripStrength,
    gripDifferenceKg: grip.gripDifferenceKg,
    gripDifferencePercent: grip.gripDifferencePercent,
    appetiteReduced,
    earlySatiety,
    frequentIndigestion,
    foodAvoidanceDueDiscomfort,
    fatigueActivityReduced,
    walkingStairsDifficulty,
    intakeIssue,
    digestionIssue,
    fatigueIssue,
    mobilityIssue,
  };
}

function physicalFunctionComparison(base, compare) {
  const before = physicalFunctionRecord(base);
  const after = physicalFunctionRecord(compare);
  const definitions = [
    { key: "score", label: "신체기능 점수", unit: "점", digits: 1, higherBetter: true },
    { key: "weight", label: "체중", unit: "kg", digits: 1 },
    { key: "bmi", label: "BMI", unit: "", digits: 1 },
    { key: "weightLossRate", label: "체중감소율", unit: "%", digits: 1, lowerBetter: true },
    { key: "skeletalMuscleMass", label: "골격근량", unit: "kg", digits: 1, higherBetter: true },
    { key: "smi", label: "SMI", unit: "kg/m²", digits: 2, higherBetter: true },
    { key: "rightGripStrength", label: "오른손 악력", unit: "kg", digits: 1, higherBetter: true },
    { key: "leftGripStrength", label: "왼손 악력", unit: "kg", digits: 1, higherBetter: true },
    { key: "representativeGripStrength", label: "대표 악력", unit: "kg", digits: 1, higherBetter: true },
    { key: "gripDifferenceKg", label: "좌우 차이", unit: "kg", digits: 1, lowerBetter: true },
    { key: "gripDifferencePercent", label: "좌우 차이율", unit: "%", digits: 1, lowerBetter: true },
    ...physicalFunctionScaleMeta.map(([key, label]) => ({ key, label, unit: "점", digits: 0, lowerBetter: true })),
  ];
  const rows = definitions.filter((item) => before[item.key] !== null && after[item.key] !== null).map((item) => {
    const diff = after[item.key] - before[item.key];
    let change = `${diff > 0 ? "+" : ""}${numberText(diff, item.digits)}${item.unit ? ` ${item.unit}` : ""}`;
    if (Math.abs(diff) < 0.001) change = "유지";
    else if (item.lowerBetter) change = diff < 0 ? "개선" : "증가";
    else if (item.higherBetter) change = diff > 0 ? "개선" : "감소";
    return { ...item, before: before[item.key], after: after[item.key], change };
  });
  if (!rows.length) return "";
  const scoreImproved = before.score !== null && after.score !== null && after.score > before.score;
  const strengthImproved = before.representativeGripStrength !== null && after.representativeGripStrength !== null && after.representativeGripStrength > before.representativeGripStrength;
  const performanceImproved = ["fatigueActivityReduced", "walkingStairsDifficulty"].some((key) => (
    before[key] !== null && after[key] !== null && after[key] < before[key]
  ));
  const summary = scoreImproved && (strengthImproved || performanceImproved)
    ? "영양섭취와 체력 상태가 개선되었으며 근력과 신체수행능력도 회복되는 방향을 보이고 있습니다."
    : "체중, 영양 섭취, 근육과 일상적인 신체기능의 변화를 함께 확인했습니다.";
  return `
    <h3>신체기능저하 평가 변화</h3>
    ${rows.length ? `<table class="tracking-table compact-table"><thead><tr><th>지표</th><th>기준</th><th>비교</th><th>변화</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.label}</td><td>${numberText(row.before, row.digits)}${row.unit ? ` ${row.unit}` : ""}</td><td>${numberText(row.after, row.digits)}${row.unit ? ` ${row.unit}` : ""}</td><td>${row.change}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="comparison-summary">${summary}</p>
  `;
}

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

function canonicalTypeName(typeName) {
  const name = String(typeName || "").trim().replace(/^[A-Z0-9]\.\s*/, "");
  return {
    "복부비만 우세형": "복부비만형",
    "인슐린 저항 우세형": "인슐린 저항형",
    "만성염증 우세형": "만성염증형",
    "자율신경(스트레스) 우세형": "자율신경(스트레스)형",
    "근감소 우세형": "신체기능저하형",
    "근육저하형": "신체기능저하형",
    "근감소형": "신체기능저하형",
    "복합 대사위험형": "복합대사위험형",
    "대사 균형형": "대사균형형",
    "특정 우세형 없음": "특정 타입 없음",
  }[name] || name;
}

function displayTypeName(typeName, separator = " + ") {
  return String(typeName || "")
    .split("+")
    .map(canonicalTypeName)
    .filter(Boolean)
    .join(separator);
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
    t.createQuestionnaire,
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
  setFormControls(t.editForm, Boolean(permissions.canEdit && tracking.selectedPatient));
  if (t.saveAssessment) t.saveAssessment.disabled = !permissions.canCreateAssessment || !tracking.selectedPatient;
  if (t.createQuestionnaire) t.createQuestionnaire.disabled = !permissions.canCreateAssessment || !tracking.selectedPatient;
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

function formatBirthDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
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

function patientReportValues(patient, atDate = "") {
  const testDate = atDate || window.metabolicReportApp?.localDateKey?.() || new Date().toISOString().slice(0, 10);
  return {
    patientName: patient.name,
    chartNumber: patient.chart_number,
    sex: patient.sex || "",
    birthDate: patient.birth_date || "",
    age: ageAt(patient.birth_date, testDate),
    testDate,
  };
}

function resetReportForPatient(patient, values = {}) {
  if (!patient) return;
  const reportValues = { ...patientReportValues(patient), ...values };
  if (window.metabolicReportApp?.resetForPatient) {
    window.metabolicReportApp.resetForPatient(reportValues);
    return;
  }
  window.metabolicReportApp?.setValues(reportValues);
}

function startNewAssessment() {
  if (!tracking.selectedPatient) return;
  resetReportForPatient(tracking.selectedPatient);
  setBanner("새 검사 입력을 시작합니다.", "ok");
}

function showSelectedPatient(patient) {
  if (!patient) return;
  t.detailPanel.hidden = false;
  t.selectedTitle.textContent = patient.name;
  t.selectedMeta.textContent = patientDisplay(patient);
  fillPatientEditForm(patient);
  applyPermissions();
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
  const requestId = ++tracking.patientsRequestId;
  const params = new URLSearchParams({
    search: t.search.value || "",
    type: t.typeFilter.value || "",
    sort: t.sort.value || "recent",
  });
  const data = await api(`/api/patients?${params}`);
  if (requestId !== tracking.patientsRequestId) return;
  tracking.patients = data.patients || [];
  renderPatientTable();
}

function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function renderPatientTable() {
  if (!tracking.patients.length) {
    t.table.innerHTML = `<tr><td colspan="8">최근 3개월 이내 검사 환자 또는 신규 환자가 없습니다.</td></tr>`;
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
      <td>${escapeHtml(displayTypeName(patient.latest_primary_type) || "--")}</td>
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
    birthDate: formatBirthDateInput(document.querySelector("#newBirthDate").value),
    memo: document.querySelector("#newPatientMemo").value.trim(),
  };
  if (!payload.chartNumber || !payload.name) return;
  t.createButton.disabled = true;
  try {
    const data = await api("/api/patients", { method: "POST", body: JSON.stringify(payload) });
    t.createForm.reset();
    await loadPatients();
    tracking.selectedPatient = tracking.patients.find((patient) => patient.id === data.patient.id) || data.patient;
    tracking.assessments = [];
    tracking.questionnaires = [];
    showSelectedPatient(tracking.selectedPatient);
    resetReportForPatient(tracking.selectedPatient);
    renderSelectedSummary();
    renderAssessmentTable();
    renderAssessmentSelectors();
    renderTrend();
    renderQuestionnaires();
    setBanner("환자가 등록되었습니다.", "ok");
  } catch (error) {
    setBanner(error.message, "warning");
  } finally {
    applyPermissions();
  }
}

function fillPatientEditForm(patient) {
  document.querySelector("#editChartNumber").value = patient?.chart_number || "";
  document.querySelector("#editPatientName").value = patient?.name || "";
  document.querySelector("#editPatientSex").value = patient?.sex || "";
  document.querySelector("#editBirthDate").value = patient?.birth_date || "";
  document.querySelector("#editPatientMemo").value = patient?.memo || "";
}

async function updatePatient(event) {
  event.preventDefault();
  if (!tracking.selectedPatient) return;
  const payload = {
    chartNumber: document.querySelector("#editChartNumber").value.trim(),
    name: document.querySelector("#editPatientName").value.trim(),
    sex: document.querySelector("#editPatientSex").value,
    birthDate: formatBirthDateInput(document.querySelector("#editBirthDate").value),
    memo: document.querySelector("#editPatientMemo").value.trim(),
  };
  if (!payload.chartNumber || !payload.name) return;
  t.updatePatientButton.disabled = true;
  try {
    const data = await api(`/api/patients/${tracking.selectedPatient.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    tracking.selectedPatient = data.patient;
    await loadPatients();
    const refreshed = tracking.patients.find((patient) => patient.id === tracking.selectedPatient.id);
    if (refreshed) tracking.selectedPatient = refreshed;
    fillPatientEditForm(tracking.selectedPatient);
    t.selectedTitle.textContent = tracking.selectedPatient.name;
    t.selectedMeta.textContent = patientDisplay(tracking.selectedPatient);
    window.metabolicReportApp?.setValues({
      patientName: tracking.selectedPatient.name,
      chartNumber: tracking.selectedPatient.chart_number,
      sex: tracking.selectedPatient.sex || "",
      birthDate: tracking.selectedPatient.birth_date || "",
      age: ageAt(tracking.selectedPatient.birth_date, document.querySelector("#testDate").value),
    });
    setBanner("환자 기본정보가 수정되었습니다.", "ok");
  } catch (error) {
    setBanner(error.message, "warning");
  } finally {
    applyPermissions();
  }
}

async function openPatient(patientId) {
  tracking.selectedPatient = tracking.patients.find((patient) => patient.id === patientId) || null;
  if (!tracking.selectedPatient) return;
  tracking.questionnaires = [];
  t.questionnaireLinkArea.hidden = true;
  t.questionnaireStatus.textContent = "링크를 만들면 7일 동안 사용할 수 있습니다.";
  showSelectedPatient(tracking.selectedPatient);
  resetReportForPatient(tracking.selectedPatient);
  await Promise.all([loadAssessments(), loadQuestionnaires()]);
  const latest = latestAssessment();
  const questionnaire = latestAppliedQuestionnaire();
  const shouldRestoreQuestionnaire = questionnaire && (!latest || questionnaire.assessmentDate >= latest.assessmentDate);
  if (shouldRestoreQuestionnaire) {
    const matchingAssessment = latestAssessmentForDate(questionnaire.assessmentDate);
    if (matchingAssessment) openAssessment(matchingAssessment.id);
    else resetReportForPatient(tracking.selectedPatient, { testDate: questionnaire.assessmentDate });
    window.metabolicReportApp?.setValues({
      ...(questionnaire.responses || {}),
      testDate: questionnaire.assessmentDate,
    });
    t.questionnaireStatus.textContent = matchingAssessment
      ? "서버에 반영된 문진 답변을 같은 날짜의 검사기록과 함께 불러왔습니다."
      : "서버에 반영된 문진 답변을 새 검사 입력 화면에 불러왔습니다. 검사수치를 확인한 뒤 저장해 주세요.";
    setBanner("다른 계정에서 반영한 최신 문진 답변을 불러왔습니다.", "ok");
  } else if (latest) {
    openAssessment(latest.id);
  }
}

function latestAppliedQuestionnaire() {
  return [...tracking.questionnaires]
    .filter((item) => item.status === "applied" && Object.keys(item.responses || {}).length)
    .sort((a, b) => `${b.assessmentDate}${b.appliedAt || b.updatedAt || ""}`.localeCompare(`${a.assessmentDate}${a.appliedAt || a.updatedAt || ""}`))[0] || null;
}

function latestAssessmentForDate(assessmentDate) {
  return [...tracking.assessments]
    .filter((assessment) => assessment.assessmentDate === assessmentDate)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
}

function questionnaireStatusLabel(status) {
  return {
    draft: "작성 중",
    submitted: "의료진 확인 필요",
    applied: "검사 입력에 반영함",
    expired: "기간 만료",
    revoked: "취소됨",
  }[status] || status || "상태 미확인";
}

function questionnaireDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

function renderQuestionnaires() {
  if (!t.questionnaireList) return;
  if (!tracking.selectedPatient) {
    t.questionnaireList.innerHTML = '<p class="empty-state">환자를 선택하면 최근 문진 요청이 표시됩니다.</p>';
    return;
  }
  if (!tracking.questionnaires.length) {
    t.questionnaireList.innerHTML = '<p class="empty-state">생성된 환자 문진이 없습니다.</p>';
    return;
  }
  t.questionnaireList.innerHTML = tracking.questionnaires.map((item) => {
    const canApply = item.status === "submitted" && tracking.permissions.canEdit;
    const canRevoke = ["draft", "submitted"].includes(item.status) && tracking.permissions.canEdit;
    const statusDetail = item.status === "draft"
      ? `${item.answeredCount}/${item.totalQuestions}문항 저장 · ${questionnaireDateTime(item.expiresAt)}까지`
      : item.status === "submitted"
        ? `${item.answeredCount}/${item.totalQuestions}문항 · ${questionnaireDateTime(item.submittedAt)} 제출`
        : item.status === "applied"
          ? `${questionnaireDateTime(item.appliedAt)} 의료진 반영`
          : `${questionnaireDateTime(item.updatedAt)} 상태 변경`;
    return `
      <article class="questionnaire-request-item">
        <div>
          <p><span class="questionnaire-status-badge">${questionnaireStatusLabel(item.status)}</span>${escapeHtml(item.assessmentDate)} 검사 문진</p>
          <small>${escapeHtml(statusDetail)}</small>
        </div>
        <div class="questionnaire-request-actions">
          ${canApply ? `<button class="mini-button" type="button" data-apply-questionnaire="${escapeHtml(item.id)}">검사에 불러오기</button>` : ""}
          ${canRevoke ? `<button class="mini-button danger" type="button" data-revoke-questionnaire="${escapeHtml(item.id)}">취소</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function loadQuestionnaires() {
  if (!tracking.selectedPatient) return;
  const data = await api(`/api/patients/${tracking.selectedPatient.id}/questionnaires`);
  tracking.questionnaires = data.questionnaires || [];
  renderQuestionnaires();
}

async function createQuestionnaire() {
  if (!tracking.selectedPatient) return;
  t.createQuestionnaire.disabled = true;
  t.questionnaireStatus.textContent = "문진 링크를 생성하는 중입니다.";
  try {
    const assessmentDate = window.metabolicReportApp?.localDateKey?.() || new Date().toISOString().slice(0, 10);
    const data = await api(`/api/patients/${tracking.selectedPatient.id}/questionnaires`, {
      method: "POST",
      body: JSON.stringify({ assessmentDate }),
    });
    t.questionnaireLink.value = data.link;
    t.questionnaireLinkArea.hidden = false;
    t.questionnaireStatus.textContent = "링크가 생성되었습니다. 환자에게 전달하면 답변이 자동 저장됩니다.";
    await loadQuestionnaires();
  } catch (error) {
    t.questionnaireStatus.textContent = error.message;
    setBanner(error.message, "warning");
  } finally {
    applyPermissions();
  }
}

async function copyQuestionnaireLink() {
  const link = t.questionnaireLink.value;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    t.questionnaireStatus.textContent = "문진 링크를 복사했습니다.";
  } catch {
    t.questionnaireLink.select();
    document.execCommand("copy");
    t.questionnaireStatus.textContent = "문진 링크를 복사했습니다.";
  }
}

async function applyQuestionnaire(questionnaireId) {
  const item = tracking.questionnaires.find((questionnaire) => questionnaire.id === questionnaireId);
  if (!item || !tracking.selectedPatient) return;
  if (!confirm("환자가 제출한 문진 답변을 현재 검사 입력 화면에 불러올까요?\n기존 문진 답변 항목은 제출 내용으로 바뀝니다.")) return;
  try {
    const data = await api(`/api/questionnaires/${questionnaireId}/apply`, { method: "POST", body: "{}" });
    window.metabolicReportApp?.setValues({
      ...(data.questionnaire.responses || {}),
      testDate: item.assessmentDate,
    });
    t.questionnaireStatus.textContent = "문진 반영 상태가 서버에 저장되었습니다. 다른 계정에서도 환자를 열면 답변이 자동으로 표시됩니다.";
    setBanner("환자 문진 답변을 공동 작업공간에 반영했습니다. 검사수치를 확인한 뒤 검사결과를 저장해 주세요.", "ok");
    await loadQuestionnaires();
    document.querySelector("#inputHeading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    t.questionnaireStatus.textContent = error.message;
    setBanner(error.message, "warning");
  }
}

async function revokeQuestionnaire(questionnaireId) {
  if (!confirm("이 문진 링크와 제출 요청을 취소할까요?")) return;
  try {
    await api(`/api/questionnaires/${questionnaireId}/revoke`, { method: "POST", body: "{}" });
    t.questionnaireLinkArea.hidden = true;
    t.questionnaireStatus.textContent = "문진 요청을 취소했습니다.";
    await loadQuestionnaires();
  } catch (error) {
    t.questionnaireStatus.textContent = error.message;
    setBanner(error.message, "warning");
  }
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
  window.metabolicReportApp?.render?.();
}

function sortedAssessmentsAsc() {
  return [...tracking.assessments].sort((a, b) => `${a.assessmentDate}${a.createdAt}`.localeCompare(`${b.assessmentDate}${b.createdAt}`));
}

function latestAssessment() {
  return [...tracking.assessments]
    .sort((a, b) => `${b.assessmentDate}${b.createdAt}`.localeCompare(`${a.assessmentDate}${a.createdAt}`))[0] || null;
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
  t.selectedPriority.textContent = `현재 관리 필요영역: ${lowest?.label || "--"}`;
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
      <td>${escapeHtml(displayTypeName(assessment.primaryType) || "--")}</td>
      <td>
        <button class="mini-button" type="button" data-open-assessment="${escapeHtml(assessment.id)}">열기</button>
        <button class="mini-button" type="button" data-review-assessment="${escapeHtml(assessment.id)}">의료진 확인</button>
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

function showClinicianReview(snapshot) {
  const dialog = t.clinicianReviewDialog;
  if (!dialog || !t.clinicianReviewContent) return;
  const notices = Array.isArray(snapshot.clinicianReview) ? snapshot.clinicianReview : [];
  const patientName = tracking.selectedPatient?.name || snapshot.data.patientName || "선택 환자";
  const chartNumber = tracking.selectedPatient?.chartNumber || snapshot.data.chartNumber || "";
  const testDate = snapshot.data.testDate || "검사일 미입력";
  t.clinicianReviewPatient.textContent = `${patientName}${chartNumber ? ` · 차트 ${chartNumber}` : ""} · ${testDate}`;

  if (!notices.length) {
    t.clinicianReviewContent.innerHTML = '<div class="clinician-review-empty">현재 입력된 수치에서는 자동 안전 확인 기준에 해당하는 항목이 없습니다. 환자의 증상, 병력과 복용약은 별도로 확인해 주세요.</div>';
  } else {
    const groups = [
      ["urgent", "즉시 확인·응급 의뢰 판단", "응급증상 여부를 먼저 확인하세요"],
      ["prompt", "신속한 진료·상급기관 의뢰 검토", "점수보다 의학적 확인을 우선하세요"],
      ["review", "함께 확인할 항목", "관련 수치와 원인을 빠뜨리지 않도록 확인하세요"],
    ];
    t.clinicianReviewContent.innerHTML = groups.map(([priority, title, description]) => {
      const items = notices.filter((notice) => notice.priority === priority);
      if (!items.length) return "";
      return `
        <section class="clinician-review-group clinician-review-group--${priority}">
          <h3>${title} <small>${description}</small></h3>
          ${items.map((notice) => `
            <article class="clinician-review-item">
              <strong>${escapeHtml(notice.title)}${notice.value ? ` <span>${escapeHtml(notice.value)}</span>` : ""}</strong>
              <p>${escapeHtml(notice.message)}</p>
              <p class="clinician-review-checks">${escapeHtml(notice.checks)}</p>
            </article>
          `).join("")}
        </section>
      `;
    }).join("");
  }

  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert(`의료진 확인이 필요합니다.\n${notices.map((notice) => `${notice.title}: ${notice.message}`).join("\n") || "자동 확인 기준에 해당하는 항목이 없습니다."}`);
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
    fastingStatus: "",
    rawValues: rawForSave(snapshot.data),
    calculatedScores: snapshot.calculatedScores,
    scoreRuleVersion: snapshot.scoreRuleVersion,
    primaryType: snapshot.primaryType,
    secondaryType: snapshot.secondaryType,
    typeStrengths: snapshot.typeResult.candidates || [],
    tags: snapshot.typeResult.tags || [],
    warnings: [...snapshot.flags.map((flag) => flag.text), ...snapshot.validation.warnings.map((warning) => warning.text)],
    clinicianNote: snapshot.data.clinicianNote || "",
    clinicianReview: snapshot.clinicianReview || [],
    reportSnapshot: snapshot.reportSnapshot,
  };
  t.saveAssessment.disabled = true;
  try {
    await api(`/api/patients/${tracking.selectedPatient.id}/assessments`, { method: "POST", body: JSON.stringify(payload) });
    setBanner("검사결과가 환자 기록에 저장되었습니다.", "ok");
    showClinicianReview(snapshot);
    await loadAssessments();
    await loadPatients();
  } catch (error) {
    setBanner(error.message, "warning");
  } finally {
    t.saveAssessment.disabled = false;
  }
}

function openAssessment(assessmentId) {
  const assessment = tracking.assessments.find((item) => item.id === assessmentId);
  if (!assessment || !tracking.selectedPatient) return;
  const rawValues = symptomsForCurrentEditor(assessment.rawValues, assessment.scoreRuleVersion);
  window.metabolicReportApp.setValues({
    ...rawValues,
    rightGripStrength: rawValues.rightGripStrength ?? "",
    leftGripStrength: rawValues.leftGripStrength ?? "",
    gripStrength: rawValues.gripStrength ?? "",
    ...patientReportValues(tracking.selectedPatient, assessment.assessmentDate),
    assessmentStage: assessment.assessmentStage || "",
    clinicianNote: assessment.clinicianNote || "",
  });
  window.metabolicReportApp.generateReport();
}

function openAssessmentClinicianReview(assessmentId) {
  const assessment = tracking.assessments.find((item) => item.id === assessmentId);
  if (!assessment) return;
  showClinicianReview({
    clinicianReview: Array.isArray(assessment.clinicianReview) ? assessment.clinicianReview : [],
    data: {
      patientName: tracking.selectedPatient?.name || "",
      chartNumber: tracking.selectedPatient?.chartNumber || "",
      testDate: assessment.assessmentDate || "",
    },
  });
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
        <p><strong>현재 관리 필요영역:</strong> ${lowAxis?.label || "--"}</p>
        <p class="comparison-summary">${makeComparisonSummary(base, compare, improvedAxis, lowAxis, rows)}</p>
      </section>
      <section class="comparison-page">
        <h3>5개 축 비교</h3>
        <table class="tracking-table compact-table">
          <thead><tr><th>축</th><th>기준</th><th>비교</th><th>변화</th></tr></thead>
          <tbody>${axisRows.map((row) => `<tr><td>${row.label}</td><td>${scoreText(row.before)}</td><td>${scoreText(row.after)}</td><td>${row.diff >= 0 ? "+" : ""}${numberText(row.diff)}점</td></tr>`).join("")}</tbody>
        </table>
        ${typeAComparison(base, compare)}
        ${inflammationComparison(base, compare)}
        <h3>주요 검사 변화표</h3>
        <table class="tracking-table compact-table">
          <thead><tr><th>지표</th><th>기준</th><th>비교</th><th>변화</th><th>평가</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${row.metricLabel}</td><td>${numberText(row.before, 2)} ${row.unit}</td><td>${numberText(row.after, 2)} ${row.unit}</td><td>${row.diff >= 0 ? "+" : ""}${numberText(row.diff, 2)} ${row.unit}</td><td>${row.evaluation}</td></tr>`).join("")}</tbody>
        </table>
        <h3>주된 관리 패턴의 변화</h3>
        <p>${escapeHtml(displayTypeName(base.primaryType) || "--")} → ${escapeHtml(displayTypeName(compare.primaryType) || "--")}</p>
      </section>
      <section class="comparison-page">
        <h3>해석 제한</h3>
        <p>두 검사 간 측정조건과 생활환경 차이를 함께 고려해 변화를 해석합니다.</p>
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
t.editForm?.addEventListener("submit", updatePatient);
[document.querySelector("#newBirthDate"), document.querySelector("#editBirthDate")].forEach((input) => {
  input?.addEventListener("input", () => {
    const formatted = formatBirthDateInput(input.value);
    if (input.value !== formatted) input.value = formatted;
  });
  input?.addEventListener("blur", () => {
    input.value = formatBirthDateInput(input.value);
  });
});
t.refresh.addEventListener("click", loadPatients);
t.newAssessmentLink?.addEventListener("click", startNewAssessment);
const debouncedPatientSearch = debounce(() => loadPatients().catch((error) => setBanner(error.message, "warning")), 280);
t.search.addEventListener("input", debouncedPatientSearch);
t.typeFilter.addEventListener("change", () => loadPatients().catch((error) => setBanner(error.message, "warning")));
t.sort.addEventListener("change", () => loadPatients().catch((error) => setBanner(error.message, "warning")));
t.table.addEventListener("click", (event) => {
  const id = event.target.closest("[data-open-patient]")?.dataset.openPatient;
  if (id) openPatient(id).catch((error) => setBanner(error.message, "warning"));
});
t.saveAssessment.addEventListener("click", saveAssessment);
t.createQuestionnaire?.addEventListener("click", createQuestionnaire);
t.copyQuestionnaireLink?.addEventListener("click", copyQuestionnaireLink);
t.questionnaireList?.addEventListener("click", (event) => {
  const applyId = event.target.closest("[data-apply-questionnaire]")?.dataset.applyQuestionnaire;
  const revokeId = event.target.closest("[data-revoke-questionnaire]")?.dataset.revokeQuestionnaire;
  if (applyId) applyQuestionnaire(applyId);
  if (revokeId) revokeQuestionnaire(revokeId);
});
document.querySelectorAll("[data-clinician-review-close]").forEach((button) => {
  button.addEventListener("click", () => t.clinicianReviewDialog?.close());
});
t.historySort.addEventListener("change", () => loadAssessments().catch((error) => setBanner(error.message, "warning")));
t.assessmentTable.addEventListener("click", (event) => {
  const openId = event.target.closest("[data-open-assessment]")?.dataset.openAssessment;
  const reviewId = event.target.closest("[data-review-assessment]")?.dataset.reviewAssessment;
  const deleteId = event.target.closest("[data-delete-assessment]")?.dataset.deleteAssessment;
  if (openId) openAssessment(openId);
  if (reviewId) openAssessmentClinicianReview(reviewId);
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

if (!window.patientQuestionnaireMode) {
  setInterval(() => {
    if (!tracking.user) return;
    loadPatients().catch(() => {});
    if (tracking.selectedPatient) {
      loadAssessments().catch(() => {});
      loadQuestionnaires().catch(() => {});
    }
  }, 60000);

  loadMe();
}
