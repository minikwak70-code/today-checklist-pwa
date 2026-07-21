const axisConfig = [
  { key: "glucose", label: "당대사", parts: ["HbA1c", "TG/HDL-C"] },
  { key: "lipid", label: "지질대사", parts: ["TG", "non-HDL-C"] },
  { key: "liver", label: "간대사", parts: ["ALT", "GGT", "TBIL"] },
  { key: "inflammation", label: "만성염증", parts: ["hs-CRP", "내장지방"] },
  { key: "autonomic", label: "자율신경·회복", parts: ["혈압", "HRV-Index", "Stress"] },
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
};

const fields = [
  "patientName",
  "chartNumber",
  "sex",
  "age",
  "testDate",
  "hba1c",
  "tg",
  "hdl",
  "totalChol",
  "ldl",
  "mealHours",
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
  "hrvIndexGrade",
  "stressGrade",
  "ansActivity",
  "hba1cCaution",
  "acuteInflammation",
  "gilbert",
  "directBilirubin",
  "hrvInvalid",
  "hrvMedication",
  "vascularHistory",
  "diabetesHistory",
  "ckd",
  "lipidMedication",
];

const numberFields = new Set([
  "hba1c",
  "tg",
  "hdl",
  "totalChol",
  "ldl",
  "age",
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
]);

const checkboxFields = new Set([
  "hba1cCaution",
  "acuteInflammation",
  "gilbert",
  "directBilirubin",
  "hrvInvalid",
  "hrvMedication",
  "vascularHistory",
  "diabetesHistory",
  "ckd",
  "lipidMedication",
]);

function field(id) {
  return document.querySelector(`#${id}`);
}

function readValue(id) {
  const input = field(id);
  if (!input) return null;
  if (checkboxFields.has(id)) return input.checked;
  if (numberFields.has(id)) {
    const value = Number(input.value);
    return Number.isFinite(value) && input.value !== "" ? value : null;
  }
  return input.value.trim();
}

function readForm() {
  return Object.fromEntries(fields.map((id) => [id, readValue(id)]));
}

function scoreByRanges(value, ranges) {
  if (value === null || value === undefined) return null;
  const match = ranges.find((range) => range.test(value));
  return match ? { score: match.score, label: match.label } : null;
}

function scoreHba1c(value) {
  return scoreByRanges(value, [
    { test: (v) => v < 5.4, score: 10, label: "양호" },
    { test: (v) => v <= 5.6, score: 8, label: "정상 상단" },
    { test: (v) => v <= 5.9, score: 6, label: "당뇨병 전단계 범위" },
    { test: (v) => v <= 6.4, score: 3, label: "고위험 전단계" },
    { test: (v) => v >= 6.5, score: 0, label: "당뇨병 진단범위" },
  ]);
}

function scoreTgHdl(tg, hdl) {
  if (!tg || !hdl) return null;
  const ratio = tg / hdl;
  return {
    ratio,
    ...scoreByRanges(ratio, [
      { test: (v) => v <= 2, score: 10, label: "양호한 대사성 지질 패턴" },
      { test: (v) => v <= 2.49, score: 8, label: "경계 변화" },
      { test: (v) => v <= 2.99, score: 6, label: "인슐린 저항성 가능성 증가" },
      { test: (v) => v <= 3.49, score: 3, label: "불리한 대사성 지질 패턴" },
      { test: (v) => v >= 3.5, score: 0, label: "매우 불리한 패턴" },
    ]),
  };
}

function scoreTg(value) {
  return scoreByRanges(value, [
    { test: (v) => v < 100, score: 10, label: "양호" },
    { test: (v) => v <= 149, score: 8, label: "정상 상단" },
    { test: (v) => v <= 174, score: 6, label: "경계" },
    { test: (v) => v <= 199, score: 4, label: "비공복 상승" },
    { test: (v) => v <= 439, score: 2, label: "높음" },
    { test: (v) => v >= 440, score: 0, label: "공복 재검 또는 별도 평가" },
  ]);
}

function scoreNonHdl(totalChol, hdl) {
  if (totalChol === null || hdl === null) return null;
  const value = totalChol - hdl;
  return {
    value,
    ...scoreByRanges(value, [
      { test: (v) => v < 130, score: 10, label: "양호" },
      { test: (v) => v <= 154, score: 8, label: "정상 상단" },
      { test: (v) => v <= 184, score: 6, label: "상승" },
      { test: (v) => v <= 219, score: 3, label: "높음" },
      { test: (v) => v >= 220, score: 0, label: "매우 높음" },
    ]),
  };
}

function scoreUln(value, uln, scores) {
  if (value === null || !uln) return null;
  const ratio = value / uln;
  return {
    ratio,
    ...scoreByRanges(ratio, [
      { test: (v) => v <= 1, score: scores[0], label: "정상범위 이내" },
      { test: (v) => v <= 1.5, score: scores[1], label: "경도 상승" },
      { test: (v) => v <= 2, score: scores[2], label: "상승" },
      { test: (v) => v <= 3, score: scores[3], label: "추가 평가" },
      { test: (v) => v > 3, score: 0, label: "원인 평가 우선" },
    ]),
  };
}

function scoreHsCrp(value) {
  if (value === null) return null;
  if (value > 10) return { score: null, label: "판정 보류", hold: true };
  return scoreByRanges(value, [
    { test: (v) => v < 0.5, score: 14, label: "매우 낮음" },
    { test: (v) => v <= 0.99, score: 11, label: "낮음" },
    { test: (v) => v <= 1.99, score: 8, label: "경도 상승" },
    { test: (v) => v <= 2.99, score: 5, label: "의미 있는 상승" },
    { test: (v) => v <= 10, score: 2, label: "높은 염증 신호" },
  ]);
}

function scoreVisceralFat(value) {
  return scoreByRanges(value, [
    { test: (v) => v >= 1 && v <= 5, score: 6, label: "매우 양호" },
    { test: (v) => v <= 9, score: 5, label: "정상범위" },
    { test: (v) => v <= 12, score: 3, label: "증가" },
    { test: (v) => v <= 15, score: 1, label: "높음" },
    { test: (v) => v >= 16, score: 0, label: "매우 높음" },
  ]);
}

function scoreBloodPressure(sbp, dbp) {
  if (sbp === null || dbp === null) return null;
  if (sbp < 120 && dbp < 80) return { score: 6, label: "정상혈압" };
  if (sbp <= 129 && dbp < 80) return { score: 5, label: "주의혈압" };
  if ((sbp >= 130 && sbp <= 139) || (dbp >= 80 && dbp <= 89)) {
    return { score: 3, label: "고혈압 전단계" };
  }
  if ((sbp >= 140 && sbp <= 159) || (dbp >= 90 && dbp <= 99)) {
    return { score: 1, label: "고혈압 범위" };
  }
  return { score: 0, label: "고도 상승" };
}

function scoreHrvIndexGrade(grade) {
  const scores = {
    "매우 높음": [10, "심박변이도 매우 양호"],
    "높음": [8, "심박변이도 양호"],
    "보통": [5, "평균 범위"],
    "낮음": [2, "회복력 저하 가능"],
    "매우 낮음": [0, "회복력 매우 낮음"],
  };
  if (!scores[grade]) return null;
  return { score: scores[grade][0], label: scores[grade][1] };
}

function scoreStressGrade(grade) {
  const scores = {
    "매우 낮음": [4, "신체적 스트레스 반응 매우 낮음"],
    "낮음": [3, "신체적 스트레스 반응 낮음"],
    "보통": [2, "평균 범위"],
    "높음": [1, "신체적 스트레스 반응 높음"],
    "매우 높음": [0, "신체적 스트레스 반응 매우 높음"],
  };
  if (!scores[grade]) return null;
  return { score: scores[grade][0], label: scores[grade][1] };
}

function safeScore(...items) {
  if (items.some((item) => item?.score === null || item === null)) return null;
  return items.reduce((sum, item) => sum + item.score, 0);
}

function getGrade(total) {
  if (total === null) return { label: "계산 대기", text: "필수 검사값을 입력하면 총점이 계산됩니다." };
  if (total >= 85) return { label: "안정권", text: "전반적으로 양호한 상태입니다." };
  if (total >= 70) return { label: "관리권", text: "일부 영역의 개선과 추적관찰이 필요합니다." };
  if (total >= 55) return { label: "집중관리권", text: "여러 대사영역의 적극적인 관리가 필요합니다." };
  return { label: "우선평가권", text: "원인 평가와 우선 관리가 필요합니다." };
}

function axisTone(score) {
  if (score === null) return "입력 대기";
  if (score >= 16) return "양호";
  if (score >= 12) return "관리 필요";
  if (score >= 8) return "개선 필요";
  return "우선 관리";
}

function makeResults(data) {
  const hba1c = scoreHba1c(data.hba1c);
  const tgHdl = scoreTgHdl(data.tg, data.hdl);
  const tg = scoreTg(data.tg);
  const nonHdl = scoreNonHdl(data.totalChol, data.hdl);
  const alt = scoreUln(data.alt, data.altUln, [10, 8, 5, 2]);
  const ggt = scoreUln(data.ggt, data.ggtUln, [6, 5, 3, 1]);
  const tbilRaw = scoreUln(data.tbil, data.tbilUln, [4, 3, 2, 1]);
  const tbil = data.gilbert && tbilRaw ? { ...tbilRaw, score: 4, label: "길버트증후군 보정" } : tbilRaw;
  const hsCrp = scoreHsCrp(data.hsCrp);
  const visceralFat = scoreVisceralFat(data.visceralFat);
  const bp = scoreBloodPressure(data.sbp, data.dbp);
  const hrvIndex = data.hrvInvalid ? { score: null, label: "판독 제외" } : scoreHrvIndexGrade(data.hrvIndexGrade);
  const stress = data.hrvInvalid ? { score: null, label: "판독 제외" } : scoreStressGrade(data.stressGrade);

  const axes = [
    {
      key: "glucose",
      label: "당대사",
      score: safeScore(hba1c, tgHdl),
      details: [
        ["HbA1c", hba1c, data.hba1c === null ? null : `${data.hba1c}%`],
        ["TG/HDL-C", tgHdl, tgHdl?.ratio === undefined ? null : tgHdl.ratio.toFixed(2)],
      ],
      comment: "혈당 조절 상태와 인슐린 저항성 관련 지질 패턴을 함께 평가합니다.",
    },
    {
      key: "lipid",
      label: "지질대사",
      score: safeScore(tg, nonHdl),
      details: [
        ["TG", tg, data.tg === null ? null : `${data.tg} mg/dL`],
        ["non-HDL-C", nonHdl, nonHdl?.value === undefined ? null : `${nonHdl.value} mg/dL`],
      ],
      comment: "중성지방의 절대 상승 정도와 동맥경화성 지질 부담을 함께 봅니다.",
    },
    {
      key: "liver",
      label: "간대사",
      score: safeScore(alt, ggt, tbil),
      details: [
        ["ALT", alt, alt?.ratio === undefined ? null : `${alt.ratio.toFixed(2)} x ULN`],
        ["GGT", ggt, ggt?.ratio === undefined ? null : `${ggt.ratio.toFixed(2)} x ULN`],
        ["TBIL", tbil, tbil?.ratio === undefined ? null : `${tbil.ratio.toFixed(2)} x ULN`],
      ],
      comment: "간세포 손상, 담도 관련 신호, 빌리루빈 이상 여부를 통합합니다.",
    },
    {
      key: "inflammation",
      label: "만성염증",
      score: safeScore(hsCrp, visceralFat),
      details: [
        ["hs-CRP", hsCrp, data.hsCrp === null ? null : `${data.hsCrp} mg/L`],
        ["내장지방레벨", visceralFat, data.visceralFat === null ? null : `${data.visceralFat}`],
      ],
      comment: "저강도 염증 신호와 내장지방 축적 정도를 함께 반영합니다.",
    },
    {
      key: "autonomic",
      label: "자율신경·회복",
      score: safeScore(bp, hrvIndex, stress),
      details: [
        ["혈압", bp, data.sbp === null || data.dbp === null ? null : `${data.sbp}/${data.dbp}`],
        [
          "HRV-Index",
          hrvIndex,
          [data.hrvIndexGrade, data.hrvIndexValue === null ? "" : data.hrvIndexValue].filter(Boolean).join(" · "),
        ],
        ["Stress", stress, data.stressGrade || null],
        ["ANS Activity", { score: "-", label: "타입 상담용" }, data.ansActivity || null],
      ],
      comment: "혈압조절 상태, 옴니핏 HRV-Index, 측정 당시 신체적 스트레스 반응을 함께 평가합니다.",
    },
  ];

  const total = axes.some((axis) => axis.score === null)
    ? null
    : axes.reduce((sum, axis) => sum + axis.score, 0);

  return { axes, total, parts: { hba1c, tgHdl, tg, nonHdl, alt, ggt, tbil, hsCrp, visceralFat, bp, hrvIndex, stress } };
}

function makeFlags(data, results) {
  const flags = [];
  const add = (type, text) => flags.push({ type, text });

  if (data.hba1c >= 6.5) add("warning", "HbA1c가 당뇨병 진단범위입니다. 증상이 뚜렷하지 않으면 반복검사 또는 다른 진단검사 확인이 필요합니다.");
  if (data.hba1cCaution) add("caution", "HbA1c 해석 주의 조건이 있어 실제 평균혈당과 차이가 날 수 있습니다.");
  if (data.tg >= 1000) add("warning", "TG가 1,000 mg/dL 이상입니다. 췌장염 위험 평가를 우선합니다.");
  else if (data.tg >= 500) add("warning", "TG가 500 mg/dL 이상으로 심한 고중성지방혈증 경고에 해당합니다.");
  else if (data.tg >= 440) add("caution", "비공복 TG가 440 mg/dL 이상입니다. 공복 지질검사 재확인을 권장합니다.");
  if (data.ldl >= 190 || results.parts.nonHdl?.value >= 220) add("warning", "고도 지질위험 기준에 해당합니다. 전체 혈관위험 평가가 필요합니다.");
  if (data.vascularHistory || data.diabetesHistory || data.ckd || data.lipidMedication) add("info", "심혈관질환 병력, 당뇨병, 만성신장질환, 지질강하제 복용 여부는 지질 목표 설정에 반영해야 합니다.");
  if (results.parts.alt?.ratio > 3) add("warning", "ALT가 3 x ULN을 초과합니다. 간세포 손상 원인 평가를 우선합니다.");
  if (data.directBilirubin) add("warning", "직접빌리루빈 우세 또는 담즙정체 의심 조건이 있어 빌리루빈 이상 평가가 필요합니다.");
  if (data.hsCrp > 10 || data.acuteInflammation) add("caution", "급성 염증 가능성이 있어 hs-CRP 기반 만성염증 점수는 회복 후 재검이 적절합니다.");
  if ((data.sbp >= 180 || data.dbp >= 120)) add("warning", "혈압이 180/120 mmHg 이상입니다. 관련 증상이 있으면 즉각적인 의학적 평가가 우선입니다.");
  if (data.hrvInvalid) add("caution", "옴니핏 HRV 판독 제외 조건이 선택되어 자율신경·회복 점수의 일부 계산을 보류했습니다.");
  if (data.hrvMedication) add("info", "베타차단제, 항부정맥제, 일부 정신과 약물 등은 HRV 결과에 영향을 줄 수 있습니다.");
  const lowHrv = data.hrvIndexGrade === "낮음" || data.hrvIndexGrade === "매우 낮음";
  const lowAns = data.ansActivity === "낮음" || data.ansActivity === "매우 낮음";
  if (lowHrv && lowAns) {
    add("info", "HRV-Index와 전체 자율신경 활성도가 낮아 회복력 저하 패턴이 관찰됩니다.");
  }
  return flags;
}

function patientLine(data) {
  const items = [
    data.patientName || "이름 미입력",
    data.sex,
    data.age !== null ? `${data.age}세` : "",
    data.chartNumber ? `차트 ${data.chartNumber}` : "",
    data.testDate ? `검사일 ${data.testDate}` : "",
  ].filter(Boolean);
  return items.join(" · ");
}

function makeSummary(data, results, grade) {
  if (results.total === null) {
    return "필수 검사값이 모두 입력되지 않았거나 판정 보류 조건이 있어 총점 계산을 기다리고 있습니다. 입력된 항목은 축별 카드와 경고 플래그에 먼저 반영됩니다.";
  }
  const sorted = [...results.axes].sort((a, b) => a.score - b.score);
  return `종합점수는 ${results.total}/100점으로 ${grade.label}입니다. ${grade.text} 특히 ${sorted[0].label}와 ${sorted[1].label} 축을 우선 확인하는 것이 좋습니다. 총점보다 개별 경고 플래그와 측정조건을 먼저 해석합니다.`;
}

function renderRadar(axes) {
  const center = 180;
  const radius = 116;
  const levels = [0.25, 0.5, 0.75, 1];
  const pointsFor = (scale) =>
    axes
      .map((axis, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
        const valueScale = axis.score === null ? 0 : (axis.score / 20) * scale;
        const x = center + Math.cos(angle) * radius * valueScale;
        const y = center + Math.sin(angle) * radius * valueScale;
        return `${x},${y}`;
      })
      .join(" ");
  const grid = levels
    .map((level) => `<polygon points="${pointsFor(level)}" fill="none" stroke="#d9e4de" stroke-width="1" />`)
    .join("");
  const spokes = axes
    .map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e2ebe6" />`;
    })
    .join("");
  const labels = axes
    .map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const x = center + Math.cos(angle) * (radius + 36);
      const y = center + Math.sin(angle) * (radius + 34);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#34433d" font-size="13" font-weight="800">${axis.label}</text>`;
    })
    .join("");
  elements.radarChart.innerHTML = `
    <svg viewBox="0 0 360 360" role="img" aria-label="5개 축 점수 레이더 차트">
      ${grid}
      ${spokes}
      <polygon points="${pointsFor(1)}" fill="rgba(35,116,90,0.24)" stroke="#23745a" stroke-width="3" />
      ${axes
        .map((axis, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
          const valueScale = axis.score === null ? 0 : axis.score / 20;
          const x = center + Math.cos(angle) * radius * valueScale;
          const y = center + Math.sin(angle) * radius * valueScale;
          return `<circle cx="${x}" cy="${y}" r="5" fill="#23745a" />`;
        })
        .join("")}
      ${labels}
    </svg>
  `;
}

function renderPriority(axes) {
  const validAxes = axes.filter((axis) => axis.score !== null).sort((a, b) => a.score - b.score);
  const priorities = validAxes.length >= 2 ? validAxes.slice(0, 2) : axes.slice(0, 2);
  elements.priorityList.replaceChildren(
    ...priorities.map((axis, index) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span><strong>${axis.label}</strong><span>${axis.comment}</span></span>
        <span>${axis.score === null ? "--" : axis.score}/20</span>
      `;
      return item;
    }),
  );
}

function renderFlags(flags) {
  if (flags.length === 0) {
    elements.flagArea.innerHTML = `<div class="flag info">총점보다 우선하는 경고 플래그는 현재 없습니다.</div>`;
    return;
  }
  elements.flagArea.replaceChildren(
    ...flags.map((flag) => {
      const item = document.createElement("div");
      item.className = `flag ${flag.type}`;
      item.textContent = flag.text;
      return item;
    }),
  );
}

function renderAxisCards(axes) {
  elements.axisCards.replaceChildren(
    ...axes.map((axis) => {
      const card = document.createElement("article");
      card.className = "axis-card";
      const percent = axis.score === null ? 0 : (axis.score / 20) * 100;
      card.innerHTML = `
        <strong>${axis.label}</strong>
        <div class="axis-score">${axis.score === null ? "--" : axis.score}<small>/20</small></div>
        <div class="score-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
        <p>${axisTone(axis.score)} · ${axis.comment}</p>
      `;
      return card;
    }),
  );
}

function renderDetails(axes) {
  const rows = axes.flatMap((axis) =>
    axis.details.map(([label, result, value]) => {
      const row = document.createElement("div");
      row.className = "detail-row";
      const score = result?.score === null || result === null ? "--" : result.score;
      const resultLabel = result?.label ? ` · ${result.label}` : "";
      row.innerHTML = `<span>${axis.label} · ${label}${value ? ` (${value})` : ""}</span><strong>${score}${resultLabel}</strong>`;
      return row;
    }),
  );
  elements.detailTable.replaceChildren(...rows);
}

function renderNotes(data) {
  const notes = [
    "중성지방은 TG/HDL-C 비율과 TG 단독 점수에 중복 반영됩니다.",
    "TG와 TG/HDL-C는 식사 영향을 받으므로 재검 비교 시 식후 경과시간을 함께 봅니다.",
    "내장지방레벨은 InBody 1-20 기준을 전제로 하며 장비 변경 시 기준 재설정이 필요합니다.",
    "자율신경·회복 축은 옴니핏 1분 PPG 결과지의 HRV-Index 판정과 Stress 판정을 그대로 점수화합니다.",
    "ANS Activity는 총점이 아니라 상담과 추적 비교에 사용하는 참고지표입니다.",
    "혈압은 자율신경뿐 아니라 혈관 탄성, 체액량, 약물, 통증, 불안의 영향을 받습니다.",
  ];
  if (data.mealHours) notes.unshift(`기록된 식후 경과시간: ${data.mealHours}`);
  elements.notesList.replaceChildren(
    ...notes.map((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      return item;
    }),
  );
}

function render() {
  const data = readForm();
  const results = makeResults(data);
  const flags = makeFlags(data, results);
  const grade = getGrade(results.total);

  elements.patientLine.textContent = patientLine(data);
  elements.totalScore.textContent = results.total === null ? "--" : results.total;
  elements.gradeLabel.textContent = grade.label;
  elements.summaryComment.textContent = makeSummary(data, results, grade);

  renderRadar(results.axes);
  renderPriority(results.axes);
  renderFlags(flags);
  renderAxisCards(results.axes);
  renderDetails(results.axes);
  renderNotes(data);
}

function setValues(values) {
  for (const [id, value] of Object.entries(values)) {
    const input = field(id);
    if (!input) continue;
    if (checkboxFields.has(id)) {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? "";
    }
  }
  render();
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
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
    tg: 188,
    hdl: 43,
    totalChol: 226,
    ldl: 148,
    mealHours: "4시간 미만",
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
    ansActivity: "보통",
  });
}

function resetForm() {
  elements.form.reset();
  setValues({
    testDate: localDateKey(),
    altUln: 40,
    ggtUln: 60,
    tbilUln: 1.2,
  });
}

function generateReport() {
  render();
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

resetForm();
window.__metabolicReportReady = true;
