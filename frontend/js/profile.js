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

// ─── Alert helper ─────────────────────────────────────────────────────────────
function showMsg(elementId, message, type) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = `alert ${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
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

navLinks.forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = this.getAttribute("data-section");

    navLinks.forEach(l => l.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(`section-${target}`).classList.add("active");
    document.getElementById("sectionTitle").textContent = sectionTitles[target];

    if (target === "projects")     loadProjects();
    if (target === "experience")   loadExperience();
    if (target === "skills")       loadSkills();
    if (target === "achievements") loadAchievements();
    if (target === "links")        loadLinks();
  });
});

// ─── On page load ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  showPageLoader("Loading your profile...");
  await loadBasicDetails();
  hidePageLoader();
});

// ─── BASIC DETAILS ────────────────────────────────────────────────────────────

async function loadBasicDetails() {
  const result = await apiCall("/api/profile/basic");

  if (!result.success) {
    // Session invalid → redirect to login
    window.location.href = "/login.html";
    return;
  }

  // Set username display
  const username = result.user ? result.user.username : "";
  document.getElementById("sidebarUsername").textContent = "@" + username;
  document.getElementById("topUsername").textContent = username;

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
  showMsg("basicAlert", result.message, result.success ? "success" : "error");

  // Reload from DB so fields show exactly what was saved
  if (result.success) await loadBasicDetails();

  btn.textContent = orig;
  btn.disabled = false;
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
        <p>${escapeHtml(p.description || "")}</p>
        ${p.tech_stack ? `<span class="tag">${escapeHtml(p.tech_stack)}</span>` : ""}
        ${p.project_url ? `<a href="${escapeHtml(p.project_url)}" target="_blank" style="font-size:0.8rem;color:var(--primary);display:block;margin-top:6px">🔗 View Project</a>` : ""}
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})">Delete</button>
    </div>
  `).join("");
}

async function deleteProject(id) {
  if (!confirm("Delete this project?")) return;
  await apiCall(`/api/profile/projects/${id}`, "DELETE");
  loadProjects();
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
    loadProjects();
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
      <button class="btn btn-danger btn-sm" onclick="deleteExperience(${e.id})">Delete</button>
    </div>
  `).join("");
}

async function deleteExperience(id) {
  if (!confirm("Delete this experience?")) return;
  await apiCall(`/api/profile/experience/${id}`, "DELETE");
  loadExperience();
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
    loadExperience();
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
      <div class="item-card-info">
        <h4>${escapeHtml(s.skill_name)}</h4>
        <span class="tag ${s.level.toLowerCase()}">${escapeHtml(s.level)}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteSkill(${s.id})">Delete</button>
    </div>
  `).join("");
}

async function deleteSkill(id) {
  if (!confirm("Delete this skill?")) return;
  await apiCall(`/api/profile/skills/${id}`, "DELETE");
  loadSkills();
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
    loadSkills();
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
      <button class="btn btn-danger btn-sm" onclick="deleteAchievement(${a.id})">Delete</button>
    </div>
  `).join("");
}

async function deleteAchievement(id) {
  if (!confirm("Delete this achievement?")) return;
  await apiCall(`/api/profile/achievements/${id}`, "DELETE");
  loadAchievements();
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
    loadAchievements();
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
