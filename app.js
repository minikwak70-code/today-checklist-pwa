const config = window.APP_CONFIG ?? {};
const isCloudConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
let createClient = null;
if (isCloudConfigured) {
  try {
    ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
  } catch (error) {
    console.warn("클라우드 연결 모듈을 불러오지 못해 오프라인 모드로 시작합니다.", error);
  }
}
const supabase = createClient ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

const elements = {
  accountButton: document.querySelector("#accountButton"),
  addForm: document.querySelector("#taskForm"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authMessage: document.querySelector("#authMessage"),
  closeDialog: document.querySelector("#closeDialog"),
  closeDisplayDialog: document.querySelector("#closeDisplayDialog"),
  closeInstallDialog: document.querySelector("#closeInstallDialog"),
  closeRoutineDialog: document.querySelector("#closeRoutineDialog"),
  closeSearchDialog: document.querySelector("#closeSearchDialog"),
  clearSearchButton: document.querySelector("#clearSearchButton"),
  dateEyebrow: document.querySelector("#dateEyebrow"),
  datePicker: document.querySelector("#datePicker"),
  displayButton: document.querySelector("#displayButton"),
  displayDialog: document.querySelector("#displayDialog"),
  emailInput: document.querySelector("#emailInput"),
  emptyState: document.querySelector("#emptyState"),
  englishMeaning: document.querySelector("#englishMeaning"),
  englishPhrase: document.querySelector("#englishPhrase"),
  heroMessage: document.querySelector("#heroMessage"),
  heroTitle: document.querySelector("#heroTitle"),
  installButton: document.querySelector("#installButton"),
  installConfirmButton: document.querySelector("#installConfirmButton"),
  installDialog: document.querySelector("#installDialog"),
  googleLoginButton: document.querySelector("#googleLoginButton"),
  nextDate: document.querySelector("#nextDate"),
  previousDate: document.querySelector("#previousDate"),
  progressBar: document.querySelector("#progressBar"),
  progressCount: document.querySelector("#progressCount"),
  progressTrack: document.querySelector("#progressTrack"),
  postitModeInput: document.querySelector("#postitModeInput"),
  routineButton: document.querySelector("#routineButton"),
  routineDialog: document.querySelector("#routineDialog"),
  routineEmpty: document.querySelector("#routineEmpty"),
  routineForm: document.querySelector("#routineForm"),
  routineInput: document.querySelector("#routineInput"),
  routineList: document.querySelector("#routineList"),
  routineMessage: document.querySelector("#routineMessage"),
  routineTemplate: document.querySelector("#routineTemplate"),
  rolloverArea: document.querySelector("#rolloverArea"),
  rolloverButton: document.querySelector("#rolloverButton"),
  rolloverLabel: document.querySelector("#rolloverLabel"),
  rolloverMessage: document.querySelector("#rolloverMessage"),
  resetDisplayButton: document.querySelector("#resetDisplayButton"),
  signedInEmail: document.querySelector("#signedInEmail"),
  signedInView: document.querySelector("#signedInView"),
  signedOutView: document.querySelector("#signedOutView"),
  signOutButton: document.querySelector("#signOutButton"),
  searchButton: document.querySelector("#searchButton"),
  searchDialog: document.querySelector("#searchDialog"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  searchResultTemplate: document.querySelector("#searchResultTemplate"),
  searchSummary: document.querySelector("#searchSummary"),
  syncStatus: document.querySelector("#syncStatus"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  taskTemplate: document.querySelector("#taskTemplate"),
  todayButton: document.querySelector("#todayButton"),
  updateButton: document.querySelector("#updateButton"),
  updateToast: document.querySelector("#updateToast"),
  weekdayTabs: document.querySelector("#weekdayTabs"),
};

const state = {
  selectedDate: startOfDay(new Date()),
  tasks: [],
  user: null,
  realtimeChannel: null,
  midnightTimer: null,
  currentDateKey: toDateKey(new Date()),
  isAutoRolloverRunning: false,
  routines: [],
  selectedRoutineWeekday: new Date().getDay(),
  draggedTaskId: null,
  searchTimer: null,
  installPrompt: null,
  waitingServiceWorker: null,
};

const DISPLAY_SETTINGS_KEY = "daily-checklist:display-settings";
const DEFAULT_DISPLAY_SETTINGS = {
  textSize: "normal",
  density: "normal",
  postitMode: false,
};

function readDisplaySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(DISPLAY_SETTINGS_KEY) || "{}");
    return { ...DEFAULT_DISPLAY_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
}

function writeDisplaySettings(nextSettings) {
  localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(nextSettings));
}

function syncDisplayControls(settings) {
  const textSizeInput = document.querySelector(
    `input[name="textSize"][value="${settings.textSize}"]`,
  );
  const densityInput = document.querySelector(
    `input[name="density"][value="${settings.density}"]`,
  );
  if (textSizeInput) textSizeInput.checked = true;
  if (densityInput) densityInput.checked = true;
  elements.postitModeInput.checked = settings.postitMode;
}

function applyDisplaySettings(settings = readDisplaySettings()) {
  document.body.dataset.textSize = settings.textSize;
  document.body.dataset.density = settings.density;
  document.body.dataset.postitMode = settings.postitMode ? "on" : "off";
  syncDisplayControls(settings);
}

function updateDisplaySettings(partialSettings) {
  const nextSettings = { ...readDisplaySettings(), ...partialSettings };
  writeDisplaySettings(nextSettings);
  applyDisplaySettings(nextSettings);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(first, second) {
  return toDateKey(first) === toDateKey(second);
}

function localStorageKey() {
  return `daily-checklist:${toDateKey(state.selectedDate)}`;
}

const ROUTINES_STORAGE_KEY = "daily-checklist:routines";

function readLocalRoutines() {
  try {
    const routines = JSON.parse(localStorage.getItem(ROUTINES_STORAGE_KEY) ?? "[]");
    return Array.isArray(routines) ? routines : [];
  } catch {
    return [];
  }
}

function saveLocalRoutines() {
  localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(state.routines));
}

function formatDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(state.selectedDate);
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatSearchDate(dateKey) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(dateKey));
}

const DAILY_ENGLISH = [
  ["I'll take that into consideration.", "그 점을 고려해 볼게."],
  ["Let me think it over.", "좀 더 생각해 볼게."],
  ["I'll get back to you on that.", "그 부분은 확인해서 다시 알려줄게."],
  ["That wasn't what I had in mind.", "내가 생각했던 건 그게 아니었어."],
  ["I see where you're coming from.", "네가 왜 그렇게 생각하는지 이해해."],
  ["You have a point there.", "그 부분은 네 말이 일리가 있어."],
  ["That's easier said than done.", "말처럼 그렇게 쉽지는 않아."],
  ["It's not as simple as it sounds.", "말처럼 간단한 일은 아니야."],
  ["I wouldn't go that far.", "나는 그렇게까지 말하진 않겠어."],
  ["I'm not entirely convinced.", "아직 완전히 납득되지는 않아."],
  ["I'm leaning toward the first option.", "첫 번째 선택 쪽으로 마음이 기울고 있어."],
  ["I'm having second thoughts.", "다시 생각해 보니 마음이 흔들려."],
  ["Let's weigh the pros and cons.", "장단점을 따져 보자."],
  ["We can work around it.", "우회할 방법을 찾을 수 있어."],
  ["We'll cross that bridge when we come to it.", "그 문제는 닥쳤을 때 해결하자."],
  ["Let's not get ahead of ourselves.", "너무 앞서서 생각하지 말자."],
  ["It's worth keeping in mind.", "기억해 둘 만한 부분이야."],
  ["That puts things into perspective.", "그렇게 보니 상황이 더 명확해지네."],
  ["I hadn't thought of it that way.", "그런 관점으로는 생각 못 했어."],
  ["That clears things up.", "이제 상황이 명확해졌어."],
  ["Could you walk me through it?", "과정을 차근차근 설명해 줄래?"],
  ["Could you elaborate on that?", "그 부분을 좀 더 자세히 설명해 줄래?"],
  ["Just to make sure we're on the same page.", "서로 같은 내용을 이해했는지 확인하려고."],
  ["If I understand correctly, this is the plan.", "내가 제대로 이해했다면 이게 계획인 거지."],
  ["Feel free to correct me if I'm wrong.", "내가 틀렸다면 편하게 바로잡아 줘."],
  ["Let me put it another way.", "다른 방식으로 설명해 볼게."],
  ["That's not quite what I meant.", "내 뜻은 정확히 그게 아니었어."],
  ["I may have misunderstood you.", "내가 네 말을 잘못 이해했을 수도 있어."],
  ["Could you be more specific?", "조금 더 구체적으로 말해 줄래?"],
  ["I'll keep you posted.", "진행 상황을 계속 알려줄게."],
  ["Something came up at the last minute.", "막판에 갑자기 일이 생겼어."],
  ["I'm tied up at the moment.", "지금은 다른 일로 꼼짝 못 해."],
  ["I have a lot on my plate.", "지금 처리할 일이 아주 많아."],
  ["I'm trying to stay on top of things.", "밀리지 않도록 계속 챙기고 있어."],
  ["I'm a little behind schedule.", "일정이 조금 밀렸어."],
  ["We're running out of time.", "시간이 얼마 남지 않았어."],
  ["Let's move this up a bit.", "이 일정을 조금 앞당기자."],
  ["Can we push it back until tomorrow?", "내일까지 미룰 수 있을까?"],
  ["I'll make time for it.", "시간을 내서 할게."],
  ["It completely slipped my mind.", "완전히 깜빡했어."],
  ["I'll take care of it first thing tomorrow.", "내일 아침 가장 먼저 처리할게."],
  ["I'll get it done by the end of the day.", "오늘 안으로 끝낼게."],
  ["I'm making steady progress.", "꾸준히 진전하고 있어."],
  ["I'm still working out the details.", "아직 세부 사항을 정리하고 있어."],
  ["Let's wrap things up.", "이제 마무리하자."],
  ["That should do the trick.", "그렇게 하면 해결될 거야."],
  ["We'll have to make do with what we have.", "지금 가진 것으로 어떻게든 해내야 해."],
  ["Let's take it one step at a time.", "한 단계씩 차근차근 해보자."],
  ["I could use a hand with this.", "이것 좀 도와주면 좋겠어."],
  ["Would you mind giving me a hand?", "나 좀 도와줄 수 있을까?"],
  ["I owe you one.", "이번 도움은 꼭 갚을게."],
  ["I'll return the favor sometime.", "언젠가 나도 꼭 도와줄게."],
  ["Thanks for going out of your way.", "일부러 애써 줘서 고마워."],
  ["I really appreciate you taking the time.", "시간을 내줘서 정말 고마워."],
  ["That means a lot to me.", "그게 나에게 정말 큰 의미가 있어."],
  ["I couldn't have done it without you.", "네가 없었다면 해내지 못했을 거야."],
  ["Don't hesitate to reach out.", "필요하면 주저하지 말고 연락해."],
  ["Let me know if anything comes up.", "무슨 일 생기면 알려줘."],
  ["I'm sorry for the inconvenience.", "불편을 드려 죄송합니다."],
  ["I didn't mean to put you on the spot.", "너를 곤란한 상황에 놓으려던 건 아니었어."],
  ["I may have overreacted.", "내가 과민 반응했을 수도 있어."],
  ["I shouldn't have jumped to conclusions.", "성급하게 결론 내리면 안 됐어."],
  ["Let's put this behind us.", "이 일은 이제 털어버리자."],
  ["There's no hard feelings.", "서로 감정 상한 건 없어."],
  ["I didn't take it personally.", "개인적인 공격으로 받아들이지 않았어."],
  ["I know you meant well.", "좋은 의도였다는 건 알아."],
  ["I can relate to that.", "나도 그런 마음을 이해해."],
  ["I've been there before.", "나도 전에 그런 일을 겪어 봤어."],
  ["That must have been frustrating.", "정말 답답했겠다."],
  ["I'm glad things worked out.", "일이 잘 풀려서 다행이야."],
  ["It could have been much worse.", "훨씬 더 나쁠 수도 있었어."],
  ["Try not to be too hard on yourself.", "너무 자책하지 마."],
  ["Give yourself some credit.", "네가 해낸 것도 인정해 줘."],
  ["I'm trying to keep an open mind.", "열린 마음으로 보려고 해."],
  ["I'm not in the mood for that right now.", "지금은 그럴 기분이 아니야."],
  ["I need some time to clear my head.", "머리를 식힐 시간이 좀 필요해."],
  ["I've got a lot on my mind.", "요즘 생각할 게 많아."],
  ["I'm feeling a bit overwhelmed.", "조금 벅차고 감당하기 힘들어."],
  ["I just need to recharge.", "그냥 잠시 재충전이 필요해."],
  ["I'm starting to get the hang of it.", "이제 조금씩 요령을 익히고 있어."],
  ["It takes some getting used to.", "익숙해지는 데 시간이 좀 걸려."],
  ["I'm still figuring things out.", "아직 이것저것 알아가는 중이야."],
  ["I'm learning as I go.", "해나가면서 배우고 있어."],
  ["Practice will eventually pay off.", "연습은 결국 결실을 맺을 거야."],
  ["I'm trying to get back into the habit.", "다시 습관을 들이려고 노력 중이야."],
  ["I've fallen out of the habit.", "그 습관이 흐트러졌어."],
  ["I need to get my priorities straight.", "우선순위를 제대로 정해야겠어."],
  ["I'm trying to cut back on spending.", "지출을 줄이려고 노력 중이야."],
  ["I'm trying to make the most of my time.", "시간을 최대한 알차게 쓰려고 해."],
  ["It's been on my to-do list for ages.", "아주 오래전부터 할 일 목록에 있었어."],
  ["I finally got around to doing it.", "드디어 시간을 내서 그 일을 했어."],
  ["That reminds me, I need to call someone.", "그러고 보니 누구에게 전화해야 해."],
  ["Now that you mention it, I remember.", "네가 말하니 이제 기억난다."],
  ["Come to think of it, you're right.", "생각해 보니 네 말이 맞아."],
  ["As far as I know, that's still the plan.", "내가 알기로는 아직 그게 계획이야."],
  ["From what I understand, nothing has changed.", "내가 이해한 바로는 달라진 게 없어."],
  ["As far as I'm concerned, we're done.", "내 입장에서는 우리 일은 끝났어."],
  ["For the time being, let's leave it as it is.", "당분간은 그대로 두자."],
  ["At the end of the day, it's your decision.", "결국 결정은 네가 하는 거야."],
  ["It turned out better than I expected.", "생각보다 결과가 더 좋았어."],
];

function getDailyEnglish(date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
  return DAILY_ENGLISH[Math.abs(dayNumber) % DAILY_ENGLISH.length];
}

function updateDateCopy() {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  elements.dateEyebrow.textContent = formatDate();
  elements.datePicker.value = toDateKey(state.selectedDate);
  const [phrase, meaning] = getDailyEnglish(state.selectedDate);
  elements.englishPhrase.textContent = phrase;
  elements.englishMeaning.textContent = meaning;

  if (isSameDate(state.selectedDate, today)) {
    elements.heroTitle.textContent = "오늘 할 일";
  } else if (isSameDate(state.selectedDate, tomorrow)) {
    elements.heroTitle.textContent = "내일 할 일";
  } else if (isSameDate(state.selectedDate, yesterday)) {
    elements.heroTitle.textContent = "어제 한 일";
  } else {
    elements.heroTitle.textContent = "이날의 할 일";
  }
}

function getTaskGroup(task) {
  if (task.is_completed) return "completed";
  return task.routine_id ? "routine" : "task";
}

function sortTasksForDisplay(tasks) {
  const groupOrder = { routine: 0, task: 1, completed: 2 };
  return [...tasks].sort((first, second) => {
    const groupDifference =
      groupOrder[getTaskGroup(first)] - groupOrder[getTaskGroup(second)];
    if (groupDifference !== 0) return groupDifference;
    return (first.position ?? 0) - (second.position ?? 0);
  });
}

function appendTaskSection(group, count) {
  const labels = {
    routine: ["ROUTINE", "요일 루틴"],
    task: ["TO DO", "오늘의 할 일"],
    completed: ["DONE", "완료한 일"],
  };
  const [eyebrow, title] = labels[group];
  const section = document.createElement("div");
  section.className = `task-section-heading ${group}`;
  section.innerHTML = `
    <span>${eyebrow}</span>
    <strong>${title}</strong>
    <small>${count}</small>
  `;
  elements.taskList.append(section);
}

function renderTasks() {
  elements.taskList.replaceChildren();
  state.tasks = sortTasksForDisplay(state.tasks);
  const groupCounts = state.tasks.reduce((counts, task) => {
    const group = getTaskGroup(task);
    counts[group] = (counts[group] ?? 0) + 1;
    return counts;
  }, {});
  let currentGroup = null;

  state.tasks.forEach((task, index) => {
    const taskGroup = getTaskGroup(task);
    if (taskGroup !== currentGroup) {
      appendTaskSection(taskGroup, groupCounts[taskGroup]);
      currentGroup = taskGroup;
    }

    const fragment = elements.taskTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".task-item");
    const checkbox = fragment.querySelector("input");
    const title = fragment.querySelector(".task-title");
    const routineBadge = fragment.querySelector(".routine-badge");
    const deleteButton = fragment.querySelector(".delete-button");
    const moveUpButton = fragment.querySelector(".move-up");
    const moveDownButton = fragment.querySelector(".move-down");

    article.dataset.taskId = task.id;
    article.classList.add(`group-${taskGroup}`);
    checkbox.checked = task.is_completed;
    checkbox.setAttribute(
      "aria-label",
      `${task.title} ${task.is_completed ? "완료 취소" : "완료로 표시"}`,
    );
    title.textContent = task.title;
    routineBadge.hidden = !task.routine_id;
    deleteButton.setAttribute(
      "aria-label",
      task.routine_id ? "오늘 루틴 제외" : "할 일 삭제",
    );
    deleteButton.title = task.routine_id ? "이 날짜에서만 제외" : "삭제";
    const groupTasks = state.tasks.filter((item) => getTaskGroup(item) === taskGroup);
    const groupIndex = groupTasks.findIndex((item) => item.id === task.id);
    moveUpButton.disabled = groupIndex === 0;
    moveDownButton.disabled = groupIndex === groupTasks.length - 1;

    checkbox.addEventListener("change", () => {
      toggleTask(task.id, checkbox.checked);
    });
    deleteButton.addEventListener("click", () => {
      if (task.routine_id) {
        hideRoutineOccurrence(task.id);
      } else {
        deleteTask(task.id);
      }
    });
    moveUpButton.addEventListener("click", () => moveTask(task.id, -1));
    moveDownButton.addEventListener("click", () => moveTask(task.id, 1));
    article.addEventListener("dragstart", (event) => {
      state.draggedTaskId = task.id;
      article.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", task.id);
    });
    article.addEventListener("dragend", () => {
      state.draggedTaskId = null;
      for (const item of elements.taskList.querySelectorAll(".task-item")) {
        item.classList.remove("dragging", "drag-over");
      }
    });
    article.addEventListener("dragover", (event) => {
      const draggedTask = state.tasks.find((item) => item.id === state.draggedTaskId);
      if (
        !draggedTask ||
        state.draggedTaskId === task.id ||
        getTaskGroup(draggedTask) !== taskGroup
      ) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      article.classList.add("drag-over");
    });
    article.addEventListener("dragleave", () => article.classList.remove("drag-over"));
    article.addEventListener("drop", async (event) => {
      event.preventDefault();
      article.classList.remove("drag-over");
      if (!state.draggedTaskId || state.draggedTaskId === task.id) return;
      await moveTaskTo(state.draggedTaskId, task.id);
    });

    elements.taskList.append(fragment);
  });

  const completed = state.tasks.filter((task) => task.is_completed).length;
  const total = state.tasks.length;
  const incomplete = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  elements.emptyState.hidden = total > 0;
  elements.rolloverArea.hidden = incomplete === 0;
  elements.rolloverLabel.textContent = `못한 일 ${incomplete}개 내일로 미루기`;
  elements.progressCount.textContent = `${completed} / ${total}`;
  elements.progressBar.style.width = `${percentage}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(percentage));
}

function setSyncStatus(text, online = false) {
  elements.syncStatus.lastElementChild.textContent = text;
  elements.syncStatus.classList.toggle("online", online);
}

function loadLocalTasks() {
  state.tasks = readLocalTasks(localStorageKey()).filter((task) => !task.is_hidden);
  setSyncStatus("이 기기에 저장됨");
  renderTasks();
}

function saveLocalTasks() {
  const hiddenTasks = readLocalTasks(localStorageKey()).filter((task) => task.is_hidden);
  localStorage.setItem(localStorageKey(), JSON.stringify([...state.tasks, ...hiddenTasks]));
  setSyncStatus("이 기기에 저장됨");
}

function readLocalTasks(storageKey) {
  try {
    const tasks = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

function routineAppliesToDate(routine, date) {
  return (
    routine.weekday === date.getDay() &&
    (!routine.created_date || routine.created_date <= toDateKey(date))
  );
}

async function ensureRoutineTasksForSelectedDate() {
  const dateKey = toDateKey(state.selectedDate);

  if (!supabase || !state.user) {
    state.routines = readLocalRoutines();
    const tasks = readLocalTasks(localStorageKey());
    const existingRoutineIds = new Set(
      tasks.filter((task) => task.routine_id).map((task) => task.routine_id),
    );
    const applicableRoutines = state.routines.filter((routine) =>
      routineAppliesToDate(routine, state.selectedDate),
    );

    const newTasks = applicableRoutines
      .filter((routine) => !existingRoutineIds.has(routine.id))
      .map((routine, index) => ({
        id: crypto.randomUUID(),
        routine_id: routine.id,
        title: routine.title,
        is_completed: false,
        position: tasks.length + index,
      }));

    if (newTasks.length > 0) {
      localStorage.setItem(localStorageKey(), JSON.stringify([...tasks, ...newTasks]));
    }
    return;
  }

  const { data: routines, error: routinesError } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", state.user.id)
    .eq("weekday", state.selectedDate.getDay())
    .order("created_at", { ascending: true });

  if (routinesError) throw routinesError;
  state.routines = routines;

  const applicableRoutines = routines.filter((routine) =>
    routineAppliesToDate(
      { ...routine, created_date: routine.created_at?.slice(0, 10) },
      state.selectedDate,
    ),
  );
  if (applicableRoutines.length === 0) return;

  const { data: existingTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("routine_id")
    .eq("user_id", state.user.id)
    .eq("task_date", dateKey)
    .not("routine_id", "is", null);

  if (tasksError) throw tasksError;

  const existingRoutineIds = new Set(existingTasks.map((task) => task.routine_id));
  const missingRoutines = applicableRoutines.filter(
    (routine) => !existingRoutineIds.has(routine.id),
  );

  if (missingRoutines.length > 0) {
    const { error: insertError } = await supabase.from("tasks").insert(
      missingRoutines.map((routine, index) => ({
        user_id: state.user.id,
        routine_id: routine.id,
        title: routine.title,
        task_date: dateKey,
        position: existingTasks.length + index,
      })),
    );
    if (insertError && insertError.code !== "23505") throw insertError;
  }
}

async function autoRolloverOverdueTasks() {
  if (state.isAutoRolloverRunning) return 0;
  state.isAutoRolloverRunning = true;

  const todayKey = toDateKey(new Date());
  let movedCount = 0;

  try {
    if (!supabase || !state.user) {
      const prefix = "daily-checklist:";
      const overdueKeys = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(prefix) && key.slice(prefix.length) < todayKey) {
          overdueKeys.push(key);
        }
      }

      const todayStorageKey = `${prefix}${todayKey}`;
      const todayTasks = readLocalTasks(todayStorageKey);
      const existingIds = new Set(todayTasks.map((task) => task.id));
      const tasksToMove = [];

      for (const key of overdueKeys.sort()) {
        const sourceTasks = readLocalTasks(key);
        const incompleteTasks = sourceTasks.filter(
          (task) => !task.is_completed && !task.is_hidden,
        );
        const retainedTasks = sourceTasks.filter(
          (task) => task.is_completed || task.is_hidden,
        );

        for (const task of incompleteTasks) {
          if (!existingIds.has(task.id)) {
            existingIds.add(task.id);
            tasksToMove.push(task);
          }
        }

        const routineMarkers = incompleteTasks
          .filter((task) => task.routine_id)
          .map((task) => ({ ...task, is_hidden: true }));
        localStorage.setItem(key, JSON.stringify([...retainedTasks, ...routineMarkers]));
      }

      movedCount = tasksToMove.length;
      if (movedCount > 0) {
        const movedTasks = tasksToMove.map((task, index) => ({
          ...task,
          id: task.routine_id ? crypto.randomUUID() : task.id,
          routine_id: null,
          is_hidden: false,
          is_completed: false,
          position: todayTasks.length + index,
        }));
        localStorage.setItem(todayStorageKey, JSON.stringify([...todayTasks, ...movedTasks]));
      }
    } else {
      const { data: overdueTasks, error: selectError } = await supabase
        .from("tasks")
        .select("id, routine_id, title")
        .eq("user_id", state.user.id)
        .eq("is_completed", false)
        .eq("is_hidden", false)
        .lt("task_date", todayKey);

      if (selectError) throw selectError;

      movedCount = overdueTasks.length;
      if (movedCount > 0) {
        const routineTasks = overdueTasks.filter((task) => task.routine_id);
        const regularTasks = overdueTasks.filter((task) => !task.routine_id);

        if (routineTasks.length > 0) {
          const { error: insertError } = await supabase.from("tasks").insert(
            routineTasks.map((task, index) => ({
              user_id: state.user.id,
              title: task.title,
              task_date: todayKey,
              is_completed: false,
              position: index,
            })),
          );
          if (insertError) throw insertError;

          const { error: hideError } = await supabase
            .from("tasks")
            .update({ is_hidden: true })
            .in(
              "id",
              routineTasks.map((task) => task.id),
            );
          if (hideError) throw hideError;
        }

        if (regularTasks.length > 0) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ task_date: todayKey, is_completed: false, routine_id: null })
            .in(
              "id",
              regularTasks.map((task) => task.id),
            );
          if (updateError) throw updateError;
        }
      }
    }

    if (movedCount > 0) {
      setSyncStatus(`못한 일 ${movedCount}개 자동 이월`, Boolean(state.user));
    }
  } catch (error) {
    console.error(error);
    setSyncStatus("자동 이월 오류");
  } finally {
    state.isAutoRolloverRunning = false;
  }

  return movedCount;
}

async function migrateLocalDataToCloud() {
  if (!supabase || !state.user) return;

  const migrationKey = `daily-checklist:migrated:${state.user.id}`;
  if (localStorage.getItem(migrationKey) === "done") return;

  setSyncStatus("기존 기록을 동기화하는 중…", true);
  const localRoutines = readLocalRoutines();
  const routineIds = new Set(localRoutines.map((routine) => routine.id));

  if (localRoutines.length > 0) {
    const { error: routinesError } = await supabase.from("routines").upsert(
      localRoutines.map((routine) => ({
        id: routine.id,
        user_id: state.user.id,
        title: routine.title,
        weekday: routine.weekday,
      })),
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (routinesError) throw routinesError;
  }

  const prefix = "daily-checklist:";
  const localTasks = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      !key?.startsWith(prefix) ||
      key === ROUTINES_STORAGE_KEY ||
      key.startsWith("daily-checklist:migrated:")
    ) {
      continue;
    }

    const taskDate = key.slice(prefix.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(taskDate)) continue;

    for (const task of readLocalTasks(key)) {
      localTasks.push({
        id: task.id,
        user_id: state.user.id,
        routine_id:
          task.routine_id && routineIds.has(task.routine_id) ? task.routine_id : null,
        title: task.title,
        task_date: taskDate,
        is_completed: Boolean(task.is_completed),
        is_hidden: Boolean(task.is_hidden),
        position: task.position ?? 0,
      });
    }
  }

  for (let index = 0; index < localTasks.length; index += 200) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .upsert(localTasks.slice(index, index + 200), {
        onConflict: "id",
        ignoreDuplicates: true,
      });
    if (tasksError) throw tasksError;
  }

  localStorage.setItem(migrationKey, "done");
  if (localRoutines.length > 0 || localTasks.length > 0) {
    setSyncStatus(
      `기존 기록 ${localTasks.length}개 동기화 완료`,
      true,
    );
  }
}

async function safelyMigrateLocalData() {
  try {
    await migrateLocalDataToCloud();
  } catch (error) {
    console.error(error);
    setSyncStatus("기존 기록 동기화 오류");
  }
}

function scheduleMidnightRollover() {
  if (state.midnightTimer) clearTimeout(state.midnightTimer);

  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate() + 1);
  nextMidnight.setHours(0, 0, 1, 0);

  state.midnightTimer = setTimeout(checkDateBoundary, nextMidnight.getTime() - now.getTime());
}

async function checkDateBoundary() {
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);

  if (todayKey !== state.currentDateKey) {
    const wasViewingCurrentDay = toDateKey(state.selectedDate) === state.currentDateKey;
    state.currentDateKey = todayKey;
    await autoRolloverOverdueTasks();

    if (wasViewingCurrentDay) {
      state.selectedDate = today;
    }

    await loadTasks();
  }

  scheduleMidnightRollover();
}

async function loadTasks() {
  updateDateCopy();

  if (!supabase || !state.user) {
    await ensureRoutineTasksForSelectedDate();
    loadLocalTasks();
    return;
  }

  setSyncStatus("동기화 중…", true);
  try {
    await ensureRoutineTasksForSelectedDate();
  } catch (error) {
    console.error(error);
    setSyncStatus("루틴 불러오기 오류");
  }
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", state.user.id)
    .eq("task_date", toDateKey(state.selectedDate))
    .eq("is_hidden", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setSyncStatus("동기화 오류");
    return;
  }

  state.tasks = data;
  setSyncStatus("실시간 동기화", true);
  renderTasks();
}

async function addTask(title) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  if (!supabase || !state.user) {
    state.tasks.push({
      id: crypto.randomUUID(),
      title: cleanTitle,
      is_completed: false,
      position: state.tasks.length,
    });
    saveLocalTasks();
    renderTasks();
    return;
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: state.user.id,
    title: cleanTitle,
    task_date: toDateKey(state.selectedDate),
    position: state.tasks.length,
  });

  if (error) {
    console.error(error);
    setSyncStatus("저장 실패");
  }
}

async function toggleTask(id, isCompleted) {
  if (!supabase || !state.user) {
    state.tasks = state.tasks.map((task) =>
      task.id === id ? { ...task, is_completed: isCompleted } : task,
    );
    saveLocalTasks();
    renderTasks();
    return;
  }

  state.tasks = state.tasks.map((task) =>
    task.id === id ? { ...task, is_completed: isCompleted } : task,
  );
  renderTasks();

  const { error } = await supabase
    .from("tasks")
    .update({ is_completed: isCompleted })
    .eq("id", id);

  if (error) {
    console.error(error);
    setSyncStatus("저장 실패");
    await loadTasks();
  }
}

async function deleteTask(id) {
  if (!supabase || !state.user) {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    saveLocalTasks();
    renderTasks();
    return;
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    console.error(error);
    setSyncStatus("삭제 실패");
  }
}

async function hideRoutineOccurrence(id) {
  if (!supabase || !state.user) {
    const storedTasks = readLocalTasks(localStorageKey()).map((task) =>
      task.id === id ? { ...task, is_hidden: true } : task,
    );
    localStorage.setItem(localStorageKey(), JSON.stringify(storedTasks));
    loadLocalTasks();
    return;
  }

  const { error } = await supabase.from("tasks").update({ is_hidden: true }).eq("id", id);
  if (error) {
    console.error(error);
    setSyncStatus("루틴 제외 실패");
  } else {
    await loadTasks();
  }
}

function collectLocalSearchResults(query) {
  const normalizedQuery = query.toLocaleLowerCase("ko-KR");
  const prefix = "daily-checklist:";
  const results = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix) || key === ROUTINES_STORAGE_KEY) continue;

    const taskDate = key.slice(prefix.length);
    for (const task of readLocalTasks(key)) {
      if (
        task.is_hidden ||
        !task.title?.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
      ) {
        continue;
      }
      results.push({ ...task, task_date: taskDate });
    }
  }

  return results;
}

async function searchTasks(query) {
  const cleanQuery = query.trim();
  elements.clearSearchButton.hidden = cleanQuery.length === 0;
  elements.searchResults.replaceChildren();

  if (!cleanQuery) {
    elements.searchSummary.textContent = "검색어를 입력하면 날짜별 기록을 보여드려요.";
    return;
  }

  elements.searchSummary.textContent = "기록을 찾는 중…";
  let results = [];

  if (!supabase || !state.user) {
    results = collectLocalSearchResults(cleanQuery);
  } else {
    const escapedQuery = cleanQuery.replaceAll("%", "\\%").replaceAll("_", "\\_");
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, task_date, is_completed, routine_id")
      .eq("user_id", state.user.id)
      .eq("is_hidden", false)
      .ilike("title", `%${escapedQuery}%`)
      .order("task_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      elements.searchSummary.textContent = "검색하지 못했어요. 다시 시도해주세요.";
      return;
    }
    results = data;
  }

  results.sort((first, second) => {
    const dateDifference = second.task_date.localeCompare(first.task_date);
    if (dateDifference !== 0) return dateDifference;
    return Number(first.is_completed) - Number(second.is_completed);
  });

  elements.searchSummary.textContent =
    results.length > 0
      ? `${results.length}개의 기록을 찾았어요.`
      : "일치하는 기록이 없어요.";

  for (const task of results.slice(0, 100)) {
    const fragment = elements.searchResultTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".search-result");
    const status = fragment.querySelector(".search-result-status");
    fragment.querySelector(".search-result-title").textContent = task.title;
    fragment.querySelector(".search-result-date").textContent = formatSearchDate(
      task.task_date,
    );
    fragment.querySelector(".search-result-routine").hidden = !task.routine_id;
    status.textContent = task.is_completed ? "완료" : "미완료";
    status.classList.add(task.is_completed ? "done" : "todo");
    button.addEventListener("click", async () => {
      state.selectedDate = startOfDay(parseDateKey(task.task_date));
      elements.searchDialog.close();
      await loadTasks();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    elements.searchResults.append(fragment);
  }
}

async function persistTaskOrder() {
  state.tasks = state.tasks.map((task, index) => ({ ...task, position: index }));

  if (!supabase || !state.user) {
    saveLocalTasks();
    renderTasks();
    return;
  }

  setSyncStatus("순서 저장 중…", true);
  const updates = state.tasks.map((task) =>
    supabase.from("tasks").update({ position: task.position }).eq("id", task.id),
  );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    console.error(error);
    setSyncStatus("순서 저장 실패");
    await loadTasks();
    return;
  }

  setSyncStatus("실시간 동기화", true);
  renderTasks();
}

async function moveTask(id, offset) {
  state.tasks = sortTasksForDisplay(state.tasks);
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  const group = getTaskGroup(task);
  const groupTasks = state.tasks.filter((item) => getTaskGroup(item) === group);
  const currentGroupIndex = groupTasks.findIndex((item) => item.id === id);
  const nextGroupIndex = currentGroupIndex + offset;
  if (nextGroupIndex < 0 || nextGroupIndex >= groupTasks.length) return;

  const targetTask = groupTasks[nextGroupIndex];
  const currentIndex = state.tasks.findIndex((item) => item.id === id);
  const targetIndex = state.tasks.findIndex((item) => item.id === targetTask.id);
  [state.tasks[currentIndex], state.tasks[targetIndex]] = [
    state.tasks[targetIndex],
    state.tasks[currentIndex],
  ];
  await persistTaskOrder();
}

async function moveTaskTo(draggedId, targetId) {
  state.tasks = sortTasksForDisplay(state.tasks);
  const draggedTask = state.tasks.find((task) => task.id === draggedId);
  const targetTask = state.tasks.find((task) => task.id === targetId);
  if (
    !draggedTask ||
    !targetTask ||
    getTaskGroup(draggedTask) !== getTaskGroup(targetTask)
  ) {
    return;
  }

  const draggedIndex = state.tasks.findIndex((task) => task.id === draggedId);
  const targetIndex = state.tasks.findIndex((task) => task.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return;

  const nextTasks = [...state.tasks];
  const [movedTask] = nextTasks.splice(draggedIndex, 1);
  nextTasks.splice(targetIndex, 0, movedTask);
  state.tasks = nextTasks;
  await persistTaskOrder();
}

async function rollOverIncompleteTasks() {
  const incompleteTasks = state.tasks.filter((task) => !task.is_completed);
  if (incompleteTasks.length === 0) return;

  const nextDate = new Date(state.selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateKey = toDateKey(nextDate);

  elements.rolloverButton.disabled = true;
  elements.rolloverMessage.textContent = "다음 날로 옮기는 중…";

  if (!supabase || !state.user) {
    let nextTasks = [];
    const nextStorageKey = `daily-checklist:${nextDateKey}`;

    try {
      nextTasks = JSON.parse(localStorage.getItem(nextStorageKey) ?? "[]");
    } catch {
      nextTasks = [];
    }

    const movedTasks = incompleteTasks.map((task, index) => ({
      ...task,
      id: task.routine_id ? crypto.randomUUID() : task.id,
      routine_id: null,
      is_hidden: false,
      is_completed: false,
      position: nextTasks.length + index,
    }));

    const sourceTasks = readLocalTasks(localStorageKey());
    const incompleteIds = new Set(incompleteTasks.map((task) => task.id));
    const retainedTasks = sourceTasks.filter(
      (task) => !incompleteIds.has(task.id) || task.is_completed || task.is_hidden,
    );
    const routineMarkers = incompleteTasks
      .filter((task) => task.routine_id)
      .map((task) => ({ ...task, is_hidden: true }));

    localStorage.setItem(localStorageKey(), JSON.stringify([...retainedTasks, ...routineMarkers]));
    localStorage.setItem(nextStorageKey, JSON.stringify([...nextTasks, ...movedTasks]));
    loadLocalTasks();
    elements.rolloverMessage.textContent =
      `${incompleteTasks.length}개를 다음 날로 옮겼어요.`;
    elements.rolloverButton.disabled = false;
    return;
  }

  const routineTasks = incompleteTasks.filter((task) => task.routine_id);
  const regularTasks = incompleteTasks.filter((task) => !task.routine_id);
  let error = null;

  if (routineTasks.length > 0) {
    const { error: insertError } = await supabase.from("tasks").insert(
      routineTasks.map((task, index) => ({
        user_id: state.user.id,
        title: task.title,
        task_date: nextDateKey,
        is_completed: false,
        position: state.tasks.length + index,
      })),
    );
    error = insertError;

    if (!error) {
      const { error: hideError } = await supabase
        .from("tasks")
        .update({ is_hidden: true })
        .in(
          "id",
          routineTasks.map((task) => task.id),
        );
      error = hideError;
    }
  }

  if (!error && regularTasks.length > 0) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ task_date: nextDateKey, is_completed: false, routine_id: null })
      .in(
        "id",
        regularTasks.map((task) => task.id),
      );
    error = updateError;
  }

  if (error) {
    console.error(error);
    elements.rolloverMessage.textContent = "옮기지 못했어요. 다시 시도해주세요.";
    setSyncStatus("저장 실패");
  } else {
    elements.rolloverMessage.textContent =
      `${incompleteTasks.length}개를 다음 날로 옮겼어요.`;
    await loadTasks();
  }

  elements.rolloverButton.disabled = false;
}

function changeDate(dayOffset) {
  const next = new Date(state.selectedDate);
  next.setDate(next.getDate() + dayOffset);
  state.selectedDate = startOfDay(next);
  loadTasks();
}

function renderAuthState() {
  const isSignedIn = Boolean(state.user);
  elements.signedOutView.hidden = isSignedIn;
  elements.signedInView.hidden = !isSignedIn;
  elements.accountButton.textContent = isSignedIn ? "내 계정" : "로그인";
  elements.signedInEmail.textContent = state.user?.email ?? "";

  if (!isCloudConfigured) {
    elements.authMessage.textContent =
      "현재는 체험용 로컬 모드입니다. config.js에 Supabase 정보를 넣으면 동기화가 켜집니다.";
    elements.authForm.hidden = true;
  } else {
    elements.authMessage.textContent = "";
    elements.authForm.hidden = false;
  }
}

function renderRoutineSettings() {
  for (const tab of elements.weekdayTabs.querySelectorAll("button")) {
    const isSelected = Number(tab.dataset.weekday) === state.selectedRoutineWeekday;
    tab.setAttribute("aria-selected", String(isSelected));
  }

  elements.routineList.replaceChildren();
  const routinesForDay = state.routines.filter(
    (routine) => routine.weekday === state.selectedRoutineWeekday,
  );

  for (const routine of routinesForDay) {
    const fragment = elements.routineTemplate.content.cloneNode(true);
    fragment.querySelector(".routine-item-title").textContent = routine.title;
    fragment.querySelector(".delete-button").addEventListener("click", () => {
      deleteRoutine(routine.id);
    });
    elements.routineList.append(fragment);
  }

  elements.routineEmpty.hidden = routinesForDay.length > 0;
}

async function loadRoutines() {
  elements.routineMessage.textContent = "";

  if (!supabase || !state.user) {
    state.routines = readLocalRoutines();
    renderRoutineSettings();
    return;
  }

  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", state.user.id)
    .order("weekday", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    elements.routineMessage.textContent = "루틴을 불러오지 못했어요.";
    return;
  }

  state.routines = data;
  renderRoutineSettings();
}

async function addRoutine(title) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  if (!supabase || !state.user) {
    state.routines.push({
      id: crypto.randomUUID(),
      title: cleanTitle,
      weekday: state.selectedRoutineWeekday,
      created_date: toDateKey(new Date()),
    });
    saveLocalRoutines();
    renderRoutineSettings();
    await loadTasks();
    return;
  }

  const { error } = await supabase.from("routines").insert({
    user_id: state.user.id,
    title: cleanTitle,
    weekday: state.selectedRoutineWeekday,
  });

  if (error) {
    console.error(error);
    elements.routineMessage.textContent = "루틴을 저장하지 못했어요.";
  } else {
    await loadRoutines();
    await loadTasks();
  }
}

async function deleteRoutine(id) {
  if (!supabase || !state.user) {
    state.routines = state.routines.filter((routine) => routine.id !== id);
    saveLocalRoutines();

    const taskPrefix = "daily-checklist:";
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(taskPrefix) || key === ROUTINES_STORAGE_KEY) continue;
      const tasks = readLocalTasks(key);
      const updatedTasks = tasks.map((task) =>
        task.routine_id === id ? { ...task, routine_id: null } : task,
      );
      localStorage.setItem(key, JSON.stringify(updatedTasks));
    }

    renderRoutineSettings();
    await loadTasks();
    return;
  }

  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) {
    console.error(error);
    elements.routineMessage.textContent = "루틴을 삭제하지 못했어요.";
  } else {
    await loadRoutines();
  }
}

async function subscribeToRealtime() {
  if (!supabase || !state.user) return;

  if (state.realtimeChannel) {
    await supabase.removeChannel(state.realtimeChannel);
  }

  state.realtimeChannel = supabase
    .channel(`tasks:${state.user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `user_id=eq.${state.user.id}`,
      },
      (payload) => {
        const selectedDateKey = toDateKey(state.selectedDate);
        if (
          payload.new?.task_date === selectedDateKey ||
          payload.old?.task_date === selectedDateKey
        ) {
          loadTasks();
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "routines",
        filter: `user_id=eq.${state.user.id}`,
      },
      async () => {
        await loadRoutines();
        await loadTasks();
      },
    )
    .subscribe();
}

async function initializeAuth() {
  if (!supabase) {
    renderAuthState();
    await autoRolloverOverdueTasks();
    loadTasks();
    scheduleMidnightRollover();
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  state.user = session?.user ?? null;
  renderAuthState();
  await safelyMigrateLocalData();
  await autoRolloverOverdueTasks();
  await loadTasks();
  await subscribeToRealtime();
  scheduleMidnightRollover();

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    state.user = nextSession?.user ?? null;
    renderAuthState();
    await safelyMigrateLocalData();
    await autoRolloverOverdueTasks();
    await loadTasks();
    await subscribeToRealtime();
  });
}

elements.addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.taskInput.value;
  elements.taskInput.value = "";
  await addTask(title);
  elements.taskInput.focus();
});

elements.previousDate.addEventListener("click", () => changeDate(-1));
elements.nextDate.addEventListener("click", () => changeDate(1));
elements.todayButton.addEventListener("click", () => {
  state.selectedDate = startOfDay(new Date());
  loadTasks();
});
elements.datePicker.addEventListener("change", () => {
  if (!elements.datePicker.value) return;
  const [year, month, day] = elements.datePicker.value.split("-").map(Number);
  state.selectedDate = startOfDay(new Date(year, month - 1, day));
  loadTasks();
});
elements.rolloverButton.addEventListener("click", rollOverIncompleteTasks);
elements.searchButton.addEventListener("click", () => {
  elements.searchDialog.showModal();
  elements.searchInput.focus();
});
elements.closeSearchDialog.addEventListener("click", () => elements.searchDialog.close());
elements.searchDialog.addEventListener("click", (event) => {
  if (event.target === elements.searchDialog) elements.searchDialog.close();
});
elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchTasks(elements.searchInput.value);
});
elements.searchInput.addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => searchTasks(elements.searchInput.value), 180);
});
elements.clearSearchButton.addEventListener("click", () => {
  elements.searchInput.value = "";
  searchTasks("");
  elements.searchInput.focus();
});
elements.routineButton.addEventListener("click", async () => {
  state.selectedRoutineWeekday = state.selectedDate.getDay();
  await loadRoutines();
  elements.routineDialog.showModal();
});
elements.closeRoutineDialog.addEventListener("click", () => elements.routineDialog.close());
elements.routineDialog.addEventListener("click", (event) => {
  if (event.target === elements.routineDialog) elements.routineDialog.close();
});
elements.weekdayTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("button[data-weekday]");
  if (!tab) return;
  state.selectedRoutineWeekday = Number(tab.dataset.weekday);
  renderRoutineSettings();
});
elements.routineForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.routineInput.value;
  elements.routineInput.value = "";
  await addRoutine(title);
  elements.routineInput.focus();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkDateBoundary();
});
window.addEventListener("focus", checkDateBoundary);

elements.accountButton.addEventListener("click", () => {
  renderAuthState();
  elements.authDialog.showModal();
});
elements.closeDialog.addEventListener("click", () => elements.authDialog.close());
elements.authDialog.addEventListener("click", (event) => {
  if (event.target === elements.authDialog) elements.authDialog.close();
});

elements.googleLoginButton.addEventListener("click", async () => {
  if (!supabase) return;

  elements.authMessage.textContent = "Google 로그인으로 이동하는 중…";
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) elements.authMessage.textContent = `오류: ${error.message}`;
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) return;

  elements.authMessage.textContent = "로그인 링크를 보내는 중…";
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: elements.emailInput.value,
    options: { emailRedirectTo: redirectUrl },
  });

  elements.authMessage.textContent = error
    ? `오류: ${error.message}`
    : "이메일을 확인해주세요. 로그인 링크를 보냈습니다.";
});

elements.signOutButton.addEventListener("click", async () => {
  await supabase?.auth.signOut();
  elements.authDialog.close();
});

elements.displayButton.addEventListener("click", () => elements.displayDialog.showModal());
elements.closeDisplayDialog.addEventListener("click", () => elements.displayDialog.close());
elements.displayDialog.addEventListener("click", (event) => {
  if (event.target === elements.displayDialog) elements.displayDialog.close();
});
elements.displayDialog.addEventListener("change", (event) => {
  if (event.target.name === "textSize") {
    updateDisplaySettings({ textSize: event.target.value });
  }

  if (event.target.name === "density") {
    updateDisplaySettings({ density: event.target.value });
  }

  if (event.target === elements.postitModeInput) {
    updateDisplaySettings({ postitMode: elements.postitModeInput.checked });
  }
});
elements.resetDisplayButton.addEventListener("click", () => {
  writeDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
  applyDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
});

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function refreshInstallButton() {
  elements.installButton.hidden = isStandaloneMode();
}

async function requestAppInstall() {
  if (!state.installPrompt) {
    elements.installConfirmButton.hidden = true;
    elements.installDialog.showModal();
    return;
  }

  await state.installPrompt.prompt();
  const { outcome } = await state.installPrompt.userChoice;
  state.installPrompt = null;
  if (outcome === "accepted") elements.installDialog.close();
  refreshInstallButton();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  elements.installConfirmButton.hidden = false;
  refreshInstallButton();
});

window.addEventListener("appinstalled", () => {
  state.installPrompt = null;
  elements.installDialog.close();
  refreshInstallButton();
});

elements.installButton.addEventListener("click", requestAppInstall);
elements.installConfirmButton.addEventListener("click", requestAppInstall);
elements.closeInstallDialog.addEventListener("click", () => elements.installDialog.close());
elements.installDialog.addEventListener("click", (event) => {
  if (event.target === elements.installDialog) elements.installDialog.close();
});

window.addEventListener("online", () => {
  setSyncStatus(state.user ? "실시간 동기화" : "이 기기에 저장됨", Boolean(state.user));
});
window.addEventListener("offline", () => setSyncStatus("오프라인 사용 중"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register("./service-worker.js");

    if (registration.waiting) {
      state.waitingServiceWorker = registration.waiting;
      elements.updateToast.hidden = false;
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          state.waitingServiceWorker = worker;
          elements.updateToast.hidden = false;
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}

elements.updateButton.addEventListener("click", () => {
  state.waitingServiceWorker?.postMessage({ type: "SKIP_WAITING" });
});

applyDisplaySettings();
refreshInstallButton();
initializeAuth();
