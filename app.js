const AXIS_MAX = 20;

const TYPE_OPTIONS = [
  ["", "자동 판정 사용"],
  ["0. 간관리 선행형", "0. 간관리 선행형"],
  ["A. 복부비만 우세형", "A. 복부비만 우세형"],
  ["B. 인슐린 저항 우세형", "B. 인슐린 저항 우세형"],
  ["C. 만성염증 우세형", "C. 만성염증 우세형"],
  ["D. 자율신경 우세형", "D. 자율신경 우세형"],
  ["E. 근감소 우세형", "E. 근감소 우세형"],
  ["F. 복합 대사위험형", "F. 복합 대사위험형"],
  ["대사 균형형 또는 경계 관리군", "대사 균형형 또는 경계 관리군"],
  ["해당 없음", "해당 없음"],
];

const AXIS_SHORT_COMMENTS = {
  glucose: "혈당 상태와 인슐린 저항성 관련 패턴",
  lipid: "중성지방과 동맥경화성 지질 부담",
  liver: "간세포 부담과 빌리루빈 배설 상태",
  inflammation: "저등급 염증과 내장지방 상태",
  autonomic: "혈압, HRV와 신체적 스트레스 반응",
};

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
  conditionList: document.querySelector("#conditionList"),
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
  altCalc: document.querySelector("#altCalc"),
  ggtCalc: document.querySelector("#ggtCalc"),
  tbilCalc: document.querySelector("#tbilCalc"),
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
  "sdnnValue",
  "snsPnsRatio",
  "heartRate",
  "ast",
  "astUln",
  "alp",
  "alpUln",
  "waist",
  "restingHr",
]);

const checkboxFields = new Set([
  "hba1cCaution",
  "acuteInflammation",
  "gilbert",
  "directBilirubin",
  "vascularHistory",
  "diabetesHistory",
  "ckd",
  "lipidMedication",
  "hrvAtrialFib",
  "hrvWaveError",
  "hrvAcuteDisease",
  "hrvStimulant",
  "hrvOtherLimit",
  "hrvMedication",
  "jaundice",
  "darkUrine",
  "ruqPain",
  "knownLiverDisease",
  "severeLiverDisease",
  "fattyLiver",
  "gumDisease",
  "dermatitis",
  "chronicPain",
  "recurrentInflammation",
  "recentInfection",
  "recentTraumaSurgery",
  "recentHardExercise",
  "sleepProblem",
  "chronicFatigue",
  "palpitation",
  "tensionAnxiety",
  "lowProtein",
  "weightLoss",
  "functionalDecline",
]);

const allFields = [
  "patientName",
  "chartNumber",
  "sex",
  "testDate",
  "mealStatus",
  "ldlMethod",
  "hrvIndexGrade",
  "stressGrade",
  "snsActivity",
  "pnsActivity",
  "ansActivity",
  "muscleMassStatus",
  "gripStatus",
  "chairStandStatus",
  "manualPrimaryType",
  "manualSecondaryType",
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
    { test: (v) => v <= 5.6, score: 8, label: "정상 상단" },
    { test: (v) => v <= 5.9, score: 6, label: "당뇨병 전단계 범위" },
    { test: (v) => v <= 6.4, score: 3, label: "고위험 전단계" },
    { test: (v) => v >= 6.5, score: 0, label: "당뇨병 진단범위" },
  ]);
}

function scoreTgHdl(tg, hdl) {
  if (!present(tg) || !present(hdl) || hdl <= 0) return missing(10);
  const ratio = tg / hdl;
  const result = scoreByRanges(ratio, 10, [
    { test: (v) => v <= 2, score: 10, label: "양호한 대사성 지질 패턴" },
    { test: (v) => v <= 2.49, score: 8, label: "경계 변화" },
    { test: (v) => v <= 2.99, score: 6, label: "인슐린 저항성 가능성 증가" },
    { test: (v) => v <= 3.49, score: 3, label: "불리한 대사성 지질 패턴" },
    { test: (v) => v >= 3.5, score: 0, label: "매우 불리한 대사성 지질 패턴" },
  ]);
  return { ...result, ratio };
}

function scoreTg(value) {
  return scoreByRanges(value, 10, [
    { test: (v) => v < 100, score: 10, label: "양호" },
    { test: (v) => v <= 149, score: 8, label: "정상 상단" },
    { test: (v) => v <= 174, score: 6, label: "경계" },
    { test: (v) => v <= 199, score: 4, label: "비공복 상승" },
    { test: (v) => v <= 439, score: 2, label: "높음" },
    { test: (v) => v >= 440, score: 0, label: "공복 재검 또는 별도 평가" },
  ]);
}

function scoreNonHdl(totalChol, hdl) {
  if (!present(totalChol) || !present(hdl)) return missing(10);
  const value = totalChol - hdl;
  const result = scoreByRanges(value, 10, [
    { test: (v) => v < 130, score: 10, label: "양호" },
    { test: (v) => v <= 154, score: 8, label: "정상 상단" },
    { test: (v) => v <= 184, score: 6, label: "상승" },
    { test: (v) => v <= 219, score: 3, label: "높음" },
    { test: (v) => v >= 220, score: 0, label: "매우 높음" },
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
    { test: (v) => v > 3, score: 0, label: "원인 평가 우선" },
  ]);
  return { ...result, ratio };
}

function scoreHsCrp(value) {
  if (!present(value)) return missing(14);
  if (value > 10) return hold(14, "급성 염증 가능성");
  return scoreByRanges(value, 14, [
    { test: (v) => v < 0.5, score: 14, label: "매우 낮음" },
    { test: (v) => v <= 0.99, score: 11, label: "낮음" },
    { test: (v) => v <= 1.99, score: 8, label: "경도 상승" },
    { test: (v) => v <= 2.99, score: 5, label: "의미 있는 상승" },
    { test: (v) => v <= 10, score: 2, label: "높은 염증 신호" },
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
  return scored(0, 6, "고도 상승");
}

function scoreHrvIndex(grade, invalid) {
  if (invalid) return hold(10, "판정 보류");
  const map = {
    "매우 높음": [10, "심박변이도 매우 양호"],
    "높음": [8, "심박변이도 양호"],
    "보통": [5, "평균 범위"],
    "낮음": [2, "회복력 저하 가능"],
    "매우 낮음": [0, "회복력 매우 낮음"],
  };
  return map[grade] ? scored(map[grade][0], 10, map[grade][1]) : missing(10);
}

function scoreStress(grade, invalid) {
  if (invalid) return hold(4, "판정 보류");
  const map = {
    "매우 낮음": [4, "신체적 스트레스 반응 매우 낮음"],
    "낮음": [3, "신체적 스트레스 반응 낮음"],
    "보통": [2, "평균 범위"],
    "높음": [1, "신체적 스트레스 반응 높음"],
    "매우 높음": [0, "신체적 스트레스 반응 매우 높음"],
  };
  return map[grade] ? scored(map[grade][0], 4, map[grade][1]) : missing(4);
}

function hasHrvLimit(data) {
  return data.hrvAtrialFib || data.hrvWaveError || data.hrvAcuteDisease || data.hrvStimulant || data.hrvOtherLimit;
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
  if (total >= 85) return { label: "안정권", text: "전반적으로 양호한 상태입니다.", short: "전반적으로 양호한 상태" };
  if (total >= 70) return { label: "관리권", text: "일부 영역의 개선과 추적관찰이 필요합니다.", short: "일부 영역의 개선이 필요한 상태" };
  if (total >= 55) return { label: "집중관리권", text: "여러 대사영역의 적극적인 관리가 필요합니다.", short: "여러 영역의 집중관리가 필요한 상태" };
  return { label: "우선평가권", text: "원인 평가와 우선 관리가 필요합니다.", short: "원인 확인과 적극적인 관리가 필요한 상태" };
}

function makeResults(data) {
  const hrvLimited = hasHrvLimit(data);
  const hba1c = scoreHba1c(data.hba1c);
  const tgHdl = scoreTgHdl(data.tg, data.hdl);
  const tg = scoreTg(data.tg);
  const nonHdl = scoreNonHdl(data.totalChol, data.hdl);
  const alt = scoreUln(data.alt, data.altUln, 10, [10, 8, 5, 2]);
  const ggt = scoreUln(data.ggt, data.ggtUln, 6, [6, 5, 3, 1]);
  const tbilRaw = scoreUln(data.tbil, data.tbilUln, 4, [4, 3, 2, 1]);
  const tbil = data.gilbert && tbilRaw && !tbilRaw.missing ? { ...tbilRaw, score: 4, label: "길버트증후군 보정" } : tbilRaw;
  const ast = scoreUln(data.ast, data.astUln, 0, [0, 0, 0, 0]);
  const alp = scoreUln(data.alp, data.alpUln, 0, [0, 0, 0, 0]);
  const hsCrp = scoreHsCrp(data.hsCrp);
  const visceralFat = scoreVisceralFat(data.visceralFat);
  const bp = scoreBloodPressure(data.sbp, data.dbp);
  const hrvIndex = scoreHrvIndex(data.hrvIndexGrade, hrvLimited);
  const stress = scoreStress(data.stressGrade, hrvLimited);

  const axes = [
    makeAxis(
      "glucose",
      "당대사",
      [
        { label: "HbA1c", result: hba1c, value: present(data.hba1c) ? `${data.hba1c}%` : null },
        { label: "TG/HDL-C", result: tgHdl, value: present(tgHdl.ratio) ? tgHdl.ratio.toFixed(2) : null },
      ],
      "혈당 조절 상태와 인슐린 저항성 관련 지질 패턴을 함께 평가합니다.",
      !present(data.hba1c) && !(present(data.tg) && present(data.hdl)),
    ),
    makeAxis(
      "lipid",
      "지질대사",
      [
        { label: "TG", result: tg, value: present(data.tg) ? `${data.tg} mg/dL` : null },
        { label: "non-HDL-C", result: nonHdl, value: present(nonHdl.value) ? `${nonHdl.value} mg/dL` : null },
      ],
      "중성지방의 절대 상승 정도와 동맥경화성 지질 부담을 함께 봅니다.",
      !present(data.tg) && !(present(data.totalChol) && present(data.hdl)),
    ),
    makeAxis(
      "liver",
      "간대사",
      [
        { label: "ALT", result: alt, value: present(alt.ratio) ? `${alt.ratio.toFixed(2)} x ULN` : null },
        { label: "GGT", result: ggt, value: present(ggt.ratio) ? `${ggt.ratio.toFixed(2)} x ULN` : null },
        { label: "TBIL", result: tbil, value: present(tbil.ratio) ? `${tbil.ratio.toFixed(2)} x ULN` : null },
      ],
      "간세포 손상, 담도 관련 신호, 빌리루빈 이상 여부를 통합합니다.",
      !present(data.alt) && !present(data.ggt) && !present(data.tbil),
    ),
    makeAxis(
      "inflammation",
      "만성염증",
      [
        { label: "hs-CRP", result: hsCrp, value: present(data.hsCrp) ? `${data.hsCrp} mg/L` : null },
        { label: "내장지방레벨", result: visceralFat, value: present(data.visceralFat) ? `${data.visceralFat}` : null },
      ],
      "저강도 염증 신호와 내장지방 축적 정도를 함께 반영합니다.",
      !present(data.hsCrp) && !present(data.visceralFat),
      hsCrp.hold,
    ),
    makeAxis(
      "autonomic",
      "자율신경·회복",
      [
        { label: "혈압", result: bp, value: present(data.sbp) && present(data.dbp) ? `${data.sbp}/${data.dbp}` : null },
        { label: "HRV-Index", result: hrvIndex, value: [data.hrvIndexGrade, present(data.hrvIndexValue) ? data.hrvIndexValue : ""].filter(Boolean).join(" · ") },
        { label: "Stress", result: stress, value: data.stressGrade || null },
        { label: "SDNN", result: scored("-", 0, "참고지표"), value: present(data.sdnnValue) ? `${data.sdnnValue} ms` : null, reference: true },
        { label: "SNS Activity", result: scored("-", 0, "참고지표"), value: data.snsActivity || null, reference: true },
        { label: "PNS Activity", result: scored("-", 0, "참고지표"), value: data.pnsActivity || null, reference: true },
        { label: "ANS Activity", result: scored("-", 0, "참고지표"), value: data.ansActivity || null, reference: true },
        { label: "SNS/PNS", result: scored("-", 0, "참고지표"), value: present(data.snsPnsRatio) ? data.snsPnsRatio : null, reference: true },
        { label: "심박수", result: scored("-", 0, "참고지표"), value: present(data.heartRate) ? `${data.heartRate} bpm` : null, reference: true },
        { label: "안정 시 심박수", result: scored("-", 0, "참고지표"), value: present(data.restingHr) ? `${data.restingHr} bpm` : null, reference: true },
      ],
      "혈압조절 상태, 옴니핏 HRV-Index, 측정 당시 신체적 스트레스 반응을 함께 평가합니다.",
      !present(data.sbp) && !present(data.dbp) && !present(data.hrvIndexGrade) && !present(data.stressGrade),
      hrvLimited,
    ),
  ];

  const measuredAxes = axes.filter((axis) => axis.status !== "unavailable" && axis.status !== "hold");
  const total = measuredAxes.reduce((sum, axis) => sum + axis.score, 0);
  const max = measuredAxes.reduce((sum, axis) => sum + axis.max, 0);

  return { axes, total, max, parts: { hba1c, tgHdl, tg, nonHdl, alt, ggt, tbil, ast, alp, hsCrp, visceralFat, bp, hrvIndex, stress }, hrvLimited };
}

function validateInputs(data) {
  const errors = [];
  const warnings = [];
  const addError = (fieldId, text) => errors.push({ fieldId, text });
  const addWarning = (fieldId, text) => warnings.push({ fieldId, text });

  for (const id of numberFields) {
    if (present(data[id]) && data[id] < 0) addError(id, "음수 검사값은 입력할 수 없습니다.");
  }
  if (present(data.hdl) && data.hdl <= 0) addError("hdl", "HDL-C가 0 이하이면 TG/HDL-C를 계산할 수 없습니다.");
  if (present(data.totalChol) && present(data.hdl) && data.totalChol < data.hdl) addError("totalChol", "총콜레스테롤이 HDL-C보다 낮습니다.");
  if (present(data.sbp) && present(data.dbp) && data.dbp > data.sbp) addError("dbp", "이완기혈압이 수축기혈압보다 높습니다.");
  for (const id of ["altUln", "ggtUln", "tbilUln", "astUln", "alpUln"]) {
    if (present(data[id]) && data[id] <= 0) addError(id, "ULN은 0보다 커야 합니다.");
  }
  if (present(data.hba1c) && (data.hba1c < 3 || data.hba1c > 20)) addWarning("hba1c", "HbA1c 단위를 확인하세요.");
  if (present(data.tg) && data.tg > 2000) addWarning("tg", "TG 값이 매우 큽니다. 단위를 확인하세요.");
  if (present(data.ldl) && present(data.totalChol) && present(data.hdl)) {
    const nonHdl = data.totalChol - data.hdl;
    if (data.ldl > nonHdl + 5) addWarning("ldl", "LDL-C가 non-HDL-C보다 높습니다. 입력값, 단위 또는 검사방법을 확인해 주세요.");
  }
  if (data.ldlMethod === "계산값" && data.tg >= 440) addWarning("ldlMethod", "중성지방 상승으로 계산 LDL-C의 정확도가 제한될 수 있습니다.");
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
    add("warning", "중성지방", `${data.tg} mg/dL`, "500 mg/dL 이상으로 심한 고중성지방혈증 평가가 필요합니다.");
  } else if (data.tg >= 440) {
    add("caution", "중성지방", `${data.tg} mg/dL`, "비공복 재검 권고 기준을 초과하여 공복 지질검사로 재확인을 권고합니다.");
  }
  if (data.ldl >= 190) add("warning", "LDL-C", `${data.ldl} mg/dL`, "190 mg/dL 이상으로 별도의 심혈관 위험 평가가 필요합니다.");
  if (results.parts.nonHdl?.value >= 220) add("warning", "non-HDL-C", `${results.parts.nonHdl.value} mg/dL`, "220 mg/dL 이상으로 고도 지질위험 기준에 해당합니다.");
  if (results.parts.alt?.ratio >= 3 || results.parts.ast?.ratio >= 3) {
    const liverValues = [
      results.parts.alt?.ratio >= 3 && present(data.alt) ? `ALT ${data.alt} U/L (${results.parts.alt.ratio.toFixed(1)} x ULN)` : "",
      results.parts.ast?.ratio >= 3 && present(data.ast) ? `AST ${data.ast} U/L (${results.parts.ast.ratio.toFixed(1)} x ULN)` : "",
    ].filter(Boolean).join(", ");
    add("warning", "간수치", liverValues, "3 x ULN 이상으로 간 원인평가가 우선입니다.");
  }
  if (results.parts.tbil?.ratio > 1 && liverAbnormal) add("warning", "총빌리루빈", `${data.tbil} mg/dL`, "간수치 이상이 동반되어 추가 평가가 필요합니다.");
  if (data.hsCrp > 10) add("warning", "hs-CRP", `${data.hsCrp} mg/L`, "10 mg/L를 초과해 급성 염증 가능성을 먼저 확인해야 합니다.");
  if (data.sbp >= 180 || data.dbp >= 120) add("warning", "혈압", `${data.sbp || "-"}/${data.dbp || "-"} mmHg`, "180/120 mmHg 이상으로 우선 확인이 필요합니다.");
  if (results.hrvLimited) add("warning", "HRV-Index", "판독 제한", "HRV 판독 제한 조건이 있어 자율신경·회복 축 판정을 보류합니다.");
  return flags;
}

function scoreTypes(data, results) {
  const tags = [];
  const candidates = [];
  const addCandidate = (code, name, strength, reasons) => {
    if (strength > 0) candidates.push({ code, name, strength, reasons });
  };
  const highTg = data.tg >= 150;
  const lowHdl = (data.sex === "남성" && data.hdl < 40) || (data.sex === "여성" && data.hdl < 50);
  const visceralHigh = data.visceralFat >= 10;
  const waistHigh = (data.sex === "남성" && data.waist >= 90) || (data.sex === "여성" && data.waist >= 85);
  const hba1cHigh = data.hba1c >= 5.7;
  const tgHdlHigh = results.parts.tgHdl?.ratio >= 3.5;
  const tgHdlModerate = results.parts.tgHdl?.ratio >= 2.5;
  const acuteInflammation = data.hsCrp > 10 || data.acuteInflammation || data.recentInfection || data.recentTraumaSurgery || data.recentHardExercise;
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);
  const liverPriority =
    results.parts.alt?.ratio >= 3 ||
    results.parts.ast?.ratio >= 3 ||
    (results.parts.tbil?.ratio > 1 && liverAbnormal) ||
    data.jaundice ||
    data.darkUrine ||
    data.ruqPain ||
    data.severeLiverDisease;

  if (visceralHigh) tags.push("내장지방 증가");
  if (highTg) tags.push("고중성지방");
  if (data.sbp >= 130 || data.dbp >= 80) tags.push("혈압 경계");
  if (data.hsCrp >= 2 && data.hsCrp <= 10) tags.push("염증 신호");
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

  const aReasons = [visceralHigh, waistHigh, highTg, lowHdl, data.fattyLiver].filter(Boolean);
  addCandidate("A", "A. 복부비만 우세형", aReasons.length + (aReasons.length >= 2 && !hba1cHigh ? 1 : 0), aReasons);

  const bReasons = [tgHdlHigh, hba1cHigh, tgHdlModerate && hba1cHigh, tgHdlModerate && (visceralHigh || data.fattyLiver)].filter(Boolean);
  addCandidate("B", "B. 인슐린 저항 우세형", bReasons.length + (tgHdlHigh ? 1 : 0), bReasons);

  const cReasons = [data.hsCrp >= 2 && data.hsCrp <= 10, !acuteInflammation && data.hsCrp >= 2, data.gumDisease, data.dermatitis, data.chronicPain, data.recurrentInflammation].filter(Boolean);
  if (data.hsCrp > 10) {
    tags.push("만성염증형 판정 보류");
  } else {
    addCandidate("C", "C. 만성염증 우세형", cReasons.length, cReasons);
  }

  const dReasons = [
    data.hrvIndexGrade === "낮음" || data.hrvIndexGrade === "매우 낮음",
    data.stressGrade === "높음" || data.stressGrade === "매우 높음",
    data.sleepProblem,
    data.chronicFatigue,
    data.snsActivity === "높음" || data.snsActivity === "매우 높음",
    data.pnsActivity === "낮음" || data.pnsActivity === "매우 낮음",
    data.restingHr >= 90 || data.heartRate >= 90,
    data.palpitation,
    data.tensionAnxiety,
  ].filter(Boolean);
  addCandidate("D", "D. 자율신경 우세형", dReasons.length, dReasons);
  if ((data.sbp >= 130 || data.dbp >= 80) && !dReasons[0] && !dReasons[1]) tags.push("혈압관리 필요");

  const eReasons = [
    data.muscleMassStatus === "저하",
    data.gripStatus === "저하",
    data.chairStandStatus === "저하",
    data.lowProtein,
    data.weightLoss,
    data.functionalDecline,
  ].filter(Boolean);
  addCandidate("E", "E. 근감소 우세형", eReasons.length + (data.muscleMassStatus === "저하" && (data.gripStatus === "저하" || data.chairStandStatus === "저하") ? 1 : 0), eReasons);

  const strong = candidates.filter((item) => item.strength >= 2).sort((a, b) => b.strength - a.strength);
  if (strong.length >= 3 || (strong.length >= 2 && strong[0].strength === strong[1].strength && strong[0].strength >= 3)) {
    return {
      primary: "F. 복합 대사위험형",
      secondary: strong.map((item) => item.name).join(" + "),
      tags,
      notes: [`세부 조합: ${strong.map((item) => item.name.replace(/^[A-E]\. /, "")).join(" + ")}`],
      candidates: strong,
    };
  }
  if (strong.length === 0) {
    return { primary: "대사 균형형 또는 경계 관리군", secondary: "해당 없음", tags, notes: [], candidates };
  }
  return {
    primary: strong[0].name,
    secondary: strong[1]?.strength >= 2 ? strong[1].name : "해당 없음",
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
    .sort((a, b) => (a.score / a.max) - (b.score / b.max))
    .slice(0, count);
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

function joinKorean(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}와 ${items.at(-1)}`;
}

function makeSummary(data, results, grade, typeResult, flags) {
  if (!results.max) return "입력된 핵심 검사값이 부족합니다. 판정 불가 축은 0점으로 처리하지 않습니다.";
  const lowest = priorityAxes(results.axes, 2).map((axis) => axis.label);
  const limitedAxes = results.axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis) => axis.label);
  const primary = selectedPrimaryType(typeResult, data);
  const sentences = [
    `종합점수는 ${scorePhrase(results)}으로, ${grade.label}입니다.`,
    lowest.length ? `특히 ${joinKorean(lowest)} 영역을 우선 확인하는 것이 좋습니다.` : "입력된 검사영역을 순차적으로 확인하는 것이 좋습니다.",
    `현재의 주된 대사 패턴은 ${primary}으로 평가됩니다.`,
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
    return `${values || "간 관련 위험 신호"}가 우선 확인 기준에 해당합니다. 대사 타입보다 간 원인평가를 먼저 고려하도록 표시합니다.`;
  }
  if (primary.startsWith("A.")) {
    const values = [
      present(data.visceralFat) ? `내장지방레벨 ${data.visceralFat}` : "",
      present(data.waist) ? `허리둘레 ${data.waist} cm` : "",
      present(data.tg) ? `중성지방 ${data.tg} mg/dL` : "",
    ].filter(Boolean);
    return `${joinKorean(values) || "복부비만 관련 지표"}에서 복부 지방 축적과 관련된 신호가 관찰됩니다. 혈당 수치만이 아니라 체지방 분포를 함께 관리할 필요가 있습니다.`;
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
    return `${values.join(", ")} 지표에서 인슐린 저항성과 관련된 대사성 지질 패턴이 두드러집니다. ${hba1cNote} 확정 진단이 아니라 현재 검사 조합에서 보이는 관리 방향입니다.`;
  }
  if (primary.startsWith("C.")) {
    const values = [
      present(data.hsCrp) ? `hs-CRP ${data.hsCrp} mg/L` : "",
      present(data.visceralFat) ? `내장지방레벨 ${data.visceralFat}` : "",
    ].filter(Boolean);
    return `${joinKorean(values) || "염증 관련 지표"}에서 저등급 염증 또는 체성분 관련 신호가 관찰됩니다. 급성 염증 가능성이 있으면 재평가가 우선입니다.`;
  }
  if (primary.startsWith("D.")) {
    const values = [
      data.hrvIndexGrade ? `HRV-Index ${data.hrvIndexGrade}` : "",
      data.stressGrade ? `Stress ${data.stressGrade}` : "",
      present(data.sbp) && present(data.dbp) ? `혈압 ${data.sbp}/${data.dbp}` : "",
    ].filter(Boolean);
    return `${joinKorean(values)} 결과에서 회복력과 신체적 스트레스 반응을 함께 살펴볼 필요가 있습니다. 측정 조건에 따라 변동될 수 있어 추적 비교가 중요합니다.`;
  }
  if (primary.startsWith("E.")) {
    const values = [
      data.muscleMassStatus ? `골격근량 ${data.muscleMassStatus}` : "",
      data.gripStatus ? `악력 ${data.gripStatus}` : "",
      data.chairStandStatus ? `Chair Stand ${data.chairStandStatus}` : "",
    ].filter(Boolean);
    return `${joinKorean(values) || "근기능 관련 문진"}에서 근감소 관련 관리 신호가 관찰됩니다. 영양, 근력, 기능 상태를 함께 확인하는 방향입니다.`;
  }
  if (primary.startsWith("F.")) {
    return "여러 대사 패턴이 동시에 관찰되어 한 가지 축만으로 설명하기 어렵습니다. 우선 관리영역과 보조 태그를 함께 보며 단계적으로 접근하는 것이 좋습니다.";
  }
  if (present(nonHdl) || present(ratio)) {
    return "현재 입력된 핵심 지표에서는 특정 우세 타입보다 전반적인 균형 유지와 경계 지표 추적이 중요합니다.";
  }
  return "주타입 판정에 필요한 보조 정보가 제한적입니다. 추가 검사값을 입력하면 판정 근거가 더 구체화됩니다.";
}

function renderComputed(data, results) {
  elements.tgHdlCalc.textContent = present(results.parts.tgHdl?.ratio)
    ? `TG/HDL-C: ${results.parts.tgHdl.ratio.toFixed(2)} — ${results.parts.tgHdl.label}`
    : "TG/HDL-C: TG와 HDL-C 입력 후 계산";
  elements.nonHdlCalc.textContent = present(results.parts.nonHdl?.value)
    ? `non-HDL-C: ${results.parts.nonHdl.value} mg/dL — ${results.parts.nonHdl.label}`
    : "non-HDL-C: 총콜레스테롤과 HDL-C 입력 후 계산";
  elements.altCalc.textContent = present(results.parts.alt?.ratio) ? `ALT: ${results.parts.alt.ratio.toFixed(2)} x ULN — ${results.parts.alt.label}` : "ALT: ULN 배수 대기";
  elements.ggtCalc.textContent = present(results.parts.ggt?.ratio) ? `GGT: ${results.parts.ggt.ratio.toFixed(2)} x ULN — ${results.parts.ggt.label}` : "GGT: ULN 배수 대기";
  elements.tbilCalc.textContent = present(results.parts.tbil?.ratio) ? `TBIL: ${results.parts.tbil.ratio.toFixed(2)} x ULN — ${results.parts.tbil.label}` : "TBIL: ULN 배수 대기";
}

function renderRadar(axes) {
  const center = 200;
  const radius = 124;
  const pointsFor = (scale, inactiveAsOuter = false) =>
    axes.map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const isInactive = axis.status === "unavailable" || axis.status === "hold";
      const axisScale = isInactive ? (inactiveAsOuter ? 1 : 0) : (axis.score / AXIS_MAX) * scale;
      return `${center + Math.cos(angle) * radius * axisScale},${center + Math.sin(angle) * radius * axisScale}`;
    }).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((level) => `<polygon points="${pointsFor(level, true)}" fill="none" stroke="#cbd9d2" stroke-width="1.2" />`).join("");
  const labels = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const x = center + Math.cos(angle) * (radius + 54);
    const y = center + Math.sin(angle) * (radius + 48);
    const label = axis.status === "unavailable" ? `${axis.label} 미측정` : axis.status === "hold" ? `${axis.label} 보류` : axis.label;
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${axis.status === "complete" || axis.status === "partial" ? "#24372f" : "#7b8781"}" font-size="13.5" font-weight="850">${label}</text>`;
  }).join("");
  const spokes = axes.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    return `<line x1="${center}" y1="${center}" x2="${center + Math.cos(angle) * radius}" y2="${center + Math.sin(angle) * radius}" stroke="#d4e0da" stroke-width="1.1" />`;
  }).join("");
  const inactive = axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis, index) => {
    const axisIndex = axes.indexOf(axis);
    const angle = -Math.PI / 2 + (axisIndex * Math.PI * 2) / axes.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#9aa6a0" stroke-dasharray="4 5" />`;
  }).join("");
  elements.radarChart.innerHTML = `
    <svg viewBox="0 0 400 400" role="img" aria-label="5개 축 점수 레이더 차트">
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
  const items = priorities.length ? priorities : axes.slice(0, 2);
  const summaryItems = items.map((axis, index) => {
    const item = document.createElement("li");
    item.className = "priority-compact";
    item.innerHTML = `<span class="rank">${index + 1}</span><span><strong>${axis.label}</strong></span><span>${axisDisplay(axis)}</span>`;
    return item;
  });
  const detailItems = items.map((axis, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="rank">${index + 1}</span><span><strong>${axis.label}</strong><span>${AXIS_SHORT_COMMENTS[axis.key] || axis.comment}을 우선 확인합니다.</span></span><span>${axisDisplay(axis)}</span>`;
    return item;
  });
  elements.priorityList.replaceChildren(...summaryItems);
  elements.priorityListDetail.replaceChildren(...detailItems);
  elements.priorityAxes.textContent = priorities.length ? priorities.slice(0, 2).map((axis) => axis.label).join(" · ") : "입력 후 표시됩니다.";
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
  if (axis.status === "hold") return "해석 제한";
  if (axis.status === "partial") return "부분 판정";
  if (axis.score >= 16) return "양호";
  if (axis.score >= 12) return "관리 필요";
  if (axis.score >= 8) return "개선 필요";
  return "우선 관리";
}

function renderAxisCards(axes) {
  elements.axisCards.replaceChildren(...axes.map((axis) => {
    const card = document.createElement("article");
    card.className = `axis-card ${axis.status}`;
    const percent = axis.status === "unavailable" || axis.status === "hold" ? 0 : (axis.score / AXIS_MAX) * 100;
    const keyValues = axis.details
      .filter((detail) => detail.value && !detail.reference)
      .slice(0, 3)
      .map((detail) => {
        const label = detail.result?.label && detail.result.max > 0 ? ` · ${detail.result.label}` : "";
        return `<li><span>${detail.label}</span><strong>${detail.value}${label}</strong></li>`;
      })
      .join("");
    const cardComment = axis.key === "liver" && axis.score >= 17
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
  }));
}

function renderDetails(axes) {
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
    .map((detail) => {
      const row = document.createElement("tr");
      const result = detail.result;
      const score = detail.reference ? "참고" : result?.missing ? "--" : result?.hold ? "보류" : `${result.score}/${result.max}`;
      const value = detail.value || "--";
      const label = result?.label || "";
      row.innerHTML = `<td class="axis">${axis.label}</td><td class="test-name">${detail.label}</td><td class="result-value">${value}</td><td class="score">${score}</td><td class="interpretation">${label}</td>`;
      return row;
    }));
  tbody.replaceChildren(...rows);
  elements.detailTable.replaceChildren(table);
}

function liverNormalMessage(data, results) {
  const liverAxis = results.axes.find((axis) => axis.key === "liver");
  if (!liverAxis || liverAxis.score < 17) return [];
  const messages = ["현재 측정한 간수치는 대체로 양호합니다."];
  if (data.fattyLiver || data.tg >= 150 || results.parts.tgHdl?.ratio >= 3.5 || data.visceralFat >= 10 || data.waist >= 85) {
    messages.push("다만 정상 간수치만으로 지방간을 완전히 배제할 수는 없습니다.");
  }
  return messages;
}

function renderList(element, items) {
  element.replaceChildren(...items.map((text) => {
    const row = document.createElement("li");
    row.textContent = text;
    return row;
  }));
}

function renderNotes(data, results, typeResult, validation) {
  const hrvCondition = results.hrvLimited ? "판독 제한 있음" : "판독 제한 없음";
  const conditions = [
    `채혈 상태: ${data.mealStatus || "미입력"}`,
    `LDL-C 검사방식: ${data.ldlMethod || "미입력"}`,
    `HRV 측정조건: ${hrvCondition}`,
  ];
  const limits = [];
  limits.push(...liverNormalMessage(data, results));
  if (data.mealStatus === "식후 4시간 미만") limits.push("최근 식사의 영향으로 TG 및 TG/HDL-C가 평소보다 높게 측정되었을 수 있습니다.");
  if (data.mealStatus === "식후 4~7시간") limits.push("식후 상태가 TG 및 TG/HDL-C 해석에 일부 영향을 줄 수 있습니다.");
  if (data.mealStatus === "확인 불가") limits.push("채혈 당시 식사 상태를 확인할 수 없어 TG 및 TG/HDL-C 해석에 제한이 있습니다.");
  if (results.parts.tbil?.ratio > 1 && !((results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1))) {
    limits.push("총빌리루빈 단독 상승입니다. 직접·간접 빌리루빈 분획 및 길버트증후군 가능성을 확인하세요.");
  }
  if (data.hsCrp > 10) limits.push("급성 염증 가능성이 있어 만성염증형 판정을 보류합니다.");
  if (results.hrvLimited) limits.push("HRV 판독 제한 조건이 있어 자율신경·회복 축의 점수 판정을 보류합니다.");
  if (typeResult.notes.length) limits.push(...typeResult.notes);
  if (validation.warnings.length) limits.push(...validation.warnings.map((warning) => warning.text));
  if (!limits.length) limits.push("이번 결과에서 별도의 해석 제한은 표시되지 않았습니다.");
  const common = [
    "본 리포트는 질병을 진단하거나 확진하기 위한 도구가 아니라, 초진 상태와 관리 전후 변화를 비교하기 위한 임상 관리지표입니다.",
    "검사 결과는 증상, 병력, 복용약 및 추가검사와 함께 해석해야 합니다.",
    "TG/HDL-C 비율은 인슐린 저항성을 확진하는 검사가 아니라 관련 대사 패턴을 추정하는 보조지표입니다.",
    "입력한 정보는 서버에 저장되지 않으며 현재 브라우저에서 리포트 생성에만 사용됩니다.",
  ];
  renderList(elements.conditionList, conditions);
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
  elements.primaryType.textContent = primary;
  elements.secondaryType.textContent = selectedSecondaryType(typeResult, data);
  elements.supportTags.textContent = typeResult.tags.length ? typeResult.tags.join(" · ") : "특이 보조 태그 없음";
  elements.primaryTypeReason.textContent = makeTypeReason(data, results, primary);
}

function render() {
  const data = readForm();
  const validation = validateInputs(data);
  const results = makeResults(data);
  const flags = makeRiskFlags(data, results, validation);
  const grade = getGrade(results.total, results.max);
  const typeResult = scoreTypes(data, results);

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
  renderAxisCards(results.axes);
  renderDetails(results.axes);
  renderNotes(data, results, typeResult, validation);
  return { data, results, flags, typeResult, validation };
}

function setValues(values) {
  for (const [id, value] of Object.entries(values)) {
    const input = field(id);
    if (!input) continue;
    if (checkboxFields.has(id)) input.checked = Boolean(value);
    else input.value = value ?? "";
  }
  render();
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fillSample() {
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
    ldlMethod: "검사결과지 수치",
    mealStatus: "식후 4시간 미만",
    alt: 58,
    altUln: 40,
    ggt: 74,
    ggtUln: 60,
    tbil: 1.1,
    tbilUln: 1.2,
    hsCrp: 2.4,
    visceralFat: 12,
    sbp: 136,
    dbp: 86,
    hrvIndexValue: 18.6,
    hrvIndexGrade: "보통",
    stressGrade: "높음",
    fattyLiver: true,
  });
}

function resetForm() {
  if (!confirm("전체 입력값을 지울까요?")) return;
  elements.form.reset();
  setValues({
    testDate: localDateKey(),
    altUln: 40,
    ggtUln: 60,
    tbilUln: 1.2,
    astUln: 40,
    alpUln: 120,
  });
  elements.generateButton.textContent = "리포트 생성";
  elements.generateStatus.textContent = "입력값은 자동 계산되며, 버튼을 누르면 출력용 리포트로 이동합니다.";
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

elements.form.addEventListener("input", render);
elements.form.addEventListener("change", render);
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateReport();
});
elements.generateButton.addEventListener("click", generateReport);
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
setValues({
  testDate: localDateKey(),
  altUln: 40,
  ggtUln: 60,
  tbilUln: 1.2,
  astUln: 40,
  alpUln: 120,
});
window.__metabolicReportReady = true;
