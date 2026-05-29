// ─── 애플리케이션 상태 관리 ───
let notes = [];
let currentFilter = { type: "all", value: null }; // type: 'all', 'pinned', 'tag'
let isListView = false;
let autosaveTimeout = null;
let activeEditorNoteId = null;
let currentEditorTheme = "theme-default";

// Zen 포커스 타이머 변수
let zenInterval = null;
let zenTimeRemaining = 0; // 초 단위

// ─── 초기 로드 및 설정 ───
window.addEventListener("DOMContentLoaded", () => {
  loadNotesFromStorage();
  startContinuousClock();
  renderApp();

  // 스토리지 멀티탭 실시간 동기화 바인딩
  window.addEventListener("storage", (e) => {
    if (e.key === "aether_notes") {
      showToast("🌌 다른 단상에서 보정된 기록을 실시간으로 가져옵니다.");
      loadNotesFromStorage();
      renderApp();
    }
  });
});

// ─── 로컬스토리지 입출력 (Storage Practice) ───
function loadNotesFromStorage() {
  try {
    const raw = localStorage.getItem("aether_notes");
    notes = raw ? JSON.parse(raw) : getDummyNotes();
  } catch (err) {
    console.error("스토리지 로드 실패:", err);
    notes = getDummyNotes();
  }
}

function saveNotesToStorage() {
  try {
    localStorage.setItem("aether_notes", JSON.stringify(notes));
  } catch (err) {
    console.error("스토리지 저장 실패:", err);
  }
}

function getDummyNotes() {
  return [
    {
      id: "dummy-1",
      title: "에테르 노트를 펼치며",
      body: '사용자가 지정한 차분한 빛깔의 조합 (#DCE2F0, #50586C) 아래, 영혼의 몽상들을 하나둘 적어가는 공간입니다.\n\n오른쪽 상단의 "새 기록 빚기"를 눌러 찬란한 첫 페이지를 열어보세요. 이 공간은 온전한 감성에 스며들도록 AI 특유의 템플릿스러움을 덜어내어 수작업으로 마감되었습니다. ✨',
      tags: ["영감", "시작"],
      theme: "theme-default",
      pinned: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "dummy-2",
      title: "황혼의 사색",
      body: "문득 밤하늘의 짙은 네이비와 서리가 내린 지붕의 아이스 블루가 맞닿는 경계를 쳐다볼 때가 있습니다.\n그 오묘한 조화를 고스란히 담아 이 메모 앱의 아키텍처가 빚어졌습니다. 잔잔히 돌아가는 황혼 시계의 초침을 보며 마음의 평화를 취해 보세요.",
      tags: ["감상", "황혼"],
      theme: "theme-purple",
      pinned: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}

// ─── UI 렌더링 엔진 (DOM manipulation & sorting) ───
function renderApp() {
  // 배지 업데이트
  $("badge-all").textContent = notes.length;
  $("badge-pinned").textContent = notes.filter((n) => n.pinned).length;
  renderNotes();
  renderSidebar();
}

function renderNotes() {
  const board = $("notes-board");
  const query = $("search-input").value.trim().toLowerCase();
  board.innerHTML = "";

  let filtered = notes;

  // 1. 카테고리 필터링
  if (currentFilter.type === "pinned") {
    filtered = filtered.filter((n) => n.pinned);
  } else if (currentFilter.type === "tag") {
    filtered = filtered.filter((n) => n.tags.includes(currentFilter.value));
  }

  // 2. 검색어 필터링
  if (query) {
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query) ||
        n.tags.some((t) => t.toLowerCase().includes(query)),
    );
  }

  // 3. 정렬 (고정 핀이 최상단, 그 다음은 최신 작성순)
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (filtered.length === 0) {
    board.innerHTML = `
    <div class="empty-state">
      <i class="material-symbols-outlined">nest_eco_leaf</i>
      <h3>적막 속에 흩어진 기운</h3>
      <p>${query ? "스며든 검색어와 호응하는 파편이 없습니다." : "단상 위에 흘린 사색의 기록이 없습니다. 첫 잔을 채워보세요."}</p>
    </div>
  `;
    return;
  }

  board.classList.toggle("list-view", isListView);

  filtered.forEach((note) => {
    const { id, title, body, tags, theme, pinned, createdAt } = note;
    const card = document.createElement("article");
    card.className = `note-card ${theme} ${pinned ? "pinned" : ""}`;
    card.id = `note-${id}`;
    card.onclick = (e) => {
      // 버튼이나 아이콘을 직접 클릭했을 때는 에디터를 열지 않음
      if (e.target.closest(".action-btn") || e.target.closest(".note-pin-btn"))
        return;
      openEditorForEdit(id);
    };

    const isTimerRunning = activeEditorNoteId === id && zenInterval !== null;
    const timerBadgeHTML = isTimerRunning
      ? `
    <div class="focus-timer-badge">
      <i class="material-symbols-outlined">hourglass_full</i>
      <span>${formatZenTime(zenTimeRemaining)}</span>
    </div>
  `
      : "";

    card.innerHTML = `
    <div class="note-header">
      <h3 class="note-title">${escapeHTML(title) || "무제"}</h3>
      <button class="note-pin-btn" onclick="togglePin('${id}')" title="상단 고정">
        <i class="material-symbols-outlined">${pinned ? "keep" : "push_pin"}</i>
      </button>
    </div>
    <p class="note-body">${escapeHTML(body) || "비어있는 꿈결..."}</p>
    <div class="note-footer">
      <div class="note-meta">
        <span class="note-date">${formatDate(createdAt)}</span>
        <div class="note-tags">
          ${tags.map((t) => `<span class="tag-pill">#${escapeHTML(t)}</span>`).join("")}
        </div>
      </div>
      <div class="note-actions">
        ${timerBadgeHTML}
        <button class="action-btn" onclick="event.stopPropagation(); copyNoteToClipboard('${id}')" title="단상 클립보드로 수확">
          <i class="material-symbols-outlined">content_copy</i>
        </button>
        <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteNote('${id}')" title="에테르 속으로 해체">
          <i class="material-symbols-outlined">delete_outline</i>
        </button>
      </div>
    </div>
  `;
    board.appendChild(card);
  });
}

function renderSidebar() {
  const tagCounts = {};
  notes.forEach((note) => {
    note.tags.forEach(
      (t) => t.trim() && (tagCounts[t] = (tagCounts[t] || 0) + 1),
    );
  });

  const tagListContainer = $("tag-menu-list");
  tagListContainer.innerHTML = "";

  Object.entries(tagCounts)
    .sort()
    .forEach(([tag, count]) => {
      const isActive =
        currentFilter.type === "tag" && currentFilter.value === tag;
      const btn = document.createElement("button");
      btn.className = `menu-item ${isActive ? "active" : ""}`;
      btn.onclick = () => filterByTag(tag);
      btn.innerHTML = `
    <i class="material-symbols-outlined">label</i>
    <span>#${escapeHTML(tag)}</span>
    <span class="badge">${count}</span>
  `;
      tagListContainer.appendChild(btn);
    });

  // 사이드바 액티브 클래스 동기화
  document
    .getElementById("menu-all")
    .classList.toggle("active", currentFilter.type === "all");
  document
    .getElementById("menu-pin")
    .classList.toggle("active", currentFilter.type === "pinned");
}

// ─── 필터 제어 ───
function filterByTag(tag) {
  if (tag === "all") {
    currentFilter = { type: "all", value: null };
  } else {
    currentFilter = { type: "tag", value: tag };
  }
  renderApp();
}

function filterByPinned() {
  currentFilter = { type: "pinned", value: null };
  renderApp();
}

function toggleLayoutView() {
  isListView = !isListView;
  const icon = document.getElementById("layout-icon");
  icon.textContent = isListView ? "view_module" : "grid_view";
  renderNotes();
}

function handleSearch() {
  renderNotes();
}

// ─── 에디터 대화상자 개폐 및 제어 ───
function openNewEditor() {
  activeEditorNoteId = null;
  currentEditorTheme = "theme-default";

  document.getElementById("editor-title").value = "";
  document.getElementById("editor-text").value = "";
  document.getElementById("editor-tags").value = "";

  resetZenTimerUI();
  applyEditorTheme("theme-default");

  document.getElementById("editor-modal").classList.add("active");
  document.getElementById("editor-title").focus();
}

function openEditorForEdit(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  activeEditorNoteId = id;
  currentEditorTheme = note.theme || "theme-default";

  document.getElementById("editor-title").value = note.title;
  document.getElementById("editor-text").value = note.body;
  document.getElementById("editor-tags").value = note.tags.join(", ");

  resetZenTimerUI();
  applyEditorTheme(currentEditorTheme);

  document.getElementById("editor-modal").classList.add("active");
}

function closeEditor() {
  document.getElementById("editor-modal").classList.remove("active");

  // 오토세이브 디바운스 즉시 실행
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
    performSave();
  }

  // 포커스 타이머 실행 중이라면 닫을 때 멈춤 처리
  if (zenInterval) {
    clearInterval(zenInterval);
    zenInterval = null;
  }

  activeEditorNoteId = null;
  renderApp();
}

function setEditorTheme(theme, element) {
  currentEditorTheme = theme;
  applyEditorTheme(theme);

  // 테마 변경도 오토세이브 자극
  triggerAutosave();

  // 활성화 도트 변경
  const dots = document.querySelectorAll(".preset-dot");
  dots.forEach((dot) => dot.classList.remove("active"));
  element.classList.add("active");
}

function applyEditorTheme(theme) {
  const container = document.getElementById("editor-container");
  container.className = `editor-container glass-panel ${theme}`;
}

// ─── 데바운스 및 자동 세이브 (Autosave Debouncing Practice) ───
function triggerAutosave() {
  const status = document.getElementById("editor-status");
  status.innerHTML = "<span></span> 스며드는 중...";
  status.className = "editor-save-status saving";

  if (autosaveTimeout) clearTimeout(autosaveTimeout);

  autosaveTimeout = setTimeout(() => {
    performSave();
  }, 1000); // 1초 정적 타이머
}

function performSave() {
  const title = document.getElementById("editor-title").value.trim();
  const body = document.getElementById("editor-text").value.trim();
  const tagsRaw = document.getElementById("editor-tags").value;

  // 내용이 모두 비어있다면 자동 생성 스킵
  if (!title && !body && !tagsRaw) {
    const status = document.getElementById("editor-status");
    status.innerHTML = "<span></span> 비어있음";
    status.className = "editor-save-status";
    return;
  }

  // 태그 파싱
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (activeEditorNoteId) {
    // 기존 수정
    const index = notes.findIndex((n) => n.id === activeEditorNoteId);
    if (index !== -1) {
      notes[index].title = title;
      notes[index].body = body;
      notes[index].tags = tags;
      notes[index].theme = currentEditorTheme;
      notes[index].createdAt = new Date().toISOString(); // 최신 저장시각 동향
    }
  } else {
    // 새 노트 작성
    const newNote = {
      id: "note-" + Date.now(),
      title: title || "무제",
      body: body,
      tags: tags,
      theme: currentEditorTheme,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    notes.push(newNote);
    activeEditorNoteId = newNote.id; // 세션 아이디 바인딩
  }

  saveNotesToStorage();

  // UI 세이브 메시지 승화
  const status = document.getElementById("editor-status");
  status.innerHTML = "<span></span> 단상에 흘렸습니다 ✨";
  status.className = "editor-save-status";
}

// ─── 핀 및 삭제 CRUD ───
function togglePin(id) {
  const index = notes.findIndex((n) => n.id === id);
  if (index !== -1) {
    notes[index].pinned = !notes[index].pinned;
    saveNotesToStorage();
    renderApp();
    showToast(
      notes[index].pinned
        ? "📌 단상 상단에 핀으로 보정했습니다."
        : "📍 핀 보정을 해제했습니다.",
    );
  }
}

function deleteNote(id) {
  setTimeout(() => {
    const noteCard = $(`note-${id}`);
    if (noteCard) {
      noteCard.style.transform = "scale(0.8) translateY(20px)";
      noteCard.style.opacity = "0";
    }

    notes = notes.filter((n) => n.id !== id);
    saveNotesToStorage();
    renderApp();
    showToast("🌌 기류 속으로 해체하여 날려 보냈습니다.");
  }, 300);
}

// ─── 몰입형 Zen Focus 포모도로 타이머 (Timer/Interval Practice) ───
function toggleZenTimer() {
  const btn = $("editor-zen-btn");
  const text = $("editor-zen-text");

  if (zenInterval) {
    clearInterval(zenInterval);
    zenInterval = null;
    btn.classList.remove("active");
    text.textContent = "몰입 타이머 개시";
    showToast("⏳ 황혼의 시선이 분산되어 타이머를 정지합니다.");
    renderNotes();
  } else {
    zenTimeRemaining = 25 * 60; // 25분 황혼 표준 몰입
    btn.classList.add("active");
    text.textContent = formatZenTime(zenTimeRemaining);
    showToast("⏳ 25분 동안 단상 위의 몽상에만 몰입합니다. 평안을 빕니다.");

    zenInterval = setInterval(() => {
      zenTimeRemaining--;
      if (zenTimeRemaining <= 0) {
        clearInterval(zenInterval);
        zenInterval = null;
        btn.classList.remove("active");
        text.textContent = "몰입 완료";
        playZenAlarm();
      } else {
        text.textContent = formatZenTime(zenTimeRemaining);
      }
      renderNotes();
    }, 1000);
  }
}

function resetZenTimerUI() {
  if (zenInterval) {
    clearInterval(zenInterval);
    zenInterval = null;
  }
  const btn = $("editor-zen-btn");
  const text = $("editor-zen-text");
  btn.classList.remove("active");
  text.textContent = "몰입 타이머 개시";
}

function formatZenTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playZenAlarm() {
  showToast("🔔 마음의 집중 주기가 끝났습니다. 은은하게 기지개를 켜보세요.");
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5의 맑은 울림
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + 1.5,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.5);
  } catch (e) {
    console.warn("Audio Context 사운드 합성 불가:", e);
  }
}

// ─── 감성 클립보드 공유 (Clipboard API Practice) ───
async function copyNoteToClipboard(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  const tagString = note.tags.map((t) => `#${t}`).join(" ");
  const cleanTitle = note.title || "무제";
  const cleanDate = formatDate(note.createdAt);

  const textToCopy = `┌────────────────────────────
│ 🌌 [${tagString || "기억 파편"}] ${cleanTitle}
├────────────────────────────
│ ${note.body}
│
│ 기록 시점: ${cleanDate}
└────────────────────────────
Shared from AetherNotes 🌙`;

  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast("🌌 몽상을 수려한 포맷으로 클립보드에 담았습니다.");
  } catch (err) {
    console.error("클립보드 수확 실패:", err);
    showToast("❌ 바람의 장난으로 수확에 실패했습니다.");
  }
}

// ─── 에테르 동기화 시뮬레이션 (Async/Await & Promises Practice) ───
async function triggerSyncSimulation() {
  const btn = $("sync-button");
  btn.classList.add("spinning");
  $("sync-status-text").textContent = "성운 동기화 채널 가동...";

  try {
    await new Promise((res, rej) =>
      setTimeout(() => (Math.random() > 0.05 ? res() : rej()), 1500),
    );
    $("sync-status-text").textContent = "성운 동기화 완료";
    $("sync-time-text").textContent =
      `최근 보정: ${formatDate(new Date().toISOString())}`;
    showToast("✨ 에테르 노트를 온 우주의 단상에 완벽히 동화시켰습니다.");
  } catch (err) {
    $("sync-status-text").textContent = "동기화 통로 막힘";
    showToast("❌ 오염된 기류로 인해 에테르 복원에 차질이 생겼습니다.");
  } finally {
    btn.classList.remove("spinning");
  }
}
