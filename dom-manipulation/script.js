
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


let quotes = [
  { id: 1, text: "The best way to predict the future is to invent it.", category: "Inspiration" },
  { id: 2, text: "Life is 10% what happens to us and 90% how we react to it.", category: "Life" },
  { id: 3, text: "Do what you can, with what you have, where you are.", category: "Motivation" }
];

// Load saved quotes if any
loadQuotes();

// -------------------- DOM ELEMENTS --------------------
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");
const syncStatus = document.getElementById("syncStatus");

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
    let newQuote = { id: Date.now(), text: newText, category: newCategory };
    quotes.push(newQuote);
    saveQuotes();
    populateCategories();
    syncToServer(newQuote); // push to server
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

// -------------------- SERVER SYNC --------------------
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

async function fetchFromServer() {
  try {
    let res = await fetch(SERVER_URL);
    let serverData = await res.json();

    // Convert mock data to our structure
    let serverQuotes = serverData.slice(0, 5).map(p => ({
      id: p.id,
      text: p.title,
      category: "Server"
    }));

    let conflicts = [];

    serverQuotes.forEach(sq => {
      let local = quotes.find(lq => lq.id === sq.id);
      if (!local) {
        quotes.push(sq); // add missing
      } else if (local.text !== sq.text) {
        conflicts.push({ local, server: sq });
        Object.assign(local, sq); // overwrite with server
      }
    });

    if (conflicts.length > 0) {
      syncStatus.textContent = `Conflicts resolved: ${conflicts.length}`;
      syncStatus.style.color = "orange";
    } else {
      syncStatus.textContent = "Sync completed successfully";
      syncStatus.style.color = "green";
    }

    saveQuotes();
    populateCategories();
  } catch (err) {
    syncStatus.textContent = "Sync failed: " + err.message;
    syncStatus.style.color = "red";
  }
}

async function syncToServer(quote) {
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      body: JSON.stringify(quote),
      headers: { "Content-Type": "application/json" }
    });
    syncStatus.textContent = "Quote synced to server.";
    syncStatus.style.color = "blue";
  } catch (err) {
    syncStatus.textContent = "Failed to sync to server.";
    syncStatus.style.color = "red";
  }
}

// -------------------- INITIALIZATION --------------------
newQuoteBtn.addEventListener("click", showRandomQuote);
populateCategories();
filterQuotes();

let lastQuote = sessionStorage.getItem("lastViewedQuote");
if (lastQuote) {
  let q = JSON.parse(lastQuote);
  quoteDisplay.textContent = `"${q.text}" — ${q.category}`;
}

// Periodic sync every 30s
setInterval(fetchFromServer, 30000);
