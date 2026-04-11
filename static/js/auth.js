const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

// ============================================================
// DOM REFERENCES (cached once on DOMContentLoaded)
// ============================================================
let loginForm, usernameInput, passwordInput, loginBtn, errorMessage, successMessage;

// ============================================================
// HELPERS
// ============================================================

function showError(message) {
    if (errorMessage) {
        errorMessage.style.display = "block";
        errorMessage.textContent = message;
    }
    if (successMessage) {
        successMessage.style.display = "none";
        successMessage.textContent = "";
    }
}

function showSuccess(message) {
    if (successMessage) {
        successMessage.style.display = "block";
        successMessage.textContent = message;
    }
    if (errorMessage) {
        errorMessage.style.display = "none";
        errorMessage.textContent = "";
    }
}

function clearMessages() {
    if (errorMessage) {
        errorMessage.style.display = "none";
        errorMessage.textContent = "";
    }
    if (successMessage) {
        successMessage.style.display = "none";
        successMessage.textContent = "";
    }
}

function setLoading(isLoading) {
    if (!loginBtn) return;

    loginBtn.disabled = isLoading;
    loginBtn.textContent = isLoading ? "Signing In..." : "Sign In";

    // Prevent interaction while submitting
    if (usernameInput) usernameInput.disabled = isLoading;
    if (passwordInput) passwordInput.disabled = isLoading;
}

function saveAuthData(responseData) {
    try {
        localStorage.setItem(TOKEN_KEY, responseData.access_token);

        const userData = {
            staff_id: responseData.staff_id,
            staff_username: responseData.staff_username,
            staff_full_name: responseData.staff_full_name,
            job_title: responseData.job_title
        };

        localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (err) {
        console.error("Failed to persist auth data:", err);
    }
}

// No auto-redirect from login page — if the user is here, let them log in.
// The token will be validated naturally when they reach dashboard/shipments.

// ============================================================
// LOGIN HANDLER
// ============================================================
let isSubmitting = false;

async function handleLogin(event) {
    event.preventDefault();
    clearMessages();

    // Guard against double-submit
    if (isSubmitting) return;

    const username = (usernameInput?.value || "").trim();
    const password = (passwordInput?.value || "").trim();

    if (!username || !password) {
        showError("Please enter both username and password.");
        return;
    }

    if (username.length > 100 || password.length > 200) {
        showError("Username or password exceeds maximum allowed length.");
        return;
    }

    isSubmitting = true;
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            // non-JSON body — fall through to the !response.ok check
        }

        if (!response.ok) {
            const detail = typeof data.detail === "string"
                ? data.detail
                : "Invalid username or password.";
            showError(detail);
            return;
        }

        if (!data.access_token) {
            showError("Token was not returned by the server.");
            return;
        }

        saveAuthData(data);
        showSuccess("Login successful. Redirecting...");

        setTimeout(() => {
            window.location.href = "/dashboard";
        }, 600);

    } catch (err) {
        console.error("Login network error:", err);
        showError("Unable to connect to the server. Please try again.");
    } finally {
        isSubmitting = false;
        setLoading(false);
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    loginForm = document.getElementById("loginForm");
    usernameInput = document.getElementById("username");
    passwordInput = document.getElementById("password");
    loginBtn = document.getElementById("loginBtn");
    errorMessage = document.getElementById("errorMessage");
    successMessage = document.getElementById("successMessage");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});