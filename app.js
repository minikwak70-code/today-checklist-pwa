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

const elements = {
  form: document.querySelector("#reportForm"),
  generateButton: document.querySelector("#generateButton"),
  generateStatus: document.querySelector("#generateStatus"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  printButton: document.querySelector("#printButton"),
  printStatus: document.querySelector("#printStatus"),
  patientLine: document.querySelector("#patientLine"),
  totalScore: document.querySelector("#totalScore"),
  gradeLabel: document.querySelector("#gradeLabel"),
  radarChart: document.querySelector("#radarChart"),
  priorityList: document.querySelector("#priorityList"),
  summaryComment: document.querySelector("#summaryComment"),
  flagArea: document.querySelector("#flagArea"),
  axisCards: document.querySelector("#axisCards"),
  detailTable: document.querySelector("#detailTable"),
  notesList: document.querySelector("#notesList"),
  validationSummary: document.querySelector("#validationSummary"),
  primaryType: document.querySelector("#primaryType"),
  secondaryType: document.querySelector("#secondaryType"),
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
    { test: (v) => v >= 1 && v <= 5, score: 6, label: "매우 양호" },
    { test: (v) => v <= 9, score: 5, label: "정상범위" },
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
  if (total >= 85) return { label: "안정권", text: "전반적으로 양호한 상태입니다." };
  if (total >= 70) return { label: "관리권", text: "일부 영역의 개선과 추적관찰이 필요합니다." };
  if (total >= 55) return { label: "집중관리권", text: "여러 대사영역의 적극적인 관리가 필요합니다." };
  return { label: "우선평가권", text: "원인 평가와 우선 관리가 필요합니다." };
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
        { label: "ANS Activity", result: scored("-", 0, "참고지표"), value: data.ansActivity || null, reference: true },
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
  if (present(data.tbil) && data.tbil > 20) addWarning("tbil", "TBIL 값이 매우 큽니다. 단위를 확인하세요.");
  if (present(data.sbp) && (data.sbp < 60 || data.sbp > 260)) addWarning("sbp", "수축기혈압 단위를 확인하세요.");
  return { errors, warnings };
}

function makeRiskFlags(data, results, validation) {
  const flags = [];
  const add = (type, text) => flags.push({ type, text });
  const liverAbnormal = (results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1);

  if (validation.errors.length > 0) add("warning", "입력 오류가 있어 리포트 생성을 제한했습니다.");
  if (data.hba1c >= 6.5) add("warning", "HbA1c가 당뇨병 진단범위에 해당합니다.");
  if (data.tg >= 500) add("warning", "TG가 500 mg/dL 이상으로 심한 고중성지방혈증 경고에 해당합니다.");
  if (data.tg >= 440) add("caution", "비공복 중성지방이 매우 높습니다. 공복 지질검사로 재확인을 권고합니다.");
  if (data.ldl >= 190) add("warning", "LDL-C가 190 mg/dL 이상으로 고도 지질위험 기준에 해당합니다.");
  if (results.parts.nonHdl?.value >= 220) add("warning", "non-HDL-C가 220 mg/dL 이상으로 고도 지질위험 기준에 해당합니다.");
  if (results.parts.alt?.ratio >= 3 || results.parts.ast?.ratio >= 3) add("warning", "ALT 또는 AST가 3 x ULN 이상입니다. 간 원인평가가 우선입니다.");
  if (results.parts.tbil?.ratio > 1 && liverAbnormal) add("warning", "TBIL 상승과 간수치 이상이 동반되어 추가 평가가 필요합니다.");
  if (data.hsCrp > 10) add("warning", "hs-CRP가 10 mg/L를 초과해 급성 염증 가능성을 먼저 확인해야 합니다.");
  if (data.sbp >= 180 || data.dbp >= 120) add("warning", "혈압이 180/120 mmHg 이상입니다.");
  if (results.hrvLimited) add("warning", "HRV 판독 제한 조건이 있어 자율신경·회복 축 판정을 보류합니다.");
  if (flags.some((flag) => flag.type === "warning")) {
    flags.unshift({ type: "warning", text: "우선 확인이 필요한 검사결과가 있습니다. 아래 대사건강점수보다 우선적인 의학적 확인이 필요합니다." });
  }
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

function makeSummary(data, results, grade, typeResult) {
  if (!results.max) return "입력된 핵심 검사값이 부족합니다. 판정 불가 축은 0점으로 처리하지 않습니다.";
  const limitedAxes = results.axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis) => axis.label);
  const scoreText = results.max === 100 ? `${results.total}/100` : `${results.total}/${results.max}`;
  const sorted = results.axes.filter((axis) => axis.status !== "unavailable" && axis.status !== "hold").sort((a, b) => (a.score / a.max) - (b.score / b.max));
  const priorityText = sorted.length >= 2 ? `${sorted[0].label}와 ${sorted[1].label}` : sorted[0]?.label || "입력된 축";
  const limitText = limitedAxes.length ? ` 전체 평가는 ${limitedAxes.join(", ")} 제한이 있습니다.` : "";
  return `측정 완료 점수는 ${scoreText}점으로 ${grade.label}입니다. ${grade.text} ${priorityText}을 우선 확인하는 것이 좋습니다. 주타입은 ${typeResult.primary}입니다.${limitText}`;
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
  const center = 180;
  const radius = 116;
  const pointsFor = (scale, inactiveAsOuter = false) =>
    axes.map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const isInactive = axis.status === "unavailable" || axis.status === "hold";
      const axisScale = isInactive ? (inactiveAsOuter ? 1 : 0) : (axis.score / AXIS_MAX) * scale;
      return `${center + Math.cos(angle) * radius * axisScale},${center + Math.sin(angle) * radius * axisScale}`;
    }).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((level) => `<polygon points="${pointsFor(level, true)}" fill="none" stroke="#d9e4de" stroke-width="1" />`).join("");
  const labels = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const x = center + Math.cos(angle) * (radius + 42);
    const y = center + Math.sin(angle) * (radius + 38);
    const label = axis.status === "unavailable" ? `${axis.label} 미측정` : axis.status === "hold" ? `${axis.label} 보류` : axis.label;
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${axis.status === "complete" || axis.status === "partial" ? "#34433d" : "#9aa6a0"}" font-size="12" font-weight="800">${label}</text>`;
  }).join("");
  const spokes = axes.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    return `<line x1="${center}" y1="${center}" x2="${center + Math.cos(angle) * radius}" y2="${center + Math.sin(angle) * radius}" stroke="#e2ebe6" />`;
  }).join("");
  const inactive = axes.filter((axis) => axis.status === "unavailable" || axis.status === "hold").map((axis, index) => {
    const axisIndex = axes.indexOf(axis);
    const angle = -Math.PI / 2 + (axisIndex * Math.PI * 2) / axes.length;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#9aa6a0" stroke-dasharray="4 5" />`;
  }).join("");
  elements.radarChart.innerHTML = `
    <svg viewBox="0 0 360 360" role="img" aria-label="5개 축 점수 레이더 차트">
      ${grid}
      ${spokes}
      ${inactive}
      <polygon points="${pointsFor(1)}" fill="rgba(35,116,90,0.24)" stroke="#23745a" stroke-width="3" />
      ${labels}
    </svg>
  `;
}

function renderPriority(axes) {
  const priorities = axes
    .filter((axis) => axis.status !== "unavailable" && axis.status !== "hold" && axis.max > 0)
    .sort((a, b) => (a.score / a.max) - (b.score / b.max))
    .slice(0, 2);
  elements.priorityList.replaceChildren(...(priorities.length ? priorities : axes.slice(0, 2)).map((axis, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="rank">${index + 1}</span><span><strong>${axis.label}</strong><span>${axis.comment}</span></span><span>${axisDisplay(axis)}</span>`;
    return item;
  }));
}

function renderFlags(flags) {
  if (!flags.length) {
    elements.flagArea.innerHTML = `<div class="flag info">우선 확인이 필요한 위험 플래그는 현재 없습니다.</div>`;
    return;
  }
  elements.flagArea.replaceChildren(...flags.map((flag) => {
    const item = document.createElement("div");
    item.className = `flag ${flag.type}`;
    item.textContent = flag.text;
    return item;
  }));
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
    card.innerHTML = `<strong>${axis.label}</strong><div class="axis-score">${axisDisplay(axis)}</div><div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div><p>${axisTone(axis)} · ${axis.comment}</p>`;
    return card;
  }));
}

function renderDetails(axes) {
  const rows = axes.flatMap((axis) => axis.details.map((detail) => {
    const row = document.createElement("div");
    row.className = "detail-row";
    const result = detail.result;
    const score = result?.missing ? "--" : result?.score;
    const resultLabel = result?.label ? ` · ${result.label}` : "";
    row.innerHTML = `<span>${axis.label} · ${detail.label}${detail.value ? ` (${detail.value})` : ""}</span><strong>${score}${resultLabel}</strong>`;
    return row;
  }));
  elements.detailTable.replaceChildren(...rows);
}

function renderNotes(data, results, typeResult, validation) {
  const notes = [
    "입력한 정보는 서버에 저장되지 않으며 현재 브라우저에서 리포트 생성에만 사용됩니다.",
    "본 리포트는 진단도구가 아니라 초진 상태와 치료 전후 변화를 보기 위한 임상 관리도구입니다.",
    "자율신경·회복 축은 옴니핏 결과지의 HRV-Index 판정과 Stress 판정을 점수화합니다.",
  ];
  if (data.mealStatus) notes.unshift(`채혈 당시 식사 상태: ${data.mealStatus}`);
  if (data.mealStatus === "식후 4시간 미만") notes.push("최근 식사의 영향으로 TG 및 TG/HDL-C가 평소보다 높게 측정되었을 수 있습니다.");
  if (data.mealStatus === "확인 불가") notes.push("채혈 당시 식사 상태를 확인할 수 없어 TG 및 TG/HDL-C 해석에 제한이 있습니다.");
  if (results.parts.tbil?.ratio > 1 && !((results.parts.alt?.ratio > 1) || (results.parts.ggt?.ratio > 1) || (results.parts.alp?.ratio > 1))) {
    notes.push("총빌리루빈 단독 상승입니다. 직접·간접 빌리루빈 분획 및 길버트증후군 가능성을 확인하세요.");
  }
  if (data.hsCrp > 10) notes.push("급성 염증 가능성이 있어 만성염증형 판정을 보류합니다.");
  if (typeResult.notes.length) notes.push(...typeResult.notes);
  if (validation.warnings.length) notes.push(...validation.warnings.map((warning) => warning.text));
  elements.notesList.replaceChildren(...notes.map((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    return item;
  }));
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

function renderType(typeResult, data) {
  elements.primaryType.textContent = data.manualPrimaryType || typeResult.primary;
  elements.secondaryType.textContent = data.manualSecondaryType || typeResult.secondary;
  elements.supportTags.textContent = typeResult.tags.length ? typeResult.tags.join(" · ") : "특이 보조 태그 없음";
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
  renderType(typeResult, data);
  elements.patientLine.textContent = patientLine(data);
  elements.totalScore.textContent = results.max ? `${results.total}/${results.max}` : "--";
  elements.gradeLabel.textContent = grade.label;
  elements.summaryComment.textContent = makeSummary(data, results, grade, typeResult);

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
  elements.printStatus.textContent = "인쇄창을 여는 중입니다. 뜨지 않으면 Cmd+P를 눌러 PDF로 저장하세요.";
  elements.printButton.textContent = "인쇄창 열기";
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
