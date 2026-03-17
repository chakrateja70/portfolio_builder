/*
  profile.js - Profile section CRUD + page loader + basic details fix

  Fix: After saving basic details, we immediately reload the form from DB
       so the fields always reflect what's actually stored.
*/

// ─── Page loader (shown while initial data loads) ─────────────────────────────
function showPageLoader(text = "Loading...") {
  let loader = document.getElementById("pageLoader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "pageLoader";
    loader.className = "page-loader";
    loader.innerHTML = `<div class="loader-inner"><div class="big-spinner"></div><p>${text}</p></div>`;
    document.body.appendChild(loader);
  }
}
function hidePageLoader() {
  const loader = document.getElementById("pageLoader");
  if (loader) loader.remove();
}

// ─── Custom Confirm Modal ─────────────────────────────────────────────────────
let currentConfirmAction = null;

function showConfirmModal(title, message, onConfirm) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmModal").classList.add("open");
  
  const confirmBtn = document.getElementById("confirmBtn");
  confirmBtn.textContent = "Delete";
  confirmBtn.disabled = false;
  
  currentConfirmAction = async () => {
    confirmBtn.innerHTML = `<span class="spinner"></span> Working...`;
    confirmBtn.disabled = true;
    await onConfirm();
    closeConfirmModal();
  };
  
  confirmBtn.onclick = currentConfirmAction;
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("open");
  currentConfirmAction = null;
}

// ─── Alert helper ─────────────────────────────────────────────────────────────
function showMsg(elementId, message, type) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  
  const icon = type === 'success' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("toast-fadeOut");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── API call helper ──────────────────────────────────────────────────────────
async function apiCall(url, method = "GET", body = null) {
  const options = { method, credentials: "include", headers: {} };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  return res.json();
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────────
const navLinks = document.querySelectorAll(".nav-link");
const sectionTitles = {
  basic: "Basic Details", projects: "Projects", experience: "Experience",
  skills: "Skills", achievements: "Achievements", links: "Social Links", ai: "AI Assistant"
};

// Simple cache to avoid re-fetching unchanged data
const _loaded = { basic: false, projects: false, experience: false, skills: false, achievements: false, links: false };

navLinks.forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = this.getAttribute("data-section");
    if (!target) return;

    // Close any open dropdown
    document.querySelectorAll(".nav-dropdown").forEach(d => d.classList.remove("open"));

    navLinks.forEach(l => l.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(`section-${target}`).classList.add("active");
    document.getElementById("sectionTitle").textContent = sectionTitles[target];

    // Only fetch if not yet loaded (cache-first strategy)
    if (target === "projects"    && !_loaded.projects)     { loadProjects();    _loaded.projects = true; }
    if (target === "experience"  && !_loaded.experience)   { loadExperience();  _loaded.experience = true; }
    if (target === "skills"      && !_loaded.skills)       { loadSkills();      _loaded.skills = true; }
    if (target === "achievements"&& !_loaded.achievements) { loadAchievements();_loaded.achievements = true; }
    if (target === "links"       && !_loaded.links)        { loadLinks();       _loaded.links = true; }
  });
});

// ─── Features Dropdown Toggle ─────────────────────────────────────────────────
const featuresToggle = document.getElementById("featuresToggle");
if (featuresToggle) {
  featuresToggle.addEventListener("click", function(e) {
    e.preventDefault();
    const dropdown = this.closest(".nav-dropdown");
    dropdown.classList.toggle("open");
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", function(e) {
  if (!e.target.closest(".nav-dropdown")) {
    document.querySelectorAll(".nav-dropdown").forEach(d => d.classList.remove("open"));
  }
});

// ─── On page load ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  showPageLoader("Loading your profile...");
  await loadBasicDetails();
  _loaded.basic = true;
  updateProfileCompletion();
  hidePageLoader();

  // Open AI Assistant by default
  const aiLink = document.querySelector(".nav-link[data-section='ai']");
  if (aiLink) aiLink.click();
});

// Call this whenever data has changed so cache gets invalidated for that section
function invalidateCache(section) {
  if (section) _loaded[section] = false;
  else Object.keys(_loaded).forEach(k => _loaded[k] = false);
}

// ─── Profile Completion Calculation ───────────────────────────────────────────
async function updateProfileCompletion() {
  try {
    const [basic, proj, exp, skills, ach, links] = await Promise.all([
      apiCall("/api/profile/basic"),
      apiCall("/api/profile/projects"),
      apiCall("/api/profile/experience"),
      apiCall("/api/profile/skills"),
      apiCall("/api/profile/achievements"),
      apiCall("/api/profile/links")
    ]);

    let score = 0;

    // Basic details — up to 30 pts (5 per filled field)
    if (basic.data) {
      if (basic.data.full_name) score += 8;
      if (basic.data.phone)     score += 5;
      if (basic.data.bio)       score += 9;
      if (basic.data.location)  score += 8;
    }

    // Projects — up to 20 pts (scales by count, max 3)
    if (proj.data && proj.data.length > 0)
      score += Math.min(proj.data.length, 3) * 7;

    // Experience — up to 15 pts
    if (exp.data && exp.data.length > 0)
      score += Math.min(exp.data.length, 2) * 7;

    // Skills — up to 10 pts
    if (skills.data && skills.data.length > 0)
      score += Math.min(skills.data.length, 5) * 2;

    // Achievements — up to 5 pts
    if (ach.data && ach.data.length > 0) score += 5;

    // Links — up to 10 pts
    if (links.data) {
      const filled = ["github_url","linkedin_url","portfolio_url","other_url"]
        .filter(k => links.data[k] && links.data[k].trim());
      score += filled.length * 2;
    }

    const pct = Math.min(score, 100);
    const badge = document.getElementById("completionPercent");
    if (badge) badge.textContent = `${pct}%`;
  } catch (err) {
    console.error("Could not calculate completion", err);
  }
}

// ─── BASIC DETAILS ────────────────────────────────────────────────────────────

async function loadBasicDetails() {
  const result = await apiCall("/api/profile/basic");

  if (!result.success) {
    // Session invalid → redirect to login
    window.location.href = "/login.html";
    return;
  }

  // ✅ FIX: Populate form fields from actual DB data
  const data = result.data;
  if (data) {
    document.getElementById("full_name").value = data.full_name || "";
    document.getElementById("phone").value     = data.phone    || "";
    document.getElementById("bio").value       = data.bio      || "";
    document.getElementById("location").value  = data.location || "";
  } else {
    // No data yet – clear all fields
    ["full_name","phone","bio","location"].forEach(id => {
      document.getElementById(id).value = "";
    });
  }
}

document.getElementById("basicForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  const orig = btn.textContent;
  btn.innerHTML = `<span class="spinner"></span> Saving...`;
  btn.disabled = true;

  const data = {
    full_name: document.getElementById("full_name").value,
    phone:     document.getElementById("phone").value,
    bio:       document.getElementById("bio").value,
    location:  document.getElementById("location").value,
  };
  const result = await apiCall("/api/profile/basic", "POST", data);

  // Reload from DB so fields show exactly what was saved
  if (result.success) {
    await loadBasicDetails();
    updateProfileCompletion();
  }

  btn.textContent = orig;
  btn.disabled = false;

  // Show toast AFTER button is restored (save is complete)
  showMsg("basicAlert", result.message, result.success ? "success" : "error");
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

document.getElementById("toggleProjectForm").addEventListener("click", () => {
  document.getElementById("projectForm").classList.toggle("open");
});

async function loadProjects() {
  const result = await apiCall("/api/profile/projects");
  const container = document.getElementById("projectsList");
  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No projects added yet. Click "+ Add Project" to get started.</p>`;
    return;
  }
  container.innerHTML = result.data.map(p => `
    <div class="item-card">
      <div class="item-card-info">
        <h4>${escapeHtml(p.title)}</h4>
        ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:10px;">
          ${p.tech_stack ? `<span class="tag" style="margin-top:0;background:#f0f9ff;color:#0369a1;border-color:#bae6fd">${escapeHtml(p.tech_stack)}</span>` : "<span></span>"}
          ${p.project_url ? `<a href="${escapeHtml(p.project_url)}" target="_blank" style="font-size:0.78rem;color:#2563eb;display:inline-flex;align-items:center;gap:3px;padding:3px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;text-decoration:none;margin-left:auto;"><svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/><polyline points='15 3 21 3 21 9'/><line x1='10' y1='14' x2='21' y2='3'/></svg> View Project</a>` : ""}
        </div>
      </div>
      <button class="btn-delete-icon" onclick="deleteProject(${p.id})" title="Delete Project">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    </div>
  `).join("");
}

async function deleteProject(id) {
  showConfirmModal(
    "Delete Project",
    "Are you sure you want to remove this project? This cannot be undone.",
    async () => {
      const res = await apiCall(`/api/profile/projects/${id}`, "DELETE");
      showMsg(null, res.message, res.success ? "success" : "error");
      if (res.success) { invalidateCache("projects"); loadProjects(); updateProfileCompletion(); }
    }
  );
}

document.getElementById("saveProjectBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveProjectBtn");
  btn.innerHTML = `<span class="spinner"></span> Saving...`;
  btn.disabled = true;

  const data = {
    title: document.getElementById("proj_title").value,
    description: document.getElementById("proj_desc").value,
    tech_stack: document.getElementById("proj_tech").value,
    project_url: document.getElementById("proj_url").value,
  };
  const result = await apiCall("/api/profile/projects", "POST", data);
  showMsg("projectAlert", result.message, result.success ? "success" : "error");
  if (result.success) {
    ["proj_title","proj_desc","proj_tech","proj_url"].forEach(id => document.getElementById(id).value = "");
    invalidateCache("projects");
    document.getElementById("projectForm").classList.remove("open");
    loadProjects();
    updateProfileCompletion();
  }

  btn.textContent = "Save Project";
  btn.disabled = false;
});

// ─── EXPERIENCE ───────────────────────────────────────────────────────────────

document.getElementById("toggleExpForm").addEventListener("click", () => {
  document.getElementById("expForm").classList.toggle("open");
});

async function loadExperience() {
  const result = await apiCall("/api/profile/experience");
  const container = document.getElementById("experienceList");
  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No experience added yet.</p>`;
    return;
  }
  container.innerHTML = result.data.map(e => `
    <div class="item-card">
      <div class="item-card-info">
        <h4>${escapeHtml(e.role)} at ${escapeHtml(e.company)}</h4>
        ${e.duration ? `<p style="font-size:0.8rem;color:var(--primary)">📅 ${escapeHtml(e.duration)}</p>` : ""}
        <p>${escapeHtml(e.description || "")}</p>
      </div>
      <button class="btn-delete-icon" onclick="deleteExperience(${e.id})" title="Delete Experience">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    </div>
  `).join("");
}

async function deleteExperience(id) {
  showConfirmModal(
    "Delete Experience",
    "Are you sure you want to remove this work experience?",
    async () => {
      const res = await apiCall(`/api/profile/experience/${id}`, "DELETE");
      showMsg(null, res.message, res.success ? "success" : "error");
      loadExperience();
      updateProfileCompletion();
    }
  );
}

document.getElementById("saveExpBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveExpBtn");
  btn.innerHTML = `<span class="spinner"></span> Saving...`;
  btn.disabled = true;

  const data = {
    company: document.getElementById("exp_company").value,
    role:    document.getElementById("exp_role").value,
    duration: document.getElementById("exp_duration").value,
    description: document.getElementById("exp_desc").value,
  };
  const result = await apiCall("/api/profile/experience", "POST", data);
  showMsg("expAlert", result.message, result.success ? "success" : "error");
  if (result.success) {
    ["exp_company","exp_role","exp_duration","exp_desc"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("expForm").classList.remove("open");
    loadExperience();
    updateProfileCompletion();
  }
  btn.textContent = "Save Experience";
  btn.disabled = false;
});

// ─── SKILLS ───────────────────────────────────────────────────────────────────

document.getElementById("toggleSkillForm").addEventListener("click", () => {
  document.getElementById("skillForm").classList.toggle("open");
});

async function loadSkills() {
  const result = await apiCall("/api/profile/skills");
  const container = document.getElementById("skillsList");
  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No skills added yet.</p>`;
    return;
  }
  container.innerHTML = result.data.map(s => `
    <div class="item-card">
      <div class="item-card-info" style="flex: 1; display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
        <h4 style="margin: 0;">${escapeHtml(s.skill_name)}</h4>
        <span class="tag ${s.level.toLowerCase()}" style="margin-top: 0;">${escapeHtml(s.level)}</span>
      </div>
      <button class="btn-delete-icon" onclick="deleteSkill(${s.id})" title="Delete Skill">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    </div>
  `).join("");
}

async function deleteSkill(id) {
  showConfirmModal(
    "Delete Skill",
    "Are you sure you want to remove this skill from your profile?",
    async () => {
      const res = await apiCall(`/api/profile/skills/${id}`, "DELETE");
      showMsg(null, res.message, res.success ? "success" : "error");
      loadSkills();
      updateProfileCompletion();
    }
  );
}

document.getElementById("saveSkillBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveSkillBtn");
  btn.innerHTML = `<span class="spinner"></span>`;
  btn.disabled = true;

  const data = {
    skill_name: document.getElementById("skill_name").value,
    level: document.getElementById("skill_level").value,
  };
  const result = await apiCall("/api/profile/skills", "POST", data);
  showMsg("skillAlert", result.message, result.success ? "success" : "error");
  if (result.success) {
    document.getElementById("skill_name").value = "";
    document.getElementById("skillForm").classList.remove("open");
    loadSkills();
    updateProfileCompletion();
  }
  btn.textContent = "Add Skill";
  btn.disabled = false;
});

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

document.getElementById("toggleAchForm").addEventListener("click", () => {
  document.getElementById("achForm").classList.toggle("open");
});

async function loadAchievements() {
  const result = await apiCall("/api/profile/achievements");
  const container = document.getElementById("achievementsList");
  if (!result.data || result.data.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem">No achievements added yet.</p>`;
    return;
  }
  container.innerHTML = result.data.map(a => `
    <div class="item-card">
      <div class="item-card-info">
        <h4>🏆 ${escapeHtml(a.title)}</h4>
        ${a.date_earned ? `<p style="font-size:0.8rem;color:var(--primary)">📅 ${escapeHtml(a.date_earned)}</p>` : ""}
        <p>${escapeHtml(a.description || "")}</p>
      </div>
      <button class="btn-delete-icon" onclick="deleteAchievement(${a.id})" title="Delete Achievement">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    </div>
  `).join("");
}

async function deleteAchievement(id) {
  showConfirmModal(
    "Delete Achievement",
    "Are you sure you want to remove this achievement?",
    async () => {
      const res = await apiCall(`/api/profile/achievements/${id}`, "DELETE");
      showMsg(null, res.message, res.success ? "success" : "error");
      loadAchievements();
      updateProfileCompletion();
    }
  );
}

document.getElementById("saveAchBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveAchBtn");
  btn.innerHTML = `<span class="spinner"></span> Saving...`;
  btn.disabled = true;

  const data = {
    title: document.getElementById("ach_title").value,
    description: document.getElementById("ach_desc").value,
    date_earned:  document.getElementById("ach_date").value,
  };
  const result = await apiCall("/api/profile/achievements", "POST", data);
  showMsg("achAlert", result.message, result.success ? "success" : "error");
  if (result.success) {
    ["ach_title","ach_desc","ach_date"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("achForm").classList.remove("open");
    loadAchievements();
    updateProfileCompletion();
  }
  btn.textContent = "Save Achievement";
  btn.disabled = false;
});

// ─── LINKS ────────────────────────────────────────────────────────────────────

async function loadLinks() {
  const result = await apiCall("/api/profile/links");
  if (result.data) {
    document.getElementById("github_url").value    = result.data.github_url    || "";
    document.getElementById("linkedin_url").value  = result.data.linkedin_url  || "";
    document.getElementById("portfolio_url").value = result.data.portfolio_url || "";
    document.getElementById("other_url").value     = result.data.other_url     || "";
  }
}

document.getElementById("linksForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  const orig = btn.textContent;
  btn.innerHTML = `<span class="spinner"></span> Saving...`;
  btn.disabled = true;

  const data = {
    github_url:    document.getElementById("github_url").value,
    linkedin_url:  document.getElementById("linkedin_url").value,
    portfolio_url: document.getElementById("portfolio_url").value,
    other_url:     document.getElementById("other_url").value,
  };
  const result = await apiCall("/api/profile/links", "POST", data);
  showMsg("linksAlert", result.message, result.success ? "success" : "error");
  if (result.success) updateProfileCompletion();

  btn.textContent = orig;
  btn.disabled = false;
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

document.getElementById("logoutBtn").addEventListener("click", async () => {
  showPageLoader("Signing out...");
  await apiCall("/api/logout", "POST");
  window.location.href = "/login.html";
});

// ─── XSS protection ───────────────────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
             .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
