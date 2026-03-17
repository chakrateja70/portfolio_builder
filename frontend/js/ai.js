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

function switchAIMode(mode) {
  const modes = ["qa", "assist", "history"];
  modes.forEach(m => {
    document.getElementById(`${m}Mode`).style.display = m === mode ? "block" : "none";
    let id = `tab${m.charAt(0).toUpperCase() + m.slice(1)}`;
    if (m === "qa") id = "tabQA";
    const tabBtn = document.getElementById(id);
    if (tabBtn) {
      if(m === mode) tabBtn.classList.add("active");
      else tabBtn.classList.remove("active");
    }
  });
  if (mode === "history") loadHistory();
}

function appendMessage(chatBoxId, sender, text, skipHistory=false) {
  const box = document.getElementById(chatBoxId);
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  
  // Format text for AI (remove asterisks, parse code snippets)
  const formattedContent = sender === "ai" ? formatAIResponse(text) : escapeHtml(text);

  msgDiv.innerHTML = `
    <div class="sender">${sender === "user" ? "You" : "AI"}</div>
    <div class="bubble">${formattedContent}</div>
  `;
  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
  
  if (!skipHistory) {
    const history = JSON.parse(sessionStorage.getItem("ai_history") || "[]");
    history.push({ sender, text });
    sessionStorage.setItem("ai_history", JSON.stringify(history));
  }
}

function formatAIResponse(text) {
  if (!text) return "";
  
  // 1. Remove all asterisks (* and **)
  let cleanText = text.replace(/\*/g, "");
  
  // 2. Parse code blocks: ```[lang]\n<code>\n```
  // This is a simple regex-based parser for vanilla JS implementation
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  return cleanText.split(codeBlockRegex).map((part, index) => {
    if (index % 3 === 0) {
      // Plain text part (handle newlines)
      return escapeHtml(part).replace(/\n/g, "<br>");
    } else if (index % 3 === 1) {
      // Language part (ignore for now or use as header)
      return "";
    } else {
      // Code content part
      const lang = cleanText.split(codeBlockRegex)[index - 1] || "code";
      const code = part.trim();
      const highlighted = highlightCode(code);
      return `<div class="code-snippet-container"><div class="code-header"><span>${lang}</span><button class="copy-btn" onclick="copySnippet(this)">Copy</button></div><pre class="code-content">${highlighted}</pre></div>`;
    }
  }).join("");
}

function highlightCode(code) {
  if (!code) return "";
  
  // 1. Escape HTML first
  let escaped = escapeHtml(code);
  
  // 2. Tokenize to prevent recursive regex replacement (e.g. operators inside tags)
  const tokens = [];
  const addToken = (str, cls) => {
    const id = `___TOKEN${tokens.length}___`;
    tokens.push({ id, html: `<sh-${cls}>${str}</sh-${cls}>` });
    return id;
  };

  // Note: Order is critical for correctness (strings/comments first)
  // Strings
  escaped = escaped.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, (m) => addToken(m, 'str'));
  // Comments
  escaped = escaped.replace(/(#.*|\/\/.*)/g, (m) => addToken(m, 'cmt'));
  // Keywords
  const keywords = /\b(if|else|for|while|return|function|def|class|import|from|as|in|try|except|const|let|var|await|async|yield|export|public|private|new|delete|type|interface|enum|static|void|this|true|false|null|undefined|None|self)\b/g;
  escaped = escaped.replace(keywords, (m) => addToken(m, 'kw'));
  // Functions
  escaped = escaped.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, (m) => addToken(m, 'fn'));
  // Numbers
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, (m) => addToken(m, 'num'));
  // Operators
  const operators = /(=|\+|-|\*|\/|&lt;|&gt;|!|&amp;{2}|\|{2}|:)/g;
  escaped = escaped.replace(operators, (m) => addToken(m, 'opr'));

  // 3. Re-inject finished HTML tokens
  // Iterate backwards or use a map to ensure IDs don't conflict
  for (let i = 0; i < tokens.length; i++) {
    escaped = escaped.replace(tokens[i].id, tokens[i].html);
  }

  return escaped;
}

function copySnippet(btn) {
  const code = btn.parentElement.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.style.background = "#22c55e";
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = "";
    }, 2000);
  });
}

function showTypingIndicator(chatBoxId) {
  const box = document.getElementById(chatBoxId);
  const indicator = document.createElement("div");
  indicator.className = "chat-message ai ai-typing";
  indicator.innerHTML = `
    <div class="sender">AI</div>
    <div class="typing-indicator"><span></span><span></span><span></span></div>
  `;
  box.appendChild(indicator);
  box.scrollTop = box.scrollHeight;
  return indicator;
}

function removeTypingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
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

  const typing = showTypingIndicator("qaChat");

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    removeTypingIndicator(typing);
    appendMessage("qaChat", "ai", data.answer || "No response.");
  } catch (err) {
    removeTypingIndicator(typing);
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

  const typing = showTypingIndicator("assistChat");

  try {
    const res = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    removeTypingIndicator(typing);
    appendMessage("assistChat", "ai", data.message || "No response.");

    if (data.success) {
      if (typeof showMsg === "function") showMsg(null, data.message || "Profile updated via AI Assistant", "success");
      
      // CRITICAL: Clear all caches so the newly added data actually appears!
      if (typeof invalidateCache === "function") invalidateCache();
      
      if (typeof loadBasicDetails === "function") loadBasicDetails();
      if (typeof loadProjects === "function") loadProjects();
      if (typeof loadExperience === "function") loadExperience();
      if (typeof loadSkills === "function") loadSkills();
      if (typeof loadAchievements === "function") loadAchievements();
      if (typeof loadLinks === "function") loadLinks();
      // Also update completion percent implicitly by waiting for loads, but we can just call updateProfileCompletion globally if defined
      setTimeout(() => {
        if (typeof updateProfileCompletion === "function") updateProfileCompletion();
      }, 500);
    }
  } catch (err) {
    removeTypingIndicator(typing);
    appendMessage("assistChat", "ai", "Error connecting to server.");
  }

  btn.textContent = "Run";
  btn.disabled = false;
}

// Allow pressing Enter to send assistant message
document.getElementById("assistInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAssistMessage();
});

// ─── History Helpers ──────────────────────────────────────────────────────────
function loadHistory() {
  const box = document.getElementById("historyChat");
  box.innerHTML = "";
  const history = JSON.parse(sessionStorage.getItem("ai_history") || "[]");
  if (history.length === 0) {
    box.innerHTML = "<p style='color:var(--text-muted);font-size:0.9rem;text-align:center;margin-top:20px'>No history for this session yet.</p>";
    return;
  }
  history.forEach(msg => {
    // Reusing appendMessage logic but skipping history push
    appendMessage("historyChat", msg.sender, msg.text, true);
  });
}

function clearAIHistory() {
  showConfirmModal(
    "Clear History",
    "This will delete all conversation history for this session. Continue?",
    async () => {
      sessionStorage.removeItem("ai_history");
      loadHistory();
      showMsg(null, "Chat history cleared", "success");
    }
  );
}

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
