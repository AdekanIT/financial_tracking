const API_BASE = "http://127.0.0.1:8000";

function getToken() {
    return localStorage.getItem("token");
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
}

async function apiRequest(endpoint, method = "GET", body = null) {
    const res = await fetch(API_BASE + endpoint, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
        },
        body: body ? JSON.stringify(body) : null
    });

    if (res.status === 401) logout();

    return res.json();
}