const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

let logoutBtn, toggleSidebarBtn, toggleArchiveNotesBtn;
let runArchiveSearchBtn, resetArchiveFiltersBtn, refreshArchiveBtn;
let archiveNotesPanel;

let archiveTableBody, archiveResultInfo, archiveStatusText;
let summaryTotalResults, summaryTotalBrokerPrice, summaryTotalDriverPay, summaryTotalProfit;

let searchInput, referenceInput, brokerReferenceInput, brokerInput, createdDateInput;

let currentArchiveRows = [];
let currentSortKey = null;
let currentSortDirection = "asc";

// ============================================================
// AUTH
// ============================================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUserData() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "/login";
}

function logout() {
    clearAuthAndRedirect();
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();

    if (!token) {
        clearAuthAndRedirect();
        return null;
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (!(options.body instanceof FormData) && !headers["Content-Type"] && options.method && options.method !== "GET") {
        headers["Content-Type"] = "application/json";
    }

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers
        });
    } catch (err) {
        console.error("Network error:", err);
        return null;
    }

    if (response.status === 401) {
        clearAuthAndRedirect();
        return null;
    }

    return response;
}

// ============================================================
// UI HELPERS
// ============================================================

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
}

function togglePanel(panel) {
    if (!panel) return;
    panel.classList.toggle("open");
}

function setStatus(text) {
    if (archiveStatusText) {
        archiveStatusText.textContent = text;
    }
}

function setResultInfo(text) {
    if (archiveResultInfo) {
        archiveResultInfo.textContent = text;
    }
}

function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value).replace("T", " ");
    }

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

async function parseErrorResponse(response, fallbackMessage) {
    let data = {};
    try {
        data = await response.json();
    } catch {
        return fallbackMessage;
    }

    if (typeof data.detail === "string") return data.detail;
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;

    return fallbackMessage;
}

function normalizeToArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === "object" && Array.isArray(data.shipments)) return data.shipments;
    if (data && typeof data === "object") return [data];
    return [];
}

// ============================================================
// DATE HELPERS
// ============================================================

function normalizeDateTyping(input) {
    if (!input) return;

    input.addEventListener("input", () => {
        const digits = input.value.replace(/\D/g, "").slice(0, 8);

        let formatted = "";
        if (digits.length <= 2) {
            formatted = digits;
        } else if (digits.length <= 4) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
        }

        input.value = formatted;
        input.classList.remove("field-error");
    });

    input.addEventListener("blur", () => {
        const value = String(input.value || "").trim();

        if (!value) {
            input.classList.remove("field-error");
            return;
        }

        if (!parseSlashDate(value)) {
            input.classList.add("field-error");
        } else {
            input.classList.remove("field-error");
        }
    });
}

function parseSlashDate(value) {
    if (!value) return null;

    const text = String(value).trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function slashDateToIso(value) {
    const parsed = parseSlashDate(value);
    if (!parsed) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ============================================================
// TABLE HELPERS
// ============================================================

function showArchiveTableLoading(message = "Loading archive...") {
    if (!archiveTableBody) return;

    archiveTableBody.innerHTML = `
        <tr>
            <td colspan="12" class="empty-row">${message}</td>
        </tr>
    `;
}

function showArchiveTableError(message = "Failed to load archive.") {
    if (!archiveTableBody) return;

    archiveTableBody.innerHTML = `
        <tr>
            <td colspan="12" class="empty-row">${message}</td>
        </tr>
    `;
}

function showArchiveEmpty(message = "No archive results found.") {
    if (!archiveTableBody) return;

    archiveTableBody.innerHTML = `
        <tr>
            <td colspan="12" class="empty-row">${message}</td>
        </tr>
    `;
}

function createCell(content, className = "") {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = content ?? "—";
    td.title = content ?? "—";
    return td;
}

function createStatusCell(status) {
    const td = document.createElement("td");
    const span = document.createElement("span");

    const cleanStatus = String(status || "—").trim().toLowerCase();
    span.className = `archive-status-pill status-${cleanStatus.replace(/\s+/g, "_")}`;
    span.textContent = status || "—";

    td.appendChild(span);
    return td;
}

function getSortValue(row, key) {
    switch (key) {
        case "company_reference":
            return String(row.company_reference || "").toLowerCase();
        case "external_reference":
            return String(row.external_reference || "").toLowerCase();
        case "broker_name":
            return String(row.broker_name || "").toLowerCase();
        case "shipment_created_date":
            return String(row.shipment_created_date || row.created_at || "");
        case "delivery_datetime":
            return String(row.delivery_datetime || "");
        case "broker_price":
            return Number(row.broker_price || 0);
        case "driver_pay":
            return Number(row.driver_pay || 0);
        case "profit":
            return Number(row.profit || 0);
        case "shipment_status":
            return String(row.shipment_status || "").toLowerCase();
        default:
            return "";
    }
}

function sortArchiveRows(rows) {
    if (!currentSortKey) return [...rows];

    const sorted = [...rows];

    sorted.sort((a, b) => {
        const av = getSortValue(a, currentSortKey);
        const bv = getSortValue(b, currentSortKey);

        if (typeof av === "number" && typeof bv === "number") {
            return currentSortDirection === "asc" ? av - bv : bv - av;
        }

        if (av < bv) return currentSortDirection === "asc" ? -1 : 1;
        if (av > bv) return currentSortDirection === "asc" ? 1 : -1;
        return 0;
    });

    return sorted;
}

function setSortIndicators() {
    document.querySelectorAll(".sortable-header").forEach((th) => {
        const key = th.dataset.sortKey;
        const indicator = th.querySelector(".sort-indicator");
        if (!indicator) return;

        if (key !== currentSortKey) {
            indicator.textContent = "↕";
            return;
        }

        indicator.textContent = currentSortDirection === "asc" ? "↑" : "↓";
    });
}

function updateSummaryCards(rows) {
    const totalResults = rows.length;
    const totalBrokerPrice = rows.reduce((sum, row) => sum + Number(row.broker_price || 0), 0);
    const totalDriverPay = rows.reduce((sum, row) => sum + Number(row.driver_pay || 0), 0);
    const totalProfit = rows.reduce((sum, row) => sum + Number(row.profit || 0), 0);

    if (summaryTotalResults) summaryTotalResults.textContent = String(totalResults);
    if (summaryTotalBrokerPrice) summaryTotalBrokerPrice.textContent = formatCurrency(totalBrokerPrice);
    if (summaryTotalDriverPay) summaryTotalDriverPay.textContent = formatCurrency(totalDriverPay);
    if (summaryTotalProfit) summaryTotalProfit.textContent = formatCurrency(totalProfit);
}

function renderArchiveTable(rows) {
    if (!archiveTableBody) return;

    archiveTableBody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
        showArchiveEmpty("No matching shipment records found in archive.");
        updateSummaryCards([]);
        return;
    }

    const sortedRows = sortArchiveRows(rows);

    sortedRows.forEach((row) => {
        const tr = document.createElement("tr");

        tr.appendChild(createCell(row.company_reference || "—"));
        tr.appendChild(createCell(row.external_reference || "—"));
        tr.appendChild(createCell(row.broker_name || "—"));
        tr.appendChild(createCell(row.driver_name || "—"));
        tr.appendChild(createCell(`${row.pickup_city || "—"}${row.pickup_state ? `, ${row.pickup_state}` : ""}`));
        tr.appendChild(createCell(formatDateTime(row.shipment_created_date || row.created_at)));
        tr.appendChild(createCell(`${row.delivery_city || "—"}${row.delivery_state ? `, ${row.delivery_state}` : ""}`));
        tr.appendChild(createCell(formatDateTime(row.delivery_datetime)));
        tr.appendChild(createCell(formatCurrency(row.broker_price || 0)));
        tr.appendChild(createCell(formatCurrency(row.driver_pay || 0)));
        tr.appendChild(createCell(formatCurrency(row.profit || 0)));
        tr.appendChild(createStatusCell(row.shipment_status || "—"));

        archiveTableBody.appendChild(tr);
    });

    updateSummaryCards(sortedRows);
    setSortIndicators();
}

// ============================================================
// FILTERS
// ============================================================

function getArchiveFilters() {
    return {
        search: String(searchInput?.value || "").trim(),
        reference: String(referenceInput?.value || "").trim(),
        broker_reference: String(brokerReferenceInput?.value || "").trim(),
        broker: String(brokerInput?.value || "").trim(),
        created_date: String(createdDateInput?.value || "").trim()
    };
}

function applyArchiveFiltersFrontend(rows) {
    const filters = getArchiveFilters();

    const search = filters.search.toLowerCase();
    const reference = filters.reference.toLowerCase();
    const brokerReference = filters.broker_reference.toLowerCase();
    const broker = filters.broker.toLowerCase();
    const createdDateIso = slashDateToIso(filters.created_date);

    return (rows || []).filter((row) => {
        const companyReference = String(row.company_reference || "").toLowerCase();
        const externalReference = String(row.external_reference || "").toLowerCase();
        const brokerName = String(row.broker_name || "").toLowerCase();
        const driverName = String(row.driver_name || "").toLowerCase();
        const businessName = String(row.business_name || "").toLowerCase();
        const pickupCity = String(row.pickup_city || "").toLowerCase();
        const deliveryCity = String(row.delivery_city || "").toLowerCase();
        const comments = String(row.comments || "").toLowerCase();

        if (reference && !companyReference.includes(reference)) {
            return false;
        }

        if (brokerReference && !externalReference.includes(brokerReference)) {
            return false;
        }

        if (broker && !brokerName.includes(broker)) {
            return false;
        }

        if (createdDateIso) {
            const rowCreated = String(row.shipment_created_date || row.created_at || "").slice(0, 10);
            if (rowCreated !== createdDateIso) {
                return false;
            }
        }

        if (search) {
            const haystack = [
                companyReference,
                externalReference,
                brokerName,
                driverName,
                businessName,
                pickupCity,
                deliveryCity,
                comments
            ].join(" ");

            if (!haystack.includes(search)) {
                return false;
            }
        }

        return true;
    });
}

// ============================================================
// MAIN SEARCH
// ============================================================

async function performArchiveSearch() {
    showArchiveTableLoading("Loading full shipment archive...");
    setStatus("Loading archive...");
    setResultInfo("Searching shipment archive...");

    const response = await fetchWithAuth(`${API_BASE_URL}/shipments/all`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed");
        setResultInfo("Network request failed");
        showArchiveTableError("Network error while loading archive.");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load archive.");
        setStatus("Error");
        setResultInfo(message);
        showArchiveTableError(message);
        return;
    }

    const data = await response.json();
    let rows = normalizeToArray(data);

    rows = applyArchiveFiltersFrontend(rows);

    currentArchiveRows = rows;
    renderArchiveTable(currentArchiveRows);

    setStatus("Archive loaded");
    setResultInfo(`${currentArchiveRows.length} shipment(s) found`);
}

// ============================================================
// RESET
// ============================================================

function resetArchiveFilters() {
    if (searchInput) searchInput.value = "";
    if (referenceInput) referenceInput.value = "";
    if (brokerReferenceInput) brokerReferenceInput.value = "";
    if (brokerInput) brokerInput.value = "";
    if (createdDateInput) {
        createdDateInput.value = "";
        createdDateInput.classList.remove("field-error");
    }

    currentSortKey = null;
    currentSortDirection = "asc";
    setSortIndicators();

    setStatus("Ready");
    setResultInfo("Filters reset");

    performArchiveSearch();
}

// ============================================================
// SORT
// ============================================================

function bindSorting() {
    document.querySelectorAll(".sortable-header").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.dataset.sortKey;
            if (!key) return;

            if (currentSortKey === key) {
                currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
            } else {
                currentSortKey = key;
                currentSortDirection = "asc";
            }

            renderArchiveTable(currentArchiveRows);
        });
    });
}

// ============================================================
// DOM CACHE
// ============================================================

function cacheDom() {
    logoutBtn = document.getElementById("logoutBtn");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    toggleArchiveNotesBtn = document.getElementById("toggleArchiveNotesBtn");
    archiveNotesPanel = document.getElementById("archiveNotesPanel");

    runArchiveSearchBtn = document.getElementById("runArchiveSearchBtn");
    resetArchiveFiltersBtn = document.getElementById("resetArchiveFiltersBtn");
    refreshArchiveBtn = document.getElementById("refreshArchiveBtn");

    archiveTableBody = document.getElementById("archiveTableBody");
    archiveResultInfo = document.getElementById("archiveResultInfo");
    archiveStatusText = document.getElementById("archiveStatusText");

    summaryTotalResults = document.getElementById("summaryTotalResults");
    summaryTotalBrokerPrice = document.getElementById("summaryTotalBrokerPrice");
    summaryTotalDriverPay = document.getElementById("summaryTotalDriverPay");
    summaryTotalProfit = document.getElementById("summaryTotalProfit");

    searchInput = document.getElementById("archiveSearchInput");
    referenceInput = document.getElementById("archiveReferenceInput");
    brokerReferenceInput = document.getElementById("archiveBrokerReferenceInput");
    brokerInput = document.getElementById("archiveBrokerInput");
    createdDateInput = document.getElementById("archiveCreatedDateInput");
}

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {
    logoutBtn?.addEventListener("click", logout);
    toggleSidebarBtn?.addEventListener("click", toggleSidebar);
    toggleArchiveNotesBtn?.addEventListener("click", () => togglePanel(archiveNotesPanel));

    runArchiveSearchBtn?.addEventListener("click", performArchiveSearch);
    refreshArchiveBtn?.addEventListener("click", performArchiveSearch);
    resetArchiveFiltersBtn?.addEventListener("click", resetArchiveFilters);

    normalizeDateTyping(createdDateInput);

    [searchInput, referenceInput, brokerReferenceInput, brokerInput, createdDateInput].forEach((input) => {
        input?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                performArchiveSearch();
            }
        });
    });
}

// ============================================================
// INIT
// ============================================================

async function initArchivePage() {
    cacheDom();
    bindEvents();
    bindSorting();

    setStatus("Loading...");
    setResultInfo("Preparing archive...");
    await performArchiveSearch();
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        clearAuthAndRedirect();
        return;
    }

    initArchivePage();
});