const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const swapBtn = document.getElementById("swap");
const resultMain = document.getElementById("result-main");
const resultRate = document.getElementById("result-rate");
const statusEl = document.getElementById("status");

// Free API, no key needed. Rates are relative to the base currency requested.
const API_URL = "https://open.er-api.com/v6/latest/";

// Offline fallback (approximate rates against USD) used if the API can't be reached.
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, INR: 83, AUD: 1.53, CAD: 1.36,
  CHF: 0.88, CNY: 7.2, AED: 3.67, SGD: 1.34, NZD: 1.66, ZAR: 18.5, BRL: 5.0,
  MXN: 17.0, KRW: 1330, SEK: 10.5, NOK: 10.7, TRY: 32
};

let rates = {};          // rates relative to the currently loaded base
let base = "USD";
let usingFallback = false;

// ---- Fetch rates ----
async function loadRates(baseCurrency) {
  statusEl.textContent = "Updating rates…";
  try {
    const res = await fetch(API_URL + baseCurrency);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (data.result !== "success") throw new Error("API error");
    rates = data.rates;
    base = baseCurrency;
    usingFallback = false;
    const updated = new Date(data.time_last_update_unix * 1000);
    statusEl.textContent = "Rates updated " + updated.toLocaleDateString();
  } catch (err) {
    // Convert fallback table so it is relative to the requested base
    const baseInUsd = FALLBACK_RATES[baseCurrency] || 1;
    rates = {};
    for (const code in FALLBACK_RATES) {
      rates[code] = FALLBACK_RATES[code] / baseInUsd;
    }
    base = baseCurrency;
    usingFallback = true;
    statusEl.textContent = "Couldn't load live rates. Showing approximate offline rates.";
  }
}

// ---- Populate dropdowns ----
function fillSelects(codes) {
  const names = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

  [fromEl, toEl].forEach(select => {
    select.innerHTML = "";
    codes.forEach(code => {
      const opt = document.createElement("option");
      let label = code;
      try { if (names && names.of(code)) label = code + " – " + names.of(code); } catch (e) { }
      opt.value = code;
      opt.textContent = label;
      select.appendChild(opt);
    });
  });
}

// ---- Convert and display ----
function convert() {
  const amount = parseFloat(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;

  if (isNaN(amount) || amount < 0) {
    resultMain.textContent = "Enter an amount";
    resultRate.textContent = "";
    return;
  }
  if (!rates[from] || !rates[to]) {
    resultMain.textContent = "Rate unavailable";
    resultRate.textContent = "";
    return;
  }

  // rates are relative to `base`, so go via the base currency
  const rate = rates[to] / rates[from];
  const converted = amount * rate;

  resultMain.textContent = format(amount, from) + " = " + format(converted, to);
  resultRate.textContent = "1 " + from + " = " + rate.toFixed(4) + " " + to;
}

function format(value, code) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(value);
  } catch (e) {
    return value.toFixed(2) + " " + code;
  }
}

// ---- Events ----
amountEl.addEventListener("input", convert);
fromEl.addEventListener("change", convert);
toEl.addEventListener("change", convert);

swapBtn.addEventListener("click", () => {
  const tmp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = tmp;
  convert();
});

// ---- Init ----
(async function init() {
  await loadRates("USD");
  const codes = Object.keys(rates).sort();
  fillSelects(codes);
  fromEl.value = "USD";
  toEl.value = codes.includes("EUR") ? "EUR" : codes[1];
  convert();
})();