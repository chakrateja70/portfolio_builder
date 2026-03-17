/*
  auth.js - Handles Register and Login form submissions
  Features: form submit, loaders, show/hide password toggle
*/

// ─── Show/hide password toggle ────────────────────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;
  } else {
    input.type = "password";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(data.password)) {
      showAlert("Password must be at least 8 characters, and contain a lowercase, uppercase, number, and special character.", "error");
      setLoading(btn, false, "Create Account");
      return;
    }

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
