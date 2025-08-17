/* =========================
   Dynamic Quote Generator
   Local/Session Storage + JSON Import/Export
   ========================= */

const LS_KEY_QUOTES = "dqg_quotes_v1";
const SS_KEY_LAST_QUOTE = "dqg_last_quote";
const SS_KEY_LAST_CATEGORY = "dqg_last_category";

const DEFAULT_QUOTES = [
  { text: "The best way to predict the future is to invent it.", category: "Inspiration" },
  { text: "Life is 10% what happens to us and 90% how we react to it.", category: "Life" },
  { text: "Do what you can, with what you have, where you are.", category: "Motivation" }
];

let quotes = []; // main in-memory store

// DOM
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const statusEl = document.getElementById("status");

/* -------------------------
   Helpers
------------------------- */
const showStatus = (msg, timeout = 1400) => {
  statusEl.textContent = msg || "";
  if (timeout) {
    setTimeout(() => {
      if (statusEl.textContent === msg) statusEl.textContent = "";
    }, timeout);
  }
};

const normalizeKey = (q) =>
  `${String(q.text || "").trim().toLowerCase()}|${String(q.category || "").trim().toLowerCase()}`;

const dedupeQuotes = (arr) => {
  const seen = new Set();
  const out = [];
  for (const q of arr) {
    if (!q || typeof q !== "object") continue;
    if (typeof q.text !== "string" || typeof q.category !== "string") continue;
    const key = normalizeKey(q);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ text: q.text.trim(), category: q.category.trim() });
    }
  }
  return out;
};

/* -------------------------
   Storage
------------------------- */
function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY_QUOTES);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    return dedupeQuotes(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [...DEFAULT_QUOTES];
  }
}

function saveQuotes() {
  localStorage.setItem(LS_KEY_QUOTES, JSON.stringify(quotes));
}

function saveLastQuote(quote) {
  try {
    sessionStorage.setItem(SS_KEY_LAST_QUOTE, JSON.stringify(quote));
  } catch { /* ignore */ }
}

function getLastQuote() {
  try {
    const raw = sessionStorage.getItem(SS_KEY_LAST_QUOTE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastCategory(cat) {
  try {
    sessionStorage.setItem(SS_KEY_LAST_CATEGORY, cat);
  } catch { /* ignore */ }
}

function getLastCategory() {
  try {
    return sessionStorage.getItem(SS_KEY_LAST_CATEGORY) || "all";
  } catch {
    return "all";
  }
}

/* -------------------------
   UI / DOM
------------------------- */
function populateCategories(preserveSelection = true) {
  const current = preserveSelection ? categorySelect.value : "all";
  const categories = [...new Set(quotes.map(q => q.category))].sort((a, b) => a.localeCompare(b));

  categorySelect.innerHTML = `<option value="all">All Categories</option>`;
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  }

  const desired = current || getLastCategory() || "all";
  if ([...categorySelect.options].some(o => o.value === desired)) {
    categorySelect.value = desired;
  } else {
    categorySelect.value = "all";
  }
}

function updateQuoteDisplay(quote) {
  if (!quote) {
    quoteDisplay.textContent = "No quotes available. Add or import some to get started.";
    return;
  }
  quoteDisplay.textContent = `"${quote.text}" — ${quote.category}`;
  saveLastQuote(quote);
}

function showRandomQuote() {
  const sel = categorySelect.value;
  const filtered = sel === "all" ? quotes : quotes.filter(q => q.category === sel);

  if (filtered.length === 0) {
    updateQuoteDisplay(null);
    return;
  }
  const idx = Math.floor(Math.random() * filtered.length);
  updateQuoteDisplay(filtered[idx]);
  showStatus("New quote shown");
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const text = (textInput.value || "").trim();
  const category = (categoryInput.value || "").trim();

  if (!text || !category) {
    alert("Please enter both quote text and category.");
    return;
  }

  const incoming = { text, category };
  const before = quotes.length;
  quotes = dedupeQuotes([...quotes, incoming]);
  const added = quotes.length > before;

  saveQuotes();
  populateCategories(); // keep selection if possible

  // If the new quote matches current filter, show it; otherwise keep current.
  if (categorySelect.value === "all" || categorySelect.value === incoming.category) {
    updateQuoteDisplay(incoming);
  }

  textInput.value = "";
  categoryInput.value = "";
  showStatus(added ? "Quote added!" : "Duplicate ignored");
}

/* -------------------------
   Import / Export
------------------------- */
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Timestamped filename
  const stamp = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const name = `quotes-${stamp.getFullYear()}${pad(stamp.getMonth()+1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showStatus("Exported JSON");
}

function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(String(e.target.result || "[]"));
      if (!Array.isArray(parsed)) throw new Error("Invalid format: expected an array.");
      const cleaned = parsed.map(q => ({ text: String(q.text || ""), category: String(q.category || "") }));
      const before = quotes.length;
      quotes = dedupeQuotes([...quotes, ...cleaned]);
      saveQuotes();
      populateCategories(false); // reset to "all" by default after import
      categorySelect.value = "all";
      updateQuoteDisplay(getLastQuote() || quotes[0] || null);
      showStatus(`Imported ${quotes.length - before} new ${quotes.length - before === 1 ? "quote" : "quotes"}`);
      alert("Quotes imported successfully!");
    } catch (err) {
      console.error(err);
      alert("Import failed: " + err.message);
    } finally {
      // Clear the file input so the same file can be re-imported if needed
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

/* -------------------------
   Utilities for testing
------------------------- */
function clearAllStorage() {
  localStorage.removeItem(LS_KEY_QUOTES);
  sessionStorage.removeItem(SS_KEY_LAST_QUOTE);
  sessionStorage.removeItem(SS_KEY_LAST_CATEGORY);
  showStatus("Storage cleared");
}

function resetToDefaults() {
  quotes = [...DEFAULT_QUOTES];
  saveQuotes();
  populateCategories(false);
  categorySelect.value = "all";
  updateQuoteDisplay(quotes[0]);
  showStatus("Reset to defaults");
}


function init() {
  quotes = loadQuotes();
  populateCategories(false);

  
  const lastCat = getLastCategory();
  if ([...categorySelect.options].some(o => o.value === lastCat)) {
    categorySelect.value = lastCat;
  }

  
  const lastQuote = getLastQuote();
  if (lastQuote && quotes.some(q => normalizeKey(q) === normalizeKey(lastQuote))) {
    updateQuoteDisplay(lastQuote);
  } else if (quotes.length) {
    updateQuoteDisplay(quotes[0]);
  } else {
    updateQuoteDisplay(null);
  }

  // Events
  newQuoteBtn.addEventListener("click", showRandomQuote);
  categorySelect.addEventListener("change", () => {
    saveLastCategory(categorySelect.value);
    showRandomQuote();
  });

  
  document.getElementById("newQuoteText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addQuote();
  });
  document.getElementById("newQuoteCategory").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addQuote();
  });
}

init();


window.addQuote = addQuote;
window.exportToJsonFile = exportToJsonFile;
window.importFromJsonFile = importFromJsonFile;
window.resetToDefaults = resetToDefaults;
window.clearAllStorage = clearAllStorage;
