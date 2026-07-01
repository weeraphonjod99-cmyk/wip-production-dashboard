const SHEET_ID = "1xhv4E6AGuHLXPpkzQjTT5FFIZjmP3wmcUAfuJ1eXKuk";
const SHEET_GID = "1215588368";
const SHEET_NAME = "automotive part";
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const STORAGE_KEY = "wip-production-tracking-status";
const SCHEDULE_KEY = "wip-production-daily-schedule";
const ACTIVE_VIEW_KEY = "wip-production-active-view";
const AUTO_REFRESH_MS = 15000;
const AUTO_REFRESH_SECONDS = Math.round(AUTO_REFRESH_MS / 1000);
// Paste the deployed Apps Script web app URL here to share schedule edits across all users.
const REMOTE_SCHEDULE_URL = "";

const COL = {
  part: 0,
  wantProduce: 1,
  safetyStock: 2,
  forecastAfterFg: 3,
  totalWorkpiece: 4,
  fgPart: 5,
  processStart: 6,
  processEnd: 15,
  totalFgAfterDelivery: 18,
  orderDelivery: 19,
  totalDelivery: 20,
  totalOrder: 21,
  waitPacking: 22,
  forecastJul: 23,
  forecastAug: 24,
  forecastSep: 25,
  forecastOct: 26,
  dayStart: 27,
  dayEnd: 57,
};

const FALLBACK_PARTS = [
  {
    partNumber: "TM-755A-1",
    wantProduce: -13396,
    sheetSafetyStock: 29400,
    forecastAfterFg: 181692,
    totalWorkpiece: 16004,
    fgPart: 5256,
    totalFgAfterDelivery: 5256,
    waitPacking: 0,
    forecasts: { jul: 98000, aug: 99696, sep: 77087, oct: 57369 },
    processes: [
      { name: "waiting sorting", qty: 2833 },
      { name: "NG", qty: 3672 },
      { name: "check threade", qty: 5544 },
      { name: "rubber cap", qty: 5760 },
      { name: "welding", qty: -3389 },
      { name: "riveting", qty: 0 },
      { name: "NG", qty: 6645 },
    ],
    dailyPlan: [],
  },
  {
    partNumber: "TM-791A-1",
    wantProduce: 13468,
    sheetSafetyStock: 9000,
    forecastAfterFg: 49841,
    totalWorkpiece: 22468,
    fgPart: 10878,
    totalFgAfterDelivery: 10878,
    waitPacking: 0,
    forecasts: { jul: 30000, aug: 42309, sep: 44721, oct: 40110 },
    processes: [{ name: "waiting sorting", qty: 11590 }],
    dailyPlan: [],
  },
  {
    partNumber: "TM-795A-1",
    wantProduce: 25275,
    sheetSafetyStock: 10200,
    forecastAfterFg: 40564,
    totalWorkpiece: 35475,
    fgPart: 34485,
    totalFgAfterDelivery: 34485,
    waitPacking: 0,
    forecasts: { jul: 34000, aug: 42039, sep: 44430, oct: 39842 },
    processes: [{ name: "waiting sorting", qty: 990 }],
    dailyPlan: [],
  },
  {
    partNumber: "SB-075B-1-1",
    wantProduce: 9131,
    sheetSafetyStock: 2820,
    forecastAfterFg: 10006,
    totalWorkpiece: 11951,
    fgPart: 480,
    totalFgAfterDelivery: 480,
    waitPacking: 0,
    forecasts: { jul: 9400, aug: 12557, sep: 6912, oct: 1958 },
    processes: [
      { name: "waiting sorting", qty: 2057 },
      { name: "CNC", qty: 1029 },
      { name: "Shotbast", qty: 2154 },
      { name: "polishing", qty: 4077 },
      { name: "X-ray", qty: 0 },
    ],
    dailyPlan: [],
  },
  {
    partNumber: "TM-865A-2",
    wantProduce: -2507,
    sheetSafetyStock: 14315,
    forecastAfterFg: 87704,
    totalWorkpiece: 11808,
    fgPart: 6000,
    totalFgAfterDelivery: 6000,
    waitPacking: 0,
    forecasts: { jul: 47716, aug: 51796, sep: 71244, oct: 52700 },
    processes: [
      { name: "X-ray", qty: 4716 },
      { name: "CNC", qty: 768 },
      { name: "Shotbast", qty: 5040 },
    ],
    dailyPlan: [],
  },
  {
    partNumber: "TH-403B-1",
    wantProduce: 4298,
    sheetSafetyStock: 270,
    forecastAfterFg: -2089,
    totalWorkpiece: 4568,
    fgPart: 170,
    totalFgAfterDelivery: 170,
    waitPacking: 0,
    forecasts: { jul: 900, aug: 1579, sep: 1442, oct: 1121 },
    processes: [
      { name: "waiting sorting", qty: 36 },
      { name: "CNC", qty: 1411 },
      { name: "Shotbast", qty: 58 },
      { name: "polishing", qty: 2893 },
    ],
    dailyPlan: [],
  },
];

const initialSchedule = loadSchedule();

const state = {
  allParts: [],
  viewParts: [],
  filter: "all",
  search: "",
  selectedPart: "all",
  sort: "shortage",
  safetyRate: 30,
  remainingDays: 4,
  source: "loading",
  sheetUpdated: "-",
  liveSignature: "",
  lastCheckedAt: null,
  lastScheduleSyncAt: null,
  isLoading: false,
  isSyncingSchedule: false,
  tracking: loadTracking(),
  schedule: initialSchedule,
  scheduleSignature: buildScheduleSignature(initialSchedule),
  activeView: loadActiveView(),
};

const els = {};
let remoteScheduleSaveTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  setActiveView(state.activeView, { persist: false });
  refreshAll({ useSnapshot: true, reason: "initial" });
  startAutoRefresh();
});

function bindElements() {
  els.dashboard = document.querySelector(".dashboard");
  els.viewTabs = document.querySelectorAll(".view-tab");
  els.connectionStatus = document.getElementById("connectionStatus");
  els.autoRefreshStatus = document.getElementById("autoRefreshStatus");
  els.refreshBtn = document.getElementById("refreshBtn");
  els.searchInput = document.getElementById("searchInput");
  els.partSelect = document.getElementById("partSelect");
  els.sortSelect = document.getElementById("sortSelect");
  els.safetyRate = document.getElementById("safetyRate");
  els.remainingDays = document.getElementById("remainingDays");
  els.remainingDaysValue = document.getElementById("remainingDaysValue");
  els.sheetUpdated = document.getElementById("sheetUpdated");
  els.kpiGrid = document.getElementById("kpiGrid");
  els.fgMonitor = document.getElementById("fgMonitor");
  els.dayGrid = document.getElementById("dayGrid");
  els.planTable = document.getElementById("planTable");
  els.scheduleGrid = document.getElementById("scheduleGrid");
  els.partsGrid = document.getElementById("partsGrid");
  els.emptyState = document.getElementById("emptyState");
  els.visibleCount = document.getElementById("visibleCount");
  els.deliveryMode = document.getElementById("deliveryMode");
  els.exportBtn = document.getElementById("exportBtn");
  els.clearScheduleBtn = document.getElementById("clearScheduleBtn");
}

function bindEvents() {
  els.viewTabs.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });
  els.refreshBtn.addEventListener("click", () => refreshAll({ reason: "manual" }));
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  els.partSelect.addEventListener("change", (event) => {
    state.selectedPart = event.target.value || "all";
    render();
  });
  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  els.safetyRate.addEventListener("input", (event) => {
    state.safetyRate = clamp(Number(event.target.value) || 30, 0, 100);
    render();
  });
  els.remainingDays.addEventListener("input", (event) => {
    state.remainingDays = clamp(Number(event.target.value) || 1, 1, 31);
    els.remainingDaysValue.textContent = `${state.remainingDays} วัน`;
    render();
  });
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      render();
    });
  });
  els.partsGrid.addEventListener("change", (event) => {
    if (!event.target.matches(".tracking-select")) return;
    state.tracking[event.target.dataset.part] = event.target.value;
    saveTracking();
    render();
  });
  els.scheduleGrid.addEventListener("input", handleSchedulePartSearchInput);
  els.scheduleGrid.addEventListener("input", handleScheduleInput);
  els.clearScheduleBtn.addEventListener("click", () => {
    if (!confirm("Clear saved daily delivery plan?")) return;
    state.schedule = {};
    saveSchedule();
    render();
  });
  els.exportBtn.addEventListener("click", exportDailyPlan);
}

function setActiveView(view, options = {}) {
  const nextView = view === "schedule" ? "schedule" : "dashboard";
  state.activeView = nextView;
  if (els.dashboard) {
    els.dashboard.dataset.activeView = nextView;
  }
  els.viewTabs.forEach((button) => {
    const isActive = button.dataset.view === nextView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  if (options.persist !== false) {
    try {
      localStorage.setItem(ACTIVE_VIEW_KEY, nextView);
    } catch {
      // Ignore storage restrictions; the menu still works for the current session.
    }
  }
}

function startAutoRefresh() {
  window.setInterval(() => {
    if (document.visibilityState !== "hidden") {
      refreshAll({ reason: "auto" });
    }
  }, AUTO_REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshAll({ reason: "auto" });
    }
  });

  window.addEventListener("focus", () => refreshAll({ reason: "auto" }));
}

function refreshAll(options = {}) {
  loadSheet(options);
  syncRemoteSchedule(options);
}

async function loadSheet(options = {}) {
  const { useSnapshot = false, reason = "manual" } = options;
  if (state.isLoading) return;
  state.isLoading = true;
  let rendered = false;

  try {
    const snapshot = loadSnapshotParts();
    if ((useSnapshot || !state.allParts.length) && snapshot.parts.length) {
      state.allParts = snapshot.parts;
      state.sheetUpdated = snapshot.updated || "Snapshot 27/06/2026";
      state.source = "fallback";
      setConnection("snapshot", "Snapshot data");
      render();
      rendered = true;
    } else if (!state.allParts.length) {
      state.allParts = FALLBACK_PARTS.map((part) => ({ ...part }));
      state.sheetUpdated = "Fallback sample";
      state.source = "fallback";
      setConnection("snapshot", "Snapshot data");
      render();
      rendered = true;
    }

    setConnection("loading", reason === "auto" ? "Checking Google Sheet" : "Connecting Google Sheet");
    const rows = await loadRowsWithJsonp();
    const parsed = parseRows(rows);
    if (!parsed.parts.length) throw new Error("No Part Number rows found");

    const nextSignature = buildDataSignature(parsed);
    const shouldRender = nextSignature !== state.liveSignature || state.source !== "live" || reason === "manual";
    state.allParts = parsed.parts;
    state.sheetUpdated = parsed.updated || "-";
    state.liveSignature = nextSignature;
    state.source = "live";
    state.lastCheckedAt = new Date();
    setConnection("live", "Live Google Sheet");

    if (shouldRender) {
      render();
      rendered = true;
    }
  } catch (error) {
    state.source = "fallback";
    state.lastCheckedAt = new Date();
    setConnection("snapshot", "Snapshot data");
    console.warn("Google Sheet live load failed:", error);
  } finally {
    state.isLoading = false;
    updateAutoRefreshStatus();
  }

  if (!rendered && !state.allParts.length) {
    render();
  }
}

async function loadSheetLegacy() {
  const snapshot = loadSnapshotParts();
  if (snapshot.parts.length) {
    state.allParts = snapshot.parts;
    state.sheetUpdated = snapshot.updated || "Snapshot 27/06/2026";
    state.source = "fallback";
    setConnection("snapshot", "ใช้ข้อมูลสำรอง");
    render();
  } else if (!state.allParts.length) {
    state.allParts = FALLBACK_PARTS.map((part) => ({ ...part }));
    state.sheetUpdated = "ตัวอย่างสำรอง";
    state.source = "fallback";
    setConnection("snapshot", "ใช้ข้อมูลสำรอง");
    render();
  }

  setConnection("loading", "กำลังเชื่อม Google Sheet");
  try {
    const rows = await loadRowsWithJsonp();
    const parsed = parseRows(rows);
    if (!parsed.parts.length) throw new Error("ไม่พบรายการ Part Number ในชีต");
    state.allParts = parsed.parts;
    state.sheetUpdated = parsed.updated || "-";
    state.source = "live";
    setConnection("live", "Live Google Sheet");
  } catch (error) {
    state.source = "fallback";
    setConnection("snapshot", "ใช้ข้อมูลสำรอง");
    console.warn("Google Sheet live load failed:", error);
  }
  render();
}

function loadRowsWithJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = `wipSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const query = encodeURIComponent("select *");
    const tqx = encodeURIComponent(`out:json;responseHandler:${callbackName}`);
    const cacheBust = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&headers=0&tqx=${tqx}&tq=${query}&cacheBust=${cacheBust}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      settled = true;
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (response) => {
      if (settled) return;
      cleanup();
      if (!response || response.status === "error" || !response.table) {
        reject(new Error(response?.errors?.[0]?.detailed_message || "Google Sheet response error"));
        return;
      }
      const maxCols = response.table.cols.length;
      const rows = response.table.rows.map((row) => {
        const values = Array.from({ length: maxCols }, (_, index) => {
          const cell = row.c[index];
          if (!cell) return "";
          return cell.f ?? cell.v ?? "";
        });
        return values;
      });
      resolve(rows);
    };

    script.onerror = () => {
      if (settled) return;
      cleanup();
      reject(new Error("โหลด Google Sheet ไม่สำเร็จ"));
    };
    script.src = url;
    document.head.appendChild(script);
    window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error("หมดเวลารอ Google Sheet"));
    }, 7000);
  });
}

function hasRemoteScheduleSync() {
  return /^https?:\/\//i.test(REMOTE_SCHEDULE_URL.trim());
}

async function syncRemoteSchedule() {
  if (!hasRemoteScheduleSync() || state.isSyncingSchedule) return;
  state.isSyncingSchedule = true;

  try {
    const response = await loadRemoteScheduleWithJsonp();
    const remoteSchedule = normalizeRemoteSchedule(response.schedule || {});
    const remoteSignature = buildScheduleSignature(remoteSchedule);
    const localSignature = buildScheduleSignature(state.schedule);
    const remoteIsEmpty = Object.keys(remoteSchedule).length === 0;
    const localHasData = Object.keys(state.schedule).length > 0;

    state.lastScheduleSyncAt = new Date();

    if (!response.updatedAt && remoteIsEmpty && localHasData) {
      queueRemoteScheduleSave();
      return;
    }

    if (remoteSignature !== localSignature) {
      state.schedule = remoteSchedule;
      state.scheduleSignature = remoteSignature;
      saveScheduleLocal();
      render();
    }
  } catch (error) {
    console.warn("Remote schedule sync failed:", error);
  } finally {
    state.isSyncingSchedule = false;
    updateAutoRefreshStatus();
  }
}

function loadRemoteScheduleWithJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = `wipScheduleCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const separator = REMOTE_SCHEDULE_URL.includes("?") ? "&" : "?";
    const url = `${REMOTE_SCHEDULE_URL}${separator}action=get&callback=${callbackName}&cacheBust=${Date.now()}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      settled = true;
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (response) => {
      if (settled) return;
      cleanup();
      if (!response || response.ok === false) {
        reject(new Error(response?.error || "Remote schedule response error"));
        return;
      }
      resolve(response);
    };

    script.onerror = () => {
      if (settled) return;
      cleanup();
      reject(new Error("Remote schedule load failed"));
    };
    script.src = url;
    document.head.appendChild(script);
    window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error("Remote schedule load timeout"));
    }, 7000);
  });
}

function queueRemoteScheduleSave() {
  if (!hasRemoteScheduleSync()) return;
  window.clearTimeout(remoteScheduleSaveTimer);
  remoteScheduleSaveTimer = window.setTimeout(pushRemoteSchedule, 600);
}

async function pushRemoteSchedule() {
  if (!hasRemoteScheduleSync()) return;
  const payload = {
    action: "set",
    schedule: normalizeRemoteSchedule(state.schedule),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(REMOTE_SCHEDULE_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
    state.lastScheduleSyncAt = new Date();
    updateAutoRefreshStatus();
  } catch (error) {
    console.warn("Remote schedule save failed:", error);
  }
}

function normalizeRemoteSchedule(rawSchedule) {
  const normalized = {};
  Object.entries(rawSchedule || {}).forEach(([partNumber, plan]) => {
    const nextPlan = pruneSchedulePlan({
      delivered: toNumber(plan?.delivered),
      pendingPacking: toNumber(plan?.pendingPacking),
      days: Object.entries(plan?.days || {}).reduce((days, [day, value]) => {
        const dayNumber = Number(day);
        const qty = Math.max(0, Math.round(toNumber(value)));
        if (dayNumber >= 1 && dayNumber <= 31 && qty > 0) {
          days[String(dayNumber)] = qty;
        }
        return days;
      }, {}),
    });
    if (nextPlan.delivered || nextPlan.pendingPacking || Object.keys(nextPlan.days).length) {
      normalized[partNumber] = nextPlan;
    }
  });
  return normalized;
}

function buildDataSignature(parsed) {
  const summary = parsed.parts.map((part) => [
    part.partNumber,
    part.wantProduce,
    part.sheetSafetyStock,
    part.totalWorkpiece,
    part.fgPart,
    part.totalFgAfterDelivery,
    part.waitPacking,
    part.processes.map((process) => `${process.name}:${process.qty}`).join("|"),
    part.dailyPlan.map((day) => `${day.day}:${day.qty}`).join("|"),
  ]);
  return JSON.stringify([parsed.updated, summary]);
}

function buildScheduleSignature(schedule) {
  const summary = Object.keys(schedule || {})
    .sort()
    .map((partNumber) => {
      const plan = schedule[partNumber] || {};
      const days = Object.keys(plan.days || {})
        .sort((a, b) => Number(a) - Number(b))
        .map((day) => [day, Number(plan.days[day]) || 0]);
      return [partNumber, Number(plan.delivered) || 0, Number(plan.pendingPacking) || 0, days];
    });
  return JSON.stringify(summary);
}

function updateAutoRefreshStatus() {
  if (!els.autoRefreshStatus) return;
  const checkedAt = state.lastCheckedAt
    ? state.lastCheckedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : "-";
  const scheduleSync = hasRemoteScheduleSync() ? "shared plan sync" : "local plan only";
  els.autoRefreshStatus.textContent = `Auto update ${AUTO_REFRESH_SECONDS}s | checked ${checkedAt} | ${scheduleSync}`;
}

function loadSnapshotParts() {
  if (!window.WIP_SNAPSHOT_CSV) return { parts: [], updated: "" };
  const rows = stripSnapshotIndexColumn(parseCsv(window.WIP_SNAPSHOT_CSV));
  return parseRows(rows);
}

function stripSnapshotIndexColumn(rows) {
  const hasIndexColumn = clean(rows[2]?.[0]) === "1" && clean(rows[2]?.[1]).toLowerCase() === "part number";
  return hasIndexColumn ? rows.map((row) => row.slice(1)) : rows;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseRows(rows) {
  const parts = [];
  const updated = findUpdatedStamp(rows);

  for (let index = 4; index < rows.length; index += 1) {
    const row = normalizeRow(rows[index]);
    const partNumber = clean(row[COL.part]);
    if (!partNumber || /^part number$/i.test(partNumber)) continue;
    if (!looksLikePartRow(row)) continue;

    const nextRow = normalizeRow(rows[index + 1] || []);
    const hasQuantityRow = !clean(nextRow[COL.part]);
    const quantityRow = hasQuantityRow ? nextRow : [];
    const processes = [];

    for (let col = COL.processStart; col <= COL.processEnd; col += 1) {
      const name = clean(row[col]);
      const qty = toNumber(quantityRow[col]);
      if (!name && !qty) continue;
      processes.push({
        name: name || `Process ${col - COL.processStart + 1}`,
        qty,
      });
    }

    const dailyPlan = [];
    for (let col = COL.dayStart; col <= COL.dayEnd; col += 1) {
      const raw = clean(row[col]);
      const qty = toNumber(row[col]);
      if (!raw && !qty) continue;
      dailyPlan.push({ day: col - COL.dayStart + 1, qty });
    }

    parts.push({
      rowNumber: index + 1,
      partNumber,
      wantProduce: toNumber(row[COL.wantProduce]),
      sheetSafetyStock: toNumber(row[COL.safetyStock]),
      forecastAfterFg: toNumber(row[COL.forecastAfterFg]),
      totalWorkpiece: toNumber(row[COL.totalWorkpiece]),
      fgPart: toNumber(row[COL.fgPart]),
      totalFgAfterDelivery: toNumber(row[COL.totalFgAfterDelivery]) || toNumber(row[COL.fgPart]),
      orderDelivery: toNumber(row[COL.orderDelivery]),
      totalDelivery: toNumber(row[COL.totalDelivery]),
      totalOrder: toNumber(row[COL.totalOrder]),
      waitPacking: toNumber(row[COL.waitPacking]),
      forecasts: {
        jul: toNumber(row[COL.forecastJul]),
        aug: toNumber(row[COL.forecastAug]),
        sep: toNumber(row[COL.forecastSep]),
        oct: toNumber(row[COL.forecastOct]),
      },
      processes,
      dailyPlan,
    });
  }

  return { parts, updated };
}

function looksLikePartRow(row) {
  const part = clean(row[COL.part]);
  const hasNumbers = [COL.wantProduce, COL.safetyStock, COL.totalWorkpiece, COL.fgPart].some((col) => toNumber(row[col]) !== 0);
  return Boolean(part && hasNumbers);
}

function normalizeRow(row) {
  return Array.from({ length: COL.dayEnd + 1 }, (_, index) => row[index] ?? "");
}

function findUpdatedStamp(rows) {
  const text = rows
    .slice(0, 4)
    .flat()
    .map(clean)
    .find((value) => /update|updeta|อัปเดต|27\/06\/2026/i.test(value));
  if (!text) return "-";
  const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
  return dateMatch ? dateMatch[0] : text.replace(/\s+/g, " ");
}

function derivePart(part) {
  const forecastSafety = Math.round((part.forecasts.jul || 0) * (state.safetyRate / 100));
  const safetyStock = forecastSafety || part.sheetSafetyStock || 0;
  const sourceFgPart = part.fgPart || 0;
  const sourceFgAfterDelivery = part.totalFgAfterDelivery || sourceFgPart;
  const schedule = getSchedulePlan(part.partNumber);
  const manualDeliveryQty = scheduleDeliveryDeduction(schedule);
  const fgPart = sourceFgPart - manualDeliveryQty;
  const fgAfterDelivery = sourceFgAfterDelivery - manualDeliveryQty;
  const safetyGap = Math.max(0, safetyStock - fgAfterDelivery);
  const needProduce = Math.max(0, part.wantProduce);
  const recommendedNeed = Math.max(needProduce, safetyGap);
  const dailyTarget = Math.ceil(recommendedNeed / Math.max(1, state.remainingDays));
  const totalProcessQty = part.processes.reduce((sum, process) => sum + Math.max(0, process.qty), 0);
  const wipQty = Math.max(part.totalWorkpiece || 0, totalProcessQty);
  const topProcess = part.processes
    .filter((process) => Math.abs(process.qty) > 0)
    .sort((a, b) => Math.abs(b.qty) - Math.abs(a.qty))[0];
  const coverage = safetyStock > 0 ? fgAfterDelivery / safetyStock : fgAfterDelivery > 0 ? 1 : 0;
  const sheetPlanTotal = part.dailyPlan.reduce((sum, day) => sum + Math.max(0, day.qty), 0);
  const trackingStatus = state.tracking[part.partNumber] || "auto";
  const computedStatus = computeStatus({ safetyGap, needProduce, fgAfterDelivery, topProcess });

  return {
    ...part,
    sourceFgPart,
    sourceFgAfterDelivery,
    manualDeliveryQty,
    fgPart,
    totalFgAfterDelivery: fgAfterDelivery,
    fgAfterDelivery,
    safetyStock,
    safetyGap,
    needProduce,
    recommendedNeed,
    dailyTarget,
    wipQty,
    topProcess,
    coverage,
    sheetPlanTotal,
    trackingStatus,
    status: trackingStatus === "auto" ? computedStatus : trackingStatus,
  };
}

function computeStatus(part) {
  if (part.safetyGap > 0 && part.needProduce > 0) return "critical";
  if (part.safetyGap > 0) return "risk";
  if (part.needProduce > 0 || part.topProcess) return "produce";
  if (part.fgAfterDelivery > 0) return "ready";
  return "process";
}

function render() {
  updateDerivedState();
  renderKpis(state.viewParts);
  renderFgMonitor(state.viewParts);
  renderDayGrid(state.viewParts);
  renderPlanTable(state.viewParts);
  renderScheduleGrid(state.viewParts);
  renderParts(state.viewParts);
}

function updateDerivedState() {
  const derived = state.allParts.map(derivePart);
  renderPartSelect(derived);
  state.viewParts = applyView(derived);
  els.sheetUpdated.textContent = state.sheetUpdated;
  els.visibleCount.textContent = `${formatNumber(state.viewParts.length)} รายการ`;
  return derived;
}

function refreshComputedViews() {
  updateDerivedState();
  renderKpis(state.viewParts);
  renderFgMonitor(state.viewParts);
  renderDayGrid(state.viewParts);
  renderPlanTable(state.viewParts);
  renderParts(state.viewParts);
}

function applyView(parts) {
  const query = state.search.trim().toLowerCase();
  const selectedPart = state.selectedPart;
  let result = parts.filter((part) => {
    if (selectedPart !== "all" && part.partNumber !== selectedPart) return false;
    const matchesSearch = !query || part.partNumber.toLowerCase().includes(query) || part.processes.some((process) => process.name.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (state.filter === "risk") return part.safetyGap > 0;
    if (state.filter === "produce") return part.needProduce > 0;
    if (state.filter === "ready") return part.safetyGap === 0 && part.fgPart > 0;
    return true;
  });

  result = [...result].sort((a, b) => {
    if (state.sort === "want") return b.needProduce - a.needProduce;
    if (state.sort === "wip") return b.wipQty - a.wipQty;
    if (state.sort === "part") return a.partNumber.localeCompare(b.partNumber, "th");
    return b.safetyGap - a.safetyGap || b.needProduce - a.needProduce;
  });

  return result;
}

function renderPartSelect(parts) {
  if (!els.partSelect) return;
  const sortedParts = [...parts].sort((a, b) => a.partNumber.localeCompare(b.partNumber, "th"));
  const hasSelectedPart = state.selectedPart === "all" || sortedParts.some((part) => part.partNumber === state.selectedPart);
  if (!hasSelectedPart) {
    state.selectedPart = "all";
  }

  els.partSelect.innerHTML = [
    `<option value="all">ทุกชิ้นงาน</option>`,
    ...sortedParts.map((part) => `<option value="${escapeHtml(part.partNumber)}">${escapeHtml(part.partNumber)}</option>`),
  ].join("");
  els.partSelect.value = state.selectedPart;
}

function renderKpis(parts) {
  const totalWip = sum(parts, "wipQty");
  const totalFg = sum(parts, "fgPart");
  const totalSafetyGap = sum(parts, "safetyGap");
  const totalNeedProduce = sum(parts, "needProduce");
  const riskCount = parts.filter((part) => part.safetyGap > 0).length;
  const readyCount = parts.filter((part) => part.safetyGap === 0 && part.fgPart > 0).length;

  const cards = [
    ["Part ทั้งหมด", parts.length, "รายการ"],
    ["ขาด Safety", riskCount, "รายการ"],
    ["ต้องผลิต", totalNeedProduce, "pcs"],
    ["Safety Gap", totalSafetyGap, "pcs"],
    ["WIP รวม", totalWip, "pcs"],
    ["FG พร้อมใช้", totalFg, `${readyCount} รายการพร้อมส่ง`],
  ];

  els.kpiGrid.innerHTML = cards
    .map(
      ([label, value, hint]) => `
        <article class="kpi-card">
          <span>${label}</span>
          <strong>${formatNumber(value)}</strong>
          <small>${hint}</small>
        </article>
      `,
    )
    .join("");
}

function renderFgMonitor(parts) {
  if (!els.fgMonitor) return;

  const monitorParts = [...parts].sort((a, b) => {
    const aUrgency = fgUrgencyScore(a);
    const bUrgency = fgUrgencyScore(b);
    return bUrgency - aUrgency || a.fgPart - b.fgPart || b.safetyGap - a.safetyGap;
  });
  const maxAbsFg = Math.max(1, ...monitorParts.map((part) => Math.abs(part.fgPart)));
  const urgentCount = monitorParts.filter((part) => part.fgPart < 0 || part.safetyGap > 0).length;
  const negativeCount = monitorParts.filter((part) => part.fgPart < 0).length;
  const lowFgCount = monitorParts.filter((part) => part.fgPart >= 0 && part.coverage < 0.5).length;

  const rows = monitorParts
    .map((part) => {
      const status = fgMonitorStatus(part);
      const width = clamp(Math.round((Math.abs(part.fgPart) / maxAbsFg) * 100), part.fgPart === 0 ? 0 : 4, 100);
      return `
        <div class="fg-row ${status.className}">
          <div class="fg-row-main">
            <strong title="${escapeHtml(part.partNumber)}">${escapeHtml(part.partNumber)}</strong>
            <span>${status.label}</span>
          </div>
          <div class="fg-bar-track" aria-label="${escapeHtml(part.partNumber)} FG Balance ${formatNumber(part.fgPart)}">
            <span class="fg-bar" style="width:${width}%"></span>
          </div>
          <div class="fg-row-values">
            <span>FG <strong>${formatNumber(part.fgPart)}</strong></span>
            <span>Gap <strong>${formatNumber(part.safetyGap)}</strong></span>
            <span>${formatNumber(Math.round(part.coverage * 100))}%</span>
          </div>
        </div>
      `;
    })
    .join("");

  els.fgMonitor.innerHTML = `
    <div class="fg-monitor-summary">
      <span>Part ${formatNumber(monitorParts.length)}</span>
      <span>เร่งรีบ ${formatNumber(urgentCount)}</span>
      <span>ติดลบ ${formatNumber(negativeCount)}</span>
      <span>FG ต่ำ ${formatNumber(lowFgCount)}</span>
    </div>
    <div class="fg-chart">${rows || `<div class="empty-state">ไม่มีข้อมูล FG Balance</div>`}</div>
  `;
}

function fgUrgencyScore(part) {
  let score = 0;
  if (part.fgPart < 0) score += 1000000 + Math.abs(part.fgPart);
  if (part.safetyGap > 0) score += 500000 + part.safetyGap;
  if (part.coverage < 0.25) score += 200000;
  if (part.coverage < 0.5) score += 100000;
  return score;
}

function fgMonitorStatus(part) {
  if (part.fgPart < 0) return { label: "ติดลบ", className: "fg-negative" };
  if (part.safetyGap > 0 && part.coverage < 0.5) return { label: "เร่งรีบ", className: "fg-critical" };
  if (part.safetyGap > 0) return { label: "ขาด Safety", className: "fg-risk" };
  if (part.coverage < 0.75) return { label: "FG ต่ำ", className: "fg-low" };
  return { label: "เพียงพอ", className: "fg-ok" };
}

function renderDayGrid(parts) {
  const dayTotals = Array.from({ length: 31 }, () => 0);
  parts.forEach((part) => {
    part.dailyPlan.forEach((day) => {
      dayTotals[day.day - 1] += Math.max(0, day.qty);
    });
    const schedule = getSchedulePlan(part.partNumber);
    Object.entries(schedule.days).forEach(([day, qty]) => {
      const dayIndex = Number(day) - 1;
      if (dayIndex >= 0 && dayIndex < 31) {
        dayTotals[dayIndex] += Math.max(0, Number(qty) || 0);
      }
    });
  });

  const hasSheetPlan = dayTotals.some((qty) => qty > 0);
  els.deliveryMode.textContent = hasSheetPlan ? "รวมจากแผนในชีตและช่องกำหนดส่งรายวัน" : "คำนวณจากยอดต้องผลิตและ Safety 30%";

  const suggestionDaily = Math.ceil(sum(parts, "recommendedNeed") / Math.max(1, state.remainingDays));
  const todayLimit = state.remainingDays;

  els.dayGrid.innerHTML = dayTotals
    .map((qty, index) => {
      const day = index + 1;
      const suggestedQty = day <= todayLimit ? suggestionDaily : 0;
      const displayQty = hasSheetPlan ? qty : suggestedQty;
      return `
        <div class="day-cell ${displayQty ? "has-plan" : ""}">
          <strong>${day}</strong>
          <span>${displayQty ? formatCompact(displayQty) : "-"}</span>
        </div>
      `;
    })
    .join("");
}

function renderPlanTable(parts) {
  const rows = [...parts]
    .sort((a, b) => b.recommendedNeed - a.recommendedNeed)
    .slice(0, 14)
    .map((part) => {
      const topProcess = part.topProcess ? `${escapeHtml(part.topProcess.name)} (${formatNumber(part.topProcess.qty)})` : "-";
      return `
        <tr>
          <td><strong>${escapeHtml(part.partNumber)}</strong></td>
          <td>${formatNumber(part.safetyGap)}</td>
          <td>${formatNumber(part.needProduce)}</td>
          <td><strong>${formatNumber(part.dailyTarget)}</strong></td>
          <td>${topProcess}</td>
          <td>${formatNumber(part.fgPart)}</td>
        </tr>
      `;
    });
  els.planTable.innerHTML = rows.join("") || `<tr><td colspan="6">ไม่มีรายการในมุมมองนี้</td></tr>`;
}

function renderScheduleGrid(parts) {
  if (!els.scheduleGrid) return;

  const dayHeaders = Array.from({ length: 31 }, (_, index) => `<th class="schedule-day-head">${index + 1}</th>`).join("");
  const scheduleSearchValue = escapeHtml(state.search);
  const rows = parts
    .map((part) => {
      const plan = getSchedulePlan(part.partNumber);
      const encodedPart = encodeURIComponent(part.partNumber);
      const dayCells = Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        const value = plan.days[day] || "";
        return `
          <td class="schedule-day-cell">
            <input class="schedule-input schedule-day-input" type="number" min="0" step="1" inputmode="numeric"
              data-part-key="${encodedPart}" data-field="day" data-day="${day}" value="${value}" aria-label="${escapeHtml(part.partNumber)} day ${day}" />
          </td>
        `;
      }).join("");
      return `
        <tr data-part-key="${encodedPart}">
          <th class="schedule-part" scope="row">${escapeHtml(part.partNumber)}</th>
          <td class="schedule-delivered-cell">
            <input class="schedule-input" type="number" min="0" step="1" inputmode="numeric"
              data-part-key="${encodedPart}" data-field="delivered" value="${plan.delivered || ""}" aria-label="${escapeHtml(part.partNumber)} delivered" />
          </td>
          <td class="schedule-pending-cell">
            <input class="schedule-input" type="number" min="0" step="1" inputmode="numeric"
              data-part-key="${encodedPart}" data-field="pendingPacking" value="${plan.pendingPacking || ""}" aria-label="${escapeHtml(part.partNumber)} pending packing" />
          </td>
          <td class="schedule-row-total" data-total-for="${encodedPart}">${formatNumber(schedulePlanTotal(plan))}</td>
          <td class="schedule-fg-cell ${part.fgPart < 0 ? "is-negative" : ""}" data-fg-for="${encodedPart}">${formatNumber(part.fgPart)}</td>
          ${dayCells}
        </tr>
      `;
    })
    .join("");

  els.scheduleGrid.innerHTML = `
    <div class="schedule-table-wrap">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="schedule-part schedule-corner" rowspan="2">
              <span>Part Number</span>
              <input class="schedule-part-search" type="search" value="${scheduleSearchValue}" placeholder="ค้นหางาน"
                autocomplete="off" aria-label="ค้นหางานตาม Part Number" />
            </th>
            <th class="schedule-delivered-head" rowspan="2">Delivered</th>
            <th class="schedule-pending-head" rowspan="2">Pending Packing</th>
            <th class="schedule-total-head" rowspan="2">Plan Total</th>
            <th class="schedule-fg-head" rowspan="2">FG Balance</th>
            <th class="schedule-month-head" colspan="31">Daily delivery plan</th>
          </tr>
          <tr>${dayHeaders}</tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="36">ไม่มีรายการในมุมมองนี้</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function handleSchedulePartSearchInput(event) {
  const input = event.target;
  if (!input.matches(".schedule-part-search")) return;

  const cursor = input.selectionStart ?? input.value.length;
  state.search = input.value;
  if (els.searchInput && els.searchInput.value !== input.value) {
    els.searchInput.value = input.value;
  }

  render();
  window.requestAnimationFrame(() => {
    const nextInput = els.scheduleGrid.querySelector(".schedule-part-search");
    if (!nextInput) return;
    nextInput.focus();
    const nextCursor = Math.min(cursor, nextInput.value.length);
    nextInput.setSelectionRange?.(nextCursor, nextCursor);
  });
}

function handleScheduleInput(event) {
  const input = event.target;
  if (!input.matches(".schedule-input")) return;

  const partNumber = decodeURIComponent(input.dataset.partKey);
  const field = input.dataset.field;
  const plan = getSchedulePlan(partNumber);
  const value = Math.max(0, Math.round(toNumber(input.value)));

  if (field === "day") {
    const day = input.dataset.day;
    if (value > 0) {
      plan.days[day] = value;
    } else {
      delete plan.days[day];
    }
  } else {
    plan[field] = value;
  }

  state.schedule[partNumber] = pruneSchedulePlan(plan);
  saveSchedule();
  updateScheduleRowTotal(partNumber);
  updateScheduleFgBalance(partNumber);
  refreshComputedViews();
}

function updateScheduleRowTotal(partNumber) {
  const totalCell = els.scheduleGrid.querySelector(`[data-total-for="${cssEscape(encodeURIComponent(partNumber))}"]`);
  if (totalCell) {
    totalCell.textContent = formatNumber(schedulePlanTotal(getSchedulePlan(partNumber)));
  }
}

function updateScheduleFgBalance(partNumber) {
  const fgCell = els.scheduleGrid.querySelector(`[data-fg-for="${cssEscape(encodeURIComponent(partNumber))}"]`);
  if (!fgCell) return;
  const sourcePart = state.allParts.find((part) => part.partNumber === partNumber);
  const fgBalance = sourcePart ? derivePart(sourcePart).fgPart : 0;
  fgCell.textContent = formatNumber(fgBalance);
  fgCell.classList.toggle("is-negative", fgBalance < 0);
}

function getSchedulePlan(partNumber) {
  const saved = state.schedule[partNumber] || {};
  return {
    delivered: Number(saved.delivered) || 0,
    pendingPacking: Number(saved.pendingPacking) || 0,
    days: { ...(saved.days || {}) },
  };
}

function pruneSchedulePlan(plan) {
  const days = {};
  Object.entries(plan.days || {}).forEach(([day, qty]) => {
    const value = Number(qty) || 0;
    if (value > 0) days[day] = value;
  });
  return {
    delivered: Number(plan.delivered) || 0,
    pendingPacking: Number(plan.pendingPacking) || 0,
    days,
  };
}

function schedulePlanTotal(plan) {
  return Object.values(plan.days || {}).reduce((total, qty) => total + (Number(qty) || 0), 0);
}

function scheduleDeliveryDeduction(plan) {
  return (Number(plan.delivered) || 0) + schedulePlanTotal(plan);
}

function renderParts(parts) {
  els.emptyState.hidden = parts.length > 0;
  els.partsGrid.innerHTML = parts.map(renderPartCard).join("");
}

function renderPartCard(part) {
  const status = statusMeta(part.status);
  const maxProcessQty = Math.max(1, ...part.processes.map((process) => Math.abs(process.qty)));
  const coveragePercent = clamp(Math.round(part.coverage * 100), 0, 100);
  const processRows = part.processes
    .slice(0, 7)
    .map((process) => {
      const width = clamp(Math.round((Math.abs(process.qty) / maxProcessQty) * 100), 3, 100);
      return `
        <div class="stage">
          <span class="stage-name" title="${escapeHtml(process.name)}">${escapeHtml(process.name)}</span>
          <span class="stage-qty">${formatNumber(process.qty)}</span>
          <span class="stage-track"><span class="stage-bar" style="width:${width}%"></span></span>
        </div>
      `;
    })
    .join("");

  return `
    <article class="part-card">
      <div class="part-head">
        <div>
          <h3>${escapeHtml(part.partNumber)}</h3>
          <span class="badge ${status.className}">${status.label}</span>
        </div>
        <select class="tracking-select" data-part="${escapeHtml(part.partNumber)}" aria-label="สถานะติดตาม ${escapeHtml(part.partNumber)}">
          ${trackingOptions(part.trackingStatus)}
        </select>
      </div>

      <div class="metric-strip">
        ${metric("ต้องผลิต", part.needProduce)}
        ${metric("Safety 30%", part.safetyStock)}
        ${metric("FG Balance", part.fgPart)}
        ${metric("Safety Gap", part.safetyGap)}
      </div>

      <div class="coverage">
        <div class="coverage-top">
          <span>FG เทียบ Safety</span>
          <strong>${formatNumber(Math.round(part.coverage * 100))}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-bar ${part.safetyGap > 0 ? "risk" : ""}" style="width:${coveragePercent}%"></div>
        </div>
      </div>

      <div class="pipeline">
        ${processRows || `<span class="muted">ไม่มี WIP process ในชีต</span>`}
      </div>

      <div class="forecast-row">
        <span class="chip">Jul ${formatNumber(part.forecasts.jul)}</span>
        <span class="chip">Aug ${formatNumber(part.forecasts.aug)}</span>
        <span class="chip">Sep ${formatNumber(part.forecasts.sep)}</span>
        <span class="chip">Oct ${formatNumber(part.forecasts.oct)}</span>
      </div>

      <div class="delivery-row">
        ${part.manualDeliveryQty > 0 ? `<span class="chip">หัก FG ${formatNumber(part.manualDeliveryQty)}</span>` : ""}
        ${part.manualDeliveryQty > 0 ? `<span class="chip">FG ไฟล์ ${formatNumber(part.sourceFgPart)}</span>` : ""}
        <span class="chip">ส่งแล้ว ${formatNumber(part.totalDelivery)}</span>
        <span class="chip">Order ${formatNumber(part.totalOrder)}</span>
        <span class="chip">Wait pack ${formatNumber(part.waitPacking)}</span>
        <span class="chip">เป้าต่อวัน ${formatNumber(part.dailyTarget)}</span>
      </div>
    </article>
  `;
}

function metric(label, value) {
  const isNegative = Number(value) < 0;
  return `
    <div>
      <span class="metric-label">${label}</span>
      <span class="metric-value ${isNegative ? "is-negative" : ""}">${formatNumber(value)}</span>
    </div>
  `;
}

function trackingOptions(value) {
  const options = [
    ["auto", "Auto"],
    ["risk", "ขาด Safety"],
    ["produce", "กำลังผลิต"],
    ["process", "ติดกระบวนการ"],
    ["ready", "พร้อมส่ง"],
    ["critical", "เร่งด่วน"],
  ];
  return options.map(([key, label]) => `<option value="${key}" ${value === key ? "selected" : ""}>${label}</option>`).join("");
}

function statusMeta(status) {
  const map = {
    critical: { label: "เร่งด่วน", className: "badge-critical" },
    risk: { label: "ขาด Safety", className: "badge-risk" },
    produce: { label: "ต้องผลิต", className: "badge-produce" },
    process: { label: "ติดกระบวนการ", className: "badge-process" },
    ready: { label: "พร้อมส่ง", className: "badge-ready" },
    auto: { label: "Auto", className: "badge-process" },
  };
  return map[status] || map.process;
}

function exportDailyPlan() {
  const dayHeaders = Array.from({ length: 31 }, (_, index) => `Day ${index + 1}`);
  const header = ["Part Number", "Safety Gap", "Want To Produce", "Daily Target", "Main WIP Status", "FG Balance", "Source FG", "Manual Delivery Deducted", "Safety Target", "Delivered", "Pending Packing", "Plan Total", ...dayHeaders];
  const rows = state.viewParts.map((part) => {
    const plan = getSchedulePlan(part.partNumber);
    const dayValues = Array.from({ length: 31 }, (_, index) => plan.days[index + 1] || "");
    return [
      part.partNumber,
      part.safetyGap,
      part.needProduce,
      part.dailyTarget,
      part.topProcess ? `${part.topProcess.name} ${part.topProcess.qty}` : "",
      part.fgPart,
      part.sourceFgPart,
      part.manualDeliveryQty,
      part.safetyStock,
      plan.delivered || "",
      plan.pendingPacking || "",
      schedulePlanTotal(plan) || "",
      ...dayValues,
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wip-daily-plan-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function setConnection(type, text) {
  els.connectionStatus.className = `status-pill status-${type}`;
  els.connectionStatus.textContent = text;
}

function clean(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function toNumber(value) {
  const original = clean(value);
  if (!original || original === "-" || /^#/.test(original)) return 0;
  const isParenthesesNegative = /^\(.+\)$/.test(original);
  const stripped = original.replace(/,/g, "").replace(/[()]/g, "").replace(/[^0-9.\-]/g, "");
  if (!stripped || stripped === "-" || stripped === ".") return 0;
  const number = Number(stripped);
  if (!Number.isFinite(number)) return 0;
  return isParenthesesNegative ? -Math.abs(number) : number;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(number);
}

function formatCompact(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sum(parts, key) {
  return parts.reduce((total, part) => total + (Number(part[key]) || 0), 0);
}

function loadTracking() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveTracking() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tracking));
}

function loadSchedule() {
  try {
    return normalizeRemoteSchedule(JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "{}"));
  } catch {
    return {};
  }
}

function saveScheduleLocal() {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(state.schedule));
}

function saveSchedule() {
  state.schedule = normalizeRemoteSchedule(state.schedule);
  state.scheduleSignature = buildScheduleSignature(state.schedule);
  saveScheduleLocal();
  queueRemoteScheduleSave();
}

function loadActiveView() {
  try {
    return localStorage.getItem(ACTIVE_VIEW_KEY) === "schedule" ? "schedule" : "dashboard";
  } catch {
    return "dashboard";
  }
}
