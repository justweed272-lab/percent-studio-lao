const state = {
  mode: "of",
  changeType: "increase",
  lastResultText: "",
  deferredInstallPrompt: null,
};

const modeNames = {
  of: "ຂອງຈຳນວນ",
  ratio: "ເປັນຈັກ %",
  change: "ເພີ່ມ/ຫຼຸດ",
  price: "ລາຄາ",
};

const defaults = {
  ofPercent: 0,
  ofNumber: 0,
  ratioPart: 0,
  ratioWhole: 0,
  changeBase: 0,
  changePercent: 0,
  priceBase: 0,
  discountPercent: 0,
  taxPercent: 0,
};

const resultValue = document.querySelector("#resultValue");
const resultLine = document.querySelector("#resultLine");
const formulaText = document.querySelector("#formulaText");
const miniStats = document.querySelector("#miniStats");
const modeBadge = document.querySelector("#modeBadge");
const copyButton = document.querySelector("#copyButton");
const saveButton = document.querySelector("#saveButton");
const historyList = document.querySelector("#historyList");
const appStatus = document.querySelector("#appStatus");
const installButton = document.querySelector("#installButton");

function valueOf(id) {
  const value = Number(document.querySelector(`#${id}`).value);
  return Number.isFinite(value) ? value : 0;
}

function formatNumber(value, suffix = "") {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.abs(value) >= 1000000 ? 2 : 4;
  return new Intl.NumberFormat("lo-LA", {
    maximumFractionDigits: rounded,
  }).format(value) + suffix;
}

function setStats(items) {
  miniStats.innerHTML = items
    .map(
      (item) => `
        <div>
          <dt>${item.label}</dt>
          <dd>${item.value}</dd>
        </div>
      `
    )
    .join("");
}

function updateResult({ value, line, formula, stats }) {
  resultValue.value = value;
  resultLine.textContent = line;
  formulaText.textContent = formula;
  state.lastResultText = `${line} | ${formula}`;
  setStats(stats);
}

function calculateOf() {
  const percent = valueOf("ofPercent");
  const number = valueOf("ofNumber");
  const result = (percent / 100) * number;

  updateResult({
    value: formatNumber(result),
    line: `${formatNumber(percent, "%")} ຂອງ ${formatNumber(number)} = ${formatNumber(result)}`,
    formula: `(${formatNumber(percent)} / 100) x ${formatNumber(number)}`,
    stats: [
      { label: "ເປີເຊັນ", value: formatNumber(percent, "%") },
      { label: "ຈຳນວນ", value: formatNumber(number) },
    ],
  });
}

function calculateRatio() {
  const part = valueOf("ratioPart");
  const whole = valueOf("ratioWhole");
  const result = whole === 0 ? Number.NaN : (part / whole) * 100;

  updateResult({
    value: Number.isFinite(result) ? formatNumber(result, "%") : "-",
    line: whole === 0
      ? "ຈຳນວນເຕັມຕ້ອງບໍ່ເປັນ 0"
      : `${formatNumber(part)} ຈາກ ${formatNumber(whole)} = ${formatNumber(result, "%")}`,
    formula: `(${formatNumber(part)} / ${formatNumber(whole)}) x 100`,
    stats: [
      { label: "ຈຳນວນຍ່ອຍ", value: formatNumber(part) },
      { label: "ຈຳນວນເຕັມ", value: formatNumber(whole) },
    ],
  });
}

function calculateChange() {
  const base = valueOf("changeBase");
  const percent = valueOf("changePercent");
  const difference = (percent / 100) * base;
  const result = state.changeType === "increase" ? base + difference : base - difference;
  const action = state.changeType === "increase" ? "ເພີ່ມ" : "ຫຼຸດ";
  const operator = state.changeType === "increase" ? "+" : "-";

  updateResult({
    value: formatNumber(result),
    line: `${formatNumber(base)} ${action} ${formatNumber(percent, "%")} = ${formatNumber(result)}`,
    formula: `${formatNumber(base)} ${operator} (${formatNumber(percent)} / 100 x ${formatNumber(base)})`,
    stats: [
      { label: "ປ່ຽນແປງ", value: formatNumber(difference) },
      { label: "ແບບ", value: action },
    ],
  });
}

function calculatePrice() {
  const price = valueOf("priceBase");
  const discountPercent = valueOf("discountPercent");
  const taxPercent = valueOf("taxPercent");
  const discount = (discountPercent / 100) * price;
  const afterDiscount = price - discount;
  const tax = (taxPercent / 100) * afterDiscount;
  const result = afterDiscount + tax;

  updateResult({
    value: formatNumber(result),
    line: `${formatNumber(price)} ຫຼຸດ ${formatNumber(discountPercent, "%")} + ພາສີ ${formatNumber(taxPercent, "%")} = ${formatNumber(result)}`,
    formula: `(${formatNumber(price)} - ${formatNumber(discount)}) + ${formatNumber(tax)}`,
    stats: [
      { label: "ສ່ວນຫຼຸດ", value: formatNumber(discount) },
      { label: "ພາສີ", value: formatNumber(tax) },
    ],
  });
}

function calculate() {
  modeBadge.textContent = modeNames[state.mode];

  if (state.mode === "of") calculateOf();
  if (state.mode === "ratio") calculateRatio();
  if (state.mode === "change") calculateChange();
  if (state.mode === "price") calculatePrice();
}

function switchMode(mode) {
  state.mode = mode;

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === mode);
  });

  calculate();
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem("percentStudioHistory") || "[]");
  } catch {
    return [];
  }
}

function writeHistory(items) {
  localStorage.setItem("percentStudioHistory", JSON.stringify(items.slice(0, 8)));
}

function renderHistory() {
  const items = readHistory();

  if (items.length === 0) {
    historyList.innerHTML = `<li class="empty-history">ຍັງບໍ່ມີປະຫວັດ</li>`;
    return;
  }

  historyList.innerHTML = items
    .map(
      (item) => `
        <li>
          <span>${item.mode}</span>
          <strong>${item.result}</strong>
          <small>${item.time}</small>
        </li>
      `
    )
    .join("");
}

async function copyResult() {
  const text = state.lastResultText;

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "ຄັດລອກແລ້ວ";
  } catch {
    copyButton.textContent = "ຄັດລອກບໍ່ໄດ້";
  }

  setTimeout(() => {
    copyButton.textContent = "ຄັດລອກຜົນ";
  }, 1400);
}

function saveResult() {
  const items = readHistory();
  const time = new Intl.DateTimeFormat("lo-LA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  writeHistory([
    {
      mode: modeNames[state.mode],
      result: resultLine.textContent,
      time,
    },
    ...items,
  ]);

  renderHistory();
  saveButton.textContent = "ບັນທຶກແລ້ວ";
  setTimeout(() => {
    saveButton.textContent = "ບັນທຶກ";
  }, 1400);
}

function updateOnlineStatus() {
  appStatus.textContent = navigator.onLine ? "ພ້ອມໃຊ້ງານ" : "ອອບໄລນ໌";
}

function setupPwa() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      appStatus.textContent = "ໃຊ້ງານຜ່ານເວັບ";
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    installButton.hidden = true;
  });
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.changeType = button.dataset.changeType;
    document.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.toggle("is-active", segment === button);
    });
    calculate();
  });
});

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", calculate);
});

document.querySelector("#resetButton").addEventListener("click", () => {
  Object.entries(defaults).forEach(([id, value]) => {
    document.querySelector(`#${id}`).value = value;
  });
  state.changeType = "increase";
  document.querySelectorAll(".segment").forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.changeType === "increase");
  });
  calculate();
});

copyButton.addEventListener("click", copyResult);
saveButton.addEventListener("click", saveResult);

document.querySelector("#clearHistoryButton").addEventListener("click", () => {
  writeHistory([]);
  renderHistory();
});

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

calculate();
renderHistory();
updateOnlineStatus();
setupPwa();
