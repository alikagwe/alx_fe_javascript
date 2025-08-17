// -------------------- STORAGE HELPERS --------------------
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  let storedQuotes = localStorage.getItem("quotes");
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  }
}

function saveFilterPreference(category) {
  localStorage.setItem("lastFilter", category);
}

function loadFilterPreference() {
  return localStorage.getItem("lastFilter") || "all";
}

// -------------------- QUOTES --------------------
let quotes = [
  { text: "The best way to predict the future is to invent it.", category: "Inspiration" },
  { text: "Life is 10% what happens to us and 90% how we react to it.", category: "Life" },
  { text: "Do what you can, with what you have, where you are.", category: "Motivation" }
];

// Load saved quotes if any
loadQuotes();

// -------------------- DOM ELEMENTS --------------------
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");

// -------------------- CATEGORY FUNCTIONS --------------------
function populateCategories() {
  let categories = [...new Set(quotes.map(q => q.category))];

  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    let option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore last filter
  categoryFilter.value = loadFilterPreference();
}

// -------------------- QUOTE DISPLAY --------------------
function showRandomQuote() {
  let selectedCategory = categoryFilter.value;
  let filteredQuotes = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }

  let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  let q = filteredQuotes[randomIndex];
  quoteDisplay.textContent = `"${q.text}" — ${q.category}`;

  // Save last viewed quote (session storage example)
  sessionStorage.setItem("lastViewedQuote", JSON.stringify(q));
}

// -------------------- FILTER --------------------
function filterQuotes() {
  saveFilterPreference(categoryFilter.value);
  showRandomQuote();
}

// -------------------- ADD QUOTE --------------------
function addQuote() {
  let textInput = document.getElementById("newQuoteText");
  let categoryInput = document.getElementById("newQuoteCategory");

  let newText = textInput.value.trim();
  let newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    quotes.push({ text: newText, category: newCategory });

    saveQuotes();
    populateCategories();

    textInput.value = "";
    categoryInput.value = "";

    alert("Quote added successfully!");
  } else {
    alert("Please enter both quote text and category.");
  }
}

// -------------------- EXPORT / IMPORT --------------------
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes.push(...importedQuotes);
        saveQuotes();
        populateCategories();
        alert("Quotes imported successfully!");
      } else {
        alert("Invalid JSON format.");
      }
    } catch (error) {
      alert("Error parsing JSON file.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// -------------------- INITIALIZATION --------------------
newQuoteBtn.addEventListener("click", showRandomQuote);

// Populate categories and restore filter preference
populateCategories();
filterQuotes();

// Restore last viewed quote if available (session storage)
let lastQuote = sessionStorage.getItem("lastViewedQuote");
if (lastQuote) {
  let q = JSON.parse(lastQuote);
  quoteDisplay.textContent = `"${q.text}" — ${q.category}`;
}
