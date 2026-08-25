const AXIS_MAX = 20;
const SCORE_RULE_VERSION = "metabolic-score-v3.5";
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
  ["A. 복부비만 우세형", "복부비만 우세형"],
  ["B. 인슐린 저항 우세형", "인슐린 저항 우세형"],
  ["C. 만성염증 우세형", "만성염증 우세형"],
  ["D. 자율신경(스트레스) 우세형", "자율신경(스트레스) 우세형"],
  ["E. 신체기능저하형", "신체기능저하형"],
  ["F. 복합 대사위험형", "복합 대사위험형"],
  ["대사 균형형", "대사 균형형"],
  ["특정 우세형 없음", "특정 우세형 없음"],
  ["해당 없음", "해당 없음"],
];

const AXIS_SHORT_COMMENTS = {
  glucose: "혈당 상태와 인슐린 저항성 관련 패턴",
  lipid: "중성지방과 HDL-C 균형",
  liver: "간수치와 빌리루빈 상태",
  inflammation: "hs-CRP로 확인한 저강도 염증 상태",
  autonomic: "혈압, HRV와 신체적 스트레스 반응",
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

const PHYSICAL_FUNCTION_CHECKBOX_FIELDS = [
  "appetiteReduced",
  "mealAmountReduced",
  "difficultyFinishingMeal",
  "earlySatiety",
  "frequentIndigestion",
  "postMealDiscomfort",
  "reducedIntakeDueDigestion",
  "recurrentDiarrhea",
  "foodAvoidanceDueDiscomfort",
  "fatigueActivityReduced",
  "walkingStairsDifficulty",
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
  detailTable: document.querySelector("#detailTable"),
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
  whtrCalc: document.querySelector("#whtrCalc"),
  physicalFunctionCalc: document.querySelector("#physicalFunctionCalc"),
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
  "gripStrength",
]);

const checkboxFields = new Set([
  ...TREATMENT_FOCUS_FIELDS.map(([id]) => id),
  ...PHYSICAL_FUNCTION_CHECKBOX_FIELDS,
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

function readValue(id) {
  const input = field(id);
  if (!input) return null;
  if (checkboxFields.has(id)) return input.checked;
  if (numberFields.has(id)) {
    const value = Number(input.value);
    return input.value !== "" && Number.isFinite(value) ? value : null;
  }
  return input.value.trim();
}

function readForm() {
  return Object.fromEntries(allFields.map((id) => [id, readValue(id)]));
}

function present(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatDecimal(value, digits = 2) {
  if (!present(value)) return "";
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
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
  const score = 10 - (riskScore * 2.5);
  const hasAnyMetric = present(whtr) || (waistValid && sexValid) || vflValid;
  const activated = riskScore >= 2 && (present(whtr) || (waistHigh && visceralHigh));
  let judgment = !hasAnyMetric
    ? "판정 대기"
    : [
        "복부비만 소견 없음",
        "복부지방 증가 가능성",
        "복부비만 우세형 가능성 높음",
        "복부비만 우세형",
        "뚜렷한 복부비만 우세형",
      ][riskScore];
  const complete = present(whtr) && sexValid && vflValid;
  if (!complete && riskScore === 0 && hasAnyMetric) judgment = "부분 판정 · 복부비만 소견 없음";
  return {
    score,
    max: 10,
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

function assessGrip(data) {
  if (!present(data.gripStrength)) return { label: "미측정", low: false, normal: false };
  if (data.gripStrength <= 0) return { label: "입력 오류", low: false, normal: false };
  if (!data.sex) return { label: "성별 확인 필요", low: false, normal: false };
  const low = data.gripStrength < (data.sex === "남성" ? 28 : 18);
  return { label: low ? "근력 저하 기준 해당" : "정상범위", low, normal: !low };
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
  const unintentionalWeightLoss = weightLossReported && present(weightLossRate) && weightLossRate >= 5;
  const suspectedWeightLoss = weightLossReported && !unintentionalWeightLoss;

  const intakeFields = ["appetiteReduced", "mealAmountReduced", "difficultyFinishingMeal"];
  const digestionFields = [
    "earlySatiety",
    "frequentIndigestion",
    "postMealDiscomfort",
    "reducedIntakeDueDigestion",
    "recurrentDiarrhea",
    "foodAvoidanceDueDiscomfort",
  ];
  const intakeIssue = intakeFields.some((id) => Boolean(data[id]));
  const digestionIssue = digestionFields.some((id) => Boolean(data[id]));

  const smi = assessSmi(data);
  const grip = assessGrip(data);
  const abnormalMuscleCount = [smi.low, grip.low].filter(Boolean).length;
  const muscleScore = abnormalMuscleCount >= 2 ? 2 : abnormalMuscleCount === 1 ? 1 : 0;
  const fatigueIssue = Boolean(data.fatigueActivityReduced);
  const mobilityIssue = Boolean(data.walkingStairsDifficulty);

  const domainRiskScores = {
    weight: (lowBmi ? 1 : 0) + (unintentionalWeightLoss ? 1 : 0),
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
    lowBmi ? "저체중" : "",
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
    bmi,
    weightLossRate,
    data.smi,
    data.gripStrength,
    data.skeletalMuscleMass,
  ].some(present) || present(data.weightLossContext) || [...intakeFields, ...digestionFields, "fatigueActivityReduced", "walkingStairsDifficulty"].some((id) => Boolean(data[id]));

  return {
    score,
    max: 20,
    riskScore,
    judgment,
    activated: riskScore >= 4,
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
  return scoreByRanges(value, 10, [
    { test: (v) => v < 5.4, score: 10, label: "양호" },
    { test: (v) => v <= 5.6, score: 8, label: "정상범위 상단" },
    { test: (v) => v <= 5.9, score: 6, label: "당뇨병 전단계 범위" },
    { test: (v) => v <= 6.4, score: 3, label: "혈당 관리 필요" },
    { test: (v) => v >= 6.5, score: 0, label: "당뇨병 진단범위" },
  ]);
}

function scoreTgHdl(tg, hdl) {
  if (!present(tg) || !present(hdl) || hdl <= 0) return missing(10);
  const ratio = tg / hdl;
  const result = scoreByRanges(ratio, 10, [
    { test: (v) => v <= 2, score: 10, label: "지질대사 균형 양호" },
    { test: (v) => v <= 2.49, score: 8, label: "지질대사 균형 관찰" },
    { test: (v) => v <= 2.99, score: 6, label: "인슐린 저항 관련 지표 관찰" },
    { test: (v) => v <= 3.49, score: 3, label: "지질대사 관리 필요" },
    { test: (v) => v >= 3.5, score: 0, label: "지질대사 집중 관리 필요" },
  ]);
  return { ...result, ratio };
}

function scoreTg(value) {
  return scoreByRanges(value, 10, [
    { test: (v) => v < 100, score: 10, label: "양호" },
    { test: (v) => v <= 149, score: 8, label: "정상범위 상단" },
    { test: (v) => v <= 174, score: 6, label: "경계" },
    { test: (v) => v <= 199, score: 4, label: "식사 영향 가능" },
    { test: (v) => v <= 439, score: 2, label: "높음" },
    { test: (v) => v >= 440, score: 0, label: "공복 재검 또는 별도 평가" },
  ]);
}

function scoreNonHdl(totalChol, hdl) {
  if (!present(totalChol) || !present(hdl)) return missing(10);
  const value = totalChol - hdl;
  const result = scoreByRanges(value, 10, [
    { test: (v) => v < 130, score: 10, label: "양호" },
    { test: (v) => v <= 154, score: 8, label: "권장범위 상단" },
    { test: (v) => v <= 184, score: 6, label: "상승" },
    { test: (v) => v <= 219, score: 3, label: "높음" },
    { test: (v) => v >= 220, score: 0, label: "상당히 높음" },
  ]);
  return { ...result, value };
}

function scoreUln(value, uln, max, scores) {
  if (!present(value)) return missing(max);
  if (!present(uln) || uln <= 0) return hold(max, "ULN 입력 오류");
  const ratio = value / uln;
  const result = scoreByRanges(ratio, max, [
    { test: (v) => v <= 1, score: scores[0], label: "정상범위 이내" },
    { test: (v) => v <= 1.5, score: scores[1], label: "경도 상승" },
    { test: (v) => v <= 2, score: scores[2], label: "상승" },
    { test: (v) => v <= 3, score: scores[3], label: "추가 평가" },
    { test: (v) => v > 3, score: 0, label: "원인 확인 우선" },
  ]);
  return { ...result, ratio };
}

function getUln(data, key) {
  const fieldName = `${key}Uln`;
  return present(data[fieldName]) ? data[fieldName] : DEFAULT_ULN[key];
}

function scoreHsCrp(value) {
  if (!present(value)) return missing(20);
  if (value > 10) return hold(20, "급성 염증원 확인 후 재검");
  return scoreByRanges(value, 20, [
    { test: (v) => v <= 0.2, score: 20, label: "최적 수준" },
    { test: (v) => v <= 0.3, score: 18, label: "낮은 수준" },
    { test: (v) => v <= 0.4, score: 16, label: "낮은 수준" },
    { test: (v) => v <= 0.5, score: 14, label: "저강도 염증 관찰" },
    { test: (v) => v <= 0.6, score: 12, label: "저강도 염증 관찰" },
    { test: (v) => v <= 0.7, score: 10, label: "저강도 염증 관찰" },
    { test: (v) => v <= 0.8, score: 8, label: "경도 상승" },
    { test: (v) => v <= 0.99, score: 5, label: "경도 상승" },
    { test: (v) => v <= 1.99, score: 2, label: "지속 염증 확인 필요" },
    { test: (v) => v <= 10, score: 0, label: "염증 수치 상승" },
  ]);
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
    높음: [4, "양호"],
    보통: [3, "보통"],
    낮음: [2, "낮음"],
    매우낮음: [1, "매우 낮음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreAnsActivity(grade, invalid) {
  if (invalid) return hold(5, "판정 보류");
  const map = {
    매우높음: [5, "매우 양호"],
    높음: [4, "양호"],
    보통: [3, "보통"],
    낮음: [2, "낮음"],
    매우낮음: [1, "매우 낮음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreStress(grade, invalid) {
  if (invalid) return hold(5, "판정 보류");
  const map = {
    매우낮음: [5, "매우 낮음"],
    낮음: [4, "낮음"],
    보통: [3, "보통"],
    높음: [2, "높음"],
    매우높음: [1, "매우 높음"],
  };
  const normalized = normalizeGrade(grade);
  return map[normalized] ? scored(map[normalized][0], 5, map[normalized][1]) : missing(5);
}

function scoreSnsPnsBalance(snsPercent, invalid) {
  if (invalid) return hold(5, "판정 보류");
  if (!present(snsPercent)) return missing(5);
  const difference = Math.abs(snsPercent - 50);
  if (difference <= 2) return scored(5, 5, "균형 양호");
  if (difference <= 4) return scored(4, 5, "가벼운 치우침");
  if (difference <= 6) return scored(3, 5, "치우침 관찰");
  if (difference <= 8) return scored(2, 5, "균형 관리 필요");
  return scored(1, 5, "뚜렷한 치우침");
}

function autonomicGrade(score) {
  if (score >= 18) return "매우 양호";
  if (score >= 15) return "양호";
  if (score >= 11) return "관리 필요";
  if (score >= 8) return "저하";
  return "뚜렷한 저하";
}

function autonomicPatientComment(score) {
  if (score >= 18) return "자율신경 균형이 양호합니다.";
  if (score >= 15) return "자율신경의 전체적인 활동과 회복력이 비교적 안정적입니다.";
  if (score >= 11) return "스트레스와 회복 상태에 대한 관리가 필요합니다.";
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
  const score = availableDetails.reduce((sum, detail) => sum + (detail.result.score ?? 0), 0);
  const max = availableDetails.reduce((sum, detail) => sum + detail.result.max, 0);
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

function getGrade(total, max) {
  if (!max) return { label: "계산 대기", text: "입력된 핵심 검사값이 부족합니다." };
  if (max < 100) return { label: "부분 판정", text: "일부 축이 미측정이므로 측정 완료 점수로 해석합니다." };
  if (total >= 85) return { label: "건강", text: "전반적으로 건강한 상태입니다.", short: "전반적으로 건강한 상태" };
  if (total >= 70) return { label: "양호", text: "일부 영역의 개선과 추적관찰이 필요합니다.", short: "대체로 양호한 상태" };
  if (total >= 55) return { label: "관리필요", text: "여러 대사영역의 관리가 필요합니다.", short: "관리가 필요한 상태" };
  return { label: "적극관리필요", text: "원인 확인과 적극적인 관리가 필요합니다.", short: "적극적인 관리가 필요한 상태" };
}

function makeResults(data) {
  const hrvLimited = hasHrvLimit(data);
  const hba1c = scoreHba1c(data.hba1c);
  const tgHdl = scoreTgHdl(data.tg, data.hdl);
  const tg = scoreTg(data.tg);
  const nonHdl = scoreNonHdl(data.totalChol, data.hdl);
  const alt = scoreUln(data.alt, getUln(data, "alt"), 10, [10, 8, 5, 2]);
  const ggt = scoreUln(data.ggt, getUln(data, "ggt"), 6, [6, 5, 3, 1]);
  const tbilRaw = scoreUln(data.tbil, getUln(data, "tbil"), 4, [4, 3, 2, 1]);
  const tbil = tbilRaw;
  const ast = scoreUln(data.ast, getUln(data, "ast"), 0, [0, 0, 0, 0]);
  const alp = scoreUln(data.alp, getUln(data, "alp"), 0, [0, 0, 0, 0]);
  const waist = assessWaist(data.sex, data.waist);
  const typeA = assessTypeA(data);
  const hsCrp = scoreHsCrp(data.hsCrp);
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
        { label: "non-HDL-C", result: nonHdl, value: present(nonHdl.value) ? `${nonHdl.value} mg/dL` : null },
      ],
      "중성지방과 HDL-C 균형을 함께 살펴봅니다.",
      !present(data.tg) && !(present(data.totalChol) && present(data.hdl)),
    ),
    makeAxis(
      "liver",
      "간대사",
      [
        { label: "ALT", result: alt, value: present(data.alt) ? `${data.alt} U/L` : null },
        { label: "GGT", result: ggt, value: present(data.ggt) ? `${data.ggt} U/L` : null },
        { label: "TBIL", result: tbil, value: present(data.tbil) ? `${data.tbil} mg/dL` : null },
        { label: "AST", result: ast, value: present(data.ast) ? `${data.ast} U/L` : null, reference: true },
        { label: "ALP", result: alp, value: present(data.alp) ? `${data.alp} U/L` : null, reference: true },
      ],
      "간수치, 담도 관련 지표, 빌리루빈 상태를 함께 평가합니다.",
      !present(data.alt) && !present(data.ggt) && !present(data.tbil),
    ),
    makeAxis(
      "inflammation",
      "만성염증",
      [
        { label: "hs-CRP", result: hsCrp, value: present(data.hsCrp) ? `${data.hsCrp} mg/L` : null },
        { label: "내장지방레벨", result: visceralFat, value: present(data.visceralFat) ? `${data.visceralFat}` : null, reference: true },
        { label: "허리둘레", result: waist, value: present(data.waist) ? `${data.waist} cm` : null, reference: true },
      ],
      "hs-CRP로 저강도 염증 상태를 평가합니다.",
      !present(data.hsCrp),
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

  return { axes, total, max, parts: { hba1c, tgHdl, tg, nonHdl, alt, ggt, tbil, ast, alp, waist, typeA, hsCrp, visceralFat, restingHr, bloodPressure, hrvIndex, ansActivity, stress, snsPnsBalance }, hrvLimited };
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
  if (present(data.gripStrength) && data.gripStrength <= 0) addError("gripStrength", "악력은 0보다 커야 합니다.");
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
  if (present(data.tbil) && data.tbil > 20) addWarning("tbil", "TBIL 값이 매우 큽니다. 단위를 확인하세요.");
  if (present(data.sbp) && (data.sbp < 60 || data.sbp > 260)) addWarning("sbp", "수축기혈압 단위를 확인하세요.");
  return { errors, warnings };
}

function makeRiskFlags(data, results, validation) {
  const flags = [];
  const add = (type, title, value, description) => flags.push({ type, title, value, description, text: [title, value, description].filter(Boolean).join(" ") });
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);

  if (validation.errors.length > 0) add("warning", "입력 오류", "", "입력 오류가 있어 리포트 생성을 제한했습니다.");
  if (data.hba1c >= 6.5) add("warning", "HbA1c", `${data.hba1c}%`, "당뇨병 진단범위에 해당해 별도 확인이 필요합니다.");
  if (data.tg >= 500) {
    add("warning", "중성지방", `${data.tg} mg/dL`, "500 mg/dL 이상으로 중성지방 관련 별도 평가가 필요합니다.");
  } else if (data.tg >= 440) {
    add("caution", "중성지방", `${data.tg} mg/dL`, "비공복 재검 권고 기준을 초과하여 공복 지질검사로 재확인을 권고합니다.");
  }
  if (data.ldl >= 190) add("warning", "LDL-C", `${data.ldl} mg/dL`, "190 mg/dL 이상으로 별도의 심혈관 위험 평가가 필요합니다.");
  if (results.parts.nonHdl?.value >= 220) add("warning", "non-HDL-C", `${results.parts.nonHdl.value} mg/dL`, "220 mg/dL 이상으로 지질 관련 위험이 높은 기준에 해당합니다.");
  if (results.parts.alt?.ratio >= 3 || results.parts.ast?.ratio >= 3) {
    const liverValues = [
      results.parts.alt?.ratio >= 3 && present(data.alt) ? `ALT ${data.alt} U/L` : "",
      results.parts.ast?.ratio >= 3 && present(data.ast) ? `AST ${data.ast} U/L` : "",
    ].filter(Boolean).join(", ");
    add("warning", "간수치", liverValues, "기준 범위를 크게 초과하여 간 관련 원인 확인이 우선입니다.");
  }
  if (results.parts.tbil?.ratio > 1 && liverAbnormal) add("warning", "총빌리루빈", `${data.tbil} mg/dL`, "간수치 이상이 동반되어 추가 평가가 필요합니다.");
  if (data.hsCrp > 10) add("warning", "hs-CRP", `${data.hsCrp} mg/L`, "10 mg/L를 초과해 급성 염증 가능성이 있습니다. 만성염증축 판정을 보류하고 급성 원인 확인 후 재검을 권고합니다.");
  if (data.sbp >= 180 || data.dbp >= 120) add("warning", "혈압", `${data.sbp || "-"}/${data.dbp || "-"} mmHg`, "180/120 mmHg 이상으로 재확인과 진료 상담이 필요합니다.");
  if (results.hrvLimited) add("warning", "HRV-Index", "판독 제한", "HRV 판독 제한 조건이 있어 자율신경(스트레스) 축 판정을 보류합니다.");
  return flags;
}

function scoreTypes(data, results) {
  const tags = [];
  const candidates = [];
  const addCandidate = (code, name, strength, reasons) => {
    if (strength > 0) candidates.push({ code, name, strength, reasons });
  };
  const axisTypeMap = {
    glucose: "B. 인슐린 저항 우세형",
    lipid: "B. 인슐린 저항 우세형",
    liver: "0. 간관리 선행형",
    inflammation: "C. 만성염증 우세형",
    autonomic: "D. 자율신경(스트레스) 우세형",
  };
  const supplementalTypes = priorityAxes(results.axes, 3)
    .map((axis) => axisTypeMap[axis.key])
    .filter(Boolean);
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
  const hba1cHigh = data.hba1c >= 5.7;
  const tgHdlHigh = results.parts.tgHdl?.ratio >= 3.5;
  const tgHdlModerate = results.parts.tgHdl?.ratio >= 2.5;
  const acuteInflammation = data.hsCrp > 10;
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);
  const liverPriority =
    results.parts.alt?.ratio >= 3 ||
    results.parts.ast?.ratio >= 3 ||
    (results.parts.tbil?.ratio > 1 && liverAbnormal);

  if (visceralHigh) tags.push("내장지방 증가");
  if (typeA.riskScore === 1) tags.push("복부지방 증가 경향");
  if (highTg) tags.push("고중성지방");
  if (data.sbp >= 130 || data.dbp >= 80) tags.push("혈압 경계");
  if (data.hsCrp >= 0.5 && data.hsCrp <= 10) tags.push("염증 관찰");
  if (results.parts.tbil?.ratio > 1 && !liverAbnormal) tags.push("총빌리루빈 단독 상승");

  if (liverPriority) {
    return {
      primary: "0. 간관리 선행형",
      secondary: "해당 없음",
      tags,
      notes: ["간관리 선행 기준이 충족되어 다른 타입보다 우선 표시합니다."],
      candidates: [],
    };
  }

  if (results.max === 100 && results.axes.every((axis) => axis.score >= 15)) {
    return {
      primary: "대사 균형형",
      secondary: "해당 없음",
      tags,
      notes: [],
      candidates: [],
    };
  }

  const aReasons = [typeA.whtrHigh, typeA.waistHigh, typeA.visceralHigh].filter(Boolean);
  if (typeA.activated) addCandidate("A", "A. 복부비만 우세형", typeA.riskScore, aReasons);

  const bReasons = [tgHdlHigh, hba1cHigh, tgHdlModerate && hba1cHigh, tgHdlModerate && visceralHigh].filter(Boolean);
  addCandidate("B", "B. 인슐린 저항 우세형", bReasons.length + (tgHdlHigh ? 1 : 0), bReasons);

  const hsCrpElevated = data.hsCrp >= 0.5 && data.hsCrp <= 10;
  const hsCrpOnePlus = data.hsCrp >= 1 && data.hsCrp <= 10;
  const hsCrpTwoPlus = data.hsCrp >= 2 && data.hsCrp <= 10;
  const inflammationHold = (data.hsCrp > 10) || (hsCrpElevated && acuteInflammation);
  const cReasons = [
    hsCrpOnePlus,
    hsCrpTwoPlus && !acuteInflammation,
  ].filter(Boolean);
  if (inflammationHold) {
    tags.push("만성염증형 판정 보류 — 급성 염증 가능성 확인 후 재검");
  } else {
    addCandidate("C", "C. 만성염증 우세형", cReasons.length + (hsCrpTwoPlus ? 1 : 0), cReasons);
  }

  const dReasons = [
    gradeLowOrVeryLow(data.hrvIndexGrade),
    gradeLowOrVeryLow(data.ansActivity),
    gradeHighOrVeryHigh(data.stressGrade),
    present(data.snsPercent) && Math.abs(data.snsPercent - 50) > 6,
    data.restingHr >= 90 || data.heartRate >= 90,
  ].filter(Boolean);
  addCandidate("D", "D. 자율신경(스트레스) 우세형", dReasons.length, dReasons);
  if ((data.sbp >= 130 || data.dbp >= 80) && !dReasons[0] && !dReasons[1]) tags.push("혈압 관리 필요");

  const physicalFunction = assessPhysicalFunction(data);
  physicalFunction.tags.forEach((tag) => addUnique(tags, tag));
  if (physicalFunction.activated) {
    addCandidate("E", "E. 신체기능저하형", physicalFunction.riskScore, physicalFunction.tags);
  }

  const strong = candidates.filter((item) => item.strength >= 2).sort((a, b) => b.strength - a.strength);
  if (strong.length >= 3 || (strong.length >= 2 && strong[0].strength === strong[1].strength && strong[0].strength >= 3)) {
    return {
      primary: "F. 복합 대사위험형",
      secondary: secondaryFrom("F. 복합 대사위험형", [...strong.map((item) => item.name), ...supplementalTypes]),
      tags,
      notes: [`세부 조합: ${strong.map((item) => item.name.replace(/^[A-E]\. /, "")).join(" + ")}`],
      candidates: strong,
    };
  }
  if (strong.length === 0) {
    const primary = supplementalTypes[0] || "특정 우세형 없음";
    return {
      primary,
      secondary: secondaryFrom(primary, supplementalTypes.slice(1)),
      tags,
      notes: [],
      candidates,
    };
  }
  const primary = strong[0].name;
  return {
    primary,
    secondary: secondaryFrom(primary, [
      ...(strong[1]?.strength >= 2 ? [strong[1].name] : []),
      ...supplementalTypes,
    ]),
    tags,
    notes: [],
    candidates: strong,
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

function displayTypeName(typeName) {
  return String(typeName || "")
    .replace(/(^|\+)\s*[A-Z0-9]\.\s*/g, "$1")
    .split("+")
    .map((part) => part.trim().replace(/근감소\s*우세형|근육저하형|근감소형/g, "신체기능저하형"))
    .filter(Boolean)
    .join(" + ");
}

function typeGuideKey(typeName) {
  const name = displayTypeName(typeName).replace(/\s+/g, "");
  if (!name || name === "해당없음" || name === "특정우세형없음") return "";
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

function parseDurationMonths(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const range = text.match(/^(\d+(?:\.\d+)?)\s*~\s*(\d+(?:\.\d+)?)개월$/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = text.match(/^(\d+(?:\.\d+)?)개월$/);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

function formatMonthRange(range) {
  if (!range) return "직접 상담 후 결정";
  const min = Number(range.min.toFixed(1)).toString();
  const max = Number(range.max.toFixed(1)).toString();
  return range.min === range.max ? `${min}개월` : `${min}~${max}개월`;
}

function sumTreatmentDurations(durations) {
  const activeDurations = durations.filter(Boolean);
  if (!activeDurations.length) return "";
  const ranges = activeDurations.map(parseDurationMonths);
  if (ranges.some((range) => !range)) return "직접 상담 후 결정";
  return formatMonthRange(ranges.reduce((sum, range) => ({
    min: sum.min + range.min,
    max: sum.max + range.max,
  }), { min: 0, max: 0 }));
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
    duration = "4~6개월";
    durationReason = "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.";
  } else if (results.total >= 70 && severeAxisCount === 0) {
    duration = "2~3개월";
    durationReason = "치료 기간은 예상 기간이며 실제 치료에 들어가면 조정될 수 있습니다.";
  }

  const directionBase = primaryName && primaryName !== "특정 우세형 없음"
    ? `현재 결과는 ${primaryName}${secondary && displayTypeName(secondary) !== "해당 없음" ? `과 ${displayTypeName(secondary)}` : ""} 양상이 관찰됩니다.`
    : "현재 결과는 특정 타입 하나보다 낮은 점수의 관리 필요영역을 중심으로 접근합니다.";
  const direction = `${directionBase} ${lowAxes.length ? `${lowAxes.join(" · ")} 개선을 중심으로 한 치료가 필요합니다.` : "전반적인 균형 유지와 정기 추적이 필요합니다."}`;
  const primaryDuration = duration;
  const secondaryDuration = programs[1] ? duration : "";
  const tertiaryDuration = programs[2] ? duration : "";
  const totalDuration = sumTreatmentDurations([primaryDuration, secondaryDuration, tertiaryDuration]);

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
  select.value = [...select.options].some((option) => option.value === value) ? value : "";
}

function maybeUpdateTotalTreatmentDuration(data, suggestion) {
  if (treatmentDurationUserEdited) return data;
  const primaryDuration = data.treatmentDurationPrimary;
  const secondaryDuration = data.treatmentDurationSecondary;
  const tertiaryDuration = data.treatmentDurationTertiary;
  const programDurations = [
    data.treatmentProgramPrimary ? primaryDuration : "",
    data.treatmentProgramSecondary ? secondaryDuration : "",
    data.treatmentProgramTertiary ? tertiaryDuration : "",
  ];
  const totalDuration = sumTreatmentDurations(programDurations);
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
  const sentences = [
    `종합점수는 ${scorePhrase(results)}으로, ${grade.label}입니다.`,
    lowest.length ? `특히 ${joinKorean(lowest)} 영역부터 살펴보는 것이 좋습니다.` : "입력된 검사영역을 순차적으로 살펴보는 것이 좋습니다.",
    `현재의 주된 대사 패턴은 ${displayTypeName(primary)}으로 평가됩니다.`,
  ];
  if (flags.length) sentences.push("우선 확인이 필요한 검사결과는 종합점수보다 먼저 의학적으로 확인하는 것이 좋습니다.");
  else if (limitedAxes.length) sentences.push(`${limitedAxes.join(", ")} 축은 입력값 부족 또는 판독 제한으로 별도 해석이 필요합니다.`);
  return sentences.slice(0, 4).join(" ");
}

function makeTypeReason(data, results, primary) {
  const ratio = results.parts.tgHdl?.ratio;
  const nonHdl = results.parts.nonHdl?.value;
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
      "체중 자체보다 복부에 지방이 얼마나 집중되어 있는지가 대사건강에서 중요합니다. 이번 검사에서는 허리-키 비율, 허리둘레, InBody 내장지방레벨을 함께 평가했습니다.",
    ];
    if (typeA.whtrHigh) sentences.push("키에 비해 허리둘레가 큰 편으로 복부지방 관리가 필요합니다.");
    if (typeA.waistHigh) sentences.push("한국 성인의 복부비만 기준을 초과하고 있습니다.");
    if (typeA.visceralHigh) sentences.push("InBody 검사에서 내장지방이 증가한 것으로 추정됩니다.");
    if (typeA.whtrHigh && typeA.waistHigh && typeA.visceralHigh) {
      sentences.push("세 가지 평가에서 모두 복부지방 증가가 확인되어 적극적인 복부지방 관리가 필요합니다.");
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
      ? "HbA1c는 당뇨병 진단범위에 해당하므로 타입 설명보다 별도 의학적 확인이 우선입니다."
      : data.hba1c >= 5.7
        ? "HbA1c도 당뇨병 전단계 범위에 있어 함께 추적할 필요가 있습니다."
        : present(data.hba1c)
          ? `현재 HbA1c ${data.hba1c}%는 당뇨병 전단계 범위에는 해당하지 않습니다.`
          : "";
    return `${values.join(", ")} 지표에서 인슐린 저항과 관련된 지질대사 불균형이 관찰됩니다. ${hba1cNote} 확정 진단이 아니라 현재 검사 조합에서 보이는 관리 방향입니다.`;
  }
  if (primary.startsWith("C.")) {
    const values = [
      present(data.hsCrp) ? `hs-CRP ${data.hsCrp} mg/L` : "",
      present(data.visceralFat) ? `내장지방레벨 ${data.visceralFat}` : "",
    ].filter(Boolean);
    return `${joinKorean(values) || "염증 관련 지표"}에서 저강도 염증 또는 체성분 관련 관리 필요 소견이 관찰됩니다. 급성 염증 가능성이 있으면 재평가가 우선입니다.`;
  }
  if (primary.startsWith("D.")) {
    const values = [
      data.hrvIndexGrade ? `HRV-Index ${data.hrvIndexGrade}` : "",
      data.ansActivity ? `ANS Activity ${data.ansActivity}` : "",
      data.stressGrade ? `Stress ${data.stressGrade}` : "",
      present(data.snsPercent) ? `SNS:PNS ${formatDecimal(data.snsPercent, 1)}:${formatDecimal(100 - data.snsPercent, 1)}` : "",
    ].filter(Boolean);
    return `${joinKorean(values)} 결과에서 회복력과 신체적 스트레스 반응을 함께 살펴볼 필요가 있습니다. 측정 조건에 따라 변동될 수 있어 추적 비교가 중요합니다.`;
  }
  if (primary.startsWith("E.")) {
    return makePhysicalFunctionTypeSentence(data);
  }
  if (primary.startsWith("F.")) {
    return "여러 대사 패턴이 동시에 관찰되어 한 가지 축만으로 설명하기 어렵습니다. 관리 필요영역과 관련 관찰항목을 함께 보며 단계적으로 접근하는 것이 좋습니다.";
  }
  if (primary === "대사 균형형") {
    return "5개 대사축이 모두 15점 이상으로 확인되어 특정 관리 유형보다 전반적인 균형 상태가 두드러집니다. 현재 상태를 유지하며 정기적으로 추적하는 것이 좋습니다.";
  }
  if (primary === "특정 우세형 없음") {
    return "현재 입력된 검사 조합에서는 한 가지 타입으로 뚜렷하게 묶이는 패턴이 두드러지지 않습니다. 낮은 점수의 개별 영역을 중심으로 관리 방향을 정합니다.";
  }
  if (present(nonHdl) || present(ratio)) {
    return "현재 입력된 핵심 지표에서는 특정 우세 타입보다 전반적인 균형 유지와 개별 지표 추적이 중요합니다.";
  }
  return "주타입 판정에 필요한 보조 정보가 제한적입니다. 추가 검사값을 입력하면 판정 근거가 더 구체화됩니다.";
}

function makePhysicalFunctionTypeSentence(data) {
  const assessment = assessPhysicalFunction(data);
  const sentences = [
    "혈당이나 콜레스테롤 같은 대사수치가 정상이어도 체중 감소, 식사량 저하, 근육과 근력 감소, 체력 저하가 있으면 건강관리가 필요할 수 있습니다. 이번 검사에서는 영양 섭취 상태와 근육, 근력, 일상적인 신체기능을 함께 평가했습니다.",
  ];
  if (assessment.smi.low || assessment.grip.low) {
    sentences.push("근육량이나 근력이 감소한 소견이 함께 확인되어 충분한 영양섭취와 적절한 근력운동이 중요합니다.");
  }
  if (assessment.intakeIssue || assessment.digestionIssue) {
    sentences.push("현재는 체중감량보다 충분한 영양섭취와 소화기능 회복을 우선하는 것이 중요합니다.");
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
  elements.whtrCalc.textContent = present(results.parts.typeA?.whtr)
    ? `WHtR: ${results.parts.typeA.whtr.toFixed(3)} — ${results.parts.typeA.whtrLabel}`
    : "WHtR: 키와 허리둘레 입력 후 계산";
  const physicalFunction = assessPhysicalFunction(data);
  const bmiText = present(physicalFunction.bmi) ? `BMI ${physicalFunction.bmi.toFixed(1)}` : "BMI 계산 대기";
  const weightLossText = present(physicalFunction.weightLossRate)
    ? `체중감소율 ${physicalFunction.weightLossRate.toFixed(1)}%`
    : physicalFunction.suspectedWeightLoss
      ? "최근 체중감소 의심 · 비율 미산출"
      : "체중감소율 계산 대기";
  elements.physicalFunctionCalc.textContent = `${bmiText} · ${weightLossText}`;
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
  const items = flags.map((flag) => `
    <li class="${flag.type}">
      <strong>${flag.title}${flag.value ? ` <span>${flag.value}</span>` : ""}</strong>
      <p>${flag.description}</p>
    </li>
  `).join("");
  box.innerHTML = `
    <h3>우선 확인이 필요한 검사결과</h3>
    <ul>${items}</ul>
    <p class="warning-tail">아래 대사건강점수보다 우선적인 의학적 확인이 필요합니다.</p>
  `;
  elements.flagArea.replaceChildren(box);
}

function axisTone(axis) {
  if (axis.status === "unavailable") return "입력값 부족";
  if (axis.key === "inflammation" && axis.status === "hold") return "급성 염증 배제 후 재검";
  if (axis.key === "inflammation") {
    if (axis.score >= 17) return "양호";
    if (axis.score >= 14) return "경계 관찰";
    if (axis.score >= 10) return "개선 필요";
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
    <div class="axis-score">${typeA.hasAnyMetric ? `${formatDecimal(typeA.score, 1)}/10` : "판정 대기"}</div>
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
        <div class="axis-score">${axisDisplay(axis)}${axis.status === "complete" || axis.status === "partial" ? ` · ${axis.autonomic.grade}` : ""}</div>
        <div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
        <p>${comment}</p>
        <ul class="axis-key-values">${detailRows}</ul>
        <p class="subsection-label">세부유형</p>
        <ul class="axis-key-values autonomic-patterns">${patterns}</ul>
      `;
      return card;
    }
    const keyValues = axis.details
      .filter((detail) => detail.value && !detail.reference)
      .slice(0, 3)
      .map((detail) => {
        const label = detail.result?.label && detail.result.max > 0 ? ` · ${detail.result.label}` : "";
        return `<li><span>${detail.label}</span><strong>${detail.value}${label}</strong></li>`;
      })
      .join("");
    const cardComment = axis.key === "inflammation" && axis.status === "hold"
      ? "급성 염증 가능성을 먼저 확인한 뒤 재검이 필요합니다."
      : axis.key === "inflammation" && axis.score >= 17
        ? "양호 · hs-CRP가 낮은 수준입니다."
        : axis.key === "inflammation" && axis.score >= 14
          ? "경계 관찰 · hs-CRP의 변화를 확인합니다."
          : axis.key === "inflammation" && axis.score >= 10
            ? "개선 필요 · hs-CRP 상승 요인을 확인할 필요가 있습니다."
            : axis.key === "inflammation"
              ? "우선 관리 · hs-CRP 상승 원인을 확인하고 추적할 필요가 있습니다."
              : axis.key === "liver" && axis.score >= 17
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
  const score = detail.reference ? "참고" : result?.missing ? "--" : result?.hold ? "판정 보류" : `${result.score}/${result.max}`;
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
  if (physicalFunctionInputsPresent(data)) {
    const assessment = assessPhysicalFunction(data);
    const physicalRows = [
      {
        label: "체중·BMI",
        value: [present(data.currentWeight) ? `${formatDecimal(data.currentWeight, 1)} kg` : "", present(assessment.bmi) ? `BMI ${assessment.bmi.toFixed(1)}` : ""].filter(Boolean).join(" · "),
        result: { score: assessment.domainScores.weight, max: 5, label: assessment.lowBmi ? "저체중 기준 해당" : "체중 상태 확인" },
      },
      {
        label: "최근 체중 변화",
        value: present(assessment.weightLossRate)
          ? `${assessment.weightLossRate.toFixed(1)}% 감소`
          : assessment.suspectedWeightLoss ? "감소 응답 · 비율 미산출" : null,
        result: {
          score: assessment.domainScores.weight,
          max: 5,
          label: assessment.unintentionalWeightLoss
            ? "비의도적 체중감소 기준 해당"
            : assessment.suspectedWeightLoss
              ? "최근 체중감소 의심 · 수치 확인 필요"
              : "기준 해당 없음",
        },
        reference: true,
      },
      {
        label: "섭취·소화 상태",
        value: [assessment.intakeIssue ? "섭취 감소" : "", assessment.digestionIssue ? "소화 불편" : ""].filter(Boolean).join(" · ") || "특이 응답 없음",
        result: { score: assessment.domainScores.intake, max: 5, label: assessment.intakeIssue || assessment.digestionIssue ? "관리 필요" : "특이 응답 없음" },
      },
      {
        label: "골격근량",
        value: present(data.skeletalMuscleMass) ? `${formatDecimal(data.skeletalMuscleMass, 1)} kg` : null,
        result: { score: null, max: 0, label: "추적 참고" },
        reference: true,
      },
      {
        label: "SMI",
        value: present(data.smi) ? `${formatDecimal(data.smi)} kg/m²` : null,
        result: { score: null, max: 0, label: assessment.smi.label },
        reference: true,
      },
      {
        label: "악력",
        value: present(data.gripStrength) ? `${formatDecimal(data.gripStrength, 1)} kg` : null,
        result: { score: null, max: 0, label: assessment.grip.label },
        reference: true,
      },
      {
        label: "신체 수행능력·체력",
        value: [assessment.fatigueIssue ? "쉽게 지침" : "", assessment.mobilityIssue ? "걷기·계단 어려움" : ""].filter(Boolean).join(" · ") || "특이 응답 없음",
        result: { score: assessment.domainScores.function, max: 5, label: assessment.fatigueIssue || assessment.mobilityIssue ? "체력 저하 응답" : "특이 응답 없음" },
      },
    ];
    physicalRows.filter((detail) => detail.value).forEach((detail) => rows.push(makeDetailTableRow("신체기능", detail)));
  }
  tbody.replaceChildren(...rows);
  elements.detailTable.replaceChildren(table);
}

function renderPhysicalFunction(data) {
  const assessment = assessPhysicalFunction(data);
  elements.physicalFunctionReport.hidden = !assessment.hasAnyMetric;
  if (!assessment.hasAnyMetric) {
    elements.physicalFunctionBody.replaceChildren();
    return;
  }
  const domains = [
    ["체중·체중 변화", assessment.domainScores.weight],
    ["섭취·소화", assessment.domainScores.intake],
    ["근육·근력", assessment.domainScores.muscle],
    ["신체 수행능력·체력", assessment.domainScores.function],
  ];
  const explanation = assessment.activated
    ? makePhysicalFunctionTypeSentence(data)
    : "체중, 섭취·소화, 근육·근력, 신체 수행능력을 함께 확인한 참고 평가입니다.";
  elements.physicalFunctionBody.innerHTML = `
    <div class="physical-function-heading">
      <strong>${formatDecimal(assessment.score, 1)}/20점</strong>
      <span>${assessment.judgment}</span>
    </div>
    <dl class="physical-domain-grid">
      ${domains.map(([label, score]) => `<div><dt>${label}</dt><dd>${formatDecimal(score, 1)}/5</dd></div>`).join("")}
    </dl>
    ${assessment.tags.length ? `<p class="physical-function-tags"><strong>주요 문제</strong> ${assessment.tags.join(" · ")}</p>` : ""}
    <p class="physical-function-explanation">${explanation}</p>
    <p class="physical-function-explanation"><strong>관리 방향</strong> 충분한 에너지와 단백질 섭취, 식욕과 소화기능 관리, 무리한 체중감량 제한, 점진적인 근력운동과 걷기, 충분한 수면과 휴식, 근육·근력·신체수행능력 추적</p>
  `;
}

function liverNormalMessage(data, results) {
  const liverAxis = results.axes.find((axis) => axis.key === "liver");
  if (!liverAxis || liverAxis.score < 17) return [];
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
  if (data.hsCrp >= 0.5 && data.hsCrp <= 0.99) {
    notes.push("hs-CRP는 일반적인 심혈관 위험 기준에서는 높은 범위가 아니지만, 대사건강의 최적 수준보다는 높아 저강도 염증 여부를 관찰할 필요가 있습니다.");
    if (data.visceralFat >= 6) notes.push("내장지방 상태를 함께 고려하면 생활습관과 체지방 분포를 개선하는 것이 좋습니다.");
  } else if (data.hsCrp >= 1 && data.hsCrp <= 1.99) {
    notes.push("hs-CRP가 경도 상승 범위입니다. 급성 염증 요인을 확인하고, 반복검사에서도 상승하는지 추적하는 것이 좋습니다.");
  } else if (data.hsCrp >= 2 && data.hsCrp <= 2.99) {
    notes.push("hs-CRP가 의미 있게 상승해 지속적인 저등급 염증 가능성을 확인할 필요가 있습니다. 급성 감염이나 외상 등이 없다면 일정 간격 후 재검을 권고합니다.");
  } else if (data.hsCrp >= 3 && data.hsCrp <= 10) {
    notes.push("hs-CRP가 염증 수치 상승 범위입니다. 급성 감염, 치주질환, 외상, 수술, 관절염 등 원인을 확인하고 재검이 필요합니다.");
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
  limits.push(...hsCrpInterpretationNotes(data));
  if (results.parts.tbil?.ratio > 1 && !((results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1))) {
    limits.push("총빌리루빈 단독 상승입니다. 직접·간접 빌리루빈 분획을 확인하세요.");
  }
  if (data.hsCrp > 10) limits.push("hs-CRP가 10 mg/L를 초과해 급성 염증 가능성을 확인한 뒤 안정된 상태에서 재검을 권고합니다.");
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
  elements.primaryType.textContent = displayTypeName(primary);
  elements.secondaryType.textContent = displayTypeName(secondary);
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
  const grade = getGrade(results.total, results.max);
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
  elements.gradeHelp.textContent = grade.short || grade.text;
  elements.summaryComment.textContent = makeSummary(data, results, grade, typeResult, flags);

  renderFlags(flags);
  renderRadar(results.axes);
  renderPriority(results.axes);
  renderAxisCards(results.axes, data, results.parts.typeA);
  renderDetails(results.axes, data);
  renderPhysicalFunction(data);
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
  const calculatedScores = {
    totalScore: rendered.results.total,
    maxScore: rendered.results.max,
    glucoseScore: axes.glucose,
    lipidScore: axes.lipid,
    liverScore: axes.liver,
    inflammationScore: axes.inflammation,
    autonomicScore: axes.autonomic,
    hrvIndexScore: itemScores["autonomic:HRV-Index"],
    ansActivityScore: itemScores["autonomic:ANS Activity"],
    stressScore: itemScores["autonomic:Stress"],
    snsPnsBalanceScore: itemScores["autonomic:SNS:PNS 균형"],
    snsPercent: rendered.data.snsPercent,
    pnsPercent: present(rendered.data.snsPercent) ? 100 - rendered.data.snsPercent : null,
    whtr: rendered.results.parts.typeA.whtr,
    typeAScore: rendered.results.parts.typeA.hasAnyMetric ? rendered.results.parts.typeA.score : null,
    typeAJudgment: rendered.results.parts.typeA.judgment,
    physicalFunctionScore: physicalFunction.hasAnyMetric ? physicalFunction.score : null,
    physicalFunctionJudgment: physicalFunction.hasAnyMetric ? physicalFunction.judgment : "",
    physicalWeightScore: physicalFunction.domainScores.weight,
    physicalIntakeScore: physicalFunction.domainScores.intake,
    physicalMuscleScore: physicalFunction.domainScores.muscle,
    physicalPerformanceScore: physicalFunction.domainScores.function,
    bmi: physicalFunction.bmi,
    weightLossRate: physicalFunction.weightLossRate,
    itemScores,
  };
  return {
    ...rendered,
    primaryType: displayTypeName(primaryType),
    secondaryType: displayTypeName(secondaryType),
    scoreRuleVersion: SCORE_RULE_VERSION,
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
        judgment: rendered.results.parts.typeA.judgment,
      },
      physicalFunction: {
        score: physicalFunction.hasAnyMetric ? physicalFunction.score : null,
        max: physicalFunction.max,
        judgment: physicalFunction.judgment,
        domainScores: physicalFunction.domainScores,
        tags: physicalFunction.tags,
        bmi: physicalFunction.bmi,
        weightLossRate: physicalFunction.weightLossRate,
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

function setValues(values) {
  const nextValues = { ...values };
  if (!present(nextValues.weightLossContext) && nextValues.weightLossStatus === "있음") nextValues.weightLossContext = "있음";
  if (nextValues.weightLossContext === "비의도적") nextValues.weightLossContext = "있음";
  if (nextValues.weightLossContext === "의도적") nextValues.weightLossContext = "없음";
  if (!present(nextValues.mealAmountReduced) && nextValues.lowProteinStatus === "있음") nextValues.mealAmountReduced = true;
  if (!present(nextValues.fatigueActivityReduced) && nextValues.functionalDeclineStatus === "있음") nextValues.fatigueActivityReduced = true;
  if (!present(nextValues.treatmentFocusCustom) && present(nextValues.treatmentPlan)) {
    nextValues.treatmentFocusCustom = nextValues.treatmentPlan;
  }
  if (Object.keys(nextValues).some((id) => isTreatmentInputId(id) && present(nextValues[id]))) treatmentPlanUserEdited = true;
  if (present(nextValues.treatmentDuration)) treatmentDurationUserEdited = true;
  for (const [id, value] of Object.entries(nextValues)) {
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
  const grade = getGrade(results.total, results.max);
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
