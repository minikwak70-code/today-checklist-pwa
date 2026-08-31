const AXIS_MAX = 20;
const SCORE_RULE_VERSION = "metabolic-score-v5.0";
const DEFAULT_ULN = {
  alt: 40,
  ggt: 60,
  tbil: 1.2,
  ast: 40,
  alp: 120,
};

const TYPE_OPTIONS = [
  ["", "자동 판정 사용"],
  ["0. 간관리 선행형", "간관리 선행형"],
  ["A. 복부비만 우세형", "복부비만형"],
  ["B. 인슐린 저항 우세형", "인슐린 저항형"],
  ["C. 만성염증 우세형", "만성염증형"],
  ["D. 자율신경(스트레스) 우세형", "자율신경(스트레스)형"],
  ["E. 신체기능저하형", "신체기능저하형"],
  ["F. 복합 대사위험형", "복합대사위험형"],
  ["대사 균형형", "대사균형형"],
  ["특정 우세형 없음", "특정 타입 없음"],
  ["해당 없음", "해당 없음"],
];

const AXIS_SHORT_COMMENTS = {
  glucose: "혈당 상태와 인슐린 저항성 관련 패턴",
  lipid: "중성지방과 LDL-C 상태",
  liver: "ALT, AST, GGT로 확인한 간대사 상태",
  inflammation: "hs-CRP와 증상 문진으로 확인한 만성염증 관리 상태",
  autonomic: "HRV와 신체적 스트레스 반응",
};

const PRIORITY_REASON_COMMENTS = {
  glucose: "인슐린 저항성과 혈당 조절 능력 상실은 만성염증을 악화시킵니다.",
  lipid: "과도한 지질은 동맥경화 및 심근경색을 일으킬 수 있습니다.",
  liver: "간이 좋아져야 대사기능이 좋아집니다.",
  inflammation: "만성염증은 몸이 회복하는 것을 방해합니다.",
  autonomic: "스트레스와 자율신경 불균형은 몸을 계속 각성시켜 부담을 줍니다.",
};

const TREATMENT_PROGRAMS = [
  { id: "", name: "선택" },
  { id: "liver_function", name: "간기능개선치료" },
  { id: "lean_diet", name: "린다이어트 프로그램" },
  { id: "enzyme_fast", name: "효소절식 프로그램" },
  { id: "herbal_medicine", name: "한약치료" },
];

const TREATMENT_FIELD_IDS = [
  "treatmentProgramPrimary",
  "treatmentProgramSecondary",
  "treatmentProgramTertiary",
  "treatmentDurationPrimary",
  "treatmentDurationSecondary",
  "treatmentDurationTertiary",
  "treatmentDuration",
  "treatmentGoals",
  "treatmentFocusCustom",
  "treatmentPlan",
];

const TREATMENT_FOCUS_FIELDS = [
  ["focusCarbRestriction", "탄수화물 제한"],
  ["focusAlcoholAvoidance", "금주"],
  ["focusSaltRestriction", "소금 제한"],
  ["focusFoodRestriction", "밀가루/설탕/유당/과당 제한"],
  ["focusSixteenHourFast", "16시간 공복"],
  ["focusAerobicExercise", "유산소 운동"],
  ["focusStrengthTraining", "근력운동"],
  ["focusSleepHabit", "수면습관 개선"],
  ["focusSupplement", "영양보충제 복용"],
  ["focusMelatonin", "멜라토닌 복용"],
  ["focusProteinIntake", "단백질 섭취"],
  ["focusPlantFat", "식물성 지질 섭취"],
];

const PHYSICAL_FUNCTION_SCALE_FIELDS = [
  ["appetiteReduced", "식욕·식사량 감소"],
  ["earlySatiety", "조기포만"],
  ["frequentIndigestion", "소화불편"],
  ["foodAvoidanceDueDiscomfort", "섭취 제한"],
  ["fatigueActivityReduced", "피로·활동 유지 어려움"],
  ["walkingStairsDifficulty", "걷기·계단 이용 어려움"],
];

const INFLAMMATION_SYMPTOM_FIELDS = [
  ["inflammationFatigue", "피로"],
  ["inflammationRecovery", "회복력"],
  ["inflammationMusculoskeletal", "근육·관절"],
  ["inflammationOral", "구강·치주"],
  ["inflammationRespiratory", "호흡기·알레르기"],
  ["inflammationSkin", "피부"],
  ["inflammationGut", "위장관"],
  ["inflammationInfectionRecovery", "감염·회복"],
];

const LINEAR_SCALE_FIELDS = [
  ...INFLAMMATION_SYMPTOM_FIELDS,
  ...PHYSICAL_FUNCTION_SCALE_FIELDS,
];

let treatmentPlanUserEdited = false;
let treatmentPlanApplyingAuto = false;
let treatmentDurationUserEdited = false;

const elements = {
  form: document.querySelector("#reportForm"),
  generateButton: document.querySelector("#generateButton"),
  generateStatus: document.querySelector("#generateStatus"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  printButton: document.querySelector("#printButton"),
  printStatus: document.querySelector("#printStatus"),
  patientLine: document.querySelector("#patientLine"),
  scoreTitle: document.querySelector("#scoreTitle"),
  totalScore: document.querySelector("#totalScore"),
  gradeLabel: document.querySelector("#gradeLabel"),
  gradeHelp: document.querySelector("#gradeHelp"),
  radarChart: document.querySelector("#radarChart"),
  axisScoreLegend: document.querySelector("#axisScoreLegend"),
  priorityList: document.querySelector("#priorityList"),
  priorityListDetail: document.querySelector("#priorityListDetail"),
  priorityAxes: document.querySelector("#priorityAxes"),
  summaryComment: document.querySelector("#summaryComment"),
  flagArea: document.querySelector("#flagArea"),
  axisCards: document.querySelector("#axisCards"),
  comprehensiveInterpretation: document.querySelector("#comprehensiveInterpretation"),
  limitList: document.querySelector("#limitList"),
  commonGuideList: document.querySelector("#commonGuideList"),
  validationSummary: document.querySelector("#validationSummary"),
  primaryType: document.querySelector("#primaryType"),
  secondaryType: document.querySelector("#secondaryType"),
  primaryTypeReason: document.querySelector("#primaryTypeReason"),
  supportTags: document.querySelector("#supportTags"),
  manualPrimaryType: document.querySelector("#manualPrimaryType"),
  manualSecondaryType: document.querySelector("#manualSecondaryType"),
  tgHdlCalc: document.querySelector("#tgHdlCalc"),
  nonHdlCalc: document.querySelector("#nonHdlCalc"),
  graLymCalc: document.querySelector("#graLymCalc"),
  whtrCalc: document.querySelector("#whtrCalc"),
  gripStrengthCalc: document.querySelector("#gripStrengthCalc"),
  physicalFunctionReport: document.querySelector("#physicalFunctionReport"),
  physicalFunctionBody: document.querySelector("#physicalFunctionBody"),
  generateTreatmentPlanButton: document.querySelector("#generateTreatmentPlanButton"),
  treatmentDirection: document.querySelector("#treatmentDirection"),
  treatmentProgramList: document.querySelector("#treatmentProgramList"),
  treatmentDurationOutput: document.querySelector("#treatmentDurationOutput"),
  treatmentDurationReason: document.querySelector("#treatmentDurationReason"),
  treatmentGoalList: document.querySelector("#treatmentGoalList"),
  treatmentFocusList: document.querySelector("#treatmentFocusList"),
};

const numberFields = new Set([
  "age",
  "hba1c",
  "fastingGlucose",
  "tg",
  "hdl",
  "totalChol",
  "ldl",
  "alt",
  "altUln",
  "ggt",
  "ggtUln",
  "tbil",
  "tbilUln",
  "hsCrp",
  "graPercent",
  "lymPercent",
  "visceralFat",
  "sbp",
  "dbp",
  "hrvIndexValue",
  "snsPercent",
  "pnsPercent",
  "sdnnValue",
  "snsPnsRatio",
  "heartRate",
  "ast",
  "astUln",
  "alp",
  "alpUln",
  "waist",
  "height",
  "restingHr",
  "currentWeight",
  "previousWeight",
  "skeletalMuscleMass",
  "smi",
  "rightGripStrength",
  "leftGripStrength",
  "gripStrength",
  ...LINEAR_SCALE_FIELDS.map(([id]) => id),
]);

const checkboxFields = new Set([
  ...TREATMENT_FOCUS_FIELDS.map(([id]) => id),
]);

const allFields = [
  "patientName",
  "chartNumber",
  "sex",
  "birthDate",
  "testDate",
  "assessmentStage",
  "hrvIndexGrade",
  "stressGrade",
  "ansActivity",
  "snsActivity",
  "pnsActivity",
  "weightLossContext",
  "manualPrimaryType",
  "manualSecondaryType",
  "clinicianNote",
  ...TREATMENT_FIELD_IDS,
  ...numberFields,
  ...checkboxFields,
];

function field(id) {
  return document.querySelector(`#${id}`);
}

function linearScaleInputs(id) {
  return [...document.querySelectorAll(`input[name="${id}"]`)];
}

function readValue(id) {
  if (LINEAR_SCALE_FIELDS.some(([fieldId]) => fieldId === id)) {
    const selected = linearScaleInputs(id).find((input) => input.checked);
    return selected ? Number(selected.value) : null;
  }
  const input = field(id);
  if (!input) return null;
  if (checkboxFields.has(id)) return input.checked;
  if (numberFields.has(id)) {
    const value = Number(input.value);
    return input.value !== "" && Number.isFinite(value) ? value : null;
  }
  return input.value.trim();
}

function setupLinearScales() {
  document.querySelectorAll("[data-symptom-scale], [data-physical-scale]").forEach((container) => {
    const id = container.dataset.symptomScale || container.dataset.physicalScale;
    const title = LINEAR_SCALE_FIELDS.find(([fieldId]) => fieldId === id)?.[1] || "증상";
    const options = document.createElement("div");
    options.className = "symptom-scale-options";
    options.setAttribute("role", "radiogroup");
    options.setAttribute("aria-label", `${title} 정도`);
    options.innerHTML = Array.from({ length: 6 }, (_, value) => `
      <label class="symptom-scale-option">
        <input type="radio" name="${id}" value="${value}" aria-label="${value}점" />
        <span>${value}</span>
      </label>
    `).join("");
    const anchors = document.createElement("div");
    anchors.className = "symptom-scale-anchors";
    anchors.innerHTML = "<span>전혀 아니다</span><span>매우 그렇다</span>";
    container.append(options, anchors);
  });
}

function readForm() {
  return Object.fromEntries(allFields.map((id) => [id, readValue(id)]));
}

function present(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatDecimal(value, digits = 2) {
  if (!present(value)) return "";
  const formatted = Number(value).toFixed(digits);
  return digits === 0 ? formatted : formatted.replace(/\.?0+$/, "");
}

function typeAGrade(score) {
  if (!Number.isFinite(Number(score))) return "";
  const normalizedScore = Math.max(0, Math.min(4, Math.round(Number(score))));
  return ["E", "D", "C", "B", "A"][normalizedScore];
}

function assessTypeA(data) {
  const heightValid = present(data.height) && data.height >= 100 && data.height <= 220;
  const waistValid = present(data.waist) && data.waist >= 40 && data.waist <= 200;
  const vflValid = present(data.visceralFat) && data.visceralFat >= 1 && data.visceralFat <= 20;
  const sexValid = data.sex === "남성" || data.sex === "여성";
  const whtr = heightValid && waistValid ? data.waist / data.height : null;
  const whtrHigh = present(whtr) && whtr >= 0.5;
  const waistHigh = waistValid && sexValid && (data.sex === "남성" ? data.waist >= 90 : data.waist >= 85);
  const visceralHigh = vflValid && data.visceralFat >= 10;
  const riskScore = (whtrHigh ? 2 : 0) + (waistHigh ? 1 : 0) + (visceralHigh ? 1 : 0);
  const score = 4 - riskScore;
  const hasAnyMetric = present(whtr) || (waistValid && sexValid) || vflValid;
  const activated = riskScore >= 2 && (present(whtr) || (waistHigh && visceralHigh));
  let judgment = !hasAnyMetric
      ? "판정 대기"
    : [
        "복부지방 상태 양호",
        "복부지방 증가 경향",
        "복부비만 관리 필요",
        "적극적인 복부비만 관리 필요",
        "집중적인 복부비만 관리 필요",
      ][riskScore];
  const complete = present(whtr) && sexValid && vflValid;
  if (!complete && riskScore === 0 && hasAnyMetric) judgment = "부분 판정 · 복부지방 상태 양호";
  return {
    score,
    max: 4,
    grade: typeAGrade(score),
    riskScore,
    judgment,
    activated,
    hasAnyMetric,
    complete,
    whtr,
    whtrHigh,
    whtrLabel: !present(whtr) ? "계산 불가" : whtrHigh ? "높음" : "양호",
    waistHigh,
    waistLabel: !waistValid ? "미측정" : !sexValid ? "성별 확인 필요" : waistHigh ? "복부비만 기준 이상" : "정상범위",
    visceralHigh,
    visceralLabel: !vflValid ? "미측정" : visceralHigh ? "증가" : "정상범위",
  };
}

function assessSmi(data) {
  if (!present(data.smi)) return { status: "missing", label: "미측정", valueText: "SMI 미측정", low: false, borderline: false, normal: false };
  if (data.smi <= 0) return { status: "invalid", label: "입력 오류", valueText: `SMI ${formatDecimal(data.smi)} kg/m²`, low: false, borderline: false, normal: false };
  if (!data.sex) return { status: "unknown-sex", label: "성별 정보가 없어 SMI 기준을 적용할 수 없습니다.", valueText: `SMI ${formatDecimal(data.smi)} kg/m²`, low: false, borderline: false, normal: false };
  const value = data.smi;
  const male = data.sex === "남성";
  const lowCut = male ? 7.0 : 5.7;
  const borderCut = male ? 7.5 : 6.0;
  if (value < lowCut) return { status: "low", label: "낮은 근육량 기준에 해당", valueText: `SMI ${formatDecimal(value)} kg/m²`, low: true, borderline: false, normal: false };
  if (value < borderCut) return { status: "borderline", label: "근육량 기준 이상 · 경계 관찰", valueText: `SMI ${formatDecimal(value)} kg/m²`, low: false, borderline: true, normal: false };
  return { status: "normal", label: "근육량 기준 이상", valueText: `SMI ${formatDecimal(value)} kg/m²`, low: false, borderline: false, normal: true };
}

function calculateGripMetrics(data) {
  const validGrip = (value) => present(value) && Number.isFinite(Number(value)) && Number(value) > 0;
  const right = validGrip(data.rightGripStrength) ? Number(data.rightGripStrength) : null;
  const left = validGrip(data.leftGripStrength) ? Number(data.leftGripStrength) : null;
  const legacy = validGrip(data.gripStrength) ? Number(data.gripStrength) : null;
  if (right === null && left === null) {
    return {
      right,
      left,
      representative: legacy,
      differenceKg: null,
      differencePercent: null,
      measurementStatus: legacy === null ? "unmeasured" : "legacy",
      asymmetryObserved: false,
    };
  }
  const representative = Math.max(...[right, left].filter((value) => value !== null));
  const bothMeasured = right !== null && left !== null;
  const differenceKg = bothMeasured ? Math.abs(right - left) : null;
  const differencePercent = bothMeasured && representative > 0 ? (differenceKg / representative) * 100 : null;
  return {
    right,
    left,
    representative,
    differenceKg,
    differencePercent,
    measurementStatus: bothMeasured ? "both" : right !== null ? "right-only" : "left-only",
    asymmetryObserved: present(differencePercent) && differencePercent >= 20,
  };
}

function assessGrip(data) {
  const metrics = calculateGripMetrics(data);
  if (!present(metrics.representative)) return { ...metrics, label: "미측정", low: false, normal: false };
  if (!data.sex) return { ...metrics, label: "성별 확인 필요", low: false, normal: false };
  const low = metrics.representative < (data.sex === "남성" ? 28 : 18);
  return { ...metrics, label: low ? "근력 저하 기준 해당" : "정상범위", low, normal: !low };
}

function assessPhysicalFunction(data) {
  const heightValid = present(data.height) && data.height >= 100 && data.height <= 220;
  const weightValid = present(data.currentWeight) && data.currentWeight > 0;
  const previousWeightValid = present(data.previousWeight) && data.previousWeight > 0;
  const bmi = heightValid && weightValid ? data.currentWeight / ((data.height / 100) ** 2) : null;
  const weightLossRate = weightValid && previousWeightValid && data.previousWeight >= data.currentWeight
    ? ((data.previousWeight - data.currentWeight) / data.previousWeight) * 100
    : weightValid && previousWeightValid ? 0 : null;
  const lowBmi = present(bmi) && bmi < 18.5;
  const weightLossReported = ["있음", "비의도적"].includes(data.weightLossContext);
  const unintentionalWeightLoss = weightLossReported && (!present(weightLossRate) || weightLossRate >= 5);
  const suspectedWeightLoss = false;

  const intakeFields = ["appetiteReduced"];
  const digestionFields = [
    "earlySatiety",
    "frequentIndigestion",
    "foodAvoidanceDueDiscomfort",
  ];
  const scaleIssue = (id) => present(data[id]) && Number(data[id]) >= 3;
  const intakeIssue = intakeFields.some(scaleIssue);
  const digestionIssue = digestionFields.some(scaleIssue);

  const smi = assessSmi(data);
  const grip = assessGrip(data);
  const abnormalMuscleCount = [smi.low, grip.low].filter(Boolean).length;
  const muscleScore = abnormalMuscleCount >= 2 ? 2 : abnormalMuscleCount === 1 ? 1 : 0;
  const fatigueIssue = scaleIssue("fatigueActivityReduced");
  const mobilityIssue = scaleIssue("walkingStairsDifficulty");

  const domainRiskScores = {
    weight: unintentionalWeightLoss ? 1 : 0,
    intake: (intakeIssue ? 1 : 0) + (digestionIssue ? 1 : 0),
    muscle: muscleScore,
    function: (fatigueIssue ? 1 : 0) + (mobilityIssue ? 1 : 0),
  };
  const riskScore = Object.values(domainRiskScores).reduce((sum, value) => sum + value, 0);
  const domainScores = Object.fromEntries(
    Object.entries(domainRiskScores).map(([key, value]) => [key, 5 - (value * 2.5)]),
  );
  const score = 20 - (riskScore * 2.5);
  const judgment = riskScore <= 1
    ? "신체기능 양호"
    : riskScore <= 3
      ? "신체기능 저하 경향"
      : riskScore <= 5
        ? "신체기능저하형"
        : "뚜렷한 신체기능저하형";
  const tags = [
    unintentionalWeightLoss ? "최근 체중감소" : "",
    suspectedWeightLoss ? "최근 체중감소 의심" : "",
    intakeIssue ? "섭취부족" : "",
    digestionIssue ? "소화기능 저하" : "",
    smi.low ? "근육량 저하" : "",
    grip.low ? "근력 저하" : "",
    mobilityIssue ? "신체수행능력 저하" : "",
    fatigueIssue ? "체력 저하" : "",
    abnormalMuscleCount === 2 ? "뚜렷한 근육·근력 저하" : "",
  ].filter(Boolean);
  const hasAnyMetric = [
    weightLossRate,
    data.smi,
    grip.representative,
    data.skeletalMuscleMass,
  ].some(present) || present(data.weightLossContext) || [...intakeFields, ...digestionFields, "fatigueActivityReduced", "walkingStairsDifficulty"].some((id) => present(data[id]));
  const objectiveCount = [unintentionalWeightLoss, smi.low, grip.low].filter(Boolean).length;
  const supportCount = [intakeIssue, digestionIssue, fatigueIssue, mobilityIssue].filter(Boolean).length;

  return {
    score,
    max: 20,
    riskScore,
    judgment,
    activated:
      (objectiveCount >= 1 && supportCount >= 2) ||
      (objectiveCount >= 2 && supportCount >= 1),
    objectiveCount,
    supportCount,
    hasAnyMetric,
    bmi,
    weightLossRate,
    lowBmi,
    unintentionalWeightLoss,
    suspectedWeightLoss,
    intakeIssue,
    digestionIssue,
    smi,
    grip,
    abnormalMuscleCount,
    fatigueIssue,
    mobilityIssue,
    domainScores,
    domainRiskScores,
    tags,
  };
}

function physicalFunctionInputsPresent(data) {
  return assessPhysicalFunction(data).hasAnyMetric;
}

function scored(score, max, label, extra = {}) {
  return { score, max, label, ...extra };
}

function missing(max, label = "미입력") {
  return { score: null, max, label, missing: true };
}

function hold(max, label = "판정 보류") {
  return { score: null, max, label, hold: true };
}

function scoreByRanges(value, max, ranges) {
  if (!present(value)) return missing(max);
  const match = ranges.find((range) => range.test(value));
  return match ? scored(match.score, max, match.label) : missing(max);
}

function scoreHba1c(value) {
  return scoreByRanges(value, 12, [
    { test: (v) => v < 5.4, score: 12, label: "양호" },
    { test: (v) => v <= 5.6, score: 10, label: "정상범위 상단" },
    { test: (v) => v <= 5.9, score: 7, label: "당뇨병 전단계 범위" },
    { test: (v) => v <= 6.4, score: 4, label: "혈당 관리 필요" },
    { test: (v) => v >= 6.5, score: 0, label: "당뇨병 진단범위" },
  ]);
}

function scoreTgHdl(tg, hdl) {
  if (!present(tg) || !present(hdl) || hdl <= 0) return missing(8);
  const ratio = tg / hdl;
  const result = scoreByRanges(ratio, 8, [
    { test: (v) => v < 2, score: 8, label: "지질대사 균형 양호" },
    { test: (v) => v <= 2.49, score: 6, label: "지질대사 균형 관찰" },
    { test: (v) => v <= 2.99, score: 4, label: "인슐린 저항 관련 지표 관찰" },
    { test: (v) => v <= 3.49, score: 2, label: "지질대사 관리 필요" },
    { test: (v) => v >= 3.5, score: 0, label: "지질대사 집중 관리 필요" },
  ]);
  return { ...result, ratio };
}

function scoreTg(value) {
  return scoreByRanges(value, 8, [
    { test: (v) => v < 100, score: 8, label: "양호" },
    { test: (v) => v <= 149, score: 6, label: "정상범위 상단" },
    { test: (v) => v <= 199, score: 4, label: "상승" },
    { test: (v) => v <= 499, score: 2, label: "높음" },
    { test: (v) => v >= 500, score: 0, label: "별도 평가 필요" },
  ]);
}

function scoreLdl(value) {
  return scoreByRanges(value, 12, [
    { test: (v) => v < 100, score: 12, label: "양호" },
    { test: (v) => v < 130, score: 9, label: "권장범위 상단" },
    { test: (v) => v < 160, score: 6, label: "상승" },
    { test: (v) => v < 190, score: 3, label: "높음" },
    { test: (v) => v >= 190, score: 0, label: "의학적 확인 우선" },
  ]);
}

function assessNonHdlReference(totalChol, hdl) {
  if (!present(totalChol) || !present(hdl)) return { value: null, label: "계산 대기", missing: true };
  const value = totalChol - hdl;
  const label = value < 130
    ? "양호"
    : value < 160
      ? "권장범위 상단"
      : value < 190
        ? "상승"
        : value < 220
          ? "높음"
          : "상당히 높음";
  return { value, label };
}

function scoreLiverEnzyme(value, uln, max) {
  if (!present(value)) return missing(max);
  if (!present(uln) || uln <= 0) return hold(max, "기준상한 확인 필요");
  const ratio = value / uln;
  const result = scoreByRanges(ratio, max, [
    { test: (v) => v <= 0.75, score: max, label: "양호" },
    { test: (v) => v <= 1, score: max * 0.8, label: "정상범위 상단" },
    { test: (v) => v <= 1.5, score: max * 0.6, label: "경도 상승" },
    { test: (v) => v <= 2, score: max * 0.4, label: "상승" },
    { test: (v) => v <= 3, score: max * 0.2, label: "추가 평가" },
    { test: (v) => v > 3, score: 0, label: "원인 확인 우선" },
  ]);
  return { ...result, ratio };
}

function assessLiverReference(value, uln) {
  if (!present(value)) return { ratio: null, label: "미측정", missing: true };
  const ratio = value / uln;
  const label = ratio <= 1 ? "정상범위 이내" : ratio <= 1.5 ? "경도 상승" : ratio <= 3 ? "상승" : "원인 확인 우선";
  return { ratio, label };
}

function scoreBilirubinAdjustment(value) {
  if (!present(value)) return { score: 0, max: 0, penalty: 0, ratio: null, label: "미측정", missing: true };
  const ratio = value / DEFAULT_ULN.tbil;
  const penalty = value <= 1.2 ? 0 : value <= 1.5 ? 1 : value <= 2 ? 2 : value <= 3 ? 3 : 5;
  const label = penalty === 0
    ? "정상범위 이내 · 감점 없음"
    : value <= 1.5
      ? "경미한 상승 · 1점 감점"
      : value <= 2
        ? "상승 · 2점 감점"
        : value <= 3
          ? "뚜렷한 상승 · 3점 감점"
          : "원인 확인 우선 · 5점 감점";
  return { score: -penalty, max: 0, penalty, ratio, label };
}

function getUln(data, key) {
  if (key === "ggt") {
    if (data.sex === "남성") return 63;
    if (data.sex === "여성") return 35;
  }
  return DEFAULT_ULN[key];
}

function scoreHsCrp(value) {
  if (!present(value)) return missing(10);
  if (value > 10) return hold(10, "급성 염증원 확인 후 재검");
  return scoreByRanges(value, 10, [
    { test: (v) => v <= 0.2, score: 10, label: "최적 수준" },
    { test: (v) => v <= 0.3, score: 9, label: "낮은 수준" },
    { test: (v) => v <= 0.4, score: 8, label: "낮은 수준" },
    { test: (v) => v <= 0.5, score: 7, label: "저강도 염증 관찰" },
    { test: (v) => v <= 0.6, score: 6, label: "저강도 염증 관리" },
    { test: (v) => v <= 0.8, score: 5, label: "저강도 염증 관리" },
    { test: (v) => v <= 1, score: 4, label: "상승 관찰" },
    { test: (v) => v <= 2, score: 2, label: "원인 및 지속 여부 확인" },
    { test: (v) => v <= 3, score: 1, label: "뚜렷한 상승" },
    { test: (v) => v <= 10, score: 0, label: "재검 및 원인 확인" },
  ]);
}

function calculateGraLymRatio(data) {
  if (present(data.graPercent) && present(data.lymPercent)) {
    const gra = Number(data.graPercent);
    const lym = Number(data.lymPercent);
    if (Number.isFinite(gra) && Number.isFinite(lym) && gra >= 0 && lym > 0) {
      return { value: gra / lym, source: "percent", sourceLabel: "%", reason: "" };
    }
  }
  const hasZeroLym = present(data.lymPercent) && Number(data.lymPercent) === 0;
  return { value: null, source: "", sourceLabel: "", reason: hasZeroLym ? "lym-zero" : "missing" };
}

function assessGraLymRatio(value) {
  if (!present(value)) return { score: null, max: 0, label: "미측정", missing: true };
  const label = value < 1.8
    ? "참고범위"
    : value < 2.5
      ? "경계 참고"
      : value < 3.5
        ? "상승 참고"
        : "높은 상승 참고";
  return { score: null, max: 0, label, missing: false };
}

function graLymPatientComment(result) {
  if (!result || result.missing) return "";
  return {
    "참고범위": "",
    "경계 참고": "백혈구 감별 비율이 경계 수준입니다. 점수에는 반영하지 않고 다른 염증 지표와 함께 참고합니다.",
    "상승 참고": "백혈구 감별 비율이 증가되어 있습니다. 감염, 알레르기, 스트레스, 과로, 수면 부족 등의 영향을 받을 수 있어 다른 검사와 함께 확인합니다.",
    "높은 상승 참고": "백혈구 감별 비율이 높습니다. 급성 감염, 알레르기, 스트레스 등 일시적인 원인도 영향을 줄 수 있으므로 현재 상태를 함께 확인해야 합니다.",
  }[result.label] || "";
}

function assessInflammationSymptoms(data) {
  const answers = INFLAMMATION_SYMPTOM_FIELDS.map(([id, label]) => ({
    id,
    label,
    value: present(data[id]) ? Number(data[id]) : null,
  }));
  const answered = answers.filter((item) => Number.isInteger(item.value) && item.value >= 0 && item.value <= 5);
  const score = answered.reduce((sum, item) => sum + item.value, 0);
  const complete = answered.length === answers.length;
  const burden = !answered.length
    ? "평가 대기"
    : !complete
      ? "문진 미완료"
      : score <= 10
        ? "만성염증 증상 양호"
        : score <= 18
          ? "만성염증 증상 있음"
          : score <= 30
            ? "만성염증 증상 많음"
            : "만성염증 증상 심각";
  return {
    answers,
    answeredCount: answered.length,
    score,
    max: 40,
    complete,
    burden,
    high: complete && score > 10,
    keyAreas: answered.filter((item) => item.value >= 3).map((item) => item.label),
  };
}

function scoreInflammationSymptoms(symptoms) {
  if (!symptoms.complete) return missing(10);
  const score = Math.max(0, Math.min(10, Math.round((symptoms.max - symptoms.score) / 4)));
  const label = score >= 8
    ? "만성염증 증상 양호"
    : score >= 6
      ? "만성염증 증상 있음"
      : score >= 3
        ? "만성염증 증상 많음"
        : "만성염증 증상 심각";
  return scored(score, 10, label);
}

function assessInflammation(data, hsCrp) {
  const graLymRatio = calculateGraLymRatio(data).value;
  const symptoms = assessInflammationSymptoms(data);
  const symptomHealth = scoreInflammationSymptoms(symptoms);
  const holdResult = present(data.hsCrp) && data.hsCrp > 10;
  const objectiveElevated = !holdResult && present(data.hsCrp) && data.hsCrp >= 0.5;
  const borderline = !objectiveElevated && !holdResult && present(data.hsCrp) && data.hsCrp >= 0.4 && data.hsCrp < 0.5;
  let subtype = "해당 없음";
  if (holdResult) subtype = "판정 보류";
  else if (objectiveElevated && symptoms.high) subtype = "만성염증형(종합형)";
  else if (objectiveElevated) subtype = "만성염증형(수치형)";
  else if (symptoms.high) subtype = "만성염증형(증상형)";
  const numericScore = [hsCrp, symptomHealth]
    .filter((result) => result && !result.missing && !result.hold)
    .reduce((sum, result) => sum + result.score, 0);
  return { graLymRatio, symptoms, symptomHealth, hold: holdResult, objectiveElevated, borderline, subtype, score: numericScore };
}

function scoreVisceralFat(value) {
  return scoreByRanges(value, 6, [
    { test: (v) => v >= 1 && v <= 5, score: 6, label: "양호" },
    { test: (v) => v <= 9, score: 5, label: "권장범위 내, 증가 경향 관찰" },
    { test: (v) => v <= 12, score: 3, label: "증가" },
    { test: (v) => v <= 15, score: 1, label: "높음" },
    { test: (v) => v >= 16, score: 0, label: "매우 높음" },
  ]);
}

function scoreBloodPressure(sbp, dbp) {
  if (!present(sbp) || !present(dbp)) return missing(6);
  if (sbp < 120 && dbp < 80) return scored(6, 6, "정상혈압");
  if (sbp <= 129 && dbp < 80) return scored(5, 6, "주의혈압");
  if ((sbp >= 130 && sbp <= 139) || (dbp >= 80 && dbp <= 89)) return scored(3, 6, "고혈압 전단계");
  if ((sbp >= 140 && sbp <= 159) || (dbp >= 90 && dbp <= 99)) return scored(1, 6, "고혈압 범위");
  return scored(0, 6, "매우 높은 범위");
}

function assessWaist(sex, waist) {
  if (!present(waist)) return missing(0);
  if (sex === "남성") return { score: null, max: 0, label: waist >= 90 ? "복부비만 기준 이상" : "기준 미만" };
  if (sex === "여성") return { score: null, max: 0, label: waist >= 85 ? "복부비만 기준 이상" : "기준 미만" };
  return { score: null, max: 0, label: "성별 기준 확인 필요" };
}

function assessRestingHr(value) {
  if (!present(value)) return missing(0);
  if (value < 50) return { score: null, max: 0, label: "낮은 심박수 확인" };
  if (value < 60) return { score: null, max: 0, label: "낮은 범위" };
  if (value <= 89) return { score: null, max: 0, label: "참고범위" };
  if (value <= 99) return { score: null, max: 0, label: "상승" };
  return { score: null, max: 0, label: "높은 범위" };
}

function normalizeGrade(grade) {
  return String(grade || "").replace(/\s+/g, "");
}

function gradeAtLeastNormal(grade) {
  return ["보통", "높음", "매우높음"].includes(normalizeGrade(grade));
}

function gradeLowOrVeryLow(grade) {
  return ["낮음", "매우낮음"].includes(normalizeGrade(grade));
}

function gradeHighOrVeryHigh(grade) {
  return ["높음", "매우높음"].includes(normalizeGrade(grade));
}

function scoreHrvIndex(grade, invalid) {
  if (invalid) return hold(5, "판정 보류");
  const map = {
    매우높음: [5, "매우 양호"],
    높음: [5, "양호"],
    보통: [4, "보통"],
    낮음: [2, "낮음"],
    매우낮음: [0, "매우 낮음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreAnsActivity(grade, invalid) {
  if (invalid) return hold(5, "판정 보류");
  const map = {
    매우높음: [5, "매우 양호"],
    높음: [5, "양호"],
    보통: [4, "보통"],
    낮음: [2, "낮음"],
    매우낮음: [0, "매우 낮음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreStress(grade, invalid) {
  if (invalid) return hold(5, "판정 보류");
  const map = {
    매우낮음: [5, "매우 낮음"],
    낮음: [5, "낮음"],
    보통: [4, "보통"],
    높음: [2, "높음"],
    매우높음: [0, "매우 높음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreSnsPnsBalance(snsPercent, invalid) {
  if (invalid) return hold(5, "판정 보류");
  if (!present(snsPercent)) return missing(5);
  const difference = Math.abs(snsPercent - 50);
  if (difference <= 4) return scored(5, 5, "균형 양호");
  if (difference <= 6) return scored(4, 5, "가벼운 치우침");
  if (difference <= 10) return scored(2, 5, "균형 관리 필요");
  return scored(0, 5, "뚜렷한 치우침");
}

function autonomicGrade(score) {
  if (score >= 18) return "매우 양호";
  if (score >= 16) return "양호";
  if (score >= 12) return "관리 필요";
  if (score >= 8) return "저하";
  return "뚜렷한 저하";
}

function autonomicPatientComment(score) {
  if (score >= 18) return "자율신경 균형이 양호합니다.";
  if (score >= 16) return "자율신경의 전체적인 활동과 회복력이 비교적 안정적입니다.";
  if (score >= 12) return "스트레스와 회복 상태에 대한 관리가 필요합니다.";
  if (score >= 8) return "검사상 자율신경 균형이 뚜렷하게 치우쳐 있습니다.";
  return "수면, 스트레스, 피로 상태를 함께 관리할 필요가 있습니다.";
}

function autonomicPatternTags(data) {
  if (!present(data.snsPercent)) return [];
  const tags = [];
  if (data.snsPercent >= 48 && data.snsPercent <= 52 && gradeAtLeastNormal(data.hrvIndexGrade) && gradeAtLeastNormal(data.ansActivity)) {
    tags.push({ label: "균형 양호형", text: "교감신경과 부교감신경의 균형이 비교적 안정적입니다." });
  }
  if (data.snsPercent >= 53) {
    tags.push({ label: "교감신경 우세형", text: "검사 당시 교감신경 쪽으로 균형이 치우쳐 있습니다. 스트레스, 긴장, 통증, 수면 부족 등의 영향을 함께 확인해야 합니다." });
  }
  if (data.snsPercent <= 47) {
    tags.push({ label: "부교감신경 우세형", text: "검사 당시 부교감신경 쪽으로 균형이 치우쳐 있습니다. 전체 자율신경 활성도와 피로 상태를 함께 확인해야 합니다." });
  }
  if (gradeLowOrVeryLow(data.ansActivity)) {
    tags.push({ label: "자율신경 활동 저하형", text: "교감신경과 부교감신경의 전체적인 활동 수준이 낮게 측정되었습니다. 수면, 영양, 활동량 및 만성 피로 상태를 함께 살펴볼 필요가 있습니다." });
  }
  if (gradeHighOrVeryHigh(data.stressGrade)) {
    tags.push({ label: "스트레스 과부하형", text: "검사 당시 신체적 스트레스가 높게 측정되었습니다. 수면 부족, 통증, 긴장, 카페인, 직전 운동 등의 영향을 함께 확인해야 합니다." });
  }
  return tags;
}

function autonomicCarePriorities(data) {
  const items = [];
  const add = (text) => {
    if (!items.includes(text)) items.push(text);
  };
  if (gradeHighOrVeryHigh(data.stressGrade)) {
    add("스트레스와 긴장 완화");
    add("호흡훈련과 스트레칭");
    add("카페인과 음주 조절");
  }
  if (data.snsPercent >= 53) {
    add("규칙적인 수면시간 유지");
    add("과로와 고강도 운동 조절");
    add("걷기와 가벼운 유산소운동");
  }
  if (data.snsPercent <= 47 || gradeLowOrVeryLow(data.ansActivity)) {
    add("수면의 질 개선");
    add("걷기와 가벼운 유산소운동");
    add("통증 및 피로 원인 관리");
  }
  if (!items.length) {
    add("규칙적인 수면시간 유지");
    add("걷기와 가벼운 유산소운동");
  }
  return items.slice(0, 4);
}

function hasHrvLimit(data) {
  return false;
}

function makeAxis(key, label, details, comment, unavailable, forcedHold = false) {
  const availableDetails = details.filter((detail) => detail.result && !detail.result.missing && !detail.reference);
  const hasHold = forcedHold || details.some((detail) => detail.result?.hold);
  const max = availableDetails.reduce((sum, detail) => sum + detail.result.max, 0);
  const rawScore = availableDetails.reduce((sum, detail) => sum + (detail.result.score ?? 0), 0);
  const score = Math.max(0, Math.min(max, rawScore));
  let status = "complete";
  if (unavailable) status = "unavailable";
  else if (hasHold) status = "hold";
  else if (max < AXIS_MAX) status = "partial";
  return { key, label, details, score, max, status, comment };
}

function axisDisplay(axis) {
  if (axis.status === "unavailable") return "판정 불가";
  if (axis.status === "hold") return "판정 보류";
  const suffix = axis.status === "partial" ? " · 부분 판정" : "";
  return `${axis.score}/${axis.max}${suffix}`;
}

function hasCriticalResult(data, results) {
  const liverEnzymeAbnormal = [results.parts.alt, results.parts.ast, results.parts.ggt, results.parts.alp]
    .some((result) => result?.ratio > 1);
  const liverEnzymeMarked = [results.parts.alt, results.parts.ast, results.parts.ggt]
    .some((result) => result?.ratio > 1.5);
  return Boolean(
    data.hba1c >= 6.5 ||
    data.tg >= 500 ||
    data.ldl >= 190 ||
    data.hsCrp > 10 ||
    data.sbp >= 180 ||
    data.dbp >= 120 ||
    results.parts.alt?.ratio >= 3 ||
    results.parts.ast?.ratio >= 3 ||
    data.tbil > 3 ||
    (data.tbil > 2 && liverEnzymeAbnormal && liverEnzymeMarked)
  );
}

function getGrade(total, max, axes = [], critical = false) {
  if (!max) return { label: "계산 대기", text: "입력된 핵심 검사값이 부족합니다." };
  if (critical) return { label: "의학적 확인 우선", text: "중요 검사 이상을 대사건강점수보다 먼저 확인해야 합니다.", short: "중요 검사결과의 확인이 우선" };
  if (max < 100) return { label: "부분 판정", text: "일부 축이 미측정이므로 측정 완료 점수로 해석합니다." };
  const scores = axes.filter((axis) => axis.max === AXIS_MAX && axis.status === "complete").map((axis) => axis.score);
  const lowest = scores.length ? Math.min(...scores) : 0;
  if (total >= 85 && lowest >= 15) return { label: "양호", text: "전반적인 대사건강 상태가 양호합니다.", short: "현재 상태 유지와 정기 점검" };
  if (total >= 70 && lowest >= 10) return { label: "관리필요 1단계", text: "생활습관 점검과 추적관찰이 필요합니다.", short: "생활습관 점검과 추적관찰 필요" };
  if (total >= 55 && lowest >= 5) return { label: "관리필요 2단계", text: "여러 대사영역의 적극적인 관리가 필요합니다.", short: "적극적인 대사관리 필요" };
  return { label: "관리필요 3단계", text: "원인 확인과 집중적인 관리가 필요합니다.", short: "원인 확인과 집중적인 관리 필요" };
}

function applyPhysicalGradeOverride(grade, data, max) {
  if (max !== 100 || !["양호", "관리필요 1단계"].includes(grade.label)) return grade;
  const physical = assessPhysicalFunction(data);
  if (!physical.activated) return grade;
  return {
    label: `${grade.label === "양호" ? "대사수치 양호" : "대사수치 관리필요 1단계"} · 신체기능 관리필요`,
    text: `대사건강 종합점수는 ${grade.label} 범위이며 신체기능상태 관리가 필요한 상태입니다.`,
    short: "신체기능상태 관리가 필요한 상태",
    physicalOverride: true,
  };
}

function makeResults(data) {
  const hrvLimited = hasHrvLimit(data);
  const hba1c = scoreHba1c(data.hba1c);
  const tgHdl = scoreTgHdl(data.tg, data.hdl);
  const tg = scoreTg(data.tg);
  const ldl = scoreLdl(data.ldl);
  const nonHdl = assessNonHdlReference(data.totalChol, data.hdl);
  const alt = scoreLiverEnzyme(data.alt, getUln(data, "alt"), 10);
  const ast = scoreLiverEnzyme(data.ast, getUln(data, "ast"), 5);
  const ggt = scoreLiverEnzyme(data.ggt, getUln(data, "ggt"), 5);
  const tbil = scoreBilirubinAdjustment(data.tbil);
  const alp = assessLiverReference(data.alp, getUln(data, "alp"));
  const waist = assessWaist(data.sex, data.waist);
  const typeA = assessTypeA(data);
  const hsCrp = scoreHsCrp(data.hsCrp);
  const graLymCalculation = calculateGraLymRatio(data);
  const graLym = assessGraLymRatio(graLymCalculation.value);
  const inflammation = assessInflammation(data, hsCrp);
  const visceralFat = scoreVisceralFat(data.visceralFat);
  const restingHrValue = present(data.restingHr) ? data.restingHr : data.heartRate;
  const restingHr = assessRestingHr(restingHrValue);
  const bloodPressure = scoreBloodPressure(data.sbp, data.dbp);
  const snsPercent = present(data.snsPercent) ? data.snsPercent : data.snsPnsRatio;
  const pnsPercent = present(snsPercent) ? 100 - snsPercent : null;
  const hrvIndex = scoreHrvIndex(data.hrvIndexGrade, hrvLimited);
  const ansActivity = scoreAnsActivity(data.ansActivity, hrvLimited);
  const stress = scoreStress(data.stressGrade, hrvLimited);
  const snsInvalid = present(snsPercent) && (snsPercent < 0 || snsPercent > 100);
  const snsPnsBalance = scoreSnsPnsBalance(snsPercent, hrvLimited || snsInvalid);
  const autonomicMissing = !present(data.hrvIndexGrade) || !present(data.ansActivity) || !present(data.stressGrade) || !present(snsPercent) || snsInvalid;
  const autonomicPatterns = autonomicPatternTags({ ...data, snsPercent });

  const axes = [
    makeAxis(
      "glucose",
      "당대사",
      [
        { label: "HbA1c", result: hba1c, value: present(data.hba1c) ? `${data.hba1c}%` : null },
        { label: "TG/HDL-C", result: tgHdl, value: present(tgHdl.ratio) ? tgHdl.ratio.toFixed(2) : null },
      ],
      "혈당 조절 상태와 인슐린 저항 관련 지표를 함께 평가합니다.",
      !present(data.hba1c) && !(present(data.tg) && present(data.hdl)),
    ),
    makeAxis(
      "lipid",
      "지질대사",
      [
        { label: "TG", result: tg, value: present(data.tg) ? `${data.tg} mg/dL` : null },
        { label: "LDL-C", result: ldl, value: present(data.ldl) ? `${data.ldl} mg/dL` : null },
        { label: "non-HDL-C", result: nonHdl, value: present(nonHdl.value) ? `${nonHdl.value} mg/dL` : null, reference: true },
      ],
      "중성지방과 LDL-C를 점수화하고 non-HDL-C는 참고지표로 함께 살펴봅니다.",
      !present(data.tg) && !present(data.ldl),
    ),
    makeAxis(
      "liver",
      "간대사",
      [
        { label: "ALT", result: alt, value: present(data.alt) ? `${data.alt} U/L` : null },
        { label: "AST", result: ast, value: present(data.ast) ? `${data.ast} U/L` : null },
        { label: "GGT", result: ggt, value: present(data.ggt) ? `${data.ggt} U/L` : null },
        { label: "TBIL", result: tbil, value: present(data.tbil) ? `${data.tbil} mg/dL` : null, adjustment: true },
        { label: "ALP", result: alp, value: present(data.alp) ? `${data.alp} U/L` : null, reference: true },
      ],
      "ALT, AST, GGT로 간대사 상태를 평가하고 총빌리루빈 상승은 간대사 점수에서 감점합니다.",
      !present(data.alt) && !present(data.ast) && !present(data.ggt),
    ),
    makeAxis(
      "inflammation",
      "만성염증",
      [
        { label: "hs-CRP", result: hsCrp, value: present(data.hsCrp) ? `${data.hsCrp} mg/L` : null },
        { label: "증상 문진", result: inflammation.symptomHealth, value: inflammation.symptoms.complete ? `${inflammation.symptoms.score}/${inflammation.symptoms.max}` : null },
        { label: "GRA/LYM ratio", result: graLym, value: present(graLymCalculation.value) ? graLymCalculation.value.toFixed(2) : null, reference: true },
      ],
      "hs-CRP와 최근 4주간의 증상 문진을 각각 10점으로 평가합니다.",
      !present(data.hsCrp) && !inflammation.symptoms.complete,
      hsCrp.hold,
    ),
    makeAxis(
      "autonomic",
      "자율신경(스트레스)",
      [
        { label: "HRV-Index", result: hrvIndex, value: data.hrvIndexGrade || null },
        { label: "ANS Activity", result: ansActivity, value: data.ansActivity || null },
        { label: "Stress", result: stress, value: data.stressGrade || null },
        { label: "SNS:PNS 균형", result: snsPnsBalance, value: present(snsPercent) ? `SNS ${formatDecimal(snsPercent, 1)}% : PNS ${formatDecimal(pnsPercent, 1)}%` : null },
        { label: "안정 시 심박수", result: restingHr, value: present(restingHrValue) ? `${restingHrValue} bpm` : null, reference: true },
        { label: "혈압", result: bloodPressure, value: present(data.sbp) || present(data.dbp) ? `${data.sbp || "-"}/${data.dbp || "-"} mmHg` : null, reference: true },
      ],
      "옴니핏 자율신경 측정 결과를 HRV-Index, ANS Activity, Stress, SNS:PNS 균형으로 평가합니다.",
      autonomicMissing,
      hrvLimited,
    ),
  ];

  const measuredAxes = axes.filter((axis) => axis.status !== "unavailable" && axis.status !== "hold");
  const total = measuredAxes.reduce((sum, axis) => sum + axis.score, 0);
  const max = measuredAxes.reduce((sum, axis) => sum + axis.max, 0);

  const autonomicAxis = axes.find((axis) => axis.key === "autonomic");
  if (autonomicAxis) {
    autonomicAxis.autonomic = {
      grade: autonomicAxis.status === "complete" || autonomicAxis.status === "partial" ? autonomicGrade(autonomicAxis.score) : "판정 불가",
      comment: autonomicPatientComment(autonomicAxis.score),
      patterns: autonomicPatterns,
      priorities: autonomicCarePriorities({ ...data, snsPercent }),
      snsPercent,
      pnsPercent,
      notice: "본 점수는 옴니핏 자율신경 측정 결과를 공덕경희한의원의 대사건강 관리 목적으로 환산한 자체 평가점수입니다. 검사 당시의 긴장, 통증, 수면 상태, 카페인, 흡연, 음주, 운동 및 측정 환경에 따라 결과가 달라질 수 있습니다. 자율신경계 질환을 진단하는 검사는 아니며, 동일한 조건에서의 치료 전후 변화를 중심으로 평가합니다.",
    };
  }

  const inflammationAxis = axes.find((axis) => axis.key === "inflammation");
  if (inflammationAxis) inflammationAxis.inflammation = inflammation;

  return { axes, total, max, parts: { hba1c, tgHdl, tg, ldl, nonHdl, alt, ggt, tbil, ast, alp, waist, typeA, hsCrp, graLym, inflammation, visceralFat, restingHr, bloodPressure, hrvIndex, ansActivity, stress, snsPnsBalance }, hrvLimited };
}

function validateInputs(data) {
  const errors = [];
  const warnings = [];
  const addError = (fieldId, text) => errors.push({ fieldId, text });
  const addWarning = (fieldId, text) => warnings.push({ fieldId, text });

  for (const id of numberFields) {
    if (id === "snsPercent") continue;
    if (present(data[id]) && data[id] < 0) addError(id, "음수 검사값은 입력할 수 없습니다.");
  }
  if (present(data.hdl) && data.hdl <= 0) addError("hdl", "HDL-C가 0 이하이면 TG/HDL-C를 계산할 수 없습니다.");
  if (present(data.snsPercent) && (data.snsPercent < 0 || data.snsPercent > 100)) addError("snsPercent", "SNS 비율은 0~100 사이의 숫자로 입력해주세요.");
  if (present(data.totalChol) && present(data.hdl) && data.totalChol < data.hdl) addError("totalChol", "총콜레스테롤이 HDL-C보다 낮습니다.");
  if (present(data.sbp) && present(data.dbp) && data.dbp > data.sbp) addError("dbp", "이완기혈압이 수축기혈압보다 높습니다.");
  if (present(data.smi) && data.smi <= 0) addError("smi", "SMI는 0보다 큰 kg/m² 값을 입력해야 합니다.");
  if (present(data.currentWeight) && data.currentWeight <= 0) addError("currentWeight", "현재 체중은 0보다 커야 합니다.");
  if (present(data.previousWeight) && data.previousWeight <= 0) addError("previousWeight", "평소 체중은 0보다 커야 합니다.");
  for (const id of ["rightGripStrength", "leftGripStrength"]) {
    if (present(data[id]) && data[id] <= 0) addError(id, "악력은 0보다 커야 합니다.");
  }
  if (present(data.height) && (data.height < 100 || data.height > 220)) addError("height", "키는 100~220cm 범위로 입력해 주세요.");
  if (present(data.waist) && (data.waist < 40 || data.waist > 200)) addError("waist", "허리둘레는 40~200cm 범위로 입력해 주세요.");
  if (present(data.visceralFat) && (data.visceralFat < 1 || data.visceralFat > 20)) addError("visceralFat", "내장지방레벨은 1~20 범위로 입력해 주세요.");
  if (present(data.visceralFat) && !Number.isInteger(data.visceralFat)) addError("visceralFat", "내장지방레벨은 정수로 입력해 주세요.");
  if (present(data.waist) && !["남성", "여성"].includes(data.sex)) addError("sex", "허리둘레 판정을 위해 성별을 선택해 주세요.");
  for (const id of ["altUln", "ggtUln", "tbilUln", "astUln", "alpUln"]) {
    if (present(data[id]) && data[id] <= 0) addError(id, "ULN은 0보다 커야 합니다.");
  }
  if (present(data.hba1c) && (data.hba1c < 3 || data.hba1c > 20)) addWarning("hba1c", "HbA1c 단위를 확인하세요.");
  if (present(data.tg) && data.tg > 2000) addWarning("tg", "TG 값이 매우 큽니다. 단위를 확인하세요.");
  if (present(data.ldl) && present(data.totalChol) && present(data.hdl)) {
    const nonHdl = data.totalChol - data.hdl;
    if (data.ldl > nonHdl + 5) addWarning("ldl", "LDL-C가 non-HDL-C보다 높습니다. 입력값 또는 단위를 확인해 주세요.");
  }
  if (present(data.smi) && (data.smi < 2 || data.smi > 15)) addWarning("smi", "SMI 입력값과 단위를 확인해 주세요. 인바디 결과지의 kg/m² 값을 입력해야 합니다.");
  for (const id of ["graPercent", "lymPercent"]) {
    if (present(data[id]) && data[id] > 100) addError(id, "백분율은 0~100 범위로 입력해 주세요.");
  }
  for (const [id] of INFLAMMATION_SYMPTOM_FIELDS) {
    if (present(data[id]) && (!Number.isInteger(data[id]) || data[id] < 0 || data[id] > 5)) addError(id, "증상 정도는 0~5 중에서 선택해 주세요.");
  }
  for (const [id] of PHYSICAL_FUNCTION_SCALE_FIELDS) {
    if (present(data[id]) && (!Number.isInteger(data[id]) || data[id] < 0 || data[id] > 5)) addError(id, "신체기능 상태는 0~5 중에서 선택해 주세요.");
  }
  if (present(data.tbil) && data.tbil > 20) addWarning("tbil", "TBIL 값이 매우 큽니다. 단위를 확인하세요.");
  if (present(data.sbp) && (data.sbp < 60 || data.sbp > 260)) addWarning("sbp", "수축기혈압 단위를 확인하세요.");
  return { errors, warnings };
}

function makeRiskFlags(data, results, validation) {
  const flags = [];
  const add = (type, title, value, description) => flags.push({ type, title, value, description, text: [title, value, description].filter(Boolean).join(" ") });
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ast?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);

  if (validation.errors.length > 0) add("warning", "입력 오류", "", "입력 오류가 있어 리포트 생성을 제한했습니다.");
  if (data.hba1c >= 6.5) add("warning", "HbA1c", `${data.hba1c}%`, "당뇨병 진단범위에 해당해 별도 확인이 필요합니다.");
  if (data.tg >= 500) {
    add("warning", "중성지방", `${data.tg} mg/dL`, "500 mg/dL 이상으로 중증 고중성지방혈증의 원인과 췌장염 위험을 별도로 평가해야 합니다.");
  }
  if (data.ldl >= 190) add("warning", "LDL-C", `${data.ldl} mg/dL`, "중증 고콜레스테롤혈증 범위로 별도의 심혈관 위험 평가가 필요합니다.");
  else if (data.ldl >= 160) add("caution", "LDL-C", `${data.ldl} mg/dL`, "LDL-C 상승이 확인되어 전체 심혈관 위험과 함께 평가할 필요가 있습니다.");
  if ((present(data.totalChol) && data.totalChol < 120) || (present(data.ldl) && data.ldl < 50)) {
    const lowLipidValues = [
      present(data.totalChol) && data.totalChol < 120 ? `총콜레스테롤 ${data.totalChol} mg/dL` : "",
      present(data.ldl) && data.ldl < 50 ? `LDL-C ${data.ldl} mg/dL` : "",
    ].filter(Boolean).join(", ");
    add("caution", "낮은 지질수치", lowLipidValues, "복약, 갑상선 기능, 흡수 및 영양 상태 등과 함께 원인을 확인할 필요가 있습니다. 이 항목은 대사축 점수를 감점하지 않습니다.");
  }
  if ((present(data.sbp) && data.sbp < 90) || (present(data.dbp) && data.dbp < 60)) {
    add("caution", "낮은 혈압", `${present(data.sbp) ? data.sbp : "-"}/${present(data.dbp) ? data.dbp : "-"} mmHg`, "어지럼, 실신, 기립 시 불편감이 동반되는지 확인하고 반복 측정하는 것이 좋습니다. 이 항목은 대사축 점수를 감점하지 않습니다.");
  }
  if (results.parts.nonHdl?.value >= 220) add("caution", "non-HDL-C", `${results.parts.nonHdl.value} mg/dL`, "죽상경화성 지단백 수치가 상당히 높은 범위입니다.");
  if (results.parts.alt?.ratio >= 3 || results.parts.ast?.ratio >= 3) {
    const liverValues = [
      results.parts.alt?.ratio >= 3 && present(data.alt) ? `ALT ${data.alt} U/L` : "",
      results.parts.ast?.ratio >= 3 && present(data.ast) ? `AST ${data.ast} U/L` : "",
    ].filter(Boolean).join(", ");
    add("warning", "간수치", liverValues, "기준 범위를 크게 초과하여 간 관련 원인 확인이 우선입니다.");
  }
  if (results.parts.tbil?.ratio > 1 && liverAbnormal) {
    add("warning", "총빌리루빈", `${data.tbil} mg/dL`, "간수치 이상이 동반되어 직접·간접 빌리루빈 분획과 원인 확인이 필요합니다.");
  } else if (results.parts.tbil?.ratio > 1) {
    add("caution", "총빌리루빈", `${data.tbil} mg/dL`, "단독 상승은 직접·간접 빌리루빈 분획과 재검 결과를 함께 확인해야 합니다.");
  }
  if (data.hsCrp > 10) add("warning", "hs-CRP", `${data.hsCrp} mg/L`, "10 mg/L를 초과해 급성 염증 가능성이 있습니다. 만성염증축 판정을 보류하고 급성 원인 확인 후 재검을 권고합니다.");
  const graLymRatio = results.parts.inflammation?.graLymRatio;
  if (present(graLymRatio) && graLymRatio >= 3.5) add("caution", "GRA/LYM 비율", graLymRatio.toFixed(2), "백혈구 감별 비율이 높습니다. 급성 감염, 알레르기, 스트레스 등 일시적인 원인도 영향을 줄 수 있으므로 현재 상태를 함께 확인해야 합니다.");
  if (data.sbp >= 180 || data.dbp >= 120) add("warning", "혈압", `${data.sbp || "-"}/${data.dbp || "-"} mmHg`, "안정 후 즉시 다시 측정하고 진료 상담이 필요합니다. 흉통, 호흡곤란, 신경학적 증상이 있으면 응급평가가 우선입니다.");
  if (results.hrvLimited) add("warning", "HRV-Index", "판독 제한", "HRV 판독 제한 조건이 있어 자율신경(스트레스) 축 판정을 보류합니다.");
  return flags;
}

function makeClinicianReview(data, results, validation) {
  const notices = [];
  const add = (priority, title, value, message, checks) => notices.push({ priority, title, value, message, checks });
  const part = results.parts;
  const altRatio = part.alt?.ratio;
  const astRatio = part.ast?.ratio;
  const ggtRatio = part.ggt?.ratio;
  const alpRatio = part.alp?.ratio;
  const bilirubinHigh = present(data.tbil) && data.tbil > DEFAULT_ULN.tbil;
  const liverEnzymeHigh = [altRatio, astRatio, ggtRatio, alpRatio].some((ratio) => present(ratio) && ratio > 1);

  if ((present(data.sbp) && data.sbp >= 180) || (present(data.dbp) && data.dbp >= 120)) {
    add(
      "urgent",
      "매우 높은 혈압",
      `${present(data.sbp) ? data.sbp : "-"}/${present(data.dbp) ? data.dbp : "-"} mmHg`,
      "안정 후 다시 측정하고 흉통, 호흡곤란, 등 통증, 마비·위약, 시야 변화, 말하기 어려움 또는 의식 변화를 확인하세요. 증상이 있으면 즉시 응급평가가 필요합니다.",
      "함께 확인: 반복 혈압, 증상, 복용약·복약 누락, 심전도 및 표적장기 손상 여부",
    );
  }
  if (present(data.tg) && data.tg >= 1000) {
    add(
      "urgent",
      "중성지방 매우 높음",
      `${data.tg} mg/dL`,
      "급성 췌장염 위험이 커지는 범위입니다. 심한 지속성 상복부 통증이나 구토가 있으면 즉시 응급평가하고, 증상이 없어도 당일 의학적 평가를 고려하세요.",
      "함께 확인: 복통·구토, 혈당, 음주, 갑상선기능, 신장·간기능, 복용약, 필요 시 lipase",
    );
  }

  if (present(data.hba1c) && data.hba1c >= 6.5) {
    add(
      "prompt",
      "HbA1c 당뇨병 진단범위",
      `${data.hba1c}%`,
      "전형적 고혈당 증상이 없다면 반복 HbA1c 또는 혈장혈당 검사로 확진이 필요합니다.",
      "함께 확인: 다뇨·다갈·체중감소, 공복혈당 또는 무작위혈당, CBC·빈혈·적혈구 수명에 영향을 주는 상태",
    );
  }
  if (present(data.tg) && data.tg >= 500 && data.tg < 1000) {
    add(
      "prompt",
      "중성지방 중증 상승",
      `${data.tg} mg/dL`,
      "췌장염 위험과 이차 원인을 별도로 평가해야 합니다. 복통·구토가 동반되면 당일 진료 우선도를 높이세요.",
      "함께 확인: 복통·구토, 혈당, 음주, 갑상선기능, 신장·간기능, 복용약",
    );
  }
  if (present(data.ldl) && data.ldl >= 190) {
    add(
      "prompt",
      "LDL-C 중증 상승",
      `${data.ldl} mg/dL`,
      "총점과 관계없이 가족성 고콜레스테롤혈증과 이차 원인을 포함한 심혈관 위험 평가가 필요합니다.",
      "함께 확인: 가족력·조기 심혈관질환, 갑상선기능, 신증후군·신장기능, 간담도질환, 복용약",
    );
  }
  if ((present(altRatio) && altRatio >= 3) || (present(astRatio) && astRatio >= 3)) {
    const values = [
      present(altRatio) && altRatio >= 3 ? `ALT ${data.alt} U/L` : "",
      present(astRatio) && astRatio >= 3 ? `AST ${data.ast} U/L` : "",
    ].filter(Boolean).join(" · ");
    add(
      "prompt",
      "간세포 손상 지표 뚜렷한 상승",
      values,
      "점수 해석보다 원인 평가가 우선입니다. 황달, 의식 변화, 출혈 경향, 심한 구토 또는 우상복부 통증이 있으면 긴급도를 높이세요.",
      "함께 확인: 반복 ALT·AST, TBIL·직접빌리루빈, ALP·GGT, PT/INR, 알부민, CBC, 간염검사, 복용약·건강식품, 음주력, 복부초음파",
    );
  }
  if (present(data.tbil) && (data.tbil > 3 || (bilirubinHigh && liverEnzymeHigh))) {
    add(
      "prompt",
      "빌리루빈 상승과 간수치 이상",
      `TBIL ${data.tbil} mg/dL`,
      "간세포 손상 또는 담즙정체 여부를 구분해야 합니다. 황달과 발열·오한·우상복부 통증이 함께 있으면 담관염 가능성을 고려해 즉시 평가하세요.",
      "함께 확인: 직접·간접빌리루빈, ALT·AST, ALP·GGT, PT/INR, 알부민, CBC, 복부초음파",
    );
  }
  if (present(data.hsCrp) && data.hsCrp > 10) {
    add(
      "prompt",
      "hs-CRP 급성 원인 확인 범위",
      `${data.hsCrp} mg/L`,
      "만성염증 점수 해석을 보류하고 감염, 조직 손상 또는 다른 염증성 원인을 먼저 확인한 뒤 안정된 시점에 재검하세요.",
      "함께 확인: 발열·감염 증상, 치주·피부·호흡기·요로 증상, CBC, 최근 수술·외상·격한 운동, 복용약",
    );
  }
  if ((present(data.sbp) && data.sbp >= 160 && data.sbp < 180) || (present(data.dbp) && data.dbp >= 100 && data.dbp < 120)) {
    add(
      "prompt",
      "혈압 뚜렷한 상승",
      `${present(data.sbp) ? data.sbp : "-"}/${present(data.dbp) ? data.dbp : "-"} mmHg`,
      "한 번의 측정으로 확진하지 말고 올바른 방법으로 반복 측정한 뒤 빠른 내과 평가가 필요한지 판단하세요.",
      "함께 확인: 반복·가정혈압, 증상, 복약, 신장기능·전해질, 심혈관 위험요인",
    );
  }

  if (present(alpRatio) && alpRatio > 1 && !(bilirubinHigh && liverEnzymeHigh)) {
    const hepaticPattern = present(ggtRatio) && ggtRatio > 1;
    add(
      "review",
      "ALP 상승 원인 구분",
      `ALP ${data.alp} U/L`,
      hepaticPattern
        ? "GGT도 높아 간·담도계 기원 가능성을 먼저 확인해야 합니다. 빌리루빈 상승이나 황달이 동반되면 평가 우선도를 높이세요."
        : "GGT가 높지 않다면 뼈 등 비간성 기원도 고려해야 합니다. 검사실 기준범위와 연령·임신 여부를 함께 확인하세요.",
      hepaticPattern
        ? "함께 확인: GGT, 직접빌리루빈, ALT·AST, 복부초음파, 복용약"
        : "함께 확인: GGT 재확인, 칼슘·인·비타민 D·PTH, 뼈 증상, 필요 시 ALP isoenzyme",
    );
  }
  if (bilirubinHigh && !liverEnzymeHigh) {
    add(
      "review",
      "총빌리루빈 단독 상승",
      `TBIL ${data.tbil} mg/dL`,
      "직접형과 간접형을 구분해야 합니다. 간접빌리루빈 우세라면 용혈, 금식·탈수 또는 길버트증후군 등을 고려하고, 직접형 우세라면 간담도 원인을 확인하세요.",
      "함께 확인: 직접·간접빌리루빈, CBC·망상적혈구·LDH·haptoglobin, 재검, 황달·소변색·복용약",
    );
  }
  if (((present(altRatio) && altRatio > 1) || (present(astRatio) && astRatio > 1)) && !((present(altRatio) && altRatio >= 3) || (present(astRatio) && astRatio >= 3))) {
    const astPredominant = present(data.ast) && present(data.alt) && data.ast > data.alt;
    add(
      "review",
      "간효소 상승",
      `${[present(data.alt) ? `ALT ${data.alt}` : "", present(data.ast) ? `AST ${data.ast}` : ""].filter(Boolean).join(" · ")} U/L`,
      astPredominant
        ? "AST 우세 상승은 음주 관련 간손상뿐 아니라 근육 손상과 격한 운동의 영향도 받을 수 있습니다."
        : "지방간, 약물·건강식품, 음주, 바이러스간염 등 흔한 원인과 수치의 지속 여부를 확인하세요.",
      `함께 확인: ${astPredominant ? "CK, 최근 운동·근육통, 음주력, " : ""}TBIL, ALP·GGT, 복용약·건강식품, 간염검사, 복부초음파`,
    );
  }
  if (present(ggtRatio) && ggtRatio > 1 && !(present(alpRatio) && alpRatio > 1) && !(present(altRatio) && altRatio > 1) && !(present(astRatio) && astRatio > 1)) {
    add(
      "review",
      "GGT 단독 상승",
      `GGT ${data.ggt} U/L`,
      "단독 상승만으로 간질환을 확정하지 않습니다. 음주, 지방간, 약물·건강식품과 수치의 지속 여부를 확인하세요.",
      "함께 확인: 음주력, ALT·AST·ALP·TBIL, 복용약·건강식품, 대사위험, 필요 시 복부초음파",
    );
  }
  if (present(data.hba1c) && data.hba1c >= 5.7 && data.hba1c < 6.5) {
    add(
      "review",
      "HbA1c 당뇨병 전단계 범위",
      `${data.hba1c}%`,
      "혈당 위험을 확인하고 추적검사 계획을 세우세요. 임상상과 맞지 않으면 HbA1c에 영향을 주는 빈혈·적혈구 상태를 확인합니다.",
      "함께 확인: 공복혈당 또는 필요 시 OGTT, CBC, 가족력, 복부비만, TG/HDL-C",
    );
  }
  if (present(data.ldl) && data.ldl >= 160 && data.ldl < 190) {
    add(
      "review",
      "LDL-C 높음",
      `${data.ldl} mg/dL`,
      "전체 심혈관 위험과 가족력을 함께 평가하고 이차 원인을 확인하세요.",
      "함께 확인: 혈압·흡연·당뇨·가족력, 갑상선기능, 신장·간담도 상태, 복용약",
    );
  }
  if (present(data.tg) && data.tg >= 200 && data.tg < 500) {
    add(
      "review",
      "중성지방 높음",
      `${data.tg} mg/dL`,
      "식사·음주 영향과 지속 여부, 당대사 및 이차 원인을 함께 확인하세요.",
      "함께 확인: HbA1c·혈당, HDL-C, 음주, 갑상선기능, 신장·간기능, 복용약",
    );
  }
  if ((present(data.totalChol) && data.totalChol < 120) || (present(data.ldl) && data.ldl < 50)) {
    const lowLipidValue = [
      present(data.totalChol) && data.totalChol < 120 ? `총콜레스테롤 ${data.totalChol}` : "",
      present(data.ldl) && data.ldl < 50 ? `LDL-C ${data.ldl}` : "",
    ].filter(Boolean).join(" · ");
    add(
      "review",
      "낮은 지질수치",
      `${lowLipidValue} mg/dL`,
      "약물 효과인지 확인하고, 설명되지 않는 저하라면 영양·흡수 상태와 전신질환 가능성을 살펴보세요.",
      "함께 확인: 지질저하제, 체중변화·섭취상태, 갑상선기능, 간기능, CBC·알부민",
    );
  }
  if (present(data.hsCrp) && data.hsCrp >= 3 && data.hsCrp <= 10) {
    add(
      "review",
      "hs-CRP 뚜렷한 상승",
      `${data.hsCrp} mg/L`,
      "대사성 저강도 염증 외에 감염, 치주질환, 알레르기·염증질환, 외상·운동 등의 영향을 확인하고 안정된 상태에서 추적하세요.",
      "함께 확인: 증상·진찰, CBC, GRA/LYM 비율, 치주·호흡기·피부·요로 상태, 최근 운동·외상",
    );
  }
  const graLymRatio = part.inflammation?.graLymRatio;
  if (present(graLymRatio) && graLymRatio >= 2.5) {
    add(
      "review",
      "GRA/LYM 비율 상승",
      graLymRatio.toFixed(2),
      "염증 또는 스트레스로 백혈구 구성에 변화가 있을 수 있습니다. GRA는 호산구·호염기구를 포함하므로 정식 NLR과 동일하게 해석하지 않습니다.",
      "함께 확인: CBC 절대 백혈구수, GRA#·LYM# 또는 5-part differential, 감염·알레르기, 과로·수면·스트레스",
    );
  }
  if ((present(data.sbp) && data.sbp >= 140 && data.sbp < 160) || (present(data.dbp) && data.dbp >= 90 && data.dbp < 100)) {
    add(
      "review",
      "혈압 상승",
      `${present(data.sbp) ? data.sbp : "-"}/${present(data.dbp) ? data.dbp : "-"} mmHg`,
      "적절한 자세와 커프로 반복 측정하고 가정혈압 또는 추적 측정으로 지속 여부를 확인하세요.",
      "함께 확인: 반복·가정혈압, 복약, 염분·음주, 신장기능·전해질, 심혈관 위험요인",
    );
  }
  if ((present(data.sbp) && data.sbp < 90) || (present(data.dbp) && data.dbp < 60)) {
    add(
      "review",
      "낮은 혈압",
      `${present(data.sbp) ? data.sbp : "-"}/${present(data.dbp) ? data.dbp : "-"} mmHg`,
      "어지럼, 실신, 탈수 또는 기립 증상이 있는지 확인하고 반복 측정하세요.",
      "함께 확인: 기립혈압·맥박, 수분상태, CBC, 전해질·신장기능, 복용약",
    );
  }
  if (present(data.restingHr) && (data.restingHr < 50 || data.restingHr > 100)) {
    add(
      "review",
      "안정 시 심박수 확인",
      `${data.restingHr} bpm`,
      "운동선수 여부와 약물 영향을 확인하고, 실신·흉통·호흡곤란·심계항진이 있으면 진료 우선도를 높이세요.",
      "함께 확인: 반복 맥박, 심전도, CBC, 갑상선기능, 전해질, 복용약",
    );
  }

  const physical = assessPhysicalFunction(data);
  if (physical.activated) {
    add(
      "review",
      "신체기능저하형 활성",
      `${physical.score}/${physical.max}점`,
      "대사수치가 양호해도 근육·근력, 섭취·소화 또는 활동능력 저하의 원인을 별도로 확인하세요.",
      "함께 확인: 최근 체중변화, 식사·소화 상태, CBC·알부민, 신장·갑상선기능, 약물, 낙상 위험",
    );
  }
  validation.warnings.forEach((warning) => {
    add("review", "입력값 확인", "", warning.text, "원본 검사결과의 단위와 입력값을 다시 대조하세요.");
  });

  const priorityOrder = { urgent: 0, prompt: 1, review: 2 };
  return notices.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function scoreTypes(data, results) {
  const tags = [];
  const candidates = [];
  const addCandidate = (code, name, strength, reasons, priorityScore = 20) => {
    if (strength > 0) candidates.push({ code, name, strength: Math.min(3, strength), reasons, priorityScore });
  };
  const secondaryFrom = (primary, names) => {
    const unique = names.filter((name, index, array) =>
      name &&
      name !== primary &&
      name !== "해당 없음" &&
      array.indexOf(name) === index
    );
    return unique.length ? unique.join(" + ") : "해당 없음";
  };
  const highTg = data.tg >= 150;
  const visceralHigh = data.visceralFat >= 10;
  const typeA = results.parts.typeA || assessTypeA(data);
  const physical = assessPhysicalFunction(data);
  const inflammation = results.parts.inflammation || assessInflammation(data, results.parts.hsCrp);
  const hba1cHigh = data.hba1c >= 5.7;
  const tgHdlHigh = results.parts.tgHdl?.ratio >= 3.5;
  const tgHdlModerate = results.parts.tgHdl?.ratio >= 2.5;
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ast?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);
  const liverEnzymeMarked = [results.parts.alt, results.parts.ast, results.parts.ggt]
    .some((result) => result?.ratio > 1.5);
  const liverPriority =
    results.parts.alt?.ratio >= 3 ||
    results.parts.ast?.ratio >= 3 ||
    data.tbil > 3 ||
    (data.tbil > 2 && liverAbnormal && liverEnzymeMarked);

  if (visceralHigh) tags.push("내장지방 증가");
  if (typeA.riskScore === 1) tags.push("복부지방 증가 경향");
  if (highTg) tags.push("고중성지방");
  if (data.sbp >= 130 || data.dbp >= 80) tags.push("혈압 경계");
  if (data.hsCrp >= 0.5 && data.hsCrp <= 10) tags.push("염증 관찰");
  if (results.parts.tbil?.ratio > 1 && !liverAbnormal) tags.push("총빌리루빈 단독 상승");
  physical.tags.forEach((tag) => {
    if (!tags.includes(tag)) tags.push(tag);
  });

  if (liverPriority) {
    return {
      primary: "0. 간관리 선행형",
      secondary: "해당 없음",
      tags,
      notes: ["간관리 선행 기준이 충족되어 다른 타입보다 우선 표시합니다."],
      candidates: [],
    };
  }

  const physicalObjectiveCount = physical.objectiveCount;
  const physicalSupportCount = physical.supportCount;
  const physicalActive = physical.activated;
  const critical = hasCriticalResult(data, results);

  if (
    results.max === 100 &&
    results.axes.every((axis) => axis.status === "complete" && axis.score >= 15) &&
    typeA.riskScore <= 1 &&
    inflammation.subtype === "해당 없음" &&
    !physicalActive &&
    !critical
  ) {
    return {
      primary: "대사 균형형",
      secondary: "해당 없음",
      tags,
      notes: [],
      candidates: [],
    };
  }

  const aReasons = [typeA.whtrHigh, typeA.waistHigh, typeA.visceralHigh].filter(Boolean);
  if (typeA.activated) {
    addCandidate("A", "A. 복부비만 우세형", typeA.riskScore - 1, aReasons, typeA.score * 5);
  }

  const insulinActive = (hba1cHigh && tgHdlModerate) || (tgHdlHigh && typeA.activated);
  if (insulinActive) {
    const strength = 1 + (tgHdlHigh ? 1 : 0) + ((data.hba1c >= 6 || typeA.riskScore >= 3) ? 1 : 0);
    const bReasons = [hba1cHigh, tgHdlModerate, tgHdlHigh, typeA.activated].filter(Boolean);
    const glucoseAxis = results.axes.find((axis) => axis.key === "glucose");
    const lipidAxis = results.axes.find((axis) => axis.key === "lipid");
    addCandidate("B", "B. 인슐린 저항 우세형", strength, bReasons, Math.min(glucoseAxis?.score ?? 20, lipidAxis?.score ?? 20));
  }

  if (inflammation.hold) {
    tags.push("만성염증형 판정 보류 — 급성 염증 가능성 확인 후 재검");
  } else {
    if (inflammation.borderline) tags.push("염증 관련 수치 경계");
    if (inflammation.objectiveElevated) tags.push("염증 관련 수치 상승");
    if (inflammation.symptoms.high) tags.push("만성염증 증상 있음");
    if (inflammation.subtype !== "해당 없음") {
      const severeLab = data.hsCrp > 3;
      const strength = severeLab ? 3 : inflammation.subtype.includes("종합형") ? 2 : 1;
      const inflammationAxis = results.axes.find((axis) => axis.key === "inflammation");
      addCandidate("C", `C. ${inflammation.subtype}`, strength, [inflammation.objectiveElevated, inflammation.symptoms.high], inflammationAxis?.score ?? 20);
    }
  }

  const dReasons = [
    gradeLowOrVeryLow(data.hrvIndexGrade),
    gradeLowOrVeryLow(data.ansActivity),
    gradeHighOrVeryHigh(data.stressGrade),
    present(data.snsPercent) && Math.abs(data.snsPercent - 50) > 6,
  ].filter(Boolean);
  if (dReasons.length >= 2) {
    const autonomicAxis = results.axes.find((axis) => axis.key === "autonomic");
    addCandidate("D", "D. 자율신경(스트레스) 우세형", dReasons.length - 1, dReasons, autonomicAxis?.score ?? 20);
  }
  if ((data.sbp >= 130 || data.dbp >= 80) && !dReasons[0] && !dReasons[1]) tags.push("혈압 관리 필요");

  if (physicalActive) {
    const strength = 1 + (physicalObjectiveCount >= 2 ? 1 : 0) + (physicalSupportCount >= 3 ? 1 : 0);
    addCandidate("E", "E. 신체기능저하형", strength, [...physical.tags], physical.score);
  }

  const active = candidates.sort((a, b) => b.strength - a.strength || a.priorityScore - b.priorityScore);
  const severePair = active.filter((item) => item.strength >= 3).length >= 2;
  if (active.length >= 3 || severePair) {
    return {
      primary: "F. 복합 대사위험형",
      secondary: secondaryFrom("F. 복합 대사위험형", active.map((item) => item.name)),
      tags,
      notes: [`세부 조합: ${active.map((item) => displayTypeName(item.name)).join(" · ")}`],
      candidates: active,
    };
  }
  if (active.length === 0) {
    return {
      primary: "특정 우세형 없음",
      secondary: "해당 없음",
      tags,
      notes: [],
      candidates,
    };
  }
  const primary = active[0].name;
  return {
    primary,
    secondary: secondaryFrom(primary, active.slice(1).map((item) => item.name)),
    tags,
    notes: [],
    candidates: active,
  };
}

function patientLine(data) {
  return [
    data.patientName || "이름 미입력",
    data.sex,
    present(data.age) ? `${data.age}세` : "",
    data.chartNumber ? `차트 ${data.chartNumber}` : "",
    data.testDate ? `검사일 ${data.testDate}` : "",
  ].filter(Boolean).join(" · ");
}

function activeAxes(axes) {
  return axes.filter((axis) => axis.status !== "unavailable" && axis.status !== "hold" && axis.max > 0);
}

function priorityAxes(axes, count = 3) {
  return activeAxes(axes)
    .filter((axis) => ((axis.score / axis.max) * AXIS_MAX) <= 16)
    .sort((a, b) => (a.score / a.max) - (b.score / b.max))
    .slice(0, count);
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

function typeGuideKey(typeName) {
  const name = displayTypeName(typeName).replace(/\s+/g, "");
  if (!name || name === "해당없음" || name === "특정타입없음") return "";
  if (name.includes("간관리선행")) return "liver";
  if (name.includes("복부비만")) return "abdominal";
  if (name.includes("인슐린저항")) return "insulin";
  if (name.includes("만성염증")) return "inflammation";
  if (name.includes("자율신경")) return "autonomic";
  if (name.includes("신체기능저하") || name.includes("근감소") || name.includes("근육저하")) return "sarcopenia";
  if (name.includes("복합대사위험")) return "complex";
  if (name.includes("대사균형")) return "balanced";
  return "";
}

function typeGuideKeys(typeName) {
  return String(typeName || "")
    .split("+")
    .map(typeGuideKey)
    .filter(Boolean);
}

function scorePhrase(results) {
  if (!results.max) return "계산 대기";
  return results.max === 100 ? `${results.total}점` : `${results.total}/${results.max}`;
}

function selectedPrimaryType(typeResult, data) {
  return data.manualPrimaryType || typeResult.primary;
}

function selectedSecondaryType(typeResult, data) {
  return data.manualSecondaryType || typeResult.secondary;
}

function programName(programId) {
  if (!programId) return "";
  return TREATMENT_PROGRAMS.find((program) => program.id === programId)?.name || "";
}

function treatmentTypes(primary, secondary) {
  return [displayTypeName(primary), ...displayTypeName(secondary).split("+")]
    .map((type) => type.trim())
    .filter((type) => type && type !== "해당 없음");
}

function addUnique(items, value) {
  if (value && !items.includes(value)) items.push(value);
}

function axisByKey(results, key) {
  return results.axes.find((axis) => axis.key === key);
}

function normalizedAxisScore(axis) {
  if (!axis || axis.status === "unavailable" || axis.status === "hold" || !axis.max) return null;
  return (axis.score / axis.max) * AXIS_MAX;
}

const TREATMENT_DURATION_OPTIONS = ["1개월", "3개월", "6개월", "6개월 이상"];

function normalizeTreatmentDuration(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (TREATMENT_DURATION_OPTIONS.includes(text)) return text;
  if (["2개월", "2~3개월"].includes(text)) return "3개월";
  if (["4개월", "4~6개월"].includes(text)) return "6개월";
  if (text === "직접 상담 후 결정") return "6개월 이상";
  return "";
}

function maxTreatmentDuration(durations) {
  const normalized = durations.map(normalizeTreatmentDuration).filter(Boolean);
  if (!normalized.length) return "";
  return normalized.reduce((longest, duration) => (
    TREATMENT_DURATION_OPTIONS.indexOf(duration) > TREATMENT_DURATION_OPTIONS.indexOf(longest)
      ? duration
      : longest
  ));
}

function focusLabelsFromData(data) {
  return TREATMENT_FOCUS_FIELDS
    .filter(([id]) => data[id])
    .map(([, label]) => label);
}

function focusCustomLabels(text) {
  return String(text || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setFocusFields(focusIds) {
  for (const [id] of TREATMENT_FOCUS_FIELDS) {
    const input = field(id);
    if (input) input.checked = focusIds.includes(id);
  }
}

function makeTreatmentSuggestion(data, results, grade, typeResult) {
  if (!results.max) {
    return {
      primaryProgram: "",
      secondaryProgram: "",
      tertiaryProgram: "",
      primaryDuration: "",
      secondaryDuration: "",
      tertiaryDuration: "",
      duration: "",
      durationReason: "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.",
      goals: ["검사 결과 확인 후 치료 목표 설정"],
      focusIds: [],
      focusCustom: "",
      direction: "검사결과를 입력하면 타입에 따른 치료 방향이 자동으로 표시됩니다.",
    };
  }
  const primary = selectedPrimaryType(typeResult, data);
  const secondary = selectedSecondaryType(typeResult, data);
  const types = treatmentTypes(primary, secondary);
  const primaryName = displayTypeName(primary);
  const priority = priorityAxes(results.axes, 3);
  const lowAxes = priority.map((axis) => axis.label);
  const goals = [];
  const focusIds = [];
  const programs = [];
  const addProgram = (id) => addUnique(programs, id);
  const addFocus = (id) => addUnique(focusIds, id);
  const glucoseScore = normalizedAxisScore(axisByKey(results, "glucose"));
  const lipidScore = normalizedAxisScore(axisByKey(results, "lipid"));
  const liverScore = normalizedAxisScore(axisByKey(results, "liver"));
  const inflammationScore = normalizedAxisScore(axisByKey(results, "inflammation"));
  const autonomicScore = normalizedAxisScore(axisByKey(results, "autonomic"));
  const severeAxisCount = [glucoseScore, lipidScore, liverScore, inflammationScore, autonomicScore].filter((score) => score !== null && score <= 10).length;
  const physicalManagement = types.some((type) => /신체기능저하|근감소|근육저하/.test(type));

  if (types.some((type) => type.includes("간관리")) || liverScore !== null && liverScore <= 12) {
    addProgram("liver_function");
    addUnique(goals, "간기능 및 피로 회복 개선");
    addFocus("focusAlcoholAvoidance");
    addFocus("focusSupplement");
  }
  const abdominalManagement = types.some((type) => type.includes("복부비만")) || results.parts.typeA?.score >= 1;
  if (abdominalManagement) {
    addProgram("lean_diet");
    addUnique(goals, "복부지방 감소");
    addUnique(goals, "12주 동안 허리둘레와 WHtR의 의미 있는 감소");
    addUnique(goals, "전체 식사량과 식사구성 개선");
    addUnique(goals, "지질대사 개선");
    addFocus("focusCarbRestriction");
    addFocus("focusAlcoholAvoidance");
    addFocus("focusSixteenHourFast");
    addFocus("focusAerobicExercise");
    addFocus("focusStrengthTraining");
    addFocus("focusPlantFat");
  }
  if (!abdominalManagement && lipidScore !== null && lipidScore <= 12) {
    addProgram("lean_diet");
    addUnique(goals, "지질대사 개선");
    addFocus("focusCarbRestriction");
    addFocus("focusAerobicExercise");
    addFocus("focusPlantFat");
  }
  if (types.some((type) => type.includes("인슐린")) || glucoseScore !== null && glucoseScore <= 12) {
    addProgram("lean_diet");
    addProgram("herbal_medicine");
    addUnique(goals, "혈당 및 인슐린 저항성 개선");
    addFocus("focusCarbRestriction");
    addFocus("focusFoodRestriction");
    addFocus("focusSixteenHourFast");
  }
  if (types.some((type) => type.includes("만성염증")) || inflammationScore !== null && inflammationScore <= 12) {
    addProgram("herbal_medicine");
    addProgram("enzyme_fast");
    addUnique(goals, "만성염증 부담 완화");
    addFocus("focusFoodRestriction");
    addFocus("focusSleepHabit");
    addFocus("focusSupplement");
  }
  if (types.some((type) => type.includes("자율신경")) || autonomicScore !== null && autonomicScore <= 12) {
    addProgram("herbal_medicine");
    addUnique(goals, "스트레스 반응 및 회복력 개선");
    addFocus("focusSleepHabit");
    addFocus("focusMelatonin");
  }
  if (physicalManagement) {
    addProgram("herbal_medicine");
    addUnique(goals, "먹고, 움직이고, 회복할 수 있는 신체기능 개선");
    addUnique(goals, "충분한 에너지와 단백질 섭취");
    addUnique(goals, "식욕과 소화기능 회복 및 무리한 체중감량 제한");
    addUnique(goals, "근력운동, 걷기와 일상 활동량의 점진적 회복");
    addUnique(goals, "충분한 수면과 휴식, 신체기능 변화 추적");
    addFocus("focusProteinIntake");
    addFocus("focusStrengthTraining");
    addFocus("focusAerobicExercise");
    addFocus("focusSleepHabit");
  }
  if (types.some((type) => type.includes("복합대사위험"))) {
    addProgram("lean_diet");
    addProgram("herbal_medicine");
    addUnique(goals, "여러 대사 문제의 단계적 개선");
    addFocus("focusCarbRestriction");
    addFocus("focusFoodRestriction");
    addFocus("focusAerobicExercise");
    addFocus("focusSleepHabit");
  }
  if (types.some((type) => type.includes("대사균형"))) {
    addUnique(goals, "현재 대사 균형 유지");
    addUnique(goals, "정기 추적검사를 통한 변화 확인");
    addFocus("focusAerobicExercise");
    addFocus("focusStrengthTraining");
    addFocus("focusSleepHabit");
  }
  if (!programs.length) {
    addProgram("herbal_medicine");
    addUnique(goals, "개별 증상과 검사 변화 추적");
    addFocus("focusSleepHabit");
  }
  if (physicalManagement) {
    const fastingIndex = focusIds.indexOf("focusSixteenHourFast");
    if (fastingIndex >= 0) focusIds.splice(fastingIndex, 1);
  }
  if (data.sbp >= 130 || data.dbp >= 80) addFocus("focusSaltRestriction");

  let duration = "3개월";
  let durationReason = "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.";
  if (primaryName.includes("복합대사위험") || (results.max && results.total < 55) || severeAxisCount >= 2) {
    duration = "6개월";
    durationReason = "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.";
  } else if (results.total >= 70 && severeAxisCount === 0) {
    duration = "3개월";
    durationReason = "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.";
  }

  const directionBase = primaryName && primaryName !== "특정 타입 없음"
    ? `현재 결과는 ${primaryName}${secondary && displayTypeName(secondary) !== "해당 없음" ? `과 ${displayTypeName(secondary)}` : ""} 양상이 관찰됩니다.`
    : "현재 결과는 특정 타입 하나보다 낮은 점수의 관리 필요영역을 중심으로 접근합니다.";
  const direction = `${directionBase} ${lowAxes.length ? `${lowAxes.join(" · ")} 개선을 중심으로 한 치료가 필요합니다.` : "전반적인 균형 유지와 정기 추적이 필요합니다."}`;
  const primaryDuration = duration;
  const secondaryDuration = programs[1] ? duration : "";
  const tertiaryDuration = programs[2] ? duration : "";
  const totalDuration = maxTreatmentDuration([primaryDuration, secondaryDuration, tertiaryDuration]);

  return {
    primaryProgram: programs[0] || "",
    secondaryProgram: programs[1] || "",
    tertiaryProgram: programs[2] || "",
    primaryDuration,
    secondaryDuration,
    tertiaryDuration,
    duration: totalDuration || duration,
    durationReason,
    goals: goals.slice(0, 5),
    focusIds: focusIds.slice(0, 6),
    focusCustom: "",
    direction,
  };
}

function fillTreatmentFields(suggestion) {
  treatmentPlanApplyingAuto = true;
  field("treatmentProgramPrimary").value = suggestion.primaryProgram || "";
  field("treatmentProgramSecondary").value = suggestion.secondaryProgram || "";
  field("treatmentProgramTertiary").value = suggestion.tertiaryProgram || "";
  setDurationSelectValue("treatmentDurationPrimary", suggestion.primaryDuration);
  setDurationSelectValue("treatmentDurationSecondary", suggestion.secondaryDuration);
  setDurationSelectValue("treatmentDurationTertiary", suggestion.tertiaryDuration);
  field("treatmentDuration").value = suggestion.duration || "";
  field("treatmentGoals").value = suggestion.goals.join("\n");
  field("treatmentFocusCustom").value = suggestion.focusCustom || "";
  setFocusFields(suggestion.focusIds || []);
  treatmentDurationUserEdited = false;
  treatmentPlanApplyingAuto = false;
}

function setDurationSelectValue(id, value) {
  const select = field(id);
  select.value = normalizeTreatmentDuration(value) || "3개월";
}

function maybeUpdateTotalTreatmentDuration(data, suggestion) {
  if (treatmentDurationUserEdited) return data;
  const primaryDuration = normalizeTreatmentDuration(data.treatmentDurationPrimary);
  const secondaryDuration = normalizeTreatmentDuration(data.treatmentDurationSecondary);
  const tertiaryDuration = normalizeTreatmentDuration(data.treatmentDurationTertiary);
  const programDurations = [
    data.treatmentProgramPrimary ? primaryDuration : "",
    data.treatmentProgramSecondary ? secondaryDuration : "",
    data.treatmentProgramTertiary ? tertiaryDuration : "",
  ];
  const totalDuration = maxTreatmentDuration(programDurations);
  const input = field("treatmentDuration");
  if (input && input.value !== totalDuration) input.value = totalDuration || "";
  return { ...data, treatmentDuration: totalDuration || "" };
}

function treatmentGoalsFromText(text, fallbackGoals) {
  const goals = String(text || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return goals.length ? goals : fallbackGoals;
}

function renderTreatmentPlan(data, suggestion) {
  const primaryProgram = data.treatmentProgramPrimary;
  const secondaryProgram = data.treatmentProgramSecondary;
  const tertiaryProgram = data.treatmentProgramTertiary;
  const durations = [
    data.treatmentDurationPrimary,
    data.treatmentDurationSecondary,
    data.treatmentDurationTertiary,
  ];
  const programs = [primaryProgram, secondaryProgram, tertiaryProgram]
    .map((programId, index) => ({
      name: programName(programId),
      duration: durations[index],
    }))
    .filter((program) => program.name);
  const goals = treatmentGoalsFromText(data.treatmentGoals, suggestion.goals);
  const focusItems = [
    ...focusLabelsFromData(data),
    ...focusCustomLabels(data.treatmentFocusCustom || data.treatmentPlan),
  ].filter((item, index, array) => array.indexOf(item) === index);
  elements.treatmentDirection.textContent = suggestion.direction;
  elements.treatmentProgramList.replaceChildren(...programs.map((name, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${index + 1}</span><strong>${name.name}</strong><small>${name.duration || "기간 상담 후 결정"}</small>`;
    return item;
  }));
  elements.treatmentDurationOutput.textContent = data.treatmentDuration || suggestion.duration;
  elements.treatmentDurationReason.textContent = suggestion.durationReason;
  elements.treatmentGoalList.replaceChildren(...goals.map((goal) => {
    const item = document.createElement("li");
    item.textContent = goal;
    return item;
  }));
  elements.treatmentFocusList.replaceChildren(...(focusItems.length ? focusItems : ["검사 결과와 상담 내용을 바탕으로 중점사항을 정합니다."]).map((focus) => {
    const item = document.createElement("li");
    item.textContent = focus;
    return item;
  }));
}

function joinKorean(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}${particle(items.at(-2), "과", "와")} ${items.at(-1)}`;
}

function hasFinalConsonant(text) {
  const char = String(text || "").trim().slice(-1);
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function particle(text, withFinal, withoutFinal) {
  return hasFinalConsonant(text) ? withFinal : withoutFinal;
}

function makeSummary(data, results, grade, typeResult, flags) {
  if (!results.max) return "입력된 핵심 검사값이 부족합니다. 판정 불가 축은 0점으로 처리하지 않습니다.";
  const lowest = priorityAxes(results.axes, 2).map((axis) => axis.label);
  const limitedAxes = results.axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis) => axis.label);
  const primary = selectedPrimaryType(typeResult, data);
  const scoreSentence = grade.physicalOverride
    ? `대사건강 종합점수는 ${scorePhrase(results)}으로 ${grade.label.includes("관리필요 1단계") ? "관리필요 1단계이며" : "양호 범위이지만"}, 신체기능상태 관리가 필요합니다.`
    : `대사건강 종합점수는 ${scorePhrase(results)}으로, ${grade.label}입니다.`;
  const sentences = [
    scoreSentence,
    lowest.length ? `특히 ${joinKorean(lowest)} 영역부터 살펴보는 것이 좋습니다.` : "입력된 검사영역을 순차적으로 살펴보는 것이 좋습니다.",
    `현재의 주된 대사 패턴은 ${displayTypeName(primary)}으로 평가됩니다.`,
  ];
  if (flags.some((flag) => flag.type === "warning")) sentences.push("우선 확인이 필요한 항목이 있습니다. 종합점수보다 먼저 의학적으로 확인하는 것이 좋습니다.");
  else if (flags.length) sentences.push("추적관찰이 필요한 항목이 있습니다. 자세한 개별 진찰이 필요합니다.");
  else if (limitedAxes.length) sentences.push(`${limitedAxes.join(", ")} 축은 입력값 부족 또는 판독 제한으로 별도 해석이 필요합니다.`);
  return sentences.slice(0, 4).join(" ");
}

function makeTypeReason(data, results, primary) {
  const ratio = results.parts.tgHdl?.ratio;
  const ldl = data.ldl;
  if (primary.startsWith("0.")) {
    const values = [
      present(data.alt) ? `ALT ${data.alt} U/L` : "",
      present(data.ast) ? `AST ${data.ast} U/L` : "",
      present(data.tbil) ? `총빌리루빈 ${data.tbil} mg/dL` : "",
    ].filter(Boolean).join(", ");
    return `${values || "간 관련 지표"}가 우선 확인 기준에 해당합니다. 대사 타입보다 간 관련 원인 확인을 먼저 고려하도록 표시합니다.`;
  }
  if (primary.startsWith("A.")) {
    const typeA = results.parts.typeA || assessTypeA(data);
    const sentences = [
      "복부지방은 염증 물질을 분비하고 장기의 기능을 저하시키기 때문에 대사기능 평가에 있어서 중요한 지표입니다.",
    ];
    if (typeA.whtrHigh) sentences.push("키에 비해 허리둘레가 큰 편으로 복부지방 관리가 필요합니다.");
    if (typeA.waistHigh) sentences.push("한국 성인의 복부비만 기준을 초과하고 있습니다.");
    if (typeA.visceralHigh) sentences.push("InBody 검사에서 내장지방이 증가한 것으로 추정됩니다.");
    if (typeA.whtrHigh && typeA.waistHigh && typeA.visceralHigh) {
      sentences.push("복부지방이 위험수준으로 평가됩니다. 적극적인 관리가 필요합니다.");
    }
    return sentences.join(" ");
  }
  if (primary.startsWith("B.")) {
    const values = [
      present(ratio) ? `TG/HDL-C 비율 ${ratio.toFixed(2)}` : "",
      present(data.tg) ? `중성지방 ${data.tg} mg/dL` : "",
    ].filter(Boolean);
    if (data.hba1c >= 5.7) values.push(`HbA1c ${data.hba1c}%`);
    const hba1cNote = data.hba1c >= 6.5
      ? "당뇨병으로 진단할 수 있는 수치입니다. 대사관리와 별도로 의학적 상담이 필요합니다."
      : data.hba1c >= 5.7
        ? "당뇨 전단계에 해당합니다. 탄수화물 제한을 포함한 적극적인 대사관리가 필요합니다."
        : present(data.hba1c)
          ? "정상범위에 해당합니다. 5.4% 이상이라면 적극적인 대사 관리가 필요합니다."
          : "";
    return `${values.join(", ")} 지표에서 인슐린 저항과 관련된 지질대사 불균형이 관찰됩니다. ${hba1cNote} 확정 진단이 아니라 현재 검사 조합에서 보이는 관리 방향입니다.`;
  }
  if (primary.startsWith("C.")) {
    const inflammation = results.parts.inflammation;
    if (primary.includes("종합형")) {
      return "만성염증이 혈액검사 수치와 증상에서 모두 나타나고 있습니다. 염증과 관련된 생활습관 및 요인을 종합적으로 평가하고 관리해야 합니다.";
    }
    if (primary.includes("증상형")) {
      return "혈액검사 수치가 높지 않더라도 만성염증에 의한 증상들이 나타나고 있습니다. 염증 증상을 줄이기 위한 적극적인 관리가 필요합니다.";
    }
    return "혈액검사상 염증수치가 상승되어 있습니다. 현재 느끼는 증상이 크지 않더라도 염증 수치를 줄이기 위한 적극적인 관리가 필요합니다.";
  }
  if (primary.startsWith("D.")) {
    return "자율신경의 불균형 상태가 관찰됩니다. 스트레스에 대한 신체반응을 살펴 자율신경계의 균형을 맞추기 위한 치료가 필요합니다.";
  }
  if (primary.startsWith("E.")) {
    return makePhysicalFunctionTypeSentence(data);
  }
  if (primary.startsWith("F.")) {
    return "여러 대사 패턴이 동시에 관찰되어 한 가지 축만으로 설명하기 어렵습니다. 관리 필요영역과 관련 관찰항목을 함께 보며 단계적으로 접근하는 것이 좋습니다.";
  }
  if (primary === "대사 균형형") {
    return "5개 대사축이 모두 15점 이상으로 전반적인 균형상태가 양호합니다. 현재 상태를 유지하는 것이 좋습니다. 특정 질환이나 증상이 있는 경우에는 의료진과의 상담이 필요합니다.";
  }
  if (primary === "특정 우세형 없음") {
    return "두드러진 대사 타입 이상이 발견되지는 않았습니다. 하지만 대사균형형처럼 건강상태라고 보기는 어렵습니다. 신체증상과 진찰 결과에 따라 치료방향을 결정하는 것이 좋습니다.";
  }
  if (present(ldl) || present(ratio)) {
    return "현재 입력된 핵심 지표에서는 특정 우세 타입보다 전반적인 균형 유지와 개별 지표 추적이 중요합니다.";
  }
  return "주타입 판정에 필요한 보조 정보가 제한적입니다. 추가 검사값을 입력하면 판정 근거가 더 구체화됩니다.";
}

function makePhysicalFunctionTypeSentence(data) {
  const assessment = assessPhysicalFunction(data);
  const sentences = [
    "체중, 영양섭취, 근육·근력 또는 활동능력에서 신체기능상태 저하가 확인됩니다. 저하된 기능을 확인하고, 신체기능을 높이기 위한 치료가 필요합니다.",
  ];
  if (assessment.smi.low || assessment.grip.low) {
    sentences.push("근육량이나 근력이 감소한 소견이 관찰되기 때문에 충분한 영양섭취와 적절한 근력운동이 중요합니다.");
  }
  if (assessment.intakeIssue || assessment.digestionIssue) {
    sentences.push("소화능력이 저하되어 있어 충분한 영양섭취와 소화기능 회복을 위한 치료가 필요합니다.");
  }
  return sentences.join(" ");
}

function renderComputed(data, results) {
  const pnsInput = field("pnsPercent");
  if (pnsInput) {
    pnsInput.value = present(data.snsPercent) && data.snsPercent >= 0 && data.snsPercent <= 100 ? formatDecimal(100 - data.snsPercent, 1) : "";
  }
  elements.tgHdlCalc.textContent = present(results.parts.tgHdl?.ratio)
    ? `TG/HDL-C: ${results.parts.tgHdl.ratio.toFixed(2)} — ${results.parts.tgHdl.label}`
    : "TG/HDL-C: TG와 HDL-C 입력 후 계산";
  elements.nonHdlCalc.textContent = present(results.parts.nonHdl?.value)
    ? `non-HDL-C: ${results.parts.nonHdl.value} mg/dL — ${results.parts.nonHdl.label}`
    : "non-HDL-C: 총콜레스테롤과 HDL-C 입력 후 계산";
  const graLymCalculation = calculateGraLymRatio(data);
  elements.graLymCalc.textContent = present(graLymCalculation.value)
    ? `GRA/LYM ratio: ${graLymCalculation.value.toFixed(2)} — ${results.parts.graLym.label} · 점수 미반영`
    : graLymCalculation.reason === "lym-zero"
      ? "GRA/LYM ratio: LYM이 0이어서 계산하지 않습니다."
      : "GRA/LYM ratio: GRA와 LYM 입력 후 자동 계산";
  elements.whtrCalc.textContent = present(results.parts.typeA?.whtr)
    ? `WHtR: ${results.parts.typeA.whtr.toFixed(3)} — ${results.parts.typeA.whtrLabel}`
    : "WHtR: 키와 허리둘레 입력 후 계산";
  const grip = assessGrip(data);
  if (present(grip.representative)) {
    const detail = grip.measurementStatus === "both"
      ? `좌우 차이 ${formatDecimal(grip.differenceKg, 1)} kg (${formatDecimal(grip.differencePercent, 1)}%)${grip.asymmetryObserved ? " · 좌우 악력 차이가 관찰됩니다." : ""}`
      : grip.measurementStatus === "right-only"
        ? "오른손만 측정됨"
        : grip.measurementStatus === "left-only"
          ? "왼손만 측정됨"
          : "기존 단일 악력 기록";
    elements.gripStrengthCalc.textContent = `대표 악력 ${formatDecimal(grip.representative, 1)} kg · ${detail}`;
  } else {
    elements.gripStrengthCalc.textContent = "대표 악력: 좌우 악력 입력 후 자동 계산됩니다.";
  }
}

function renderRadar(axes) {
  const viewWidth = 560;
  const viewHeight = 460;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const radius = 140;
  const labelLines = (label) => {
    if (label === "자율신경(스트레스)") return ["자율신경", "(스트레스)"];
    return label.includes("·") ? label.split("·").map((part, index) => index === 0 ? part : `·${part}`) : [label];
  };
  const pointsFor = (scale, inactiveAsOuter = false) =>
    axes.map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const isInactive = axis.status === "unavailable" || axis.status === "hold";
      const axisScale = isInactive ? (inactiveAsOuter ? 1 : 0) : (axis.score / AXIS_MAX) * scale;
      return `${centerX + Math.cos(angle) * radius * axisScale},${centerY + Math.sin(angle) * radius * axisScale}`;
    }).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((level) => `<polygon points="${pointsFor(level, true)}" fill="none" stroke="#cbd9d2" stroke-width="1.2" />`).join("");
  const labels = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const side = Math.cos(angle);
    const rawX = centerX + side * (radius + 58);
    let x = side < -0.35 ? 8 : side > 0.35 ? viewWidth - 56 : rawX;
    if (axis.key === "inflammation") x = 52;
    if (axis.key === "liver") x = viewWidth - 72;
    const y = centerY + Math.sin(angle) * (radius + 48);
    const anchor = side < -0.35 ? "start" : side > 0.35 ? "end" : "middle";
    const statusLabel = axis.status === "unavailable" ? "미측정" : axis.status === "hold" ? "보류" : "";
    const fill = axis.status === "complete" || axis.status === "partial" ? "#24372f" : "#7b8781";
    const lines = statusLabel ? [...labelLines(axis.label), statusLabel] : labelLines(axis.label);
    const firstDy = lines.length === 1 ? "0" : `${-0.55 * (lines.length - 1)}em`;
    const tspans = lines.map((line, lineIndex) => (
      `<tspan x="${x}" dy="${lineIndex === 0 ? firstDy : "1.15em"}">${line}</tspan>`
    )).join("");
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" font-size="32" font-weight="850">${tspans}</text>`;
  }).join("");
  const spokes = axes.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    return `<line x1="${centerX}" y1="${centerY}" x2="${centerX + Math.cos(angle) * radius}" y2="${centerY + Math.sin(angle) * radius}" stroke="#d4e0da" stroke-width="1.1" />`;
  }).join("");
  const inactive = axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis, index) => {
    const axisIndex = axes.indexOf(axis);
    const angle = -Math.PI / 2 + (axisIndex * Math.PI * 2) / axes.length;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#9aa6a0" stroke-dasharray="4 5" />`;
  }).join("");
  elements.radarChart.innerHTML = `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="5개 축 점수 레이더 차트">
      ${grid}
      ${spokes}
      ${inactive}
      <polygon points="${pointsFor(1)}" fill="rgba(35,116,90,0.24)" stroke="#23745a" stroke-width="4" />
      ${labels}
    </svg>
  `;
  elements.axisScoreLegend.replaceChildren(...axes.map((axis) => {
    const item = document.createElement("li");
    item.className = axis.status === "complete" || axis.status === "partial" ? "" : "muted";
    item.innerHTML = `<span>${axis.label}</span><strong>${axisDisplay(axis)}</strong>`;
    return item;
  }));
}

function renderPriority(axes) {
  const priorities = priorityAxes(axes, 3);
  const items = priorities;
  const summaryItems = items.map((axis, index) => {
    const item = document.createElement("li");
    item.className = "priority-compact";
    item.innerHTML = `<span class="rank">${index + 1}</span><span><strong>${axis.label}</strong></span><span>${axisDisplay(axis)}</span>`;
    return item;
  });
  const detailItems = items.map((axis, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="rank">${index + 1}</span><span><strong>${axis.label}</strong><span>${PRIORITY_REASON_COMMENTS[axis.key] || axis.comment}</span></span><span>${axisDisplay(axis)}</span>`;
    return item;
  });
  elements.priorityList.replaceChildren(...summaryItems);
  elements.priorityListDetail.replaceChildren(...detailItems);
  elements.priorityAxes.textContent = priorities.length ? priorities.slice(0, 2).map((axis) => axis.label).join(" · ") : "16점 이하 영역 없음";
}

function renderFlags(flags) {
  if (!flags.length) {
    elements.flagArea.hidden = true;
    elements.flagArea.replaceChildren();
    return;
  }
  elements.flagArea.hidden = false;
  const box = document.createElement("article");
  box.className = "warning-box";
  const hasWarning = flags.some((flag) => flag.type === "warning");
  const items = flags.map((flag) => `
    <li class="${flag.type}">
      <strong>${flag.title}${flag.value ? ` <span>${flag.value}</span>` : ""}</strong>
      <p>${flag.description}</p>
    </li>
  `).join("");
  box.innerHTML = `
    <h3>${hasWarning ? "우선 확인이 필요한 검사결과" : "추적관찰이 필요한 검사결과"}</h3>
    <ul>${items}</ul>
    <p class="warning-tail">${hasWarning ? "아래 대사건강점수보다 우선적인 의학적 확인이 필요합니다." : "종합점수와 함께 해당 지표의 변화를 추적합니다."}</p>
  `;
  elements.flagArea.replaceChildren(box);
}

function axisTone(axis) {
  if (axis.status === "unavailable") return "입력값 부족";
  if (axis.key === "inflammation" && axis.status === "hold") return "급성 염증 배제 후 재검";
  if (axis.key === "inflammation") {
    const normalized = axis.max ? (axis.score / axis.max) * AXIS_MAX : 0;
    if (normalized >= 16) return "양호";
    if (normalized >= 12) return "경계 관찰";
    if (normalized >= 8) return "개선 필요";
    return "우선 관리";
  }
  if (axis.status === "hold") return "해석 제한";
  if (axis.status === "partial") return "부분 판정";
  if (axis.score >= 16) return "양호";
  if (axis.score >= 12) return "관리 필요";
  if (axis.score >= 8) return "개선 필요";
  return "우선 관리";
}

function renderTypeACard(data, typeA) {
  const card = document.createElement("article");
  card.className = "axis-card type-a-card";
  const whtrValue = present(typeA.whtr) ? typeA.whtr.toFixed(3) : "--";
  const heightValue = present(data.height) ? `${formatDecimal(data.height, 1)} cm` : "--";
  const waistValue = present(data.waist) ? `${formatDecimal(data.waist, 1)} cm` : "--";
  const visceralValue = present(data.visceralFat) ? formatDecimal(data.visceralFat, 0) : "--";
  let explanation = "키와 허리둘레, 내장지방레벨을 입력하면 복부지방 상태를 함께 평가합니다.";
  if (typeA.whtrHigh && typeA.waistHigh && typeA.visceralHigh) {
    explanation = "세 가지 평가에서 모두 복부지방 증가가 확인되어 적극적인 복부지방 관리가 필요합니다.";
  } else if (typeA.whtrHigh) {
    explanation = "키에 비해 허리둘레가 큰 편으로 복부지방 관리가 필요합니다.";
  } else if (typeA.waistHigh) {
    explanation = "한국 성인의 복부비만 기준을 초과하고 있습니다.";
  } else if (typeA.visceralHigh) {
    explanation = "InBody 검사에서 내장지방이 증가한 것으로 추정됩니다.";
  } else if (typeA.complete) {
    explanation = "세 가지 복부지방 평가 지표가 모두 정상범위입니다.";
  }
  card.innerHTML = `
    <strong>복부비만 평가</strong>
    <div class="axis-score">${typeA.hasAnyMetric ? `${typeA.grade}등급` : "판정 대기"}</div>
    <p class="type-a-judgment">${typeA.judgment}</p>
    <p class="type-a-explanation">${explanation}</p>
    <ul class="axis-key-values">
      <li><span>키</span><strong>${heightValue}</strong></li>
      <li><span>허리둘레</span><strong>${waistValue} · ${typeA.waistLabel}</strong></li>
      <li><span>WHtR</span><strong>${whtrValue} · ${typeA.whtrLabel}</strong></li>
      <li><span>내장지방레벨</span><strong>${visceralValue} · ${typeA.visceralLabel}</strong></li>
    </ul>
  `;
  return card;
}

function renderAxisCards(axes, data, typeA) {
  const cards = axes.map((axis) => {
    const card = document.createElement("article");
    card.className = `axis-card ${axis.status}`;
    const percent = axis.status === "unavailable" || axis.status === "hold" ? 0 : (axis.score / AXIS_MAX) * 100;
    if (axis.key === "autonomic") {
      const detailRows = axis.details
        .filter((detail) => !detail.reference)
        .map((detail) => `<li><span>${detail.label}</span><strong>${axis.status === "unavailable" || axis.status === "hold" ? "판정 불가" : `${detail.result.score}/${detail.result.max}점`}${detail.value ? ` · ${detail.value}` : ""}</strong></li>`)
        .join("");
      const patterns = axis.autonomic?.patterns?.length
        ? axis.autonomic.patterns.map((pattern) => `<li><strong>${pattern.label}</strong></li>`).join("")
        : "<li><strong>입력 후 표시됩니다.</strong></li>";
      const comment = axis.status === "unavailable"
        ? "HRV-Index, ANS Activity, Stress, SNS 비율을 모두 입력하면 자율신경·회복 점수가 계산됩니다."
        : axis.status === "hold"
          ? "HRV 판독 제한 조건이 있어 자율신경 결과는 참고용으로만 확인합니다."
          : axis.autonomic.comment;
      card.innerHTML = `
        <strong>자율신경·회복 점수</strong>
        <div class="axis-score">${axisDisplay(axis)}</div>
        <div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
        <p>${comment}</p>
        <ul class="axis-key-values">${detailRows}</ul>
        <p class="subsection-label">세부유형</p>
        <ul class="axis-key-values autonomic-patterns">${patterns}</ul>
      `;
      return card;
    }
    if (axis.key === "inflammation") {
      const inflammation = axis.inflammation;
      const symptoms = inflammation.symptoms;
      const symptomText = symptoms.answeredCount
        ? `${symptoms.score}/${symptoms.max} · ${symptoms.burden}${symptoms.complete ? ` · 환산점수 ${inflammation.symptomHealth.score}/10` : ""}`
        : "미입력";
      const keyAreas = symptoms.keyAreas.length
        ? symptoms.keyAreas.map((area) => `<li><strong>${area}</strong></li>`).join("")
        : `<li><strong>${symptoms.answeredCount ? "주요 증상 영역 없음" : "입력 후 표시"}</strong></li>`;
      const hsCrpDetail = axis.details.find((detail) => detail.label === "hs-CRP");
      const graLymDetail = axis.details.find((detail) => detail.label === "GRA/LYM ratio");
      const hsCrpText = present(data.hsCrp) ? `${formatDecimal(data.hsCrp, 2)} mg/L · ${hsCrpDetail.result.label} · ${hsCrpDetail.result.score}/10` : "미입력";
      const graLymText = present(inflammation.graLymRatio) ? `${inflammation.graLymRatio.toFixed(2)} · ${graLymDetail.result.label}` : "미입력";
      const graLymComment = graLymPatientComment(graLymDetail.result);
      const graLymInfo = "현재 사용 중인 CBC 검사기는 과립구(GRA)와 림프구(LYM)를 구분합니다. GRA/LYM ratio는 정식 NLR과 유사한 경향을 보기 위한 참고지표이며 동일한 검사는 아닙니다.";
      card.classList.add("inflammation-axis-card");
      card.innerHTML = `
        <strong>만성염증</strong>
        <div class="axis-score">${axisDisplay(axis)}</div>
        <div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
        <p class="inflammation-subtype">현재 유형 <strong>${inflammation.subtype}</strong></p>
        <ul class="axis-key-values">
          <li><span>hs-CRP</span><strong>${hsCrpText}</strong></li>
          <li><span>증상 문진</span><strong>${symptomText}</strong></li>
          <li>
            <span>GRA/LYM 비율 <button class="metric-info" type="button" aria-label="GRA/LYM 비율 설명" data-tooltip="${graLymInfo}" title="${graLymInfo}">i</button></span>
            <strong>${graLymText}</strong>
          </li>
        </ul>
        ${graLymComment ? `<p class="metric-interpretation">${graLymComment}</p>` : ""}
        <p class="subsection-label">주요 증상 영역</p>
        <ul class="axis-key-values inflammation-key-areas">${keyAreas}</ul>
      `;
      return card;
    }
    const scoredDetails = axis.details.filter((detail) => detail.value && !detail.reference && !detail.adjustment);
    const supplementalDetails = axis.key === "liver"
      ? axis.details.filter((detail) => detail.value && (detail.reference || detail.adjustment))
      : axis.details.filter((detail) => detail.value && detail.adjustment && detail.result?.penalty > 0);
    const keyValues = [...scoredDetails.slice(0, 3), ...supplementalDetails]
      .map((detail) => {
        const label = detail.result?.label && (detail.result.max > 0 || detail.adjustment || detail.reference) ? ` · ${detail.result.label}` : "";
        return `<li><span>${detail.label}</span><strong>${detail.value}${label}</strong></li>`;
      })
      .join("");
    const cardComment = axis.key === "inflammation" && axis.status === "hold"
      ? "급성 염증 가능성을 먼저 확인한 뒤 재검이 필요합니다."
      : axis.key === "inflammation" && axis.score >= 16
        ? "양호 · hs-CRP가 낮은 수준입니다."
        : axis.key === "inflammation" && axis.score >= 12
          ? "경계 관찰 · hs-CRP의 변화를 확인합니다."
          : axis.key === "inflammation" && axis.score >= 8
            ? "개선 필요 · hs-CRP 상승 요인을 확인할 필요가 있습니다."
            : axis.key === "inflammation"
              ? "우선 관리 · hs-CRP 상승 원인을 확인하고 추적할 필요가 있습니다."
      : axis.key === "liver" && axis.score >= 16
      ? "현재 측정한 간수치는 대체로 양호합니다."
      : `${axisTone(axis)} · ${AXIS_SHORT_COMMENTS[axis.key] || axis.comment}`;
    card.innerHTML = `
      <strong>${axis.label}</strong>
      <div class="axis-score">${axisDisplay(axis)}</div>
      <div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
      <p>${cardComment}</p>
      ${keyValues ? `<ul class="axis-key-values">${keyValues}</ul>` : ""}
    `;
    return card;
  });
  elements.axisCards.replaceChildren(renderTypeACard(data, typeA), ...cards);
}

function detailNeedsAttention(detail) {
  if (detail.result?.missing) return false;
  if (detail.result?.hold) return true;
  const label = detail.result?.label || "";
  return /경계|관찰|상승|높음|높은 범위|낮은|관리 필요|진단범위|전단계|재검|별도 평가|추가 평가|원인 확인|염증|고혈압|주의혈압|저하|치우침|부족|과도|기준 이상|확인 필요/.test(label);
}

function makeDetailTableRow(axisLabel, detail) {
  const row = document.createElement("tr");
  const result = detail.result;
  const score = detail.reference
    ? "참고"
    : detail.adjustment
      ? result?.penalty > 0 ? `-${result.penalty}점` : "감점 없음"
      : result?.missing
        ? "--"
        : result?.hold
          ? "판정 보류"
          : `${result.score}/${result.max}`;
  const value = detail.value || "--";
  const label = result?.label || "";
  if (detailNeedsAttention(detail)) row.classList.add("is-attention");
  row.innerHTML = `<td class="axis">${axisLabel}</td><td class="test-name">${detail.label}</td><td class="result-value">${value}</td><td class="score">${score}</td><td class="interpretation">${label}</td>`;
  return row;
}

function renderDetails(axes, data) {
  const table = document.createElement("table");
  table.className = "result-table";
  table.innerHTML = `
    <colgroup>
      <col class="axis-col" />
      <col class="test-col" />
      <col class="value-col" />
      <col class="score-col" />
      <col class="interpretation-col" />
    </colgroup>
    <thead>
      <tr><th>평가축</th><th>검사</th><th>결과</th><th>점수</th><th>판정</th></tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  const rows = axes.flatMap((axis) => axis.details
    .filter((detail) => detail.value || (!detail.reference && detail.result && !detail.result.missing))
    .map((detail) => makeDetailTableRow(axis.label, detail)));
  tbody.replaceChildren(...rows);
  elements.detailTable.replaceChildren(table);
}

function axisManagementSentence(axis) {
  if (axis.status === "unavailable") return "평가에 필요한 값이 입력되지 않아 이번 해설에서는 판단하지 않습니다.";
  if (axis.status === "hold") return "현재 값은 만성적인 상태보다 급성 원인을 먼저 확인해야 하므로 점수 판정을 보류했습니다.";
  const normalized = axis.max ? (axis.score / axis.max) * 20 : 0;
  if (normalized >= 16) return "현재 상태를 유지하면서 정기적인 변화를 확인하는 것이 좋습니다.";
  if (normalized >= 12) return "아직 뚜렷한 질환을 뜻하지는 않지만 생활습관 관리와 추적관찰이 필요합니다.";
  if (normalized >= 8) return "관련 생활습관과 원인을 점검하고 적극적으로 개선할 필요가 있습니다.";
  return "현재 관리에서 우선순위를 높이고, 필요하면 의학적 원인 확인을 함께 진행해야 합니다.";
}

function axisExplanation(axis, data, results) {
  const scoreText = axis.status === "unavailable"
    ? "판정할 수 없습니다"
    : axis.status === "hold"
      ? "판정을 보류했습니다"
      : `${axis.score}/${axis.max}점으로 ${axisTone(axis)} 상태입니다`;
  let findings = "";
  if (axis.key === "glucose") {
    const items = [];
    if (present(data.hba1c)) items.push(`HbA1c ${formatDecimal(data.hba1c, 1)}%는 ${results.parts.hba1c.label}입니다`);
    if (present(results.parts.tgHdl?.ratio)) items.push(`TG/HDL-C 비율 ${results.parts.tgHdl.ratio.toFixed(2)}는 ${results.parts.tgHdl.label}에 해당합니다`);
    findings = items.join(". ");
  } else if (axis.key === "lipid") {
    const items = [];
    if (present(data.tg)) items.push(`중성지방 ${formatDecimal(data.tg, 0)} mg/dL는 ${results.parts.tg.label}입니다`);
    if (present(data.ldl)) items.push(`LDL-C ${formatDecimal(data.ldl, 0)} mg/dL는 ${results.parts.ldl.label}에 해당합니다`);
    findings = items.join(". ");
  } else if (axis.key === "liver") {
    const items = [];
    if (present(data.alt)) items.push(`ALT ${formatDecimal(data.alt, 0)} U/L는 ${results.parts.alt.label}입니다`);
    if (present(data.ast)) items.push(`AST ${formatDecimal(data.ast, 0)} U/L는 ${results.parts.ast.label}입니다`);
    if (present(data.ggt)) items.push(`GGT ${formatDecimal(data.ggt, 0)} U/L는 ${results.parts.ggt.label}입니다`);
    if (present(data.tbil) && results.parts.tbil.penalty > 0) items.push(`총빌리루빈 상승으로 ${results.parts.tbil.penalty}점이 추가 감점되었습니다`);
    findings = items.join(". ");
  } else if (axis.key === "inflammation") {
    const inflammation = results.parts.inflammation;
    const items = [];
    if (present(data.hsCrp)) items.push(`hs-CRP ${formatDecimal(data.hsCrp, 2)} mg/L는 ${results.parts.hsCrp.label}으로 10점 중 ${results.parts.hsCrp.score}점입니다`);
    if (inflammation.symptoms.complete) items.push(`최근 4주 증상 문진은 ${inflammation.symptoms.score}/40점이며 평가점수로는 10점 중 ${inflammation.symptomHealth.score}점입니다`);
    if (present(inflammation.graLymRatio)) {
      items.push(`GRA/LYM 비율 ${inflammation.graLymRatio.toFixed(2)}는 ${results.parts.graLym.label} 소견입니다`);
      if (inflammation.graLymRatio >= 1.8) {
        items.push("GRA/LYM 비율 상승은 염증 또는 스트레스로 인해 백혈구 구성에 변화가 있음을 의미합니다. 감염, 알레르기, 과로, 수면 부족 등 영향을 주고 있는 원인을 분석하고 관리해야 합니다");
      }
    }
    findings = items.join(". ");
  } else if (axis.key === "autonomic") {
    const items = [];
    if (data.hrvIndexGrade) items.push(`HRV-Index는 ${data.hrvIndexGrade}`);
    if (data.ansActivity) items.push(`자율신경 활성도는 ${data.ansActivity}`);
    if (data.stressGrade) items.push(`스트레스 지표는 ${data.stressGrade}`);
    if (present(data.snsPercent)) items.push(`교감신경 비율은 ${formatDecimal(data.snsPercent, 1)}%`);
    findings = items.length ? `${items.join(" · ")}로 측정되었습니다` : "";
  }
  return `${axis.label} 점수는 ${scoreText}.${findings ? ` ${findings}.` : ""} ${axisManagementSentence(axis)}`;
}

function renderComprehensiveInterpretation(data, results, grade, typeResult, flags) {
  const container = elements.comprehensiveInterpretation;
  if (!container) return;
  const primary = displayTypeName(selectedPrimaryType(typeResult, data));
  const measuredAxes = results.axes.filter((axis) => axis.status !== "unavailable");
  const priority = priorityAxes(measuredAxes, 3).map((axis) => axis.label);
  const overview = document.createElement("p");
  overview.className = "interpretation-overview";
  const scoreText = results.max ? `${results.total}/${results.max}점` : "계산 대기";
  const priorityLabel = joinKorean(priority);
  const priorityText = priority.length ? `${priorityLabel}${particle(priorityLabel, "을", "를")} 우선적으로 살펴볼 필요가 있습니다.` : "입력된 검사값이 충분하지 않아 관리 우선영역을 정하지 않았습니다.";
  overview.textContent = `이번 검사에서 대사건강 종합점수는 ${scoreText}, 종합상태는 ${grade.label}이며 주타입은 ${primary}입니다. ${priorityText}`;

  const warningFlags = flags.filter((flag) => flag.type === "warning");
  const warning = document.createElement("p");
  warning.className = "interpretation-warning";
  warning.hidden = !warningFlags.length;
  warning.textContent = warningFlags.length
    ? `점수 해석보다 먼저 확인할 항목은 ${joinKorean(warningFlags.map((flag) => flag.title))}입니다. 해당 소견은 생활관리만으로 판단하지 말고 필요한 의학적 확인을 우선합니다.`
    : "";

  const list = document.createElement("div");
  list.className = "interpretation-axis-list";
  results.axes.forEach((axis) => {
    const section = document.createElement("section");
    section.className = `interpretation-axis-item is-${axis.key}`;
    const heading = document.createElement("h3");
    heading.textContent = axis.label;
    const paragraph = document.createElement("p");
    paragraph.textContent = axisExplanation(axis, data, results);
    section.append(heading, paragraph);
    list.append(section);
  });

  const typeA = results.parts.typeA;
  if (typeA?.hasAnyMetric) {
    const physical = assessPhysicalFunction(data);
    const section = document.createElement("section");
    section.className = "interpretation-axis-item is-body";
    const heading = document.createElement("h3");
    heading.textContent = physical.hasAnyMetric ? "복부지방과 신체기능" : "복부지방 평가";
    const paragraph = document.createElement("p");
    const bodyParts = [`복부비만 평가는 ${typeA.grade}등급으로 ${typeA.judgment}입니다`];
    if (physical.hasAnyMetric) bodyParts.push(`신체기능상태는 ${physical.score}/20점으로 ${physical.judgment}입니다`);
    paragraph.textContent = `${bodyParts.join(". ")}. 평가 결과에 따른 관리 방향 설정이 필요합니다.`;
    section.append(heading, paragraph);
    list.append(section);
  }

  container.replaceChildren(overview, warning, list);
}

function renderPhysicalFunction(data) {
  const grip = assessGrip(data);
  if (!present(grip.representative)) {
    elements.physicalFunctionReport.hidden = true;
    elements.physicalFunctionBody.replaceChildren();
    return;
  }
  const valueText = (value) => present(value) ? `${formatDecimal(value, 1)} kg` : "미측정";
  const differenceText = present(grip.differenceKg) ? `${formatDecimal(grip.differenceKg, 1)} kg` : "계산하지 않음";
  const measurementNote = grip.measurementStatus === "right-only"
    ? "오른손만 측정되었습니다."
    : grip.measurementStatus === "left-only"
      ? "왼손만 측정되었습니다."
      : grip.measurementStatus === "legacy"
        ? "기존 단일 악력 기록을 대표값으로 표시했습니다."
        : grip.asymmetryObserved
          ? "좌우 악력 차이가 관찰됩니다. 질환을 의미하는 판정은 아니며 추적 관찰용 보조지표입니다."
          : "좌우 중 높은 값을 신체기능 평가의 대표 악력으로 사용합니다.";
  elements.physicalFunctionBody.innerHTML = `
    <div class="physical-function-heading"><strong>${formatDecimal(grip.representative, 1)} kg</strong><span>대표 악력 · ${grip.label}</span></div>
    <dl class="physical-domain-grid grip-result-grid">
      <div><dt>오른손</dt><dd>${valueText(grip.right)}</dd></div>
      <div><dt>왼손</dt><dd>${valueText(grip.left)}</dd></div>
      <div><dt>대표 악력</dt><dd>${formatDecimal(grip.representative, 1)} kg</dd></div>
      <div><dt>좌우 차이</dt><dd>${differenceText}</dd></div>
    </dl>
    <p class="physical-function-explanation">${measurementNote}</p>
  `;
  elements.physicalFunctionReport.hidden = false;
}

function liverNormalMessage(data, results) {
  const liverAxis = results.axes.find((axis) => axis.key === "liver");
  if (!liverAxis || liverAxis.score < 16) return [];
  const messages = ["현재 측정한 간수치는 대체로 양호합니다."];
  if (data.tg >= 150 || results.parts.tgHdl?.ratio >= 3.5 || data.visceralFat >= 10 || data.waist >= 85) {
    messages.push("다만 정상 간수치만으로 지방간을 완전히 배제할 수는 없습니다.");
  }
  return messages;
}

function hsCrpInterpretationNotes(data) {
  const notes = [];
  if (!present(data.hsCrp)) return notes;
  if (data.hsCrp > 10) {
    notes.push("hs-CRP가 10 mg/L를 초과해 급성 염증 가능성이 있습니다. 만성염증축 판정을 보류하고, 급성 원인을 확인한 뒤 안정된 상태에서 재검을 권고합니다.");
    return notes;
  }
  if (data.hsCrp > 0.2 && data.hsCrp < 1) {
    notes.push("hs-CRP 0.20 mg/L 이하는 공덕경희한의원의 생활관리용 최적 목표이며 질병 진단 경계값은 아닙니다. 현재 수치는 변화 추적과 생활습관 관리에 활용합니다.");
  } else if (data.hsCrp >= 1 && data.hsCrp <= 10) {
    notes.push("hs-CRP 상승은 현재 염증 부담을 살펴보는 관리지표이며, 감염이나 다른 염증 원인이 의심되면 원인 확인과 재평가가 우선입니다.");
    if (data.hsCrp > 3) notes.push("hs-CRP가 3 mg/L를 초과해 감염, 치주질환, 외상, 수술, 염증성 질환 등 다른 원인을 함께 확인해야 합니다.");
  }
  return notes;
}

function inflammationInterpretationNotes(data, results) {
  const notes = hsCrpInterpretationNotes(data);
  const inflammation = results.parts.inflammation;
  if (present(inflammation?.graLymRatio)) {
    notes.push("GRA/LYM ratio는 백혈구 감별검사에서 과립구와 림프구의 비율을 계산한 참고지표입니다. 만성염증 점수와 유형 판정에는 반영하지 않으며 다른 검사와 임상 상태를 함께 평가합니다.");
  }
  if (inflammation?.symptoms.answeredCount) {
    notes.push("염증 관련 증상 문진은 진단을 대신하지 않으며, 최근 4주간의 증상 부담과 치료 전후 변화를 평가하는 관리점수로 활용합니다.");
  }
  return notes;
}

function renderList(element, items) {
  if (!element) return;
  element.replaceChildren(...items.map((text) => {
    const row = document.createElement("li");
    row.textContent = text;
    return row;
  }));
}

function renderNotes(data, results, typeResult, validation) {
  const limits = [];
  limits.push(...liverNormalMessage(data, results));
  limits.push(...inflammationInterpretationNotes(data, results));
  if (results.parts.tbil?.ratio > 1 && !((results.parts.alt?.ratio > 1) || (results.parts.ast?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1))) {
    limits.push("총빌리루빈 단독 상승입니다. 직접·간접 빌리루빈 분획을 확인하세요.");
  }
  if (typeResult.notes.length) limits.push(...typeResult.notes);
  if (validation.warnings.length) limits.push(...validation.warnings.map((warning) => warning.text));
  if (!limits.length) limits.push("이번 결과에서 별도의 해석 제한은 표시되지 않았습니다.");
  const common = [
    "본 리포트는 질병을 진단하거나 확진하기 위한 도구가 아니라, 초진 상태와 관리 전후 변화를 비교하기 위한 임상 관리지표입니다.",
    "검사 결과는 증상, 병력, 복용약 및 추가검사와 함께 해석해야 합니다.",
    "검사 저장을 실행한 환자정보와 검사결과는 공덕경희한의원 공동 작업공간의 인증된 사용자만 접근할 수 있는 서버 데이터베이스에 기록됩니다.",
  ];
  renderList(elements.limitList, limits);
  renderList(elements.commonGuideList, common);
}

function renderValidation(validation) {
  document.querySelectorAll(".field-invalid").forEach((item) => item.classList.remove("field-invalid"));
  validation.errors.forEach((error) => field(error.fieldId)?.classList.add("field-invalid"));
  elements.generateButton.disabled = validation.errors.length > 0;
  if (!validation.errors.length && !validation.warnings.length) {
    elements.validationSummary.textContent = "";
    return;
  }
  elements.validationSummary.innerHTML = [...validation.errors, ...validation.warnings]
    .map((item) => `<p>${item.text}</p>`)
    .join("");
}

function renderType(typeResult, data, results) {
  const primary = selectedPrimaryType(typeResult, data);
  const secondary = selectedSecondaryType(typeResult, data);
  elements.primaryType.textContent = displayTypeName(primary, "\n");
  elements.secondaryType.textContent = displayTypeName(secondary, "\n");
  elements.supportTags.textContent = typeResult.tags.length ? typeResult.tags.join(" · ") : "특이 관찰항목 없음";
  const baseReason = makeTypeReason(data, results, primary);
  elements.primaryTypeReason.textContent = !primary.startsWith("E.") && /E\. (신체기능저하|근감소|근육저하)/.test(secondary)
    ? `${baseReason} ${makePhysicalFunctionTypeSentence(data)}`
    : baseReason;
  const primaryKey = typeGuideKey(primary);
  const secondaryKeys = new Set(typeGuideKeys(secondary));
  document.querySelectorAll("[data-type-guide]").forEach((item) => {
    const key = item.dataset.typeGuide;
    item.classList.toggle("is-primary-type", key === primaryKey);
    item.classList.toggle("is-secondary-type", key !== primaryKey && secondaryKeys.has(key));
  });
}

function render() {
  let data = readForm();
  const validation = validateInputs(data);
  const results = makeResults(data);
  const flags = makeRiskFlags(data, results, validation);
  const grade = applyPhysicalGradeOverride(
    getGrade(results.total, results.max, results.axes, hasCriticalResult(data, results)),
    data,
    results.max,
  );
  const typeResult = scoreTypes(data, results);
  const treatmentSuggestion = makeTreatmentSuggestion(data, results, grade, typeResult);
  if (!treatmentPlanUserEdited) {
    fillTreatmentFields(treatmentSuggestion);
    data = readForm();
  } else {
    data = maybeUpdateTotalTreatmentDuration(data, treatmentSuggestion);
  }

  renderComputed(data, results);
  renderValidation(validation);
  renderType(typeResult, data, results);
  elements.patientLine.textContent = patientLine(data);
  elements.scoreTitle.textContent = results.max === 100 ? "대사건강 종합점수" : "측정 완료 점수";
  elements.totalScore.textContent = results.max ? scorePhrase(results) : "--";
  elements.gradeLabel.textContent = grade.label;
  elements.gradeLabel.classList.toggle("is-long", grade.label.length > 10);
  elements.gradeHelp.textContent = grade.short || grade.text;
  elements.summaryComment.textContent = makeSummary(data, results, grade, typeResult, flags);

  renderFlags(flags);
  renderRadar(results.axes);
  renderPriority(results.axes);
  renderAxisCards(results.axes, data, results.parts.typeA);
  renderComprehensiveInterpretation(data, results, grade, typeResult, flags);
  renderNotes(data, results, typeResult, validation);
  renderTreatmentPlan(data, treatmentSuggestion);
  return { data, results, flags, typeResult, validation };
}

function axisScoreMap(axes) {
  return Object.fromEntries(axes.map((axis) => [axis.key, axis.status === "unavailable" || axis.status === "hold" ? null : axis.score]));
}

function itemScoreMap(axes) {
  const itemScores = {};
  axes.forEach((axis) => {
    axis.details.forEach((detail) => {
      const key = `${axis.key}:${detail.label}`;
      itemScores[key] = typeof detail.result.score === "number" ? detail.result.score : null;
    });
  });
  return itemScores;
}

function currentReportSnapshot() {
  const rendered = render();
  const primaryType = selectedPrimaryType(rendered.typeResult, rendered.data);
  const secondaryType = selectedSecondaryType(rendered.typeResult, rendered.data);
  const axes = axisScoreMap(rendered.results.axes);
  const itemScores = itemScoreMap(rendered.results.axes);
  const physicalFunction = assessPhysicalFunction(rendered.data);
  const inflammation = rendered.results.parts.inflammation;
  const clinicianReview = makeClinicianReview(rendered.data, rendered.results, rendered.validation);
  const calculatedScores = {
    totalScore: rendered.results.total,
    maxScore: rendered.results.max,
    glucoseScore: axes.glucose,
    lipidScore: axes.lipid,
    liverScore: axes.liver,
    inflammationScore: axes.inflammation,
    graLymRatio: inflammation.graLymRatio,
    trueNlr: null,
    inflammationSymptomScore: inflammation.symptoms.answeredCount ? inflammation.symptoms.score : null,
    inflammationSymptomMax: inflammation.symptoms.max,
    inflammationSymptomHealthScore: inflammation.symptoms.complete ? inflammation.symptomHealth.score : null,
    inflammationSymptomBurden: inflammation.symptoms.burden,
    inflammationSubtype: inflammation.subtype,
    autonomicScore: axes.autonomic,
    hrvIndexScore: itemScores["autonomic:HRV-Index"],
    ansActivityScore: itemScores["autonomic:ANS Activity"],
    stressScore: itemScores["autonomic:Stress"],
    snsPnsBalanceScore: itemScores["autonomic:SNS:PNS 균형"],
    snsPercent: rendered.data.snsPercent,
    pnsPercent: present(rendered.data.snsPercent) ? 100 - rendered.data.snsPercent : null,
    whtr: rendered.results.parts.typeA.whtr,
    typeAScore: rendered.results.parts.typeA.hasAnyMetric ? rendered.results.parts.typeA.score : null,
    typeAGrade: rendered.results.parts.typeA.hasAnyMetric ? rendered.results.parts.typeA.grade : "",
    typeAJudgment: rendered.results.parts.typeA.judgment,
    physicalFunctionScore: physicalFunction.hasAnyMetric ? physicalFunction.score : null,
    physicalFunctionJudgment: physicalFunction.hasAnyMetric ? physicalFunction.judgment : "",
    physicalWeightScore: physicalFunction.domainScores.weight,
    physicalIntakeScore: physicalFunction.domainScores.intake,
    physicalMuscleScore: physicalFunction.domainScores.muscle,
    physicalPerformanceScore: physicalFunction.domainScores.function,
    bmi: physicalFunction.bmi,
    weightLossRate: physicalFunction.weightLossRate,
    representativeGripStrength: physicalFunction.grip.representative,
    gripDifferenceKg: physicalFunction.grip.differenceKg,
    gripDifferencePercent: physicalFunction.grip.differencePercent,
    gripMeasurementStatus: physicalFunction.grip.measurementStatus,
    itemScores,
  };
  return {
    ...rendered,
    primaryType: displayTypeName(primaryType),
    secondaryType: displayTypeName(secondaryType),
    scoreRuleVersion: SCORE_RULE_VERSION,
    clinicianReview,
    calculatedScores,
    reportSnapshot: {
      patientLine: elements.patientLine.textContent,
      summaryComment: elements.summaryComment.textContent,
      priorityAxes: elements.priorityAxes.textContent,
      grade: elements.gradeLabel.textContent,
      gradeHelp: elements.gradeHelp.textContent,
      axisScores: rendered.results.axes.map((axis) => ({
        key: axis.key,
        label: axis.label,
        score: axis.score,
        max: axis.max,
        status: axis.status,
      })),
      typeA: {
        height: rendered.data.height,
        waist: rendered.data.waist,
        whtr: rendered.results.parts.typeA.whtr,
        visceralFat: rendered.data.visceralFat,
        score: rendered.results.parts.typeA.hasAnyMetric ? rendered.results.parts.typeA.score : null,
        grade: rendered.results.parts.typeA.hasAnyMetric ? rendered.results.parts.typeA.grade : "",
        judgment: rendered.results.parts.typeA.judgment,
      },
      inflammation: {
        hsCrp: rendered.data.hsCrp,
        graPercent: rendered.data.graPercent,
        lymPercent: rendered.data.lymPercent,
        graLymRatio: inflammation.graLymRatio,
        trueNlr: null,
        score: axes.inflammation,
        symptomScore: inflammation.symptoms.answeredCount ? inflammation.symptoms.score : null,
        symptomMax: inflammation.symptoms.max,
        symptomHealthScore: inflammation.symptoms.complete ? inflammation.symptomHealth.score : null,
        symptomBurden: inflammation.symptoms.burden,
        keyAreas: inflammation.symptoms.keyAreas,
        subtype: inflammation.subtype,
      },
      physicalFunction: {
        score: physicalFunction.hasAnyMetric ? physicalFunction.score : null,
        max: physicalFunction.max,
        judgment: physicalFunction.judgment,
        domainScores: physicalFunction.domainScores,
        tags: physicalFunction.tags,
        bmi: physicalFunction.bmi,
        weightLossRate: physicalFunction.weightLossRate,
        rightGripStrength: physicalFunction.grip.right,
        leftGripStrength: physicalFunction.grip.left,
        representativeGripStrength: physicalFunction.grip.representative,
        gripDifferenceKg: physicalFunction.grip.differenceKg,
        gripDifferencePercent: physicalFunction.grip.differencePercent,
        gripMeasurementStatus: physicalFunction.grip.measurementStatus,
      },
      treatmentPlan: {
        primaryProgram: rendered.data.treatmentProgramPrimary,
        secondaryProgram: rendered.data.treatmentProgramSecondary,
        tertiaryProgram: rendered.data.treatmentProgramTertiary,
        primaryDuration: rendered.data.treatmentDurationPrimary,
        secondaryDuration: rendered.data.treatmentDurationSecondary,
        tertiaryDuration: rendered.data.treatmentDurationTertiary,
        duration: rendered.data.treatmentDuration,
        goals: rendered.data.treatmentGoals,
        focusItems: focusLabelsFromData(rendered.data),
        focusCustom: rendered.data.treatmentFocusCustom,
      },
    },
  };
}

function isTreatmentInputId(id) {
  return TREATMENT_FIELD_IDS.includes(id) || TREATMENT_FOCUS_FIELDS.some(([fieldId]) => fieldId === id);
}

function normalizePhysicalScaleValue(value, legacyTriggered = false) {
  if (value === true) return 5;
  if (value === false) return 0;
  if (present(value) && Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(5, Math.round(Number(value))));
  }
  return legacyTriggered ? 5 : null;
}

function normalizePhysicalFunctionValues(values) {
  return {
    ...values,
    appetiteReduced: normalizePhysicalScaleValue(values.appetiteReduced,
      values.mealAmountReduced ||
      values.difficultyFinishingMeal ||
      values.lowProteinStatus === "있음"
    ),
    earlySatiety: normalizePhysicalScaleValue(values.earlySatiety),
    frequentIndigestion: normalizePhysicalScaleValue(values.frequentIndigestion, values.postMealDiscomfort),
    foodAvoidanceDueDiscomfort: normalizePhysicalScaleValue(values.foodAvoidanceDueDiscomfort,
      values.reducedIntakeDueDigestion ||
      values.recurrentDiarrhea
    ),
    fatigueActivityReduced: normalizePhysicalScaleValue(
      values.fatigueActivityReduced,
      values.functionalDeclineStatus === "있음",
    ),
    walkingStairsDifficulty: normalizePhysicalScaleValue(values.walkingStairsDifficulty),
  };
}

function setValues(values) {
  const nextValues = normalizePhysicalFunctionValues(values);
  const durationProgramPairs = [
    ["treatmentDurationPrimary", "treatmentProgramPrimary"],
    ["treatmentDurationSecondary", "treatmentProgramSecondary"],
    ["treatmentDurationTertiary", "treatmentProgramTertiary"],
  ];
  for (const [durationId, programId] of durationProgramPairs) {
    if (!Object.prototype.hasOwnProperty.call(nextValues, durationId)) continue;
    nextValues[durationId] = normalizeTreatmentDuration(nextValues[durationId]) || (nextValues[programId] ? "3개월" : "");
  }
  if (Object.prototype.hasOwnProperty.call(values, "treatmentDuration")) treatmentDurationUserEdited = false;
  if (!present(nextValues.weightLossContext) && nextValues.weightLossStatus === "있음") nextValues.weightLossContext = "있음";
  if (nextValues.weightLossContext === "비의도적") nextValues.weightLossContext = "있음";
  if (nextValues.weightLossContext === "의도적") nextValues.weightLossContext = "없음";
  if (!present(nextValues.treatmentFocusCustom) && present(nextValues.treatmentPlan)) {
    nextValues.treatmentFocusCustom = nextValues.treatmentPlan;
  }
  if (Object.keys(nextValues).some((id) => isTreatmentInputId(id) && present(nextValues[id]))) treatmentPlanUserEdited = true;
  for (const [id, value] of Object.entries(nextValues)) {
    if (LINEAR_SCALE_FIELDS.some(([fieldId]) => fieldId === id)) {
      linearScaleInputs(id).forEach((input) => {
        input.checked = present(value) && Number(input.value) === Number(value);
      });
      continue;
    }
    const input = field(id);
    if (!input) continue;
    if (checkboxFields.has(id)) input.checked = Boolean(value);
    else if (["hrvIndexGrade", "ansActivity", "stressGrade"].includes(id)) input.value = normalizeGrade(value);
    else input.value = value ?? "";
  }
  render();
}

function formatBirthDate(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function setupBirthDateInputs() {
  ["birthDate", "newBirthDate"].forEach((id) => {
    const input = field(id);
    if (!input) return;
    input.addEventListener("input", () => {
      const formatted = formatBirthDate(input.value);
      if (input.value !== formatted) input.value = formatted;
    });
    input.addEventListener("blur", () => {
      input.value = formatBirthDate(input.value);
    });
  });
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fillSample() {
  treatmentPlanUserEdited = false;
  treatmentDurationUserEdited = false;
  setValues({
    patientName: "홍길동",
    chartNumber: "GK-24001",
    sex: "남성",
    age: 52,
    testDate: localDateKey(),
    hba1c: 5.9,
    tg: 210,
    hdl: 40,
    totalChol: 226,
    ldl: 148,
    alt: 58,
    ggt: 74,
    tbil: 1.1,
    hsCrp: 2.4,
    visceralFat: 12,
    waist: 92,
    height: 170,
    sbp: 136,
    dbp: 86,
    hrvIndexValue: 18.6,
    hrvIndexGrade: "보통",
    ansActivity: "높음",
    stressGrade: "높음",
    snsPercent: 59,
  });
}

function resetForm() {
  if (!confirm("전체 입력값을 지울까요?")) return;
  elements.form.reset();
  treatmentPlanUserEdited = false;
  treatmentDurationUserEdited = false;
  setValues({
    testDate: localDateKey(),
  });
  elements.generateButton.textContent = "리포트 생성";
  elements.generateStatus.textContent = "입력값은 자동 계산되며, 버튼을 누르면 출력용 리포트로 이동합니다.";
}

function resetForPatient(values = {}) {
  elements.form.reset();
  treatmentPlanUserEdited = false;
  treatmentDurationUserEdited = false;
  setValues({
    patientName: values.patientName || "",
    chartNumber: values.chartNumber || "",
    sex: values.sex || "",
    birthDate: values.birthDate || "",
    age: values.age ?? "",
    testDate: values.testDate || localDateKey(),
    previousWeight: values.previousWeight ?? "",
  });
  elements.generateButton.textContent = "리포트 생성";
  elements.generateStatus.textContent = "새 환자 정보가 적용되었습니다. 검사수치를 입력한 뒤 리포트를 생성하세요.";
}

function generateReport() {
  const rendered = render();
  if (rendered.validation.errors.length) {
    elements.generateStatus.textContent = "입력 오류를 먼저 확인하세요.";
    return;
  }
  const report = document.querySelector("#report");
  report.classList.remove("generated");
  void report.offsetWidth;
  report.classList.add("generated");
  report.scrollIntoView({ behavior: "smooth", block: "start" });
  report.setAttribute("tabindex", "-1");
  report.focus({ preventScroll: true });
  elements.generateStatus.textContent = "리포트가 생성되었습니다. 오른쪽 또는 아래쪽 출력 화면을 확인하세요.";
  elements.generateButton.textContent = "리포트 다시 생성";
}

function setupManualTypeSelects() {
  for (const select of [elements.manualPrimaryType, elements.manualSecondaryType]) {
    select.replaceChildren(...TYPE_OPTIONS.map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
  }
}

function setupTreatmentProgramSelects() {
  for (const id of ["treatmentProgramPrimary", "treatmentProgramSecondary", "treatmentProgramTertiary"]) {
    const select = field(id);
    select.replaceChildren(...TREATMENT_PROGRAMS.map((program) => {
      const option = document.createElement("option");
      option.value = program.id;
      option.textContent = program.name;
      return option;
    }));
  }
}

function regenerateTreatmentPlan() {
  const data = readForm();
  const validation = validateInputs(data);
  const results = makeResults(data);
  const grade = applyPhysicalGradeOverride(
    getGrade(results.total, results.max, results.axes, hasCriticalResult(data, results)),
    data,
    results.max,
  );
  const typeResult = scoreTypes(data, results);
  fillTreatmentFields(makeTreatmentSuggestion(data, results, grade, typeResult));
  treatmentPlanUserEdited = true;
  treatmentDurationUserEdited = false;
  render();
}

elements.form.addEventListener("input", (event) => {
  if (event.target.id === "treatmentDuration" && !treatmentPlanApplyingAuto) treatmentDurationUserEdited = true;
  if (isTreatmentInputId(event.target.id) && !treatmentPlanApplyingAuto) treatmentPlanUserEdited = true;
  render();
});
elements.form.addEventListener("change", (event) => {
  if (event.target.id === "treatmentDuration" && !treatmentPlanApplyingAuto) treatmentDurationUserEdited = true;
  if (isTreatmentInputId(event.target.id) && !treatmentPlanApplyingAuto) treatmentPlanUserEdited = true;
  render();
});
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateReport();
});
elements.generateButton.addEventListener("click", generateReport);
elements.generateTreatmentPlanButton.addEventListener("click", regenerateTreatmentPlan);
elements.sampleButton.addEventListener("click", fillSample);
elements.resetButton.addEventListener("click", resetForm);
elements.printButton.addEventListener("click", () => {
  render();
  const printGuide = "깔끔한 PDF 저장을 위해 인쇄 설정에서\n'머리글과 바닥글' 옵션을 해제해 주세요.\n\n용지: A4\n방향: 세로\n여백: 기본 또는 없음\n배경 그래픽: 켜기\n머리글과 바닥글: 끄기";
  elements.printStatus.textContent = "PDF 저장창에서 '머리글과 바닥글' 옵션을 해제해 주세요.";
  elements.printButton.textContent = "인쇄창 열기";
  alert(printGuide);
  setTimeout(() => window.print(), 80);
});

setupManualTypeSelects();
setupTreatmentProgramSelects();
setupBirthDateInputs();
setupLinearScales();
setValues({
  testDate: localDateKey(),
});
window.metabolicReportApp = {
  render,
  readForm,
  setValues,
  resetForPatient,
  localDateKey,
  generateReport,
  snapshot: currentReportSnapshot,
  scoreRuleVersion: SCORE_RULE_VERSION,
};
window.__metabolicReportReady = true;
