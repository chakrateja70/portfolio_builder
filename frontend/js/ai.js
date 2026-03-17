/*
  ai.js - Handles the two AI modes on the profile page

  Mode 1: Q&A Chat
    - User asks a question
    - Server calls Groq and returns an answer
    - Chat-style display

  Mode 2: Personal Assistant
    - User types natural language commands like "update my name to Teja"
    - Server uses Groq to parse the command and update the DB
*/

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

function switchAIMode(mode) {
  const qaMode = document.getElementById("qaMode");
  const assistMode = document.getElementById("assistMode");
  const tabQA = document.getElementById("tabQA");
  const tabAssist = document.getElementById("tabAssist");

  if (mode === "qa") {
    qaMode.style.display = "block";
    assistMode.style.display = "none";
    tabQA.classList.add("active");
    tabAssist.classList.remove("active");
  } else {
    qaMode.style.display = "none";
    assistMode.style.display = "block";
    tabQA.classList.remove("active");
    tabAssist.classList.add("active");
  }
}

// ─── Helper: Append a message bubble to the chat box ─────────────────────────

function appendMessage(chatBoxId, sender, text) {
  const box = document.getElementById(chatBoxId);
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  msgDiv.innerHTML = `
    <div class="sender">${sender === "user" ? "You" : "AI"}</div>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  box.appendChild(msgDiv);
  // Scroll to the bottom automatically
  box.scrollTop = box.scrollHeight;
}

// ─── Mode 1: Q&A Chat ─────────────────────────────────────────────────────────

async function sendQAMessage() {
  const input = document.getElementById("qaInput");
  const question = input.value.trim();
  if (!question) return;

  // Show user message
  appendMessage("qaChat", "user", question);
  input.value = "";

  const btn = document.getElementById("qaBtn");
  btn.textContent = "...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    appendMessage("qaChat", "ai", data.answer || "No response.");
  } catch (err) {
    appendMessage("qaChat", "ai", "Error connecting to server.");
  }

  btn.textContent = "Send";
  btn.disabled = false;
}

// Allow pressing Enter to send Q&A message
document.getElementById("qaInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendQAMessage();
});

// ─── Mode 2: Personal Assistant ───────────────────────────────────────────────

async function sendAssistMessage() {
  const input = document.getElementById("assistInput");
  const prompt = input.value.trim();
  if (!prompt) return;

  // Show user message
  appendMessage("assistChat", "user", prompt);
  input.value = "";

  const btn = document.getElementById("assistBtn");
  btn.textContent = "...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    appendMessage("assistChat", "ai", data.message || "No response.");
  } catch (err) {
    appendMessage("assistChat", "ai", "Error connecting to server.");
  }

  btn.textContent = "Run";
  btn.disabled = false;
}

// Allow pressing Enter to send assistant message
document.getElementById("assistInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAssistMessage();
});

// ─── XSS Protection (same helper as profile.js) ──────────────────────────────
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
