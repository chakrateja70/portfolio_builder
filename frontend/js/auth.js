/*
  auth.js - Handles Register and Login form submissions
  Features: form submit, loaders, show/hide password toggle
*/

// ─── Show/hide password toggle ────────────────────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

// ─── Show alert message ───────────────────────────────────────────────────────
function showAlert(message, type) {
  const box = document.getElementById("alertBox");
  box.textContent = message;
  box.className = `alert ${type}`;
  box.style.display = "block";
}

// ─── Set button loading state ─────────────────────────────────────────────────
function setLoading(btn, loading, defaultText) {
  if (loading) {
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
    btn.disabled = true;
  } else {
    btn.textContent = defaultText;
    btn.disabled = false;
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    setLoading(btn, true, "Create Account");

    const data = {
      username: document.getElementById("username").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      confirm_password: document.getElementById("confirm_password").value,
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        showAlert(result.message + " Redirecting to login...", "success");
        setTimeout(() => { window.location.href = "/login.html"; }, 1500);
      } else {
        showAlert(result.message, "error");
      }
    } catch (err) {
      showAlert("Could not connect to server. Is it running?", "error");
    }

    setLoading(btn, false, "Create Account");
  });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    setLoading(btn, true, "Sign In");

    const data = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    };

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        showAlert("Login successful! Loading your profile...", "success");
        setTimeout(() => { window.location.href = "/profile.html"; }, 800);
      } else {
        showAlert(result.message, "error");
        setLoading(btn, false, "Sign In");
      }
    } catch (err) {
      showAlert("Could not connect to server. Is it running?", "error");
      setLoading(btn, false, "Sign In");
    }
  });
}
