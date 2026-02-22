/* =========================
  基本ユーティリティ
========================= */

const $ = (id) => document.getElementById(id);

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function fmtJPDate(iso) {
  return isISODate(iso) ? iso.replaceAll("-", "/") : "";
}
function normalizeNumber(str) {
  if (!str) return "";
  return String(str)
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[^\d]/g, "");
}
function formatYen(n) {
  if (!n) return "";
  const v = Number(n);
  if (Number.isNaN(v)) return "";
  return v.toLocaleString("ja-JP") + " 円";
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function showToast(t) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 1500);
}

/* =========================
  永続化キー（ここを統一）
========================= */

const PROFILE_KEY = "techProfile_v2";
const RECENT_KEY = "techCheckRecentList_v1"; // ←一覧メタ
const DRAFT_PREFIX = "techCheckDraft_";      // ←案件本体

/* =========================
  プロフィール（自社）
========================= */

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { myCompany: {} };
  } catch (e) {
    return { myCompany: {} };
  }
}
function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
function fillProfileUI() {
  const p = loadProfile().myCompany || {};
  if ($("myName")) $("myName").value = p.name || "";
  if ($("myAddress")) $("myAddress").value = p.address || "";
  if ($("myPermitNo")) $("myPermitNo").value = p.permitNo || "";
  if ($("myPermitUntil")) $("myPermitUntil").value = p.permitUntil || "";
}
function readProfileUI() {
  return {
    myCompany: {
      name: ($("myName")?.value || "").trim(),
      address: ($("myAddress")?.value || "").trim(),
      permitNo: ($("myPermitNo")?.value || "").trim(),
      permitUntil: ($("myPermitUntil")?.value || "").trim(),
    },
  };
}

/* =========================
  state（まずは最小）
========================= */

const state = {
  view: "home",
  _id: null,
  case: {
    projectName: "",
    partnerName: "",
    startDate: "",
    endDate: "",
    contractAmount: "",
    fiscalYear: "",
  },
  engineers: [],
  daicho: { contracts: [] },
};

/* =========================
  Recent（一覧）/ Draft（本体）最低限
========================= */

function makeId() {
  return (
    "id_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function getRecentList() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}
function setRecentList(arr) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
}

function saveDraftById(id, obj) {
  localStorage.setItem(DRAFT_PREFIX + id, JSON.stringify(obj));
}
function loadDraftById(id) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function deleteDraftById(id) {
  localStorage.removeItem(DRAFT_PREFIX + id);
  const next = getRecentList().filter((x) => x.id !== id);
  setRecentList(next);
}

function upsertRecentFromState() {
  const meta = {
    id: state._id || makeId(),
    savedAt: new Date().toISOString(),
    projectName: (state.case.projectName || "").trim(),
    partnerName: (state.case.partnerName || "").trim(),
    contractAmount: state.case.contractAmount || "",
    fiscalYear: (state.case.fiscalYear || "").trim(),
    startDate: state.case.startDate || "",
    endDate: state.case.endDate || "",
  };
  state._id = meta.id;

  const list = getRecentList();
  const next = [meta, ...list.filter((x) => x.id !== meta.id)];
  setRecentList(next);
  saveDraftById(meta.id, state);
  return meta;
}

function fmtWhen(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? (iso || "") : d.toLocaleString("ja-JP");
}

/* =========================
  一覧描画（Home）
========================= */

function renderRecentList() {
  const root = $("recentList");
  const empty = $("recentEmpty");
  if (!root || !empty) return;

  const q = ($("searchBox")?.value || "").trim().toLowerCase();
  const sort = $("sortSelect")?.value || "savedDesc";

  let list = getRecentList();

  if (q) {
    list = list.filter((x) => {
      const a = (x.projectName || "").toLowerCase();
      const b = (x.partnerName || "").toLowerCase();
      const c = String(x.contractAmount || "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }

  if (sort === "savedDesc") {
    list.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  } else if (sort === "savedAsc") {
    list.sort((a, b) => String(a.savedAt || "").localeCompare(String(b.savedAt || "")));
  }

  root.innerHTML = "";

  if (list.length === 0) {
    empty.style.display = "";
    empty.textContent = q ? "検索条件に一致する案件がありません。" : "まだ保存された案件がありません。";
    return;
  }
  empty.style.display = "none";

  for (const item of list) {
    const card = document.createElement("div");
    card.className = "recentCard";

    const title = item.projectName ? item.projectName : "（工事名なし）";
    const partner = item.partnerName ? item.partnerName : "（発注者なし）";
    const when = fmtWhen(item.savedAt);

    const main = document.createElement("div");
    main.className = "recentMain";
    main.innerHTML = `
      <div class="recentTitleRow">
        <span class="recentMark">🟢</span>
        <div class="recentTitle">${escapeHtml(title)}</div>
      </div>
      <div class="recentSub">${escapeHtml(partner)}${item.contractAmount ? " / " + escapeHtml(formatYen(item.contractAmount)) : ""}</div>
      <div class="recentSub">${escapeHtml(when)}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "recentBtns";

    const openBtn = document.createElement("button");
    openBtn.className = "ghost";
    openBtn.textContent = "開く";
    openBtn.onclick = () => {
      const obj = loadDraftById(item.id);
      if (!obj) {
        showToast("データが見つかりません（削除済みの可能性）");
        deleteDraftById(item.id);
        renderRecentList();
        return;
      }
      // 最低限復元
      state.view = obj.view || state.view;
      state.case = obj.case || state.case;
      state.engineers = Array.isArray(obj.engineers) ? obj.engineers : [];
      state.daicho = obj.daicho || state.daicho;
      state._id = obj._id || item.id;

      showToast("案件を開きました");
      goEdit();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "ghost";
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
      const ok = confirm("この案件を削除します（復元用データも削除）。よろしいですか？");
      if (!ok) return;
      deleteDraftById(item.id);
      showToast("削除しました");
      renderRecentList();
    };

    btns.appendChild(openBtn);
    btns.appendChild(delBtn);

    card.appendChild(main);
    card.appendChild(btns);
    root.appendChild(card);
  }
}

/* =========================
  ヘッダー
========================= */

function currentProjectLabel() {
  return (state.case.projectName || "").trim() ? state.case.projectName.trim() : "（工事未選択）";
}
function setBreadcrumb(parts) {
  const el = $("hdrCrumb");
  if (el) el.textContent = parts.join(" > ");
}
function updateHeader() {
  if ($("hdrProject")) $("hdrProject").textContent = currentProjectLabel();

  if (state.view === "home") {
    setBreadcrumb(["入口"]);
  } else if (state.view === "edit") {
    setBreadcrumb(["入口", `工事（${currentProjectLabel()}）`]);
  } else if (state.view === "daichoPreview") {
    setBreadcrumb(["入口", `工事（${currentProjectLabel()}）`, "施工体制台帳"]);
  } else {
    setBreadcrumb(["入口"]);
  }
}

/* =========================
  画面切替（★goHomeで一覧を必ず描画）
========================= */

function goHome() {
  state.view = "home";
  if ($("homeView")) $("homeView").style.display = "";
  if ($("editView")) $("editView").style.display = "none";
  if ($("daichoPreviewView")) $("daichoPreviewView").style.display = "none";

  renderRecentList();   // ★これが「一覧が出ない」を潰す核心
  updateHeader();
}
function goEdit() {
  state.view = "edit";
  if ($("homeView")) $("homeView").style.display = "none";
  if ($("editView")) $("editView").style.display = "";
  if ($("daichoPreviewView")) $("daichoPreviewView").style.display = "none";
  updateHeader();

  // ここではrender()など本体の描画を呼ぶ（存在すれば）
  if (typeof window.render === "function") window.render();
}
function goDaichoPreview() {
  state.view = "daichoPreview";
  if ($("homeView")) $("homeView").style.display = "none";
  if ($("editView")) $("editView").style.display = "none";
  if ($("daichoPreviewView")) $("daichoPreviewView").style.display = "";
  updateHeader();

  if (typeof window.renderDaichoPreview === "function") window.renderDaichoPreview();
}

/* =========================
  設定パネル（右スライド）
========================= */

function openSettings() {
  fillProfileUI();
  if ($("settingsOverlay")) $("settingsOverlay").style.display = "";
  if ($("settingsPanel")) $("settingsPanel").style.display = "";
}
function closeSettings() {
  if ($("settingsOverlay")) $("settingsOverlay").style.display = "none";
  if ($("settingsPanel")) $("settingsPanel").style.display = "none";
}

/* =========================
  新規案件（最低限）
========================= */

function resetCase() {
  state._id = null;
  state.case = {
    projectName: "",
    partnerName: "",
    startDate: "",
    endDate: "",
    contractAmount: "",
    fiscalYear: "",
  };
  state.engineers = [];
  state.daicho = { contracts: [] };
}

/* =========================
  ボタン結線（落ちない・一覧が戻る）
========================= */

function setupButtons() {
  const onClick = (id, fn) => {
    const n = $(id);
    if (!n) return;
    // 同じ画面切替で多重結線しないために一度外す
    n.onclick = null;
    n.onclick = fn;
  };

  const openFile = () => $("fileLoad")?.click();

  // Header
  onClick("btnOpenSettings", () => openSettings());
  onClick("btnCloseSettings", () => closeSettings());
  onClick("settingsOverlay", () => closeSettings());

  // Home
  onClick("homeNew", () => {
    resetCase();
    goEdit();
  });
  onClick("homeOpen", openFile);
  onClick("homeSettings", () => openSettings()); // 残してる場合だけ

  // Settings panel save/clear
  onClick("btnSaveProfile", () => {
    const prof = readProfileUI();
    if (!prof.myCompany.name) {
      alert("自社名は必須です。");
      return;
    }
    saveProfile(prof);
    const note = $("profileSavedNote");
    if (note) {
      note.style.display = "";
      note.textContent = "保存しました（このPC・このブラウザに保存）";
    }
    showToast("自社情報を保存しました");
  });
  onClick("btnClearProfile", () => {
    const ok = confirm("自社情報をクリアします。よろしいですか？");
    if (!ok) return;
    localStorage.removeItem(PROFILE_KEY);
    fillProfileUI();
    showToast("クリアしました");
  });

  // Edit
  onClick("backHome", () => goHome());

  onClick("btnSave", () => {
    // 最低限：localStorageへ保存し一覧更新
    upsertRecentFromState();
    showToast("保存しました（このPC内に復元用データ）");
    // ホームへ戻らなくても一覧はHomeで見れるが、念のため
    // renderRecentList();
  });

  // Edit → 設定（右スライド）
  onClick("btnOpenSettingsFromEdit", () => openSettings());

  // Preview
  onClick("btnDaichoPreview", () => goDaichoPreview());
  onClick("btnBackToEdit", () => goEdit());
  onClick("btnPrintDaicho", () => window.print());

  // ファイル読み込み（JSON） ※今は保留でもOK。必要なら後で追加
}

/* =========================
  起動（DOM準備後に1回だけ）
========================= */

function initApp() {
  setupButtons();

  const sb = $("searchBox");
  if (sb) sb.addEventListener("input", () => renderRecentList());

  const ss = $("sortSelect");
  if (ss) ss.addEventListener("change", () => renderRecentList());

  goHome();
  updateHeader();
}

window.addEventListener("DOMContentLoaded", initApp, { once: true });
