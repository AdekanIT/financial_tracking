const API_BASE = "http://127.0.0.1:8000";

// ================= AUTH =================
function getToken() {
    return localStorage.getItem("token");
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
}

if (!getToken()) {
    window.location.href = "/login";
}

// ================= API =================
async function apiRequest(endpoint, method = "GET", body = null) {
    const res = await fetch(API_BASE + endpoint, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
        },
        body: body ? JSON.stringify(body) : null
    });

    if (res.status === 401) logout();

    return res.json();
}

// ================= LOAD =================
async function loadShipments() {
    const data = await apiRequest("/shipments/all");

    const table = document.getElementById("shipmentsTable");
    table.innerHTML = "";

    data.forEach(s => {
        table.innerHTML += `
            <tr>
                <td>${s.shipment_code}</td>
                <td>${s.broker_price}</td>
                <td>${s.driver_pay}</td>
                <td>${s.profit}</td>
                <td>
                    <button onclick="deleteShipment(${s.shipment_id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

// ================= CREATE =================
async function createShipment() {
    const broker = document.getElementById("broker_price").value;
    const driver = document.getElementById("driver_pay").value;

    await apiRequest("/shipments/create", "POST", {
        broker_price: Number(broker),
        driver_pay: Number(driver)
    });

    closeModal();
    loadShipments();
}

// ================= DELETE =================
async function deleteShipment(id) {
    if (!confirm("Delete this shipment?")) return;

    await apiRequest(`/shipments/${id}`, "DELETE");
    loadShipments();
}

// ================= MODAL =================
function openModal() {
    document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

// ================= INIT =================
loadShipments();