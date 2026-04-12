const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

const MANAGER_ROLES = new Set(["manager", "accounting"]);

let logoutBtn, toggleSidebarBtn, toggleNotesBtn;
let toggleSalaryCheckPanelBtn, toggleGeneratePanelBtn, toggleDispatcherSalaryCheckPanelBtn;

let salaryCheckCard, dispatcherSalaryCheckCard;
let salaryCheckPanel, generateSalaryPanel, dispatcherSalaryCheckPanel, salaryNotesPanel;
let salaryForm;

let salaryStartDateInput, salaryEndDateInput;
let dispatcherStartDateInput, dispatcherEndDateInput;
let generateStartDateInput, generateEndDateInput;

let salaryStartDatePickerBtn, salaryEndDatePickerBtn;
let dispatcherStartDatePickerBtn, dispatcherEndDatePickerBtn;
let generateStartDatePickerBtn, generateEndDatePickerBtn;

let salaryViewModeInput, salaryViewModeDisplay;
let dispatcherResultModeInput, dispatcherResultModeDisplay;

let salaryViewModeField, salaryTableTypeField;

let staffFullNameInput, staffIdInput, baseSalaryInput, customBonusInput, taxPercentInput;

let loadPreviewBtn, loadRecordsBtn, exportPreviewBtn, exportExcelBtn;
let runSalaryViewBtn, resetSalaryFiltersBtn, generateSalaryBtn, previewGenerateSalaryBtn;
let dispatcherRunBtn, dispatcherResetBtn;

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
    salaryViewMode: [
        { value: "preview_all", label: "Preview All" },
        { value: "preview_my", label: "My Preview" },
        { value: "records_all", label: "Saved Records" },
        { value: "record_my", label: "My Saved Record" }
    ],
    dispatcherResultMode: [
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

function isManagerRole() {
    return MANAGER_ROLES.has(getCurrentUserRole());
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

function getDispatcherRange() {
    return getRangeFromInputs(dispatcherStartDateInput, dispatcherEndDateInput);
}

function getGenerateRange() {
    return getRangeFromInputs(generateStartDateInput, generateEndDateInput);
}

function setSalaryLabels() {
    if (!salaryPageTitle || !salaryPageSubtitle || !salaryTableTitle || !salaryTableSubtitle) return;

    if (isManagerRole()) {
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

function applyRoleBasedUI() {
    const manager = isManagerRole();

    if (salaryCheckCard) {
        salaryCheckCard.classList.toggle("hidden", !manager);
    }

    if (dispatcherSalaryCheckCard) {
        dispatcherSalaryCheckCard.classList.toggle("hidden", manager);
    }

    if (exportPreviewBtn) {
        exportPreviewBtn.classList.toggle("hidden", !manager);
    }

    if (exportExcelBtn) {
        exportExcelBtn.classList.toggle("hidden", !manager);
    }

    if (loadPreviewBtn) {
        loadPreviewBtn.classList.toggle("hidden", !manager);
    }

    if (loadRecordsBtn) {
        loadRecordsBtn.classList.toggle("hidden", !manager);
    }

    if (toggleGeneratePanelBtn) {
        toggleGeneratePanelBtn.classList.toggle("hidden", !manager);
    }

    if (generateSalaryPanel) {
        generateSalaryPanel.classList.toggle("hidden", !manager);
        if (!manager) {
            generateSalaryPanel.classList.remove("open");
        }
    }

    if (salaryViewModeField) {
        salaryViewModeField.classList.toggle("hidden", !manager);
    }

    if (salaryTableTypeField) {
        // compatibility placeholder
    }
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
        tr.appendChild(createCell(row.total_shipments ?? 0));
        tr.appendChild(createCell(formatCurrency(row.total_profit || 0), "money-neutral"));
        tr.appendChild(createCell(formatCurrency(row.estimated_salary || 0), "money-positive"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));
        tr.appendChild(createCell("—"));

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

function getQueryString(params) {
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

function getSelectLabel(selectName, value) {
    const options = SELECT_OPTIONS[selectName] || [];
    const found = options.find((item) => item.value === value);
    return found ? found.label : "";
}

function setSelectValue(selectName, value) {
    if (selectName === "salaryViewMode") {
        if (salaryViewModeInput) salaryViewModeInput.value = value;
        if (salaryViewModeDisplay) salaryViewModeDisplay.value = getSelectLabel(selectName, value);
        return;
    }

    if (selectName === "dispatcherResultMode") {
        if (dispatcherResultModeInput) dispatcherResultModeInput.value = value;
        if (dispatcherResultModeDisplay) dispatcherResultModeDisplay.value = getSelectLabel(selectName, value);
    }
}

function openSelectModal(targetName, titleText) {
    currentSelectTarget = targetName;
    if (!salarySelectModal || !salarySelectOptionList) return;

    const options = SELECT_OPTIONS[targetName] || [];
    salarySelectOptionList.innerHTML = "";

    if (salarySelectModalTitle) {
        salarySelectModalTitle.textContent = titleText || "Select Option";
    }

    options.forEach((option) => {
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
    if (!isManagerRole()) return;

    const selectedView = salaryViewModeInput?.value || "preview_all";

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

async function runDispatcherView() {
    if (isManagerRole()) return;

    const range = getDispatcherRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    const mode = dispatcherResultModeInput?.value || "preview_my";

    if (mode === "record_my") {
        await loadSavedRecords(range, true);
    } else {
        await loadPreviewData(range, true);
    }
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
    if (!isManagerRole()) return;

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
    if (!isManagerRole()) {
        showNotice("Only manager or accounting roles can generate official salary records.", "Access Denied");
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

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/salary/generate?${getQueryString(built.payload)}`, {
            method: "POST"
        });

        if (!response) {
            setStatus("Failed to generate");
            return;
        }

        if (!response.ok) {
            const message = await parseErrorResponse(response, "Failed to generate salary record.");
            showNotice(message, "Generation Error");
            setStatus("Generation failed");
            return;
        }

        const data = await response.json();
        showNotice(data.message || "Salary record created successfully.", "Success");
        setStatus("Salary generated");

        setSelectValue("salaryViewMode", "records_all");
        await loadSavedRecords(getGenerateRange(), false);

    } catch (err) {
        console.error("Generate salary error:", err);
        showNotice("Server error while generating salary record.", "Server Error");
        setStatus("Generation failed");
    } finally {
        isGeneratingSalary = false;

        if (generateSalaryBtn) {
            generateSalaryBtn.disabled = false;
            generateSalaryBtn.textContent = "Generate Official Salary";
        }
    }
}

async function openExportPreview() {
    if (!isManagerRole()) return;

    const range = getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    setStatus("Opening export preview...");
    const qs = getQueryString(range);
    window.location.href = `/excel?${qs}`;
}

async function downloadExcel() {
    if (!isManagerRole()) return;

    const range = getCheckRange();
    if (range.error) {
        showNotice(range.error, "Date Required");
        return;
    }

    setStatus("Downloading Excel...");

    const qs = getQueryString(range);
    const response = await fetchWithAuth(`${API_BASE_URL}/salary/export?${qs}`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Download failed");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to download Excel.");
        showNotice(message, "Download Error");
        setStatus("Download failed");
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
}

function resetTableAndSummary() {
    currentSalaryRows = [];
    currentTableMode = "preview";
    currentSortKey = null;
    currentSortDirection = "asc";
    setSortIndicators();

    if (summaryTotalRecords) summaryTotalRecords.textContent = "0";
    if (summaryTotalGross) summaryTotalGross.textContent = "$0";
    if (summaryTotalTax) summaryTotalTax.textContent = "$0";
    if (summaryTotalNet) summaryTotalNet.textContent = "$0";

    showEmptyTable("Load salary data to see results.");
    setStatus("Ready");
    setResultInfo("No data loaded yet");
}

function resetManagerFilters() {
    if (salaryStartDateInput) {
        salaryStartDateInput.value = "";
        salaryStartDateInput.classList.remove("field-error");
    }

    if (salaryEndDateInput) {
        salaryEndDateInput.value = "";
        salaryEndDateInput.classList.remove("field-error");
    }

    setSelectValue("salaryViewMode", "preview_all");

    if (generateStartDateInput) {
        generateStartDateInput.value = "";
        generateStartDateInput.classList.remove("field-error");
    }

    if (generateEndDateInput) {
        generateEndDateInput.value = "";
        generateEndDateInput.classList.remove("field-error");
    }

    if (staffFullNameInput) staffFullNameInput.value = "";
    if (staffIdInput) staffIdInput.value = "";
    if (baseSalaryInput) baseSalaryInput.value = "";
    if (customBonusInput) customBonusInput.value = "";
    if (taxPercentInput) taxPercentInput.value = "";

    resetTableAndSummary();
}

function resetDispatcherFilters() {
    if (dispatcherStartDateInput) {
        dispatcherStartDateInput.value = "";
        dispatcherStartDateInput.classList.remove("field-error");
    }

    if (dispatcherEndDateInput) {
        dispatcherEndDateInput.value = "";
        dispatcherEndDateInput.classList.remove("field-error");
    }

    setSelectValue("dispatcherResultMode", "preview_my");
    resetTableAndSummary();
}

function openDatePickerFor(inputId, titleText) {
    datePickerTargetInputId = inputId;

    if (dateModalTitle) {
        dateModalTitle.textContent = titleText || "Select Date";
    }

    const input = document.getElementById(inputId);
    const parsed = parseSlashDate(input?.value);
    datePickerViewDate = parsed || new Date();

    renderDatePickerGrid();

    if (datePickerModal) {
        datePickerModal.style.display = "flex";
    }
}

function closeDatePickerModal() {
    if (datePickerModal) datePickerModal.style.display = "none";
    datePickerTargetInputId = null;
}

function renderDatePickerGrid() {
    if (!dateGrid || !dateCurrentMonthLabel) return;

    const year = datePickerViewDate.getFullYear();
    const month = datePickerViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    dateCurrentMonthLabel.textContent = datePickerViewDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    dateGrid.innerHTML = "";

    const mondayBasedFirstDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = 0; i < mondayBasedFirstDay; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn muted";
        btn.textContent = String(prevMonthLastDay - mondayBasedFirstDay + i + 1);
        btn.tabIndex = -1;
        dateGrid.appendChild(btn);
    }

    const targetInput = datePickerTargetInputId ? document.getElementById(datePickerTargetInputId) : null;
    const selectedDate = parseSlashDate(targetInput?.value);

    for (let day = 1; day <= daysInMonth; day++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn";
        btn.textContent = String(day);

        const currentDate = new Date(year, month, day);

        if (
            selectedDate &&
            selectedDate.getFullYear() === currentDate.getFullYear() &&
            selectedDate.getMonth() === currentDate.getMonth() &&
            selectedDate.getDate() === currentDate.getDate()
        ) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => {
            if (!datePickerTargetInputId) return;
            const input = document.getElementById(datePickerTargetInputId);
            if (!input) return;

            input.value = formatDateToSlash(currentDate);
            input.classList.remove("field-error");
            closeDatePickerModal();
        });

        dateGrid.appendChild(btn);
    }

    const totalCells = mondayBasedFirstDay + daysInMonth;
    const trailingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    for (let i = 1; i <= trailingCells; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-day-btn muted";
        btn.textContent = String(i);
        btn.tabIndex = -1;
        dateGrid.appendChild(btn);
    }
}

function cacheElements() {
    logoutBtn = document.getElementById("logoutBtn");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    toggleNotesBtn = document.getElementById("toggleNotesBtn");
    toggleSalaryCheckPanelBtn = document.getElementById("toggleSalaryCheckPanelBtn");
    toggleGeneratePanelBtn = document.getElementById("toggleGeneratePanelBtn");
    toggleDispatcherSalaryCheckPanelBtn = document.getElementById("toggleDispatcherSalaryCheckPanelBtn");

    salaryCheckCard = document.getElementById("salaryCheckCard");
    dispatcherSalaryCheckCard = document.getElementById("dispatcherSalaryCheckCard");
    salaryCheckPanel = document.getElementById("salaryCheckPanel");
    generateSalaryPanel = document.getElementById("generateSalaryPanel");
    dispatcherSalaryCheckPanel = document.getElementById("dispatcherSalaryCheckPanel");
    salaryNotesPanel = document.getElementById("salaryNotesPanel");
    salaryForm = document.getElementById("salaryForm");

    salaryStartDateInput = document.getElementById("salaryStartDate");
    salaryEndDateInput = document.getElementById("salaryEndDate");
    dispatcherStartDateInput = document.getElementById("dispatcherStartDate");
    dispatcherEndDateInput = document.getElementById("dispatcherEndDate");
    generateStartDateInput = document.getElementById("generateStartDate");
    generateEndDateInput = document.getElementById("generateEndDate");

    salaryStartDatePickerBtn = document.getElementById("salaryStartDatePickerBtn");
    salaryEndDatePickerBtn = document.getElementById("salaryEndDatePickerBtn");
    dispatcherStartDatePickerBtn = document.getElementById("dispatcherStartDatePickerBtn");
    dispatcherEndDatePickerBtn = document.getElementById("dispatcherEndDatePickerBtn");
    generateStartDatePickerBtn = document.getElementById("generateStartDatePickerBtn");
    generateEndDatePickerBtn = document.getElementById("generateEndDatePickerBtn");

    salaryViewModeInput = document.getElementById("salaryViewMode");
    salaryViewModeDisplay = document.getElementById("salaryViewModeDisplay");

    dispatcherResultModeInput = document.getElementById("dispatcherResultMode");
    dispatcherResultModeDisplay = document.getElementById("dispatcherResultModeDisplay");

    salaryViewModeField = document.getElementById("salaryViewModeField");
    salaryTableTypeField = document.getElementById("salaryTableTypeField");

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
    dispatcherRunBtn = document.getElementById("dispatcherRunBtn");
    dispatcherResetBtn = document.getElementById("dispatcherResetBtn");

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
}

function bindDateInputs() {
    [
        salaryStartDateInput,
        salaryEndDateInput,
        dispatcherStartDateInput,
        dispatcherEndDateInput,
        generateStartDateInput,
        generateEndDateInput
    ].forEach((input) => normalizeDateTyping(input));
}

function bindDatePickerButtons() {
    const mapping = [
        [salaryStartDatePickerBtn, "salaryStartDate", "Select Start Date"],
        [salaryEndDatePickerBtn, "salaryEndDate", "Select End Date"],
        [dispatcherStartDatePickerBtn, "dispatcherStartDate", "Select Start Date"],
        [dispatcherEndDatePickerBtn, "dispatcherEndDate", "Select End Date"],
        [generateStartDatePickerBtn, "generateStartDate", "Select Start Date"],
        [generateEndDatePickerBtn, "generateEndDate", "Select End Date"]
    ];

    mapping.forEach(([btn, inputId, title]) => {
        if (!btn) return;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openDatePickerFor(inputId, title);
        });
    });
}

function bindPanelToggles() {
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", toggleSidebar);
    }

    if (toggleNotesBtn) {
        toggleNotesBtn.addEventListener("click", () => togglePanel(salaryNotesPanel));
    }

    if (toggleSalaryCheckPanelBtn) {
        toggleSalaryCheckPanelBtn.addEventListener("click", () => togglePanel(salaryCheckPanel));
    }

    if (toggleGeneratePanelBtn) {
        toggleGeneratePanelBtn.addEventListener("click", () => {
            if (!isManagerRole() || !generateSalaryPanel) return;
            generateSalaryPanel.classList.toggle("hidden");
            generateSalaryPanel.classList.toggle("open");
        });
    }

    if (toggleDispatcherSalaryCheckPanelBtn) {
        toggleDispatcherSalaryCheckPanelBtn.addEventListener("click", () => togglePanel(dispatcherSalaryCheckPanel));
    }
}

function bindSelectTriggers() {
    if (salaryViewModeDisplay) {
        salaryViewModeDisplay.addEventListener("click", () => {
            if (!isManagerRole()) return;
            openSelectModal("salaryViewMode", "Select View Mode");
        });
    }

    if (dispatcherResultModeDisplay) {
        dispatcherResultModeDisplay.addEventListener("click", () => {
            if (isManagerRole()) return;
            openSelectModal("dispatcherResultMode", "Select Result Type");
        });
    }
}

function bindActions() {
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    if (loadPreviewBtn) {
        loadPreviewBtn.addEventListener("click", async () => {
            if (!isManagerRole()) return;
            setSelectValue("salaryViewMode", "preview_all");
            await loadPreviewData();
        });
    }

    if (loadRecordsBtn) {
        loadRecordsBtn.addEventListener("click", async () => {
            if (!isManagerRole()) return;
            setSelectValue("salaryViewMode", "records_all");
            await loadSavedRecords();
        });
    }

    if (runSalaryViewBtn) {
        runSalaryViewBtn.addEventListener("click", runSelectedView);
    }

    if (resetSalaryFiltersBtn) {
        resetSalaryFiltersBtn.addEventListener("click", resetManagerFilters);
    }

    if (previewGenerateSalaryBtn) {
        previewGenerateSalaryBtn.addEventListener("click", previewGenerateSalary);
    }

    if (generateSalaryBtn) {
        generateSalaryBtn.addEventListener("click", generateSalary);
    }

    if (exportPreviewBtn) {
        exportPreviewBtn.addEventListener("click", openExportPreview);
    }

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener("click", downloadExcel);
    }

    if (dispatcherRunBtn) {
        dispatcherRunBtn.addEventListener("click", runDispatcherView);
    }

    if (dispatcherResetBtn) {
        dispatcherResetBtn.addEventListener("click", resetDispatcherFilters);
    }

    if (salaryForm) {
        salaryForm.addEventListener("submit", (e) => e.preventDefault());
    }
}

function bindDateModal() {
    if (datePrevMonthBtn) {
        datePrevMonthBtn.addEventListener("click", () => {
            datePickerViewDate = new Date(datePickerViewDate.getFullYear(), datePickerViewDate.getMonth() - 1, 1);
            renderDatePickerGrid();
        });
    }

    if (dateNextMonthBtn) {
        dateNextMonthBtn.addEventListener("click", () => {
            datePickerViewDate = new Date(datePickerViewDate.getFullYear(), datePickerViewDate.getMonth() + 1, 1);
            renderDatePickerGrid();
        });
    }

    if (dateCloseBtn) {
        dateCloseBtn.addEventListener("click", closeDatePickerModal);
    }

    if (dateClearBtn) {
        dateClearBtn.addEventListener("click", () => {
            if (datePickerTargetInputId) {
                const input = document.getElementById(datePickerTargetInputId);
                if (input) {
                    input.value = "";
                    input.classList.remove("field-error");
                }
            }
            closeDatePickerModal();
        });
    }

    if (datePickerModal) {
        datePickerModal.addEventListener("click", (e) => {
            if (e.target === datePickerModal) {
                closeDatePickerModal();
            }
        });
    }
}

function bindSelectModal() {
    if (salarySelectCloseBtn) {
        salarySelectCloseBtn.addEventListener("click", closeSelectModal);
    }

    if (salarySelectModal) {
        salarySelectModal.addEventListener("click", (e) => {
            if (e.target === salarySelectModal) {
                closeSelectModal();
            }
        });
    }
}

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

            renderSalaryTable(currentSalaryRows, currentTableMode);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        clearAuthAndRedirect();
        return;
    }

    cacheElements();
    bindDateInputs();
    bindDatePickerButtons();
    bindPanelToggles();
    bindSelectTriggers();
    bindActions();
    bindDateModal();
    bindSelectModal();
    bindSorting();
    ensureNoticeModal();

    setSalaryLabels();
    applyRoleBasedUI();
    setSortIndicators();

    if (salaryNotesPanel) {
        salaryNotesPanel.classList.remove("open");
    }

    if (isManagerRole()) {
        if (salaryCheckPanel) salaryCheckPanel.classList.add("open");
        if (generateSalaryPanel) {
            generateSalaryPanel.classList.add("hidden");
            generateSalaryPanel.classList.remove("open");
        }
        setSelectValue("salaryViewMode", "preview_all");
        resetManagerFilters();
    } else {
        if (dispatcherSalaryCheckPanel) dispatcherSalaryCheckPanel.classList.add("open");
        setSelectValue("dispatcherResultMode", "preview_my");
        resetDispatcherFilters();
    }
});