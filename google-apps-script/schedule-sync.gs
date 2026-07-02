const SPREADSHEET_ID = "1xhv4E6AGuHLXPpkzQjTT5FFIZjmP3wmcUAfuJ1eXKuk";
const SYNC_SHEET_NAME = "web_schedule_sync";

function doGet(e) {
  const action = String(e.parameter.action || "get");
  const callback = String(e.parameter.callback || "");
  const payload = action === "get"
    ? getSchedule_()
    : { ok: false, error: "Unsupported action" };

  const json = JSON.stringify(payload);
  const output = callback ? `${callback}(${json});` : json;
  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (body.action === "set") {
      setSchedule_(body.schedule || {});
      return json_({ ok: true, updatedAt: new Date().toISOString() });
    }

    if (body.action === "patch") {
      patchSchedule_(body.schedule || {});
      return json_({ ok: true, updatedAt: new Date().toISOString() });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function getSchedule_() {
  const sheet = getSyncSheet_();
  const values = sheet.getDataRange().getValues();
  const schedule = {};

  values.slice(1).forEach((row) => {
    const partNumber = String(row[0] || "").trim();
    if (!partNumber) return;

    let days = {};
    try {
      days = JSON.parse(row[3] || "{}");
    } catch (error) {
      days = {};
    }

    schedule[partNumber] = normalizePlan_({
      delivered: row[1],
      pendingPacking: row[2],
      days,
    });
  });

  return {
    ok: true,
    updatedAt: String(sheet.getRange("G1").getValue() || ""),
    schedule,
  };
}

function setSchedule_(schedule) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    writeSchedule_(schedule);
  } finally {
    lock.releaseLock();
  }
}

function patchSchedule_(schedulePatch) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const current = getSchedule_().schedule || {};
    Object.keys(schedulePatch).forEach((partNumber) => {
      const plan = normalizePlan_(schedulePatch[partNumber] || {});
      if (isEmptyPlan_(plan)) {
        delete current[partNumber];
      } else {
        current[partNumber] = plan;
      }
    });
    writeSchedule_(current);
  } finally {
    lock.releaseLock();
  }
}

function writeSchedule_(schedule) {
  const sheet = getSyncSheet_();
  const now = new Date().toISOString();
  const rows = Object.keys(schedule)
    .sort()
    .map((partNumber) => {
      const plan = normalizePlan_(schedule[partNumber] || {});
      return [
        partNumber,
        plan.delivered,
        plan.pendingPacking,
        JSON.stringify(plan.days || {}),
        now,
      ];
    });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, 7).setValues([[
    "Part Number",
    "Delivered",
    "Pending Packing",
    "Days JSON",
    "Updated At",
    "",
    now,
  ]]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  sheet.showSheet();
}

function getSyncSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SYNC_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SYNC_SHEET_NAME);
    sheet.getRange(1, 1, 1, 7).setValues([[
      "Part Number",
      "Delivered",
      "Pending Packing",
      "Days JSON",
      "Updated At",
      "",
      "",
    ]]);
  }
  sheet.showSheet();
  return sheet;
}

function normalizePlan_(plan) {
  const days = {};
  Object.keys(plan.days || {}).forEach((day) => {
    const dayNumber = Number(day);
    const qty = Math.max(0, Math.round(Number(plan.days[day]) || 0));
    if (dayNumber >= 1 && dayNumber <= 31 && qty > 0) {
      days[String(dayNumber)] = qty;
    }
  });

  return {
    delivered: Math.max(0, Math.round(Number(plan.delivered) || 0)),
    pendingPacking: Math.max(0, Math.round(Number(plan.pendingPacking) || 0)),
    days,
  };
}

function isEmptyPlan_(plan) {
  return !plan.delivered && !plan.pendingPacking && !Object.keys(plan.days || {}).length;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
