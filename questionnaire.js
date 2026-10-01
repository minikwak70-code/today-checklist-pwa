const questionnaireToken = new URLSearchParams(window.location.search).get("questionnaire") || "";
window.patientQuestionnaireMode = Boolean(questionnaireToken);

const QUESTIONNAIRE_SECTIONS = [
  {
    target: "questionnaireInflammationQuestions",
    questions: [
      ["inflammationFatigue", "피로", "충분히 쉬거나 잠을 자도 피로가 잘 회복되지 않는다."],
      ["inflammationRecovery", "회복력", "운동·과로·스트레스 이후 몸 상태가 쉽게 나빠지고 회복하는 데 오래 걸린다."],
      ["inflammationMusculoskeletal", "근육·관절", "특별한 이유 없이 몸 여러 곳이 자주 뻐근하거나 쑤시고, 아침에 몸이나 관절이 뻣뻣한 경우가 있다."],
      ["inflammationOral", "구강·치주", "양치할 때 잇몸에서 피가 나거나 잇몸이 붓고, 구내염이 반복되는 경우가 있다."],
      ["inflammationRespiratory", "호흡기·알레르기", "비염·축농증·알레르기 증상이 반복적으로 나타난다."],
      ["inflammationSkin", "피부", "피부의 가려움, 붉어짐, 습진, 두드러기 등 피부 염증 증상이 반복된다."],
      ["inflammationGut", "위장관", "복부팽만, 복통, 설사 또는 묽은 변 등 위장 증상이 반복된다."],
      ["inflammationInfectionRecovery", "감염·회복", "감기에 자주 걸리거나 감염 후 몸 상태가 회복되는 데 오래 걸린다."],
    ],
  },
  {
    target: "questionnaireIntakeQuestions",
    questions: [
      ["appetiteReduced", "식욕·식사량", "최근 식욕이나 식사량이 뚜렷하게 줄었다."],
      ["earlySatiety", "조기포만", "조금만 먹어도 금방 배가 불러 충분히 먹기 어렵다."],
      ["frequentIndigestion", "소화불편", "소화불량, 복부팽만 또는 식후 불편감이 자주 있다."],
      ["foodAvoidanceDueDiscomfort", "섭취 제한", "설사나 음식 섭취 후 불편감 때문에 먹는 양이나 종류를 제한한다."],
    ],
  },
  {
    target: "questionnairePerformanceQuestions",
    questions: [
      ["fatigueActivityReduced", "피로·활동 유지", "예전보다 쉽게 지치고 일상 활동을 오래 유지하기 어렵다."],
      ["walkingStairsDifficulty", "걷기·계단", "계단을 오르거나 오래 걷는 것이 예전보다 힘들다."],
    ],
  },
];

const questionnaireState = {
  birthDate: "",
  responses: {},
  verified: false,
  saveTimer: null,
  savePromise: null,
};

function questionnaireElement(id) {
  return document.querySelector(`#${id}`);
}

function formatQuestionnaireBirthDate(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

async function questionnaireApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "문진 내용을 저장하지 못했습니다.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function renderQuestionnaireQuestions() {
  for (const section of QUESTIONNAIRE_SECTIONS) {
    const target = questionnaireElement(section.target);
    target.innerHTML = section.questions.map(([key, title, text], index) => `
      <fieldset class="questionnaire-question">
        <legend>
          <span class="questionnaire-question-number">${index + 1}</span>
          <span class="questionnaire-question-copy">
            <strong class="questionnaire-question-title">${title}</strong>
            <span class="questionnaire-question-prompt">${text}</span>
          </span>
        </legend>
        <div class="questionnaire-scale" role="radiogroup" aria-label="${title} 정도">
          ${Array.from({ length: 6 }, (_, score) => `
            <label>
              <input type="radio" name="questionnaire-${key}" value="${score}" data-questionnaire-key="${key}" />
              <span>${score}</span>
            </label>
          `).join("")}
        </div>
        <div class="questionnaire-scale-anchors"><span>전혀 아니다</span><span>매우 그렇다</span></div>
      </fieldset>
    `).join("");
  }
}

function questionnaireQuestionCount() {
  return QUESTIONNAIRE_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0);
}

function updateQuestionnaireProgress() {
  const answered = Object.keys(questionnaireState.responses).length;
  const total = questionnaireQuestionCount();
  questionnaireElement("questionnaireProgressText").textContent = `${answered} / ${total}`;
  questionnaireElement("questionnaireProgressBar").style.width = `${(answered / total) * 100}%`;
  questionnaireElement("questionnaireSubmitButton").disabled = answered !== total;
}

function applySavedQuestionnaireResponses() {
  Object.entries(questionnaireState.responses).forEach(([key, score]) => {
    const input = document.querySelector(`input[data-questionnaire-key="${key}"][value="${score}"]`);
    if (input) input.checked = true;
  });
  updateQuestionnaireProgress();
}

function setQuestionnaireStatus(message, type = "") {
  const status = questionnaireElement("questionnaireSaveStatus");
  status.textContent = message;
  status.dataset.status = type;
}

async function saveQuestionnaireResponses() {
  if (!questionnaireState.verified) return;
  setQuestionnaireStatus("저장 중...", "saving");
  questionnaireState.savePromise = questionnaireApi(`/api/questionnaire/${encodeURIComponent(questionnaireToken)}`, {
    method: "PATCH",
    body: JSON.stringify({ birthDate: questionnaireState.birthDate, responses: questionnaireState.responses }),
  });
  try {
    await questionnaireState.savePromise;
    setQuestionnaireStatus("자동 저장되었습니다.", "saved");
  } catch (error) {
    setQuestionnaireStatus(error.message, "error");
    throw error;
  } finally {
    questionnaireState.savePromise = null;
  }
}

function scheduleQuestionnaireSave() {
  clearTimeout(questionnaireState.saveTimer);
  setQuestionnaireStatus("변경사항 저장 대기 중...", "saving");
  questionnaireState.saveTimer = setTimeout(() => {
    saveQuestionnaireResponses().catch(() => {});
  }, 450);
}

function showQuestionnaireComplete() {
  questionnaireElement("questionnaireIntro").hidden = true;
  questionnaireElement("questionnaireForm").hidden = true;
  const complete = questionnaireElement("questionnaireComplete");
  complete.hidden = false;
  complete.focus({ preventScroll: true });
  complete.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function verifyQuestionnaire(event) {
  event.preventDefault();
  const birthDateInput = questionnaireElement("questionnaireBirthDate");
  const status = questionnaireElement("questionnaireVerifyStatus");
  const birthDate = formatQuestionnaireBirthDate(birthDateInput.value);
  birthDateInput.value = birthDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    status.textContent = "생년월일 8자리를 입력해 주세요.";
    status.dataset.status = "error";
    return;
  }
  status.textContent = "환자 정보를 확인하는 중입니다.";
  status.dataset.status = "saving";
  try {
    const data = await questionnaireApi(`/api/questionnaire/${encodeURIComponent(questionnaireToken)}/verify`, {
      method: "POST",
      body: JSON.stringify({ birthDate }),
    });
    if (["submitted", "applied"].includes(data.status)) {
      showQuestionnaireComplete();
      return;
    }
    if (["expired", "revoked"].includes(data.status)) throw new Error("사용이 종료된 문진 링크입니다.");
    questionnaireState.birthDate = birthDate;
    questionnaireState.responses = data.responses || {};
    questionnaireState.verified = true;
    questionnaireElement("questionnairePatientLabel").textContent = `${data.patientLabel} 님 · ${data.assessmentDate}`;
    questionnaireElement("questionnaireIntro").hidden = true;
    questionnaireElement("questionnaireForm").hidden = false;
    applySavedQuestionnaireResponses();
  } catch (error) {
    status.textContent = error.message;
    status.dataset.status = "error";
  }
}

async function submitQuestionnaire(event) {
  event.preventDefault();
  clearTimeout(questionnaireState.saveTimer);
  const button = questionnaireElement("questionnaireSubmitButton");
  button.disabled = true;
  setQuestionnaireStatus("문진을 제출하는 중입니다.", "saving");
  try {
    if (questionnaireState.savePromise) await questionnaireState.savePromise;
    await questionnaireApi(`/api/questionnaire/${encodeURIComponent(questionnaireToken)}/submit`, {
      method: "POST",
      body: JSON.stringify({ birthDate: questionnaireState.birthDate, responses: questionnaireState.responses }),
    });
    showQuestionnaireComplete();
  } catch (error) {
    setQuestionnaireStatus(error.message, "error");
    button.disabled = false;
  }
}

async function initializePatientQuestionnaire() {
  if (!questionnaireToken) return;
  document.body.classList.add("patient-questionnaire-mode");
  document.querySelector(".app-shell").hidden = true;
  questionnaireElement("patientQuestionnaireApp").hidden = false;
  renderQuestionnaireQuestions();

  const birthDateInput = questionnaireElement("questionnaireBirthDate");
  birthDateInput.addEventListener("input", () => {
    birthDateInput.value = formatQuestionnaireBirthDate(birthDateInput.value);
  });
  questionnaireElement("questionnaireVerifyForm").addEventListener("submit", verifyQuestionnaire);
  questionnaireElement("questionnaireForm").addEventListener("change", (event) => {
    const key = event.target.dataset.questionnaireKey;
    if (!key) return;
    questionnaireState.responses[key] = Number(event.target.value);
    updateQuestionnaireProgress();
    scheduleQuestionnaireSave();
  });
  questionnaireElement("questionnaireForm").addEventListener("submit", submitQuestionnaire);

  try {
    const data = await questionnaireApi(`/api/questionnaire/${encodeURIComponent(questionnaireToken)}`);
    questionnaireElement("questionnaireClinicName").textContent = data.clinicName || "공덕경희한의원";
    if (["submitted", "applied"].includes(data.status)) {
      showQuestionnaireComplete();
    } else if (["expired", "revoked"].includes(data.status)) {
      const status = questionnaireElement("questionnaireVerifyStatus");
      status.textContent = "사용이 종료된 문진 링크입니다. 한의원에 새 링크를 요청해 주세요.";
      status.dataset.status = "error";
      questionnaireElement("questionnaireVerifyForm").hidden = true;
    }
  } catch (error) {
    const status = questionnaireElement("questionnaireVerifyStatus");
    status.textContent = error.message;
    status.dataset.status = "error";
    questionnaireElement("questionnaireVerifyForm").hidden = true;
  }
}

initializePatientQuestionnaire();
