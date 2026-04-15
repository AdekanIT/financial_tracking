const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

let logoutBtn, toggleSidebarBtn;
let backToSalaryBtn, refreshPreviewBtn, downloadExcelBtn;

let previewSubtitle, periodChip, previewStatusText, previewResultInfo;
let excelPreviewTableBody;

let summaryTotalRecords, summaryTotalGross, summaryTotalTax, summaryTotalNet;
let summaryTopEmployee, summaryTopSalary;

let currentStartDate = "";
let currentEndDate = "";
let currentPreviewRows = [];
let currentSummary = null;

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

function getCurrentUserRole() {
    const user = getUserData();
    return String(user?.job_title || "").trim().toLowerCase();
}

function setSidebarLinkVisibility(href, allowedRoles) {
    const role = getCurrentUserRole();

    document.querySelectorAll(`a.nav-link[href="${href}"]`).forEach((el) => {
        el.style.display = allowedRoles.includes(role) ? "" : "none";
    });
}

function applySidebarRoleVisibility() {
    setSidebarLinkVisibility("/users", ["manager"]);
    setSidebarLinkVisibility("/archive", ["manager", "supervisor", "hr", "accounting"]);
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

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
}

function setStatus(text) {
    if (previewStatusText) {
        previewStatusText.textContent = text;
    }
}

function setResultInfo(text) {
    if (previewResultInfo) {
        previewResultInfo.textContent = text;
    }
}

function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDateDisplay(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
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

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        start_date: params.get("start_date") || "",
        end_date: params.get("end_date") || ""
    };
}

function updatePeriodUI() {
    const startText = currentStartDate || "—";
    const endText = currentEndDate || "—";

    if (periodChip) {
        periodChip.textContent = `Period: ${startText} → ${endText}`;
    }

    if (previewSubtitle) {
        previewSubtitle.textContent = `Full salary export preview for period ${startText} to ${endText}`;
    }
}

function buildQueryString(params) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            search.append(key, value);
        }
    });

    return search.toString();
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

function createCell(content, className = "") {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = content ?? "—";
    td.title = content ?? "—";
    return td;
}

function createRoleCell(role) {
    const td = document.createElement("td");

    const span = document.createElement("span");
    span.className = "role-pill";
    span.textContent = role || "—";

    td.appendChild(span);
    return td;
}

function showTableLoading(message = "Loading preview...") {
    if (!excelPreviewTableBody) return;

    excelPreviewTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
        </tr>
    `;
}

function showTableError(message = "Failed to load preview data.") {
    if (!excelPreviewTableBody) return;

    excelPreviewTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
        </tr>
    `;
}

function showEmptyTable(message = "No salary records found for this period.") {
    if (!excelPreviewTableBody) return;

    excelPreviewTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
        </tr>
    `;
}

function renderSummary(summary) {
    const safeSummary = summary || {};

    if (summaryTotalRecords) summaryTotalRecords.textContent = String(safeSummary.total_records ?? 0);
    if (summaryTotalGross) summaryTotalGross.textContent = formatCurrency(safeSummary.total_gross || 0);
    if (summaryTotalTax) summaryTotalTax.textContent = formatCurrency(safeSummary.total_tax || 0);
    if (summaryTotalNet) summaryTotalNet.textContent = formatCurrency(safeSummary.total_net || 0);
    if (summaryTopEmployee) summaryTopEmployee.textContent = safeSummary.top_employee || "—";
    if (summaryTopSalary) summaryTopSalary.textContent = formatCurrency(safeSummary.top_salary || 0);
}

function renderTable(rows) {
    if (!excelPreviewTableBody) return;

    excelPreviewTableBody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
        showEmptyTable("No salary records found for the selected period.");
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");

        tr.appendChild(createCell(row.staff_full_name || "—"));
        tr.appendChild(createCell(row.staff_username || "—"));
        tr.appendChild(createRoleCell(row.job_title || "—"));
        tr.appendChild(createCell(row.staff_id ?? "—"));
        tr.appendChild(createCell(formatDateDisplay(row.period_start)));
        tr.appendChild(createCell(formatDateDisplay(row.period_end)));
        tr.appendChild(createCell(formatCurrency(row.base_salary || 0)));
        tr.appendChild(createCell(formatCurrency(row.shipment_bonus || 0)));
        tr.appendChild(createCell(formatCurrency(row.bonus || 0)));
        tr.appendChild(createCell(formatCurrency(row.gross_salary || 0), "money-neutral"));
        tr.appendChild(createCell(`${formatNumber(row.tax_percent || 0)}%`));
        tr.appendChild(createCell(formatCurrency(row.tax_amount || 0)));
        tr.appendChild(createCell(formatCurrency(row.total_salary || 0), "money-positive"));
        tr.appendChild(createCell(formatDateTime(row.created_at)));

        excelPreviewTableBody.appendChild(tr);
    });
}

async function loadExportPreview() {
    if (!currentStartDate || !currentEndDate) {
        setStatus("Missing period");
        setResultInfo("start_date and end_date are required in URL");
        showTableError("Missing start_date or end_date in page URL.");
        return;
    }

    updatePeriodUI();
    showTableLoading("Loading export preview...");
    setStatus("Loading preview...");
    setResultInfo("Requesting saved salary records...");

    const qs = buildQueryString({
        start_date: currentStartDate,
        end_date: currentEndDate
    });

    const response = await fetchWithAuth(`${API_BASE_URL}/salary/export-preview-data?${qs}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed");
        setResultInfo("Network request failed");
        showTableError("Network error while loading preview.");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load export preview.");
        setStatus("Error");
        setResultInfo(message);
        showTableError(message);
        return;
    }

    const data = await response.json();

    currentPreviewRows = Array.isArray(data.rows) ? data.rows : [];
    currentSummary = data.summary || {};

    renderSummary(currentSummary);
    renderTable(currentPreviewRows);

    setStatus("Preview loaded");
    setResultInfo(`${currentPreviewRows.length} record(s) loaded`);
}

async function downloadExcel() {
    if (!currentStartDate || !currentEndDate) {
        alert("Missing start_date or end_date.");
        return;
    }

    setStatus("Downloading Excel...");
    setResultInfo("Preparing Excel file...");

    const qs = buildQueryString({
        start_date: currentStartDate,
        end_date: currentEndDate
    });

    const response = await fetchWithAuth(`${API_BASE_URL}/salary/export?${qs}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Download failed");
        setResultInfo("Network request failed");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to download Excel.");
        alert(message);
        setStatus("Download failed");
        setResultInfo(message);
        return;
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    let fileName = "salary_export.xlsx";
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
            fileName = match[1];
        }
    }

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);

    setStatus("Excel downloaded");
    setResultInfo(`${currentPreviewRows.length} preview row(s) were used for this period`);
}

function goBackToSalary() {
    if (currentStartDate && currentEndDate) {
        window.location.href = `/salary?start_date=${encodeURIComponent(currentStartDate)}&end_date=${encodeURIComponent(currentEndDate)}`;
        return;
    }

    window.location.href = "/salary";
}

function bindEvents() {
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", toggleSidebar);
    }

    if (backToSalaryBtn) {
        backToSalaryBtn.addEventListener("click", goBackToSalary);
    }

    if (refreshPreviewBtn) {
        refreshPreviewBtn.addEventListener("click", loadExportPreview);
    }

    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener("click", downloadExcel);
    }
}

function assignElements() {
    logoutBtn = document.getElementById("logoutBtn");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");

    backToSalaryBtn = document.getElementById("backToSalaryBtn");
    refreshPreviewBtn = document.getElementById("refreshPreviewBtn");
    downloadExcelBtn = document.getElementById("downloadExcelBtn");

    previewSubtitle = document.getElementById("previewSubtitle");
    periodChip = document.getElementById("periodChip");
    previewStatusText = document.getElementById("previewStatusText");
    previewResultInfo = document.getElementById("previewResultInfo");

    excelPreviewTableBody = document.getElementById("excelPreviewTableBody");

    summaryTotalRecords = document.getElementById("summaryTotalRecords");
    summaryTotalGross = document.getElementById("summaryTotalGross");
    summaryTotalTax = document.getElementById("summaryTotalTax");
    summaryTotalNet = document.getElementById("summaryTotalNet");
    summaryTopEmployee = document.getElementById("summaryTopEmployee");
    summaryTopSalary = document.getElementById("summaryTopSalary");
}

function init() {
    assignElements();
    applySidebarRoleVisibility();
    bindEvents();

    const params = getQueryParams();
    currentStartDate = params.start_date;
    currentEndDate = params.end_date;

    updatePeriodUI();
    loadExportPreview();
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        clearAuthAndRedirect();
        return;
    }

    init();
});