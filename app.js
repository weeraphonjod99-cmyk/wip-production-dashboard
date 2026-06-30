const SHEET_ID = "1xhv4E6AGuHLXPpkzQjTT5FFIZjmP3wmcUAfuJ1eXKuk";
const SHEET_GID = "1215588368";
const SHEET_NAME = "automotive part";
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const STORAGE_KEY = "wip-production-tracking-status";

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

const state = {
  allParts: [],
  viewParts: [],
  filter: "all",
  search: "",
  sort: "shortage",
  safetyRate: 30,
  remainingDays: 4,
  source: "loading",
  sheetUpdated: "-",
  tracking: loadTracking(),
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  loadSheet();
});

function bindElements() {
  els.connectionStatus = document.getElementById("connectionStatus");
  els.refreshBtn = document.getElementById("refreshBtn");
  els.searchInput = document.getElementById("searchInput");
  els.sortSelect = document.getElementById("sortSelect");
  els.safetyRate = document.getElementById("safetyRate");
  els.remainingDays = document.getElementById("remainingDays");
  els.remainingDaysValue = document.getElementById("remainingDaysValue");
  els.sheetUpdated = document.getElementById("sheetUpdated");
  els.kpiGrid = document.getElementById("kpiGrid");
  els.dayGrid = document.getElementById("dayGrid");
  els.planTable = document.getElementById("planTable");
  els.partsGrid = document.getElementById("partsGrid");
  els.emptyState = document.getElementById("emptyState");
  els.visibleCount = document.getElementById("visibleCount");
  els.deliveryMode = document.getElementById("deliveryMode");
  els.exportBtn = document.getElementById("exportBtn");
}

function bindEvents() {
  els.refreshBtn.addEventListener("click", loadSheet);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
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
  els.exportBtn.addEventListener("click", exportDailyPlan);
}

async function loadSheet() {
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
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${SHEET_GID}&headers=0&tqx=${tqx}&tq=${query}`;
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
  const fgAfterDelivery = part.totalFgAfterDelivery || part.fgPart || 0;
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
  const derived = state.allParts.map(derivePart);
  state.viewParts = applyView(derived);
  els.sheetUpdated.textContent = state.sheetUpdated;
  els.visibleCount.textContent = `${formatNumber(state.viewParts.length)} รายการ`;
  renderKpis(derived);
  renderDayGrid(derived);
  renderPlanTable(state.viewParts);
  renderParts(state.viewParts);
}

function applyView(parts) {
  const query = state.search;
  let result = parts.filter((part) => {
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

function renderDayGrid(parts) {
  const dayTotals = Array.from({ length: 31 }, () => 0);
  parts.forEach((part) => {
    part.dailyPlan.forEach((day) => {
      dayTotals[day.day - 1] += Math.max(0, day.qty);
    });
  });

  const hasSheetPlan = dayTotals.some((qty) => qty > 0);
  els.deliveryMode.textContent = hasSheetPlan ? "ใช้ตัวเลขจากคอลัมน์วันที่ 1-31 ในชีต" : "คำนวณจากยอดต้องผลิตและ Safety 30%";

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
        ${metric("FG", part.fgPart)}
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
        <span class="chip">ส่งแล้ว ${formatNumber(part.totalDelivery)}</span>
        <span class="chip">Order ${formatNumber(part.totalOrder)}</span>
        <span class="chip">Wait pack ${formatNumber(part.waitPacking)}</span>
        <span class="chip">เป้าต่อวัน ${formatNumber(part.dailyTarget)}</span>
      </div>
    </article>
  `;
}

function metric(label, value) {
  return `
    <div>
      <span class="metric-label">${label}</span>
      <span class="metric-value">${formatNumber(value)}</span>
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
  const header = ["Part Number", "Safety Gap", "Want To Produce", "Daily Target", "Main WIP Status", "FG", "Safety Target"];
  const rows = state.viewParts.map((part) => [
    part.partNumber,
    part.safetyGap,
    part.needProduce,
    part.dailyTarget,
    part.topProcess ? `${part.topProcess.name} ${part.topProcess.qty}` : "",
    part.fgPart,
    part.safetyStock,
  ]);
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
