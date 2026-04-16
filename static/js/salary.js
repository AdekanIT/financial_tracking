const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

const FULL_SALARY_ROLES = new Set(["manager", "accounting"]);

let logoutBtn, toggleSidebarBtn, toggleNotesBtn;
let toggleSalaryCheckPanelBtn, toggleGeneratePanelBtn;

let salaryCheckCard, salaryCheckPanel, generateSalaryPanel, salaryNotesPanel;
let salaryForm;

let salaryStartDateInput, salaryEndDateInput;
let generateStartDateInput, generateEndDateInput;

let salaryStartDatePickerBtn, salaryEndDatePickerBtn;
let generateStartDatePickerBtn, generateEndDatePickerBtn;

let salaryViewModeInput, salaryViewModeDisplay;
let staffFullNameInput, staffIdInput, baseSalaryInput, customBonusInput, taxPercentInput;

let loadPreviewBtn, loadRecordsBtn, exportPreviewBtn, exportExcelBtn;
let runSalaryViewBtn, resetSalaryFiltersBtn, generateSalaryBtn, previewGenerateSalaryBtn;

let salaryStatusText, salaryResultInfo;
let salaryPageTitle, salaryPageSubtitle, salaryTableTitle, salaryTableSubtitle;
let salaryTableBody;
let summaryTotalRecords, summaryTotalGross, summaryTotalTax, summaryTotalNet;

let datePickerModal, datePrevMonthBtn, dateNextMonthBtn, dateGrid;
let dateCurrentMonthLabel, dateCloseBtn, dateClearBtn, dateModalTitle;
let datePickerTargetInputId = null;
let datePickerViewDate = new Date();

let salarySelectModal, salarySelectModalTitle, salarySelectOptionList, salarySelectCloseBtn;
let currentSelectTarget = null;

let currentSalaryRows = [];
let currentTableMode = "preview";
let isGeneratingSalary = false;

let currentSortKey = null;
let currentSortDirection = "asc";

let customNoticeModal = null;
let customNoticeTitle = null;
let customNoticeMessage = null;
let customNoticeConfirmBtn = null;

const SELECT_OPTIONS = {
    salaryViewModeFull: [
        { value: "preview_all", label: "Preview All" },
        { value: "preview_my", label: "My Preview" },
        { value: "records_all", label: "Saved Records" },
        { value: "record_my", label: "My Saved Record" }
    ],
    salaryViewModeLimited: [
        { value: "preview_my", label: "My Preview" },
        { value: "record_my", label: "My Saved Record" }
    ]
};

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

function isFullSalaryRole() {
    return FULL_SALARY_ROLES.has(getCurrentUserRole());
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

function togglePanel(panel) {
    if (!panel) return;
    panel.classList.toggle("open");
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

function setStatus(text) {
    if (salaryStatusText) {
        salaryStatusText.textContent = text;
    }
}

function setResultInfo(text) {
    if (salaryResultInfo) {
        salaryResultInfo.textContent = text;
    }
}

function ensureNoticeModal() {
    if (customNoticeModal) return;

    const style = document.createElement("style");
    style.textContent = `
        .custom-notice-modal {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(2, 6, 23, 0.72);
            backdrop-filter: blur(6px);
            padding: 16px;
        }

        .custom-notice-modal.show {
            display: flex;
        }

        .custom-notice-card {
            width: 100%;
            max-width: 420px;
            background: rgba(15, 23, 34, 0.98);
            border: 1px solid rgba(120, 170, 255, 0.18);
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.42);
            padding: 18px;
        }

        .custom-notice-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .custom-notice-title {
            margin: 0;
            color: #f8fbff;
            font-size: 16px;
            font-weight: 800;
        }

        .custom-notice-close {
            width: 36px;
            height: 36px;
            border: 1px solid rgba(147, 197, 253, 0.18);
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            color: #dce7f5;
            cursor: pointer;
            font-size: 16px;
            font-weight: 700;
        }

        .custom-notice-close:hover {
            background: rgba(59, 130, 246, 0.12);
        }

        .custom-notice-message {
            color: #cbd5e1;
            font-size: 13px;
            line-height: 1.65;
            margin: 0 0 16px 0;
            white-space: pre-wrap;
        }

        .custom-notice-actions {
            display: flex;
            justify-content: flex-end;
        }

        .custom-notice-confirm {
            border: 1px solid rgba(59, 130, 246, 0.35);
            border-radius: 12px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            color: white;
            background: linear-gradient(90deg, #2563eb, #3b82f6);
        }
    `;
    document.head.appendChild(style);

    customNoticeModal = document.createElement("div");
    customNoticeModal.className = "custom-notice-modal";
    customNoticeModal.innerHTML = `
        <div class="custom-notice-card" onclick="event.stopPropagation()">
            <div class="custom-notice-head">
                <h3 class="custom-notice-title">Notice</h3>
                <button type="button" class="custom-notice-close">✕</button>
            </div>
            <p class="custom-notice-message"></p>
            <div class="custom-notice-actions">
                <button type="button" class="custom-notice-confirm">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(customNoticeModal);

    customNoticeTitle = customNoticeModal.querySelector(".custom-notice-title");
    customNoticeMessage = customNoticeModal.querySelector(".custom-notice-message");
    customNoticeConfirmBtn = customNoticeModal.querySelector(".custom-notice-confirm");
    const closeBtn = customNoticeModal.querySelector(".custom-notice-close");

    const closeModal = () => {
        customNoticeModal.classList.remove("show");
    };

    customNoticeModal.addEventListener("click", (e) => {
        if (e.target === customNoticeModal) closeModal();
    });

    closeBtn.addEventListener("click", closeModal);
    customNoticeConfirmBtn.addEventListener("click", closeModal);
}

function showNotice(message, title = "Notice") {
    ensureNoticeModal();
    if (customNoticeTitle) customNoticeTitle.textContent = title;
    if (customNoticeMessage) customNoticeMessage.textContent = message || "";
    customNoticeModal.classList.add("show");
}

function formatDateToSlash(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

function parseSlashDate(value) {
    if (!value) return null;
    const text = String(value).trim();

    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
    const date = parseSlashDate(value);
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeDateTyping(input) {
    if (!input) return;

    let isFormatting = false;

    function buildMaskedValue(rawValue) {
        const digits = String(rawValue || "").replace(/\D/g, "").slice(0, 8);

        let result = "";
        if (digits.length > 0) result += digits.slice(0, 2);
        if (digits.length >= 3) result += "/" + digits.slice(2, 4);
        if (digits.length >= 5) result += "/" + digits.slice(4, 8);

        return result;
    }

    function formatCurrentValue() {
        if (isFormatting) return;
        isFormatting = true;

        const start = input.selectionStart ?? input.value.length;
        const before = input.value;
        const digitsBeforeCursor = before.slice(0, start).replace(/\D/g, "").length;

        const masked = buildMaskedValue(before);
        input.value = masked;

        let nextCursor = digitsBeforeCursor;
        if (digitsBeforeCursor >= 3) nextCursor += 1;
        if (digitsBeforeCursor >= 5) nextCursor += 1;

        const safeCursor = Math.min(nextCursor, input.value.length);

        requestAnimationFrame(() => {
            try {
                input.setSelectionRange(safeCursor, safeCursor);
            } catch (_) {}
        });

        input.classList.remove("field-error");
        isFormatting = false;
    }

    input.addEventListener("input", formatCurrentValue);

    input.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "." || e.key === "-") {
            e.preventDefault();
            formatCurrentValue();
        }
    });

    input.addEventListener("paste", () => {
        requestAnimationFrame(formatCurrentValue);
    });

    input.addEventListener("blur", () => {
        if (!input.value.trim()) {
            input.classList.remove("field-error");
            return;
        }

        const parsed = parseSlashDate(input.value);
        if (!parsed) {
            input.classList.add("field-error");
        } else {
            input.classList.remove("field-error");
            input.value = formatDateToSlash(parsed);
        }
    });
}

function getRangeFromInputs(startInput, endInput) {
    const startRaw = startInput?.value?.trim() || "";
    const endRaw = endInput?.value?.trim() || "";

    if (!startRaw || !endRaw) {
        return { error: "Please enter both start date and end date." };
    }

    const startParsed = parseSlashDate(startRaw);
    const endParsed = parseSlashDate(endRaw);

    if (!startParsed || !endParsed) {
        return { error: "Date format must be dd/mm/yyyy." };
    }

    const start_date = slashDateToIso(startRaw);
    const end_date = slashDateToIso(endRaw);

    if (!start_date || !end_date) {
        return { error: "Failed to parse date." };
    }

    if (start_date > end_date) {
        return { error: "Start date cannot be later than end date." };
    }

    return { start_date, end_date };
}

function getCheckRange() {
    return getRangeFromInputs(salaryStartDateInput, salaryEndDateInput);
}

function getGenerateRange() {
    return getRangeFromInputs(generateStartDateInput, generateEndDateInput);
}

function setSalaryLabels() {
    if (!salaryPageTitle || !salaryPageSubtitle || !salaryTableTitle || !salaryTableSubtitle) return;

    if (isFullSalaryRole()) {
        salaryPageTitle.textContent = "Salary Management";
        salaryPageSubtitle.textContent = "Check salary results by period and generate official salary records";
        salaryTableTitle.textContent = "Salary Result";
        salaryTableSubtitle.textContent = "Preview and saved salary records for the selected period";
    } else {
        salaryPageTitle.textContent = "My Salary";
        salaryPageSubtitle.textContent = "Check only your own salary for the selected period";
        salaryTableTitle.textContent = "My Salary Result";
        salaryTableSubtitle.textContent = "Only your own preview and saved salary record";
    }
}

function setSidebarLinkVisibility(href, allowedRoles) {
    const role = getCurrentUserRole();

    document.querySelectorAll(`a.nav-link[href="${href}"]`).forEach((el) => {
        el.style.display = allowedRoles.includes(role) ? "" : "none";
    });
}

function applySidebarRoleVisibility() {
    setSidebarLinkVisibility("/users", ["manager", "hr"]);
    setSidebarLinkVisibility("/archive", ["manager", "supervisor", "hr", "accounting"]);
}

function applyRoleBasedUI() {
    const fullRole = isFullSalaryRole();

    if (loadPreviewBtn) loadPreviewBtn.classList.toggle("hidden", !fullRole);
    if (loadRecordsBtn) loadRecordsBtn.classList.toggle("hidden", !fullRole);
    if (exportPreviewBtn) exportPreviewBtn.classList.toggle("hidden", !fullRole);
    if (exportExcelBtn) exportExcelBtn.classList.toggle("hidden", !fullRole);
    if (toggleGeneratePanelBtn) toggleGeneratePanelBtn.classList.toggle("hidden", !fullRole);
    if (previewGenerateSalaryBtn) previewGenerateSalaryBtn.classList.toggle("hidden", !fullRole);

    if (generateSalaryPanel) {
        generateSalaryPanel.classList.toggle("hidden", !fullRole);
        if (!fullRole) {
            generateSalaryPanel.classList.remove("open");
        }
    }

    if (staffFullNameInput) staffFullNameInput.disabled = !fullRole;
    if (staffIdInput) staffIdInput.disabled = !fullRole;
    if (baseSalaryInput) baseSalaryInput.disabled = !fullRole;
    if (customBonusInput) customBonusInput.disabled = !fullRole;
    if (taxPercentInput) taxPercentInput.disabled = !fullRole;
    if (generateSalaryBtn) generateSalaryBtn.disabled = !fullRole;
    if (previewGenerateSalaryBtn) previewGenerateSalaryBtn.disabled = !fullRole;

    const options = fullRole ? SELECT_OPTIONS.salaryViewModeFull : SELECT_OPTIONS.salaryViewModeLimited;
    const defaultValue = fullRole ? "preview_all" : "preview_my";

    if (salaryViewModeInput) {
        salaryViewModeInput.value = defaultValue;
    }

    if (salaryViewModeDisplay) {
        salaryViewModeDisplay.value = (options.find(item => item.value === defaultValue) || {}).label || "";
    }

    if (!fullRole) {
        setStatus("Limited access");
        setResultInfo("Only your own preview and saved salary records are available.");
    }

    applySidebarRoleVisibility();
}

function getCurrentSelectOptions() {
    return isFullSalaryRole() ? SELECT_OPTIONS.salaryViewModeFull : SELECT_OPTIONS.salaryViewModeLimited;
}

function setSelectValue(targetName, value) {
    if (targetName !== "salaryViewMode") return;

    const options = getCurrentSelectOptions();
    const matched = options.find(item => item.value === value) || options[0];

    if (salaryViewModeInput) salaryViewModeInput.value = matched.value;
    if (salaryViewModeDisplay) salaryViewModeDisplay.value = matched.label;
}

function openSelectModal(targetName, title = "Select Option") {
    if (targetName !== "salaryViewMode") return;
    if (!salarySelectModal || !salarySelectOptionList) return;

    currentSelectTarget = targetName;
    salarySelectModalTitle.textContent = title;
    salarySelectOptionList.innerHTML = "";

    getCurrentSelectOptions().forEach((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "select-option-btn";
        btn.textContent = option.label;
        btn.addEventListener("click", () => {
            setSelectValue(targetName, option.value);
            closeSelectModal();
        });
        salarySelectOptionList.appendChild(btn);
    });

    salarySelectModal.classList.remove("hidden");
    salarySelectModal.style.display = "flex";
}

function closeSelectModal() {
    currentSelectTarget = null;
    if (!salarySelectModal) return;
    salarySelectModal.style.display = "none";
    salarySelectModal.classList.add("hidden");
}

function parseErrorResponse(response, fallbackMessage) {
    return response.json()
        .then((data) => {
            if (typeof data.detail === "string") return data.detail;
            if (typeof data.error === "string") return data.error;
            if (typeof data.message === "string") return data.message;
            return fallbackMessage;
        })
        .catch(() => fallbackMessage);
}

function getQueryString(params) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            search.append(key, value);
        }
    });

    return search.toString();
}

function getSortValue(row, key) {
    if (currentTableMode === "records") {
        switch (key) {
            case "employee":
                return (row.staff_full_name || row.full_name || "").toLowerCase();
            case "username":
                return (row.staff_username || "").toLowerCase();
            case "role":
                return (row.job_title || "").toLowerCase();
            case "period_start":
                return row.period_start || "";
            case "period_end":
                return row.period_end || "";
            case "shipments":
                return Number(row.total_shipments || 0);
            case "profit":
                return Number(row.total_profit || 0);
            case "estimated_salary":
                return Number(row.total_salary || row.net_salary || 0);
            default:
                return "";
        }
    }

    switch (key) {
        case "employee":
            return (row.staff_full_name || "").toLowerCase();
        case "username":
            return (row.staff_username || "").toLowerCase();
        case "role":
            return (row.job_title || "").toLowerCase();
        case "period_start":
            return row.period_start || "";
        case "period_end":
            return row.period_end || "";
        case "shipments":
            return Number(row.total_shipments || 0);
        case "profit":
            return Number(row.total_profit || 0);
        case "estimated_salary":
            return Number(row.estimated_salary || 0);
        default:
            return "";
    }
}

function sortCurrentRows() {
    if (!currentSortKey || !Array.isArray(currentSalaryRows)) return [...currentSalaryRows];

    const rows = [...currentSalaryRows];
    rows.sort((a, b) => {
        const av = getSortValue(a, currentSortKey);
        const bv = getSortValue(b, currentSortKey);

        if (typeof av === "number" && typeof bv === "number") {
            return currentSortDirection === "asc" ? av - bv : bv - av;
        }

        if (av < bv) return currentSortDirection === "asc" ? -1 : 1;
        if (av > bv) return currentSortDirection === "asc" ? 1 : -1;
        return 0;
    });

    return rows;
}

function setSortIndicators() {
    document.querySelectorAll(".sortable-header").forEach((th) => {
        const indicator = th.querySelector(".sort-indicator");
        if (!indicator) return;

        const key = th.dataset.sortKey;
        if (key !== currentSortKey) {
            indicator.textContent = "↕";
            return;
        }

        indicator.textContent = currentSortDirection === "asc" ? "↑" : "↓";
    });
}

function updateTableHeaders() {
    setSortIndicators();
}

function showTableLoading(message = "Loading salary data...") {
    if (!salaryTableBody) return;
    salaryTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
        </tr>
    `;
}

function showTableError(message = "Failed to load salary data.") {
    if (!salaryTableBody) return;
    salaryTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
        </tr>
    `;
}

function showEmptyTable(message = "No salary data found.") {
    if (!salaryTableBody) return;
    salaryTableBody.innerHTML = `
        <tr>
            <td colspan="14" class="empty-row">${message}</td>
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

function createRoleCell(role) {
    const td = document.createElement("td");
    const span = document.createElement("span");
    span.className = "role-pill";
    span.textContent = role || "—";
    td.appendChild(span);
    return td;
}

function normalizeToArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === "object") return [data];
    return [];
}

function renderPreviewTable(rows) {
    if (!salaryTableBody) return;

    salaryTableBody.innerHTML = "";

    if (!rows.length) {
        showEmptyTable("No salary preview data found.");
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");

        tr.appendChild(createCell(row.staff_full_name || "—"));
        tr.appendChild(createCell(row.staff_username || "—"));
        tr.appendChild(createRoleCell(row.job_title || "—"));
        tr.appendChild(createCell(row.period_start || "—"));
        tr.appendChild(createCell(row.period_end || "—"));
        tr.appendChild(createCell(row.total_shipments ?? "—"));
        tr.appendChild(createCell(formatCurrency(row.total_profit || 0)));
        tr.appendChild(createCell(formatCurrency(row.estimated_salary || 0), "money-positive"));

        salaryTableBody.appendChild(tr);
    });
}

function renderRecordsTable(rows) {
    if (!salaryTableBody) return;

    salaryTableBody.innerHTML = "";

    if (!rows.length) {
        showEmptyTable("No saved salary records found.");
        return;
    }

    rows.forEach((row) => {
        const shipmentBonus = row.shipment_bonus ?? row.dispatch_bonus ?? 0;
        const customBonus = row.custom_bonus ?? row.bonus ?? 0;
        const gross = row.gross_salary ?? (
            Number(row.base_salary || 0) +
            Number(shipmentBonus || 0) +
            Number(customBonus || 0)
        );

        const taxAmount = row.tax_amount ?? (gross * Number(row.tax_percent || 0) / 100);

        const tr = document.createElement("tr");

        tr.appendChild(createCell(row.staff_full_name || row.full_name || "—"));
        tr.appendChild(createCell(row.staff_username || "—"));
        tr.appendChild(createRoleCell(row.job_title || "—"));
        tr.appendChild(createCell(row.period_start || "—"));
        tr.appendChild(createCell(row.period_end || "—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell(formatCurrency(row.base_salary || 0)));
        tr.appendChild(createCell(formatCurrency(shipmentBonus)));
        tr.appendChild(createCell(formatCurrency(customBonus)));
        tr.appendChild(createCell(`${formatNumber(row.tax_percent || 0)}%`));
        tr.appendChild(createCell(formatCurrency(taxAmount)));
        tr.appendChild(createCell(formatCurrency(row.total_salary || row.net_salary || 0), "money-positive"));

        salaryTableBody.appendChild(tr);
    });
}

function updateSummaryCards(rows, mode) {
    let totalRecords = rows.length;
    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;

    if (mode === "records") {
        rows.forEach((row) => {
            const shipmentBonus = row.shipment_bonus ?? row.dispatch_bonus ?? 0;
            const customBonus = row.custom_bonus ?? row.bonus ?? 0;
            const gross = Number(row.gross_salary ?? (
                Number(row.base_salary || 0) +
                Number(shipmentBonus || 0) +
                Number(customBonus || 0)
            ));
            const taxAmount = Number(row.tax_amount ?? (gross * Number(row.tax_percent || 0) / 100));
            const net = Number(row.total_salary || row.net_salary || 0);

            totalGross += gross;
            totalTax += taxAmount;
            totalNet += net;
        });
    } else {
        rows.forEach((row) => {
            totalGross += Number(row.total_profit || 0);
            totalNet += Number(row.estimated_salary || 0);
        });
    }

    if (summaryTotalRecords) summaryTotalRecords.textContent = String(totalRecords);
    if (summaryTotalGross) summaryTotalGross.textContent = formatCurrency(totalGross);
    if (summaryTotalTax) summaryTotalTax.textContent = formatCurrency(totalTax);
    if (summaryTotalNet) summaryTotalNet.textContent = formatCurrency(totalNet);
}

function renderSalaryTable(rows, mode) {
    currentSalaryRows = rows;
    currentTableMode = mode;

    const sortedRows = sortCurrentRows();

    updateTableHeaders();
    updateSummaryCards(sortedRows, mode);

    if (mode === "records") {
        renderRecordsTable(sortedRows);
        setResultInfo(`${sortedRows.length} saved salary record(s) loaded`);
    } else {
        renderPreviewTable(sortedRows);
        setResultInfo(`${sortedRows.length} salary preview row(s) loaded`);
    }

    setSortIndicators();
}

async function loadPreviewData(rangeOverride = null, forceMine = false) {
    const range = rangeOverride || getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    const endpoint = forceMine ? "/salary/my" : "/salary/all";

    showTableLoading("Loading salary preview...");
    setStatus("Loading preview...");

    const qs = getQueryString(range);

    const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}?${qs}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed to load");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load salary preview.");
        showTableError(message);
        setStatus("Error");
        showNotice(message, "Preview Error");
        return;
    }

    const data = await response.json();
    const rows = normalizeToArray(data);
    renderSalaryTable(rows, "preview");
    setStatus("Preview loaded");
}

async function loadSavedRecords(rangeOverride = null, forceMine = false) {
    const range = rangeOverride || getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    const endpoint = forceMine ? "/salary/my-record" : "/salary/all-records";

    showTableLoading("Loading saved salary records...");
    setStatus("Loading records...");

    const qs = getQueryString(range);

    const response = await fetchWithAuth(`${API_BASE_URL}${endpoint}?${qs}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed to load");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load saved salary records.");
        showTableError(message);
        setStatus("Error");
        showNotice(message, "Records Error");
        return;
    }

    const data = await response.json();
    const rows = normalizeToArray(data);
    renderSalaryTable(rows, "records");
    setStatus("Records loaded");
}

async function runSelectedView() {
    const selectedView = salaryViewModeInput?.value || (isFullSalaryRole() ? "preview_all" : "preview_my");

    if (!isFullSalaryRole()) {
        if (selectedView === "record_my") {
            await loadSavedRecords(null, true);
        } else {
            await loadPreviewData(null, true);
        }
        return;
    }

    if (selectedView === "records_all") {
        await loadSavedRecords(null, false);
        return;
    }

    if (selectedView === "record_my") {
        await loadSavedRecords(null, true);
        return;
    }

    if (selectedView === "preview_my") {
        await loadPreviewData(null, true);
        return;
    }

    await loadPreviewData(null, false);
}

function buildGeneratePayloadFromForm() {
    const range = getGenerateRange();
    if (range.error) {
        return { error: range.error };
    }

    const staff_full_name = (staffFullNameInput?.value || "").trim();
    const staff_id = (staffIdInput?.value || "").trim();
    const base_salary = (baseSalaryInput?.value || "").trim();
    const custom_bonus = (customBonusInput?.value || "").trim();
    const tax_percent = (taxPercentInput?.value || "").trim();

    if (!staff_full_name) {
        return { error: "Staff Full Name is required." };
    }

    return {
        payload: {
            staff_full_name,
            staff_id,
            start_date: range.start_date,
            end_date: range.end_date,
            base_salary: base_salary || 0,
            custom_bonus: custom_bonus || 0,
            tax_percent: tax_percent || 0
        }
    };
}

async function previewGenerateSalary() {
    if (!isFullSalaryRole()) return;

    const built = buildGeneratePayloadFromForm();
    if (built.error) {
        showNotice(built.error, "Missing Data");
        return;
    }

    showTableLoading("Loading salary preview...");
    setStatus("Loading preview...");

    const previewPayload = {
        start_date: built.payload.start_date,
        end_date: built.payload.end_date
    };

    const response = await fetchWithAuth(`${API_BASE_URL}/salary/all?${getQueryString(previewPayload)}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed to load");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load salary preview.");
        showTableError(message);
        setStatus("Error");
        showNotice(message, "Preview Error");
        return;
    }

    const data = await response.json();
    const rows = normalizeToArray(data);

    const filteredRows = rows.filter((row) => {
        const rowName = String(row.staff_full_name || "").trim().toLowerCase();
        const typedName = String(built.payload.staff_full_name || "").trim().toLowerCase();

        if (!typedName) return true;
        return rowName === typedName;
    });

    renderSalaryTable(filteredRows, "preview");
    setStatus("Preview loaded");
}

async function generateSalary() {
    if (getCurrentUserRole() !== "manager") {
        showNotice("Only manager can generate official salary records.", "Access Denied");
        return;
    }

    if (isGeneratingSalary) return;

    const built = buildGeneratePayloadFromForm();
    if (built.error) {
        showNotice(built.error, "Missing Data");
        return;
    }

    isGeneratingSalary = true;

    if (generateSalaryBtn) {
        generateSalaryBtn.disabled = true;
        generateSalaryBtn.textContent = "Generating...";
    }

    setStatus("Generating salary...");

    const response = await fetchWithAuth(`${API_BASE_URL}/salary/generate?${getQueryString(built.payload)}`, {
        method: "POST"
    });

    if (!response) {
        isGeneratingSalary = false;
        if (generateSalaryBtn) {
            generateSalaryBtn.disabled = false;
            generateSalaryBtn.textContent = "Generate Official Salary";
        }
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to generate salary.");
        setStatus("Error");
        showNotice(message, "Generate Error");
        isGeneratingSalary = false;
        if (generateSalaryBtn) {
            generateSalaryBtn.disabled = false;
            generateSalaryBtn.textContent = "Generate Official Salary";
        }
        return;
    }

    const data = await response.json();
    showNotice(data.message || "Salary generated successfully.", "Success");
    setStatus("Salary generated");

    isGeneratingSalary = false;
    if (generateSalaryBtn) {
        generateSalaryBtn.disabled = false;
        generateSalaryBtn.textContent = "Generate Official Salary";
    }
}

function openExportPreview() {
    if (!isFullSalaryRole()) return;

    const range = getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    window.location.href = `/excel?${getQueryString(range)}`;
}

async function downloadExcel() {
    if (!isFullSalaryRole()) return;

    const range = getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    setStatus("Preparing Excel...");

    const response = await fetchWithAuth(`${API_BASE_URL}/salary/export?${getQueryString(range)}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to download Excel.");
        setStatus("Error");
        showNotice(message, "Export Error");
        return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "salary_export.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    setStatus("Excel downloaded");
}

function resetSalaryFilters() {
    if (salaryStartDateInput) salaryStartDateInput.value = "";
    if (salaryEndDateInput) salaryEndDateInput.value = "";
    if (generateStartDateInput) generateStartDateInput.value = "";
    if (generateEndDateInput) generateEndDateInput.value = "";

    const defaultValue = isFullSalaryRole() ? "preview_all" : "preview_my";
    setSelectValue("salaryViewMode", defaultValue);

    showEmptyTable("No salary data found.");
    updateSummaryCards([], "preview");
    setStatus("Ready");
    setResultInfo("No preview loaded yet");
}

function bindSortHandlers() {
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

            renderSalaryTable(currentSalaryRows, currentTableMode);
        });
    });
}

/* =========================
   CUSTOM DATE PICKER
========================= */

function getInputById(id) {
    if (!id) return null;
    return document.getElementById(id);
}

function openDatePicker(inputId, title = "Select Date") {
    const input = getInputById(inputId);
    if (!input || !datePickerModal) return;

    datePickerTargetInputId = inputId;

    if (dateModalTitle) {
        dateModalTitle.textContent = title;
    }

    const parsed = parseSlashDate(input.value);
    datePickerViewDate = parsed || new Date();

    renderDatePicker();
    datePickerModal.style.display = "flex";
    datePickerModal.classList.remove("hidden");
}

function closeDatePicker() {
    datePickerTargetInputId = null;
    if (!datePickerModal) return;

    datePickerModal.style.display = "none";
    datePickerModal.classList.add("hidden");
}

function selectDateFromPicker(date) {
    const input = getInputById(datePickerTargetInputId);
    if (!input) return;

    input.value = formatDateToSlash(date);
    input.classList.remove("field-error");
    closeDatePicker();
}

function clearDatePickerValue() {
    const input = getInputById(datePickerTargetInputId);
    if (input) {
        input.value = "";
        input.classList.remove("field-error");
    }
    closeDatePicker();
}

function renderDatePicker() {
    if (!dateGrid || !dateCurrentMonthLabel) return;

    const year = datePickerViewDate.getFullYear();
    const month = datePickerViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let firstWeekday = firstDay.getDay();
    firstWeekday = firstWeekday === 0 ? 7 : firstWeekday; // Monday start

    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    dateCurrentMonthLabel.textContent = datePickerViewDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
    });

    dateGrid.innerHTML = "";

    const targetInput = getInputById(datePickerTargetInputId);
    const selectedDate = targetInput ? parseSlashDate(targetInput.value) : null;

    for (let i = firstWeekday - 1; i > 0; i--) {
        const day = prevMonthLastDay - i + 1;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn muted";
        btn.textContent = String(day);

        const mutedDate = new Date(year, month - 1, day);
        btn.addEventListener("click", () => selectDateFromPicker(mutedDate));

        dateGrid.appendChild(btn);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn";
        btn.textContent = String(day);

        const currentDate = new Date(year, month, day);

        if (
            selectedDate &&
            currentDate.getFullYear() === selectedDate.getFullYear() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getDate() === selectedDate.getDate()
        ) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => selectDateFromPicker(currentDate));
        dateGrid.appendChild(btn);
    }

    const totalCells = dateGrid.children.length;
    const remainder = totalCells % 7;
    const extraCells = remainder === 0 ? 0 : 7 - remainder;

    for (let day = 1; day <= extraCells; day++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn muted";
        btn.textContent = String(day);

        const mutedDate = new Date(year, month + 1, day);
        btn.addEventListener("click", () => selectDateFromPicker(mutedDate));

        dateGrid.appendChild(btn);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    logoutBtn = document.getElementById("logoutBtn");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    toggleNotesBtn = document.getElementById("toggleNotesBtn");

    toggleSalaryCheckPanelBtn = document.getElementById("toggleSalaryCheckPanelBtn");
    toggleGeneratePanelBtn = document.getElementById("toggleGeneratePanelBtn");

    salaryCheckCard = document.getElementById("salaryCheckCard");
    salaryCheckPanel = document.getElementById("salaryCheckPanel");
    generateSalaryPanel = document.getElementById("generateSalaryPanel");
    salaryNotesPanel = document.getElementById("salaryNotesPanel");

    salaryForm = document.getElementById("salaryForm");

    salaryStartDateInput = document.getElementById("salaryStartDate");
    salaryEndDateInput = document.getElementById("salaryEndDate");
    generateStartDateInput = document.getElementById("generateStartDate");
    generateEndDateInput = document.getElementById("generateEndDate");

    salaryStartDatePickerBtn = document.getElementById("salaryStartDatePickerBtn");
    salaryEndDatePickerBtn = document.getElementById("salaryEndDatePickerBtn");
    generateStartDatePickerBtn = document.getElementById("generateStartDatePickerBtn");
    generateEndDatePickerBtn = document.getElementById("generateEndDatePickerBtn");

    salaryViewModeInput = document.getElementById("salaryViewMode");
    salaryViewModeDisplay = document.getElementById("salaryViewModeDisplay");

    staffFullNameInput = document.getElementById("staffFullName");
    staffIdInput = document.getElementById("staffId");
    baseSalaryInput = document.getElementById("baseSalary");
    customBonusInput = document.getElementById("customBonus");
    taxPercentInput = document.getElementById("taxPercent");

    loadPreviewBtn = document.getElementById("loadPreviewBtn");
    loadRecordsBtn = document.getElementById("loadRecordsBtn");
    exportPreviewBtn = document.getElementById("exportPreviewBtn");
    exportExcelBtn = document.getElementById("exportExcelBtn");
    runSalaryViewBtn = document.getElementById("runSalaryViewBtn");
    resetSalaryFiltersBtn = document.getElementById("resetSalaryFiltersBtn");
    generateSalaryBtn = document.getElementById("generateSalaryBtn");
    previewGenerateSalaryBtn = document.getElementById("previewGenerateSalaryBtn");

    salaryStatusText = document.getElementById("salaryStatusText");
    salaryResultInfo = document.getElementById("salaryResultInfo");
    salaryPageTitle = document.getElementById("salaryPageTitle");
    salaryPageSubtitle = document.getElementById("salaryPageSubtitle");
    salaryTableTitle = document.getElementById("salaryTableTitle");
    salaryTableSubtitle = document.getElementById("salaryTableSubtitle");
    salaryTableBody = document.getElementById("salaryTableBody");
    summaryTotalRecords = document.getElementById("summaryTotalRecords");
    summaryTotalGross = document.getElementById("summaryTotalGross");
    summaryTotalTax = document.getElementById("summaryTotalTax");
    summaryTotalNet = document.getElementById("summaryTotalNet");

    datePickerModal = document.getElementById("datePickerModal");
    datePrevMonthBtn = document.getElementById("datePrevMonthBtn");
    dateNextMonthBtn = document.getElementById("dateNextMonthBtn");
    dateGrid = document.getElementById("dateGrid");
    dateCurrentMonthLabel = document.getElementById("dateCurrentMonthLabel");
    dateCloseBtn = document.getElementById("dateCloseBtn");
    dateClearBtn = document.getElementById("dateClearBtn");
    dateModalTitle = document.getElementById("dateModalTitle");

    salarySelectModal = document.getElementById("salarySelectModal");
    salarySelectModalTitle = document.getElementById("salarySelectModalTitle");
    salarySelectOptionList = document.getElementById("salarySelectOptionList");
    salarySelectCloseBtn = document.getElementById("salarySelectCloseBtn");

    setSalaryLabels();
    applyRoleBasedUI();
    applySidebarRoleVisibility();

    [
        salaryStartDateInput,
        salaryEndDateInput,
        generateStartDateInput,
        generateEndDateInput
    ].forEach(normalizeDateTyping);

    salaryStartDatePickerBtn?.addEventListener("click", () => {
        openDatePicker("salaryStartDate", "Select Start Date");
    });

    salaryEndDatePickerBtn?.addEventListener("click", () => {
        openDatePicker("salaryEndDate", "Select End Date");
    });

    generateStartDatePickerBtn?.addEventListener("click", () => {
        openDatePicker("generateStartDate", "Select Start Date");
    });

    generateEndDatePickerBtn?.addEventListener("click", () => {
        openDatePicker("generateEndDate", "Select End Date");
    });

    datePrevMonthBtn?.addEventListener("click", () => {
        datePickerViewDate = new Date(
            datePickerViewDate.getFullYear(),
            datePickerViewDate.getMonth() - 1,
            1
        );
        renderDatePicker();
    });

    dateNextMonthBtn?.addEventListener("click", () => {
        datePickerViewDate = new Date(
            datePickerViewDate.getFullYear(),
            datePickerViewDate.getMonth() + 1,
            1
        );
        renderDatePicker();
    });

    dateCloseBtn?.addEventListener("click", closeDatePicker);
    dateClearBtn?.addEventListener("click", clearDatePickerValue);

    datePickerModal?.addEventListener("click", (e) => {
        if (e.target === datePickerModal) {
            closeDatePicker();
        }
    });

    logoutBtn?.addEventListener("click", logout);
    toggleSidebarBtn?.addEventListener("click", toggleSidebar);
    toggleNotesBtn?.addEventListener("click", () => togglePanel(salaryNotesPanel));
    toggleSalaryCheckPanelBtn?.addEventListener("click", () => togglePanel(salaryCheckPanel));

    toggleGeneratePanelBtn?.addEventListener("click", () => {
        if (!isFullSalaryRole()) return;
        togglePanel(generateSalaryPanel);
    });

    salaryViewModeDisplay?.addEventListener("click", () => {
        openSelectModal("salaryViewMode", "Select Salary View");
    });

    salarySelectCloseBtn?.addEventListener("click", closeSelectModal);

    salarySelectModal?.addEventListener("click", (e) => {
        if (e.target === salarySelectModal) {
            closeSelectModal();
        }
    });

    loadPreviewBtn?.addEventListener("click", async () => {
        if (!isFullSalaryRole()) return;
        setSelectValue("salaryViewMode", "preview_all");
        await loadPreviewData(null, false);
    });

    loadRecordsBtn?.addEventListener("click", async () => {
        if (!isFullSalaryRole()) return;
        setSelectValue("salaryViewMode", "records_all");
        await loadSavedRecords(null, false);
    });

    runSalaryViewBtn?.addEventListener("click", async () => {
        await runSelectedView();
    });

    resetSalaryFiltersBtn?.addEventListener("click", resetSalaryFilters);

    exportPreviewBtn?.addEventListener("click", openExportPreview);
    exportExcelBtn?.addEventListener("click", downloadExcel);
    previewGenerateSalaryBtn?.addEventListener("click", previewGenerateSalary);

    salaryForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await generateSalary();
    });

    generateSalaryBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        await generateSalary();
    });

    bindSortHandlers();
    showEmptyTable("No salary data found.");
    updateSummaryCards([], "preview");
    setStatus("Ready");
    setResultInfo("No preview loaded yet");
});