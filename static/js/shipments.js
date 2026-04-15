const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";
const SHIPMENT_COLUMNS_KEY = "shipment_columns_v4";
const BROKER_NAMES_KEY = "broker_name_history_v2";
const SHIPMENT_TIME_FORMAT_KEY = "shipment_time_format_v1";

const RESTRICTED_FINANCIAL_KEYS = new Set([
    "broker_price",
    "driver_pay",
    "profit",
    "percentage_of_margin"
]);

const PRIVILEGED_ROLES = new Set(["manager", "supervisor", "accounting"]);

const SHIPMENT_STATUS_OPTIONS = [
    { value: "created", label: "Created" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "tonu", label: "TONU" }
];

const DRIVER_PAYMENT_STATUS_OPTIONS = [
    { value: "unpaid", label: "Unpaid" },
    { value: "paid", label: "Paid" }
];

const BROKER_PAYMENT_OPTION_OPTIONS = [
    { value: "", label: "Select payment option" },
    { value: "standard", label: "Standard Payment" },
    { value: "quick_pay", label: "Broker Quick Pay" }
];

let shipmentsTable, shipmentsHeaderRow, logoutBtn, shipmentModal, shipmentForm, shipmentLogsModal;
let brokerPriceInput, driverPayInput, calculatedProfitBox, resetColumnsBtn;
let columnToolbar, toggleColumnsBtn, filtersPanel, toggleFiltersBtn, timeFormatSelect, timeFormatDisplay, toggleSidebarBtn;
let shipmentModalTitle, shipmentSubmitBtn, shipmentLogsTitle, shipmentLogsContainer;
let visibleColumnList, hiddenColumnList;
let visibleColumnsZone, hiddenColumnsZone;
let filterCompanyReference, filterBrokerReference, filterCreatedDate, filterGlobalSearch, filterMonth;
let filterCreatedDatePickerBtn, filterMonthPickerBtn, pickupDatePickerBtn, deliveryDatePickerBtn, shipmentCreatedDatePickerBtn;
let editOnlyShipmentStatus, editOnlyPaymentStatus;
let pickupTimeInput, deliveryTimeInput;

let floatingActionMenu;
let floatingActionMenuOpen = false;

let confirmDeleteShipmentModal;
let cancelDeleteShipmentBtn;
let confirmDeleteShipmentBtn;
let pendingDeleteShipmentId = null;

let customSelectModal;
let customSelectTitle;
let customSelectSubtitle;
let customSelectSearch;
let customSelectList;
let customSelectCloseBtn;
let currentCustomSelectHandler = null;
let currentCustomSelectItems = [];

let isCreating = false;
let draggedColumnKey = null;
let allShipments = [];
let filteredShipments = [];
let managerStaffList = [];

const STATE_OPTIONS = [
    "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California",
    "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia",
    "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa",
    "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland",
    "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri",
    "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey",
    "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio",
    "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina",
    "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont",
    "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming",
    "DC - District of Columbia",
    "AB - Alberta", "BC - British Columbia", "MB - Manitoba", "NB - New Brunswick",
    "NL - Newfoundland and Labrador", "NS - Nova Scotia", "NT - Northwest Territories",
    "NU - Nunavut", "ON - Ontario", "PE - Prince Edward Island", "QC - Quebec",
    "SK - Saskatchewan", "YT - Yukon"
];

const ALL_COLUMNS = [
    { key: "company_reference", label: "Company Reference", visible: true },
    { key: "external_reference", label: "Broker Reference", visible: true },
    { key: "shipment_created_date", label: "Created Date", visible: true },
    { key: "unit_number", label: "Unit Number", visible: true },
    { key: "driver_name", label: "Driver Name", visible: true },
    { key: "business_name", label: "Business Name", visible: true },
    { key: "broker_name", label: "Broker Name", visible: true },
    { key: "pickup_city", label: "Pickup City", visible: true },
    { key: "pickup_state", label: "Pickup State", visible: true },
    { key: "pickup_datetime", label: "Pickup Datetime", visible: true },
    { key: "delivery_city", label: "Delivery City", visible: true },
    { key: "delivery_state", label: "Delivery State", visible: true },
    { key: "delivery_datetime", label: "Delivery Datetime", visible: true },
    { key: "miles", label: "Miles", visible: true },
    { key: "broker_price", label: "Broker Price", visible: true },
    { key: "driver_pay", label: "Driver Pay", visible: true },
    { key: "profit", label: "Profit", visible: true },
    { key: "percentage_of_margin", label: "Margin %", visible: true },
    { key: "loads_per_day", label: "Loads / Day", visible: true },
    { key: "dispatcher_commission_percent", label: "Commission %", visible: true },
    { key: "staff_full_name", label: "Staff Full Name", visible: true },
    { key: "shipment_status", label: "Status", visible: true },
    { key: "payment_status", label: "Payment Status", visible: true },
    { key: "comments", label: "Comments", visible: true },
    { key: "__actions__", label: "Actions", visible: true }
];

const REQUIRED_FIELD_IDS = [
    "shipment_created_date",
    "external_reference",
    "unit_number",
    "driver_name",
    "business_name",
    "broker_name",
    "pickup_city",
    "pickup_state",
    "pickup_date",
    "pickup_time",
    "delivery_city",
    "delivery_state",
    "delivery_date",
    "delivery_time",
    "broker_price",
    "driver_pay",
    "loads_per_day"
];

const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const STATUS_CLASS_MAP = {
    created: "status-created",
    picked_up: "status-picked_up",
    in_transit: "status-in_transit",
    delivered: "status-delivered",
    tonu: "status-tonu",
    deleted: "status-canceled"
};

let currentColumns = loadColumnsFromStorage();

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

function getCurrentUserId() {
    const user = getUserData();
    return Number(user?.staff_id || user?.id || 0);
}

function clearAuthAndRedirect() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "/login";
}

function logout() {
    clearAuthAndRedirect();
}

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
}

function isPrivilegedRole() {
    return PRIVILEGED_ROLES.has(getCurrentUserRole());
}

function isManagerRole() {
    return getCurrentUserRole() === "manager";
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

    if (!(options.body instanceof FormData)) {
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

function getShipmentsEndpoint() {
    return `${API_BASE_URL}/shipments/visible`;
}

function hideSidebarLinkByHref(href) {
    document.querySelectorAll(`a.nav-link[href="${href}"]`).forEach((el) => {
        el.style.display = "none";
    });
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

function getTimeFormat() {
    return localStorage.getItem(SHIPMENT_TIME_FORMAT_KEY) || "12";
}

function setTimeFormat(value) {
    localStorage.setItem(SHIPMENT_TIME_FORMAT_KEY, value);
    syncTimeFormatUI();
}

function getTimeFormatLabel(value) {
    return value === "24" ? "24 Hours" : "AM / PM";
}

function syncTimeFormatUI() {
    const format = getTimeFormat();

    if (timeFormatSelect) timeFormatSelect.value = format;
    if (timeFormatDisplay) timeFormatDisplay.value = getTimeFormatLabel(format);
}

function formatCurrencyOrDash(value) {
    if (value === null || value === undefined || value === "") return "—";
    return `$${Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function formatNumberOrDash(value) {
    if (value === null || value === undefined || value === "") return "—";
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDateOnly(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    });
}

function formatDateToSlash(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}

function parseSlashDate(value) {
    if (!value) return null;
    const text = String(value).trim();

    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const month = Number(match[1]);
    const day = Number(match[2]);
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

function normalizeDateTyping(input, onValidChange = null) {
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

    input.addEventListener("input", () => {
        formatCurrentValue();
        const parsed = parseSlashDate(input.value);
        if (parsed && typeof onValidChange === "function") {
            onValidChange(parsed);
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "." || e.key === "-") {
            e.preventDefault();
            formatCurrentValue();
        }
    });

    input.addEventListener("paste", () => {
        requestAnimationFrame(() => {
            formatCurrentValue();
            const parsed = parseSlashDate(input.value);
            if (parsed && typeof onValidChange === "function") {
                onValidChange(parsed);
            }
        });
    });

    input.addEventListener("blur", () => {
        const text = String(input.value || "").trim();

        if (!text) {
            input.classList.remove("field-error");
            if (typeof onValidChange === "function") onValidChange(null);
            return;
        }

        const parsed = parseSlashDate(text);
        if (!parsed) {
            input.classList.add("field-error");
            return;
        }

        input.value = formatDateToSlash(parsed);
        input.classList.remove("field-error");

        if (typeof onValidChange === "function") {
            onValidChange(parsed);
        }
    });
}

function formatMonthValue(year, monthIndex) {
    return `${MONTH_NAMES_SHORT[monthIndex]} ${year}`;
}

function parseMonthDisplay(value) {
    if (!value) return null;
    const match = String(value).trim().match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (!match) return null;

    const monthIndex = MONTH_NAMES_SHORT.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
    if (monthIndex < 0) return null;

    return {
        year: Number(match[2]),
        monthIndex
    };
}

function getMonthFilterValue() {
    const parsed = parseMonthDisplay(filterMonth?.value || "");
    if (!parsed) return "";
    return `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}`;
}

function formatTimeForDisplay(timeValue, forceFormat = null) {
    if (!timeValue) return "";
    const match = String(timeValue).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(timeValue);

    const hour24 = Number(match[1]);
    const minute = Number(match[2]);
    const format = forceFormat || getTimeFormat();

    if (format === "24") {
        return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function normalizeTimeInputValue(value) {
    if (!value) return "";
    const text = String(value).trim();

    let match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
    }

    match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
        let h = Number(match[1]);
        const m = Number(match[2]);
        const suffix = match[3].toUpperCase();

        if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
            if (suffix === "AM") {
                if (h === 12) h = 0;
            } else {
                if (h !== 12) h += 12;
            }
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
    }

    return "";
}

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).replace("T", " ");
    }

    const format = getTimeFormat();

    if (format === "24") {
        return date.toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    return date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function setTimeInputValue(inputId, hhmmValue) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const normalized = normalizeTimeInputValue(hhmmValue);
    input.value = normalized ? formatTimeForDisplay(normalized) : "";
    input.dataset.timeValue = normalized || "";
    input.classList.remove("field-error");
}

function getTimeInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return "";

    const normalizedTyped = normalizeTimeInputValue(input.value);
    if (normalizedTyped) {
        input.dataset.timeValue = normalizedTyped;
        return normalizedTyped;
    }

    return input.dataset.timeValue || "";
}

function refreshTimeDisplaysForFormatChange() {
    ["pickup_time", "delivery_time"].forEach(id => {
        const value = getTimeInputValue(id);
        if (value) {
            setTimeInputValue(id, value);
        }
    });
}

function handleManualTimeInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    const normalized = normalizeTimeInputValue(input.value);

    if (normalized) {
        input.dataset.timeValue = normalized;
        input.value = formatTimeForDisplay(normalized);
        input.classList.remove("field-error");
        return true;
    }

    input.dataset.timeValue = "";
    input.classList.add("field-error");
    return false;
}

function getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return null;

    if (id === "pickup_time" || id === "delivery_time") {
        return getTimeInputValue(id) || el.value || null;
    }

    return el.value || null;
}

function getNumericValue(id, fallback = 0) {
    const raw = document.getElementById(id)?.value;
    const num = Number(raw);
    return Number.isNaN(num) ? fallback : num;
}

function buildDateTime(dateId, timeId) {
    const dateValue = getInputValue(dateId);
    const rawTime = getInputValue(timeId);
    const time = normalizeTimeInputValue(rawTime);
    const isoDate = slashDateToIso(dateValue);

    if (!isoDate || !time) return null;
    return `${isoDate}T${time}`;
}

function buildCreatedDateTime(dateId) {
    const dateValue = getInputValue(dateId);
    const isoDate = slashDateToIso(dateValue);

    if (!isoDate) return null;
    return `${isoDate}T00:00`;
}

function splitDateTime(value) {
    if (!value) return { date: "", time: "" };

    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) {
        const [d, t] = String(value).split("T");
        const dateOnly = d ? formatDateToSlash(d) : "";
        return {
            date: dateOnly || "",
            time: normalizeTimeInputValue((t || "").slice(0, 5))
        };
    }

    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");

    return {
        date: formatDateToSlash(dateObj),
        time: `${hours}:${minutes}`
    };
}

function populateStateSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">Select state / province</option>`;
    STATE_OPTIONS.forEach(state => {
        const option = document.createElement("option");
        option.value = state.split(" - ")[0];
        option.textContent = state;
        select.appendChild(option);
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function canViewFinancials(item) {
    const role = getCurrentUserRole();
    const currentUserId = getCurrentUserId();

    if (PRIVILEGED_ROLES.has(role)) return true;
    if (role === "dispatcher") {
        return Number(item?.assigned_staff_id || 0) === currentUserId;
    }
    return false;
}

function getCellValue(item, key) {
    switch (key) {
        case "shipment_created_date":
            return formatDateOnly(item.shipment_created_date);
        case "pickup_datetime":
        case "delivery_datetime":
            return formatDateTime(item[key]);
        case "broker_price":
        case "driver_pay":
        case "profit":
            return formatCurrencyOrDash(item[key]);
        case "percentage_of_margin":
        case "dispatcher_commission_percent":
            return item[key] === null || item[key] === undefined || item[key] === ""
                ? "—"
                : `${Number(item[key]).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                })}%`;
        case "miles":
        case "loads_per_day":
            return formatNumberOrDash(item[key]);
        default:
            return item[key] ?? "—";
    }
}

function createLocationNode(text, type, shipmentStatus) {
    const span = document.createElement("span");
    const status = String(shipmentStatus || "").toLowerCase();

    let done = false;
    if (type === "pickup") {
        done = ["picked_up", "in_transit", "delivered"].includes(status);
    } else {
        done = ["delivered"].includes(status);
    }

    span.className = `location-pill ${done ? "loc-done" : "loc-pending"}`;
    span.textContent = text || "—";
    span.title = text || "—";
    return span;
}

function showTableLoading(message = "Loading shipments...") {
    if (!shipmentsTable) return;
    shipmentsTable.innerHTML = `
        <tr>
            <td colspan="${Math.max(getVisibleColumns().length, 1)}" class="empty-row">${message}</td>
        </tr>
    `;
}

function showTableError(message = "Failed to load shipments.") {
    if (!shipmentsTable) return;
    shipmentsTable.innerHTML = `
        <tr>
            <td colspan="${Math.max(getVisibleColumns().length, 1)}" class="empty-row">${message}</td>
        </tr>
    `;
}

function createTextCell(text, extraClass = "") {
    const td = document.createElement("td");
    if (extraClass) td.className = extraClass;
    td.textContent = text ?? "—";
    td.title = text ?? "—";
    return td;
}

function createHtmlCell(node, extraClass = "") {
    const td = document.createElement("td");
    if (extraClass) td.className = extraClass;
    td.appendChild(node);
    return td;
}

function createMaskedFinanceCell() {
    const td = document.createElement("td");
    td.className = "masked-finance";
    td.textContent = "Hidden";
    td.title = "Visible only to owner or privileged roles";
    return td;
}

function getDefaultColumns() {
    return ALL_COLUMNS.map(col => ({ ...col }));
}

function loadColumnsFromStorage() {
    try {
        const raw = localStorage.getItem(SHIPMENT_COLUMNS_KEY);
        if (!raw) return getDefaultColumns();

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return getDefaultColumns();

        const validKeys = new Set(ALL_COLUMNS.map(col => col.key));
        const filtered = parsed.filter(col => validKeys.has(col.key));
        const missing = ALL_COLUMNS.filter(defaultCol => !filtered.some(col => col.key === defaultCol.key));

        return [...filtered, ...missing.map(col => ({ ...col }))];
    } catch {
        return getDefaultColumns();
    }
}

function saveColumnsToStorage() {
    localStorage.setItem(SHIPMENT_COLUMNS_KEY, JSON.stringify(currentColumns));
}

function resetColumns() {
    currentColumns = getDefaultColumns();
    saveColumnsToStorage();
    renderColumnManager();
    renderHeader();
    renderShipmentsTable(filteredShipments);
}

function getVisibleColumns() {
    return currentColumns.filter(col => col.visible);
}

function getHiddenColumns() {
    return currentColumns.filter(col => !col.visible);
}

function renderHeader() {
    if (!shipmentsHeaderRow) return;

    shipmentsHeaderRow.innerHTML = "";
    for (const col of getVisibleColumns()) {
        const th = document.createElement("th");
        th.textContent = col.label;
        shipmentsHeaderRow.appendChild(th);
    }
}

function removeColumnByKey(key) {
    const idx = currentColumns.findIndex(col => col.key === key);
    if (idx >= 0) {
        return currentColumns.splice(idx, 1)[0];
    }
    return null;
}

function moveColumnToVisible(key, targetIndex = null) {
    const column = removeColumnByKey(key);
    if (!column) return;
    column.visible = true;

    const visible = getVisibleColumns();
    const hidden = getHiddenColumns();

    if (targetIndex === null || targetIndex > visible.length) {
        visible.push(column);
    } else {
        visible.splice(targetIndex, 0, column);
    }

    currentColumns = [...visible, ...hidden];
}

function moveColumnToHidden(key, targetIndex = null) {
    const column = removeColumnByKey(key);
    if (!column) return;
    column.visible = false;

    const visible = getVisibleColumns();
    const hidden = getHiddenColumns();

    if (targetIndex === null || targetIndex > hidden.length) {
        hidden.push(column);
    } else {
        hidden.splice(targetIndex, 0, column);
    }

    currentColumns = [...visible, ...hidden];
}

function createColumnChip(col, index, zoneType) {
    const chip = document.createElement("div");
    chip.className = "column-chip";
    chip.draggable = true;
    chip.dataset.key = col.key;
    chip.dataset.zone = zoneType;
    chip.dataset.index = String(index);

    if (zoneType === "visible") {
        const order = document.createElement("span");
        order.className = "column-chip-order";
        order.textContent = String(index + 1);
        chip.appendChild(order);
    }

    const label = document.createElement("span");
    label.textContent = col.label;
    chip.appendChild(label);

    chip.addEventListener("dragstart", () => {
        draggedColumnKey = col.key;
        chip.classList.add("dragging");
    });

    chip.addEventListener("dragend", () => {
        chip.classList.remove("dragging");
    });

    chip.addEventListener("dblclick", () => {
        if (zoneType === "visible") {
            moveColumnToHidden(col.key);
        } else {
            moveColumnToVisible(col.key);
        }
        saveColumnsToStorage();
        renderColumnManager();
        renderHeader();
        renderShipmentsTable(filteredShipments);
    });

    return chip;
}

function setupDropZone(zoneEl, zoneType) {
    if (!zoneEl) return;

    zoneEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        zoneEl.classList.add("zone-drop-hover");
    });

    zoneEl.addEventListener("dragleave", () => {
        zoneEl.classList.remove("zone-drop-hover");
    });

    zoneEl.addEventListener("drop", (e) => {
        e.preventDefault();
        zoneEl.classList.remove("zone-drop-hover");

        if (!draggedColumnKey) return;

        if (zoneType === "visible") {
            moveColumnToVisible(draggedColumnKey);
        } else {
            moveColumnToHidden(draggedColumnKey);
        }

        saveColumnsToStorage();
        renderColumnManager();
        renderHeader();
        renderShipmentsTable(filteredShipments);
        draggedColumnKey = null;
    });
}

function renderColumnManager() {
    if (!visibleColumnList || !hiddenColumnList) return;

    visibleColumnList.innerHTML = "";
    hiddenColumnList.innerHTML = "";

    getVisibleColumns().forEach((col, index) => {
        visibleColumnList.appendChild(createColumnChip(col, index, "visible"));
    });

    getHiddenColumns().forEach((col, index) => {
        hiddenColumnList.appendChild(createColumnChip(col, index, "hidden"));
    });
}

function closeFloatingActionMenu() {
    if (!floatingActionMenu) return;
    floatingActionMenu.classList.remove("open");
    floatingActionMenu.innerHTML = "";
    floatingActionMenuOpen = false;
    delete floatingActionMenu.dataset.shipmentId;
}

function appendFloatingMenuButton(text, onClick, danger = false) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    if (danger) btn.style.color = "#fca5a5";

    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        closeFloatingActionMenu();
        await onClick();
    });

    floatingActionMenu.appendChild(btn);
}

function appendFloatingDivider() {
    const divider = document.createElement("div");
    divider.className = "action-divider";
    floatingActionMenu.appendChild(divider);
}

function getNextStatusActions(currentStatus) {
    const status = String(currentStatus || "").toLowerCase();

    if (status === "created") {
        return [{ label: "Set Picked Up", value: "picked_up" }];
    }

    if (status === "picked_up") {
        return [{ label: "Set In Transit", value: "in_transit" }];
    }

    if (status === "in_transit") {
        return [{ label: "Set Delivered", value: "delivered" }];
    }

    return [];
}

function positionFloatingMenu(anchorBtn) {
    if (!floatingActionMenu) return;
    const rect = anchorBtn.getBoundingClientRect();

    const menuWidth = 190;
    const menuHeightEstimate = 240;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 6;

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
    }

    if (top + menuHeightEstimate > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - menuHeightEstimate - 8);
    }

    floatingActionMenu.style.left = `${left}px`;
    floatingActionMenu.style.top = `${top}px`;
}

function openFloatingActionMenu(anchorBtn, item) {
    if (!floatingActionMenu) return;

    floatingActionMenu.innerHTML = "";

    appendFloatingMenuButton("Edit Shipment", async () => {
        await openEditModal(item);
    });

    appendFloatingMenuButton("View Logs", async () => {
        await openShipmentLogs(item);
    });

    const nextActions = getNextStatusActions(item.shipment_status);
    if (nextActions.length) {
        appendFloatingDivider();
        nextActions.forEach(statusItem => {
            appendFloatingMenuButton(statusItem.label, async () => {
                await updateShipmentStatus(item.shipment_id, statusItem.value);
            });
        });
    }

    appendFloatingDivider();
    appendFloatingMenuButton("Delete Shipment", async () => {
        await deleteShipment(item.shipment_id);
    }, true);

    positionFloatingMenu(anchorBtn);
    requestAnimationFrame(() => {
        floatingActionMenu.classList.add("open");
        floatingActionMenuOpen = true;
    });
}

function createActionsCell(item) {
    const td = document.createElement("td");
    td.className = "actions-cell";

    const btn = document.createElement("button");
    btn.className = "action-menu-btn";
    btn.type = "button";
    btn.textContent = "⋯";

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        const sameTarget = floatingActionMenuOpen && floatingActionMenu.dataset.shipmentId === String(item.shipment_id);
        closeFloatingActionMenu();

        if (sameTarget) return;

        floatingActionMenu.dataset.shipmentId = String(item.shipment_id);
        openFloatingActionMenu(btn, item);
    });

    td.appendChild(btn);
    return td;
}

function getStatusClass(status) {
    const key = (status || "").toLowerCase();
    const modifier = STATUS_CLASS_MAP[key] || "status-created";
    return `shipment-status ${modifier}`;
}

function createStatusCell(item) {
    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = getStatusClass(item.shipment_status);
    badge.textContent = item.shipment_status || "—";
    statusTd.appendChild(badge);
    return statusTd;
}

function matchesMonthFilter(item, monthValue) {
    if (!monthValue) return true;
    const created = item.shipment_created_date;
    if (!created) return false;

    const date = new Date(created);
    if (Number.isNaN(date.getTime())) return String(created).startsWith(monthValue);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}` === monthValue;
}

function applyFilters(data) {
    const companyRef = (filterCompanyReference?.value || "").trim().toLowerCase();
    const brokerRef = (filterBrokerReference?.value || "").trim().toLowerCase();
    const createdDate = (filterCreatedDate?.value || "").trim();
    const globalSearch = (filterGlobalSearch?.value || "").trim().toLowerCase();
    const monthValue = getMonthFilterValue();

    return (data || []).filter(item => {
        if (companyRef && !(item.company_reference || "").toLowerCase().includes(companyRef)) {
            return false;
        }

        if (brokerRef && !(item.external_reference || "").toLowerCase().includes(brokerRef)) {
            return false;
        }

        if (createdDate) {
            const formattedCreated = formatDateToSlash(item.shipment_created_date);
            if (!formattedCreated.includes(createdDate)) return false;
        }

        if (!matchesMonthFilter(item, monthValue)) {
            return false;
        }

        if (globalSearch) {
            const haystack = [
                item.company_reference,
                item.external_reference,
                item.unit_number,
                item.driver_name,
                item.business_name,
                item.broker_name,
                item.pickup_city,
                item.pickup_state,
                item.delivery_city,
                item.delivery_state,
                item.staff_full_name,
                item.shipment_status,
                item.payment_status,
                item.comments
            ].join(" ").toLowerCase();

            if (!haystack.includes(globalSearch)) {
                return false;
            }
        }

        return true;
    });
}

function renderShipmentsTable(data) {
    if (!shipmentsTable) return;

    shipmentsTable.innerHTML = "";
    closeFloatingActionMenu();

    if (!Array.isArray(data) || data.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = Math.max(getVisibleColumns().length, 1);
        td.className = "empty-row";
        td.textContent = "No shipments found.";
        tr.appendChild(td);
        shipmentsTable.appendChild(tr);
        return;
    }

    const visibleColumns = getVisibleColumns();

    for (const item of data) {
        const tr = document.createElement("tr");
        const financialAllowed = canViewFinancials(item);

        visibleColumns.forEach(col => {
            if (col.key === "__actions__") {
                tr.appendChild(createActionsCell(item));
                return;
            }

            if (col.key === "shipment_status") {
                tr.appendChild(createStatusCell(item));
                return;
            }

            if (RESTRICTED_FINANCIAL_KEYS.has(col.key) && !financialAllowed) {
                tr.appendChild(createMaskedFinanceCell());
                return;
            }

            if (col.key === "pickup_city" || col.key === "pickup_state") {
                tr.appendChild(createHtmlCell(
                    createLocationNode(getCellValue(item, col.key), "pickup", item.shipment_status)
                ));
                return;
            }

            if (col.key === "delivery_city" || col.key === "delivery_state") {
                tr.appendChild(createHtmlCell(
                    createLocationNode(getCellValue(item, col.key), "delivery", item.shipment_status)
                ));
                return;
            }

            const extraClass = ["comments", "business_name", "broker_name"].includes(col.key) ? "wide-cell" : "";
            tr.appendChild(createTextCell(getCellValue(item, col.key), extraClass));
        });

        shipmentsTable.appendChild(tr);
    }
}

function refreshFilteredView() {
    filteredShipments = applyFilters(allShipments);
    renderShipmentsTable(filteredShipments);
}

async function loadShipments() {
    showTableLoading();

    try {
        const response = await fetchWithAuth(getShipmentsEndpoint());
        if (!response) return;

        if (response.status === 403) {
            showTableError("You don't have permission to view shipments.");
            return;
        }

        if (!response.ok) {
            showTableError("Server returned an error. Please try again.");
            return;
        }

        const data = await response.json();
        const rawShipments = Array.isArray(data) ? data : [];

        allShipments = rawShipments.filter(item => {
            const status = String(item?.shipment_status || "").toLowerCase();
            return status !== "canceled" && status !== "cancelled" && status !== "deleted";
        });

        allShipments.forEach(item => {
            if (item?.broker_name) {
                saveBrokerNameToHistory(item.broker_name);
            }
        });

        renderBrokerNameSuggestions();
        refreshFilteredView();
    } catch (err) {
        console.error("Shipments load error:", err);
        showTableError("Failed to load shipments.");
    }
}

function clearFormErrors() {
    REQUIRED_FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("field-error");
    });
}

function validateRequiredFields() {
    clearFormErrors();

    const missing = [];

    REQUIRED_FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const value = String(el.value ?? "").trim();
        if (!value) {
            el.classList.add("field-error");
            missing.push(id);
        }
    });

    const shipmentCreatedDate = parseSlashDate(getInputValue("shipment_created_date"));
    const pickupDate = parseSlashDate(getInputValue("pickup_date"));
    const deliveryDate = parseSlashDate(getInputValue("delivery_date"));

    if (getInputValue("shipment_created_date") && !shipmentCreatedDate) {
        document.getElementById("shipment_created_date")?.classList.add("field-error");
        missing.push("shipment_created_date_format");
    }

    if (getInputValue("pickup_date") && !pickupDate) {
        document.getElementById("pickup_date")?.classList.add("field-error");
        missing.push("pickup_date_format");
    }

    if (getInputValue("delivery_date") && !deliveryDate) {
        document.getElementById("delivery_date")?.classList.add("field-error");
        missing.push("delivery_date_format");
    }

    ["pickup_time", "delivery_time"].forEach(id => {
        if (!handleManualTimeInput(id)) {
            document.getElementById(id)?.classList.add("field-error");
            missing.push(`${id}_format`);
        }
    });

    return missing.length === 0;
}

function saveBrokerNameToHistory(name) {
    const clean = String(name || "").trim();
    if (!clean) return;

    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(BROKER_NAMES_KEY) || "[]");
        if (!Array.isArray(list)) list = [];
    } catch {
        list = [];
    }

    const normalized = clean.toLowerCase();
    list = list.filter(item => String(item).trim().toLowerCase() !== normalized);
    list.unshift(clean);

    if (list.length > 50) list = list.slice(0, 50);
    localStorage.setItem(BROKER_NAMES_KEY, JSON.stringify(list));
}

function renderBrokerNameSuggestions() {
    const datalist = document.getElementById("brokerNameSuggestions");
    if (!datalist) return;

    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(BROKER_NAMES_KEY) || "[]");
        if (!Array.isArray(list)) list = [];
    } catch {
        list = [];
    }

    datalist.innerHTML = "";
    list.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        datalist.appendChild(option);
    });
}

function openCustomSelectModal({ title, subtitle, items, onSelect }) {
    if (!customSelectModal || !customSelectList) return;

    currentCustomSelectItems = Array.isArray(items) ? items : [];
    currentCustomSelectHandler = onSelect || null;

    customSelectTitle.textContent = title || "Select Option";
    customSelectSubtitle.textContent = subtitle || "Choose one value";
    customSelectSearch.value = "";

    renderCustomSelectItems("");

    customSelectModal.style.display = "flex";
}

function closeCustomSelectModal() {
    if (!customSelectModal) return;
    customSelectModal.style.display = "none";
    currentCustomSelectItems = [];
    currentCustomSelectHandler = null;
    if (customSelectSearch) customSelectSearch.value = "";
}

function renderCustomSelectItems(searchText = "") {
    if (!customSelectList) return;

    const q = String(searchText || "").trim().toLowerCase();
    customSelectList.innerHTML = "";

    const filtered = currentCustomSelectItems.filter(item => {
        if (!q) return true;
        return String(item.search || "").toLowerCase().includes(q);
    });

    if (!filtered.length) {
        customSelectList.innerHTML = `<div class="empty-logs">No results found.</div>`;
        return;
    }

    filtered.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "small-btn";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.padding = "12px 14px";
        btn.style.display = "block";
        btn.style.marginBottom = "8px";

        btn.innerHTML = `
            <div style="font-weight:700; color:#e5eefb;">${escapeHtml(item.label || "")}</div>
            ${item.meta ? `<div style="font-size:12px; color:#8ea0b8; margin-top:4px;">${escapeHtml(item.meta)}</div>` : ""}
        `;

        btn.addEventListener("click", () => {
            if (typeof currentCustomSelectHandler === "function") {
                currentCustomSelectHandler(item);
            }
            closeCustomSelectModal();
        });

        customSelectList.appendChild(btn);
    });
}

function openShipmentStatusPicker() {
    openCustomSelectModal({
        title: "Select Shipment Status",
        subtitle: "Choose shipment operational status",
        items: SHIPMENT_STATUS_OPTIONS.map(item => ({
            ...item,
            search: `${item.label} ${item.value}`
        })),
        onSelect: (item) => {
            const hidden = document.getElementById("edit_shipment_status");
            const display = document.getElementById("edit_shipment_status_display");
            if (hidden) hidden.value = item.value;
            if (display) display.value = item.label;
        }
    });
}

function openDriverPaymentStatusPicker() {
    openCustomSelectModal({
        title: "Select Driver Payment Status",
        subtitle: "Choose driver payment state",
        items: DRIVER_PAYMENT_STATUS_OPTIONS.map(item => ({
            ...item,
            search: `${item.label} ${item.value}`
        })),
        onSelect: (item) => {
            const hidden = document.getElementById("edit_payment_status");
            const display = document.getElementById("edit_payment_status_display");
            if (hidden) hidden.value = item.value;
            if (display) display.value = item.label;
        }
    });
}

function openBrokerPaymentOptionPicker() {
    openCustomSelectModal({
        title: "Select Broker Payment Option",
        subtitle: "Choose broker payment option",
        items: BROKER_PAYMENT_OPTION_OPTIONS.map(item => ({
            ...item,
            search: `${item.label} ${item.value}`
        })),
        onSelect: (item) => {
            const hidden = document.getElementById("payment_option");
            const display = document.getElementById("payment_option_display");
            if (hidden) hidden.value = item.value;
            if (display) display.value = item.label;
        }
    });
}

function setShipmentStatusValue(value) {
    const hidden = document.getElementById("edit_shipment_status");
    const display = document.getElementById("edit_shipment_status_display");
    const item = SHIPMENT_STATUS_OPTIONS.find(x => x.value === value) || SHIPMENT_STATUS_OPTIONS[0];
    if (hidden) hidden.value = item.value;
    if (display) display.value = item.label;
}

function setDriverPaymentStatusValue(value) {
    const hidden = document.getElementById("edit_payment_status");
    const display = document.getElementById("edit_payment_status_display");
    const item = DRIVER_PAYMENT_STATUS_OPTIONS.find(x => x.value === value) || DRIVER_PAYMENT_STATUS_OPTIONS[0];
    if (hidden) hidden.value = item.value;
    if (display) display.value = item.label;
}

function setBrokerPaymentOptionValue(value) {
    const hidden = document.getElementById("payment_option");
    const display = document.getElementById("payment_option_display");
    const item = BROKER_PAYMENT_OPTION_OPTIONS.find(x => x.value === value) || BROKER_PAYMENT_OPTION_OPTIONS[0];
    if (hidden) hidden.value = item.value;
    if (display) display.value = item.label;
}

function getStaffDisplayName(staff) {
    if (!staff) return "";
    return `${staff.staff_full_name} (${staff.job_title})`;
}

function setAssignedStaffValue(staffId) {
    const hiddenInput = document.getElementById("assigned_staff_id");
    const displayInput = document.getElementById("assigned_staff_id_display");

    if (!hiddenInput || !displayInput) return;

    const numericId = Number(staffId || 0);
    hiddenInput.value = numericId ? String(numericId) : "";

    const staff = managerStaffList.find(item => Number(item.staff_id) === numericId);

    if (staff) {
        displayInput.value = `${staff.staff_full_name} (${staff.job_title})`;
        displayInput.dataset.staffId = String(staff.staff_id);
        displayInput.dataset.staffName = staff.staff_full_name || "";
    } else {
        displayInput.value = "";
        displayInput.dataset.staffId = "";
        displayInput.dataset.staffName = "";
    }
}

function openAssignedStaffPicker() {
    if (!isManagerRole()) return;
    if (!managerStaffList.length) return;

    openCustomSelectModal({
        title: "Select Shipment Owner",
        subtitle: "Choose which staff member this shipment belongs to",
        items: managerStaffList.map(staff => ({
            value: String(staff.staff_id),
            label: staff.staff_full_name || "",
            meta: `ID: ${staff.staff_id} • ${staff.staff_username || ""} • ${staff.job_title || ""}`,
            search: [
                staff.staff_full_name || "",
                staff.staff_username || "",
                staff.job_title || "",
                String(staff.staff_id || "")
            ].join(" ")
        })),
        onSelect: (item) => {
            setAssignedStaffValue(Number(item.value));
        }
    });
}

function populateAssignedStaffSelect(selectedId = null) {
    if (!isManagerRole()) return;

    const hiddenInput = document.getElementById("assigned_staff_id");
    const displayInput = document.getElementById("assigned_staff_id_display");

    if (!hiddenInput || !displayInput) return;

    let finalId = Number(selectedId || 0);
    if (!finalId) {
        finalId = getCurrentUserId();
    }

    setAssignedStaffValue(finalId);
}

async function loadStaffListForManager() {
    if (!isManagerRole()) return;

    const response = await fetchWithAuth(`${API_BASE_URL}/users/all`, {
        method: "GET"
    });

    if (!response || !response.ok) {
        managerStaffList = [];
        return;
    }

    const data = await response.json();
    managerStaffList = Array.isArray(data) ? data : [];

    populateAssignedStaffSelect(getCurrentUserId());

    const displayInput = document.getElementById("assigned_staff_id_display");
    if (displayInput) {
        displayInput.removeEventListener("click", openAssignedStaffPicker);
        displayInput.addEventListener("click", openAssignedStaffPicker);
    }
}

function resetShipmentForm() {
    shipmentForm?.reset();
    clearFormErrors();

    document.getElementById("edit_shipment_id").value = "";
    setShipmentStatusValue("created");
    setDriverPaymentStatusValue("unpaid");
    setBrokerPaymentOptionValue("");

    if (isManagerRole()) {
        populateAssignedStaffSelect(getCurrentUserId());
    }

    setTimeInputValue("pickup_time", "");
    setTimeInputValue("delivery_time", "");

    if (calculatedProfitBox) {
        calculatedProfitBox.textContent = "Profit: $0";
    }
}

function openDeleteShipmentModal(id) {
    pendingDeleteShipmentId = id;
    if (confirmDeleteShipmentModal) {
        confirmDeleteShipmentModal.style.display = "flex";
    }
}

function closeDeleteShipmentModal() {
    pendingDeleteShipmentId = null;
    if (confirmDeleteShipmentModal) {
        confirmDeleteShipmentModal.style.display = "none";
    }
}

async function executeDeleteShipment() {
    if (!pendingDeleteShipmentId) return;

    try {
        let response = await fetchWithAuth(`${API_BASE_URL}/shipments/delete/${pendingDeleteShipmentId}`, {
            method: "DELETE"
        });

        if (!response || response.status === 404 || response.status === 405) {
            response = await fetchWithAuth(`${API_BASE_URL}/shipments/delete`, {
                method: "DELETE",
                body: JSON.stringify({ shipment_id: pendingDeleteShipmentId })
            });
        }

        closeDeleteShipmentModal();
        await loadShipments();
    } catch (e) {
        console.error(e);
    }
}

async function deleteShipment(shipmentId) {
    openDeleteShipmentModal(shipmentId);
}

function openCreateModal() {
    resetShipmentForm();
    document.getElementById("edit_shipment_id").value = "";
    shipmentModalTitle.textContent = "Create Shipment";
    shipmentSubmitBtn.textContent = "Save";
    shipmentSubmitBtn.disabled = false;
    editOnlyShipmentStatus.style.display = "none";
    editOnlyPaymentStatus.style.display = "none";

    if (isManagerRole()) {
        populateAssignedStaffSelect(getCurrentUserId());
    }

    openModal();
}

async function openEditModal(item) {
    resetShipmentForm();

    document.getElementById("edit_shipment_id").value = String(item.shipment_id || "");
    shipmentModalTitle.textContent = `Edit Shipment #${item.shipment_id}`;
    shipmentSubmitBtn.textContent = "Save";
    shipmentSubmitBtn.disabled = false;

    editOnlyShipmentStatus.style.display = "";
    editOnlyPaymentStatus.style.display = "";

    document.getElementById("shipment_created_date").value = formatDateToSlash(item.shipment_created_date);
    document.getElementById("external_reference").value = item.external_reference || "";
    document.getElementById("unit_number").value = item.unit_number || "";
    document.getElementById("driver_name").value = item.driver_name || "";
    document.getElementById("business_name").value = item.business_name || "";
    document.getElementById("broker_name").value = item.broker_name || "";
    document.getElementById("pickup_city").value = item.pickup_city || "";
    document.getElementById("pickup_state").value = item.pickup_state || "";
    document.getElementById("delivery_city").value = item.delivery_city || "";
    document.getElementById("delivery_state").value = item.delivery_state || "";
    document.getElementById("miles").value = item.miles ?? 0;
    document.getElementById("broker_price").value = item.broker_price ?? 0;
    document.getElementById("driver_pay").value = item.driver_pay ?? 0;
    document.getElementById("loads_per_day").value = item.loads_per_day ?? 0;
    document.getElementById("dispatcher_commission_percent").value = item.dispatcher_commission_percent ?? 0;
    document.getElementById("comments").value = item.comments || "";

    setShipmentStatusValue(item.shipment_status || "created");
    setDriverPaymentStatusValue(item.payment_status || "unpaid");
    setBrokerPaymentOptionValue(item.payment_option || "");

    const pickupParts = splitDateTime(item.pickup_datetime);
    const deliveryParts = splitDateTime(item.delivery_datetime);

    document.getElementById("pickup_date").value = pickupParts.date || "";
    document.getElementById("delivery_date").value = deliveryParts.date || "";
    setTimeInputValue("pickup_time", pickupParts.time || "");
    setTimeInputValue("delivery_time", deliveryParts.time || "");

    if (isManagerRole()) {
        populateAssignedStaffSelect(item.assigned_staff_id || getCurrentUserId());
    }

    calculateProfit();
    openModal();
}

function openModal() {
    if (shipmentModal) shipmentModal.style.display = "flex";
}

function closeModal() {
    if (shipmentModal) shipmentModal.style.display = "none";
}

function openLogsModal() {
    if (shipmentLogsModal) shipmentLogsModal.style.display = "flex";
}

function closeLogsModal() {
    if (shipmentLogsModal) shipmentLogsModal.style.display = "none";
}

window.openModal = openModal;
window.closeModal = closeModal;
window.openCreateModal = openCreateModal;
window.closeLogsModal = closeLogsModal;

function calculateProfit() {
    if (!brokerPriceInput || !driverPayInput || !calculatedProfitBox) return;

    const broker = Number(brokerPriceInput.value) || 0;
    const driver = Number(driverPayInput.value) || 0;
    const profit = broker - driver;

    calculatedProfitBox.textContent = `Profit: $${profit.toLocaleString()}`;
}

async function updateShipmentStatus(shipmentId, newStatus) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/shipments/update`, {
            method: "PUT",
            body: JSON.stringify({
                shipment_id: shipmentId,
                shipment_status: newStatus
            })
        });

        if (!response) return;

        let result = {};
        try {
            result = await response.json();
        } catch {}

        if (!response.ok) {
            alert(result.detail || "Failed to update shipment status.");
            return;
        }

        await loadShipments();
    } catch (err) {
        console.error("Status update error:", err);
        alert("Server error while updating shipment status.");
    }
}

async function fetchShipmentLogs(shipmentId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/shipments/logs/${shipmentId}`, {
        method: "GET"
    });

    if (!response || !response.ok) return null;

    try {
        return await response.json();
    } catch {
        return [];
    }
}

function renderLogs(logs, shipmentId) {
    shipmentLogsTitle.textContent = `Shipment Logs #${shipmentId}`;
    shipmentLogsContainer.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
        shipmentLogsContainer.innerHTML = `<div class="empty-logs">No logs found for this shipment.</div>`;
        return;
    }

    logs.forEach(log => {
        const card = document.createElement("div");
        card.className = "log-card";

        const userName =
            log.changed_by_name ||
            log.staff_full_name ||
            log.username ||
            "Unknown User";

        const changedAt = formatDateTime(log.created_at || log.updated_at);
        const fieldName = log.field_name || "Change";

        const oldValue =
            log.old_value === null || log.old_value === undefined || log.old_value === ""
                ? "—"
                : String(log.old_value);

        const newValue =
            log.new_value === null || log.new_value === undefined || log.new_value === ""
                ? "—"
                : String(log.new_value);

        card.innerHTML = `
            <div class="log-card-top">
                <div class="log-user">${escapeHtml(userName)}</div>
                <div class="log-date">${escapeHtml(changedAt)}</div>
            </div>
            <div class="log-field">${escapeHtml(fieldName)}</div>
            <div class="log-values">
                <div class="log-value-box"><strong>Old:</strong> ${escapeHtml(oldValue)}</div>
                <div class="log-value-box"><strong>New:</strong> ${escapeHtml(newValue)}</div>
            </div>
        `;

        shipmentLogsContainer.appendChild(card);
    });
}

async function openShipmentLogs(item) {
    openLogsModal();
    shipmentLogsTitle.textContent = `Shipment Logs #${item.shipment_id}`;
    shipmentLogsContainer.innerHTML = `<div class="empty-logs">Loading logs...</div>`;

    const logs = await fetchShipmentLogs(item.shipment_id);
    renderLogs(logs || [], item.shipment_id);
}

async function saveShipment(event) {
    event.preventDefault();

    if (isCreating) return;
    if (!validateRequiredFields()) {
        alert("Please fill all required fields correctly.");
        return;
    }

    const editShipmentId = document.getElementById("edit_shipment_id").value;

    const payload = {
        company_id: 1,
        shipment_created_date: buildCreatedDateTime("shipment_created_date"),
        external_reference: getInputValue("external_reference"),
        unit_number: getInputValue("unit_number"),
        driver_name: getInputValue("driver_name"),
        business_name: getInputValue("business_name"),
        broker_name: getInputValue("broker_name"),
        pickup_city: getInputValue("pickup_city"),
        pickup_state: getInputValue("pickup_state"),
        pickup_datetime: buildDateTime("pickup_date", "pickup_time"),
        delivery_city: getInputValue("delivery_city"),
        delivery_state: getInputValue("delivery_state"),
        delivery_datetime: buildDateTime("delivery_date", "delivery_time"),
        miles: getNumericValue("miles", 0),
        broker_price: getNumericValue("broker_price", 0),
        driver_pay: getNumericValue("driver_pay", 0),
        loads_per_day: getNumericValue("loads_per_day", 0),
        dispatcher_commission_percent: getNumericValue("dispatcher_commission_percent", 0),
        payment_option: getInputValue("payment_option"),
        comments: getInputValue("comments")
    };

    if (isManagerRole()) {
        const assignedStaffId = document.getElementById("assigned_staff_id")?.value || "";
        if (assignedStaffId) {
            payload.assigned_staff_id = Number(assignedStaffId);
        }
    }

    if (!payload.shipment_created_date || !payload.pickup_datetime || !payload.delivery_datetime) {
        alert("Created, pickup, and delivery date/time are required.");
        return;
    }

    if (payload.broker_price < 0 || payload.driver_pay < 0) {
        alert("Broker price and driver pay cannot be negative.");
        return;
    }

    isCreating = true;
    shipmentSubmitBtn.disabled = true;
    shipmentSubmitBtn.textContent = "Saving...";

    try {
        let response;

        if (editShipmentId) {
            response = await fetchWithAuth(`${API_BASE_URL}/shipments/update`, {
                method: "PUT",
                body: JSON.stringify({
                    shipment_id: Number(editShipmentId),
                    shipment_status: getInputValue("edit_shipment_status") || "created",
                    payment_status: getInputValue("edit_payment_status") || "unpaid",
                    ...payload
                })
            });
        } else {
            response = await fetchWithAuth(`${API_BASE_URL}/shipments/create`, {
                method: "POST",
                body: JSON.stringify({
                    ...payload,
                    shipment_status: "created",
                    payment_status: "unpaid"
                })
            });
        }

        if (!response) return;

        let result = {};
        try {
            result = await response.json();
        } catch {}

        if (!response.ok) {
            alert(result.detail || "Failed to save shipment.");
            return;
        }

        const brokerName = getInputValue("broker_name");
        if (brokerName) {
            saveBrokerNameToHistory(brokerName);
            renderBrokerNameSuggestions();
        }

        closeModal();
        resetShipmentForm();
        await loadShipments();
    } catch (err) {
        console.error("Save shipment error:", err);
        alert("Server error while saving shipment.");
    } finally {
        isCreating = false;
        shipmentSubmitBtn.disabled = false;
        shipmentSubmitBtn.textContent = "Save";
    }
}

function setDefaultMonthFilter() {
    const now = new Date();
    filterMonth.value = formatMonthValue(now.getFullYear(), now.getMonth());
}

function bindFilterEvents() {
    [filterCompanyReference, filterBrokerReference, filterGlobalSearch].forEach(el => {
        if (!el) return;
        el.addEventListener("input", refreshFilteredView);
        el.addEventListener("change", refreshFilteredView);
    });

    if (filterCreatedDate) {
        normalizeDateTyping(filterCreatedDate, refreshFilteredView);
        filterCreatedDate.addEventListener("change", refreshFilteredView);
    }

    if (filterMonth) {
        filterMonth.addEventListener("change", refreshFilteredView);
    }
}

function bindDateAndTimeInputs() {
    [
        document.getElementById("shipment_created_date"),
        document.getElementById("pickup_date"),
        document.getElementById("delivery_date")
    ].forEach(el => normalizeDateTyping(el));

    ["pickup_time", "delivery_time"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("blur", () => {
            handleManualTimeInput(id);
        });

        el.addEventListener("dblclick", () => {
            const current = getTimeInputValue(id) || "08:00";
            const typed = prompt("Enter time in HH:MM or H:MM AM/PM", formatTimeForDisplay(current));
            if (typed !== null) {
                const normalized = normalizeTimeInputValue(typed);
                if (normalized) {
                    setTimeInputValue(id, normalized);
                } else {
                    el.classList.add("field-error");
                }
            }
        });
    });

    [
        ["shipmentCreatedDatePickerBtn", "shipment_created_date"],
        ["pickupDatePickerBtn", "pickup_date"],
        ["deliveryDatePickerBtn", "delivery_date"],
        ["filterCreatedDatePickerBtn", "filterCreatedDate"]
    ].forEach(([btnId, inputId]) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.addEventListener("click", () => {
            input.focus();
        });
    });

    if (filterMonthPickerBtn && filterMonth) {
        filterMonthPickerBtn.addEventListener("click", () => {
            const typed = prompt("Enter month as Mon YYYY", filterMonth.value || formatMonthValue(new Date().getFullYear(), new Date().getMonth()));
            if (typed !== null) {
                filterMonth.value = typed;
                refreshFilteredView();
            }
        });
    }
}

document.addEventListener("click", (e) => {
    if (floatingActionMenuOpen && floatingActionMenu && !floatingActionMenu.contains(e.target)) {
        closeFloatingActionMenu();
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    shipmentsTable = document.getElementById("shipmentsTable");
    shipmentsHeaderRow = document.getElementById("shipmentsHeaderRow");
    logoutBtn = document.getElementById("logoutBtn");
    shipmentModal = document.getElementById("shipmentModal");
    shipmentForm = document.getElementById("shipmentForm");
    shipmentLogsModal = document.getElementById("shipmentLogsModal");
    brokerPriceInput = document.getElementById("broker_price");
    driverPayInput = document.getElementById("driver_pay");
    calculatedProfitBox = document.getElementById("calculatedProfit");
    resetColumnsBtn = document.getElementById("resetColumnsBtn");
    columnToolbar = document.getElementById("columnToolbar");
    toggleColumnsBtn = document.getElementById("toggleColumnsBtn");
    filtersPanel = document.getElementById("filtersPanel");
    toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
    timeFormatSelect = document.getElementById("timeFormatSelect");
    timeFormatDisplay = document.getElementById("timeFormatDisplay");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    shipmentModalTitle = document.getElementById("shipmentModalTitle");
    shipmentSubmitBtn = document.getElementById("shipmentSubmitBtn");
    shipmentLogsTitle = document.getElementById("shipmentLogsTitle");
    shipmentLogsContainer = document.getElementById("shipmentLogsContainer");
    visibleColumnList = document.getElementById("visibleColumnList");
    hiddenColumnList = document.getElementById("hiddenColumnList");
    visibleColumnsZone = document.getElementById("visibleColumnsZone");
    hiddenColumnsZone = document.getElementById("hiddenColumnsZone");
    filterCompanyReference = document.getElementById("filterCompanyReference");
    filterBrokerReference = document.getElementById("filterBrokerReference");
    filterCreatedDate = document.getElementById("filterCreatedDate");
    filterGlobalSearch = document.getElementById("filterGlobalSearch");
    filterMonth = document.getElementById("filterMonth");
    filterCreatedDatePickerBtn = document.getElementById("filterCreatedDatePickerBtn");
    filterMonthPickerBtn = document.getElementById("filterMonthPickerBtn");
    pickupDatePickerBtn = document.getElementById("pickupDatePickerBtn");
    deliveryDatePickerBtn = document.getElementById("deliveryDatePickerBtn");
    shipmentCreatedDatePickerBtn = document.getElementById("shipmentCreatedDatePickerBtn");
    editOnlyShipmentStatus = document.getElementById("editOnlyShipmentStatus");
    editOnlyPaymentStatus = document.getElementById("editOnlyPaymentStatus");
    pickupTimeInput = document.getElementById("pickup_time");
    deliveryTimeInput = document.getElementById("delivery_time");
    floatingActionMenu = document.getElementById("floatingActionMenu");
    confirmDeleteShipmentModal = document.getElementById("confirmDeleteShipmentModal");
    cancelDeleteShipmentBtn = document.getElementById("cancelDeleteShipmentBtn");
    confirmDeleteShipmentBtn = document.getElementById("confirmDeleteShipmentBtn");

    customSelectModal = document.getElementById("customSelectModal");
    customSelectTitle = document.getElementById("customSelectTitle");
    customSelectSubtitle = document.getElementById("customSelectSubtitle");
    customSelectSearch = document.getElementById("customSelectSearch");
    customSelectList = document.getElementById("customSelectList");
    customSelectCloseBtn = document.getElementById("customSelectCloseBtn");

    applySidebarRoleVisibility();
    syncTimeFormatUI();
    renderHeader();
    renderColumnManager();
    setupDropZone(visibleColumnsZone, "visible");
    setupDropZone(hiddenColumnsZone, "hidden");
    setDefaultMonthFilter();
    bindFilterEvents();
    bindDateAndTimeInputs();
    renderBrokerNameSuggestions();

    try {
        if (isManagerRole()) {
            await loadStaffListForManager();
        }
    } catch (e) {
        console.error("Manager block error:", e);
    }

    setShipmentStatusValue("created");
    setDriverPaymentStatusValue("unpaid");
    setBrokerPaymentOptionValue("");

    logoutBtn?.addEventListener("click", logout);
    toggleSidebarBtn?.addEventListener("click", toggleSidebar);

    toggleColumnsBtn?.addEventListener("click", () => {
        columnToolbar?.classList.toggle("open");
    });

    toggleFiltersBtn?.addEventListener("click", () => {
        filtersPanel?.classList.toggle("open");
    });

    resetColumnsBtn?.addEventListener("click", resetColumns);

    brokerPriceInput?.addEventListener("input", calculateProfit);
    driverPayInput?.addEventListener("input", calculateProfit);

    shipmentForm?.addEventListener("submit", saveShipment);

    shipmentModal?.addEventListener("click", (e) => {
        if (e.target === shipmentModal) closeModal();
    });

    shipmentLogsModal?.addEventListener("click", (e) => {
        if (e.target === shipmentLogsModal) closeLogsModal();
    });

    cancelDeleteShipmentBtn?.addEventListener("click", closeDeleteShipmentModal);
    confirmDeleteShipmentBtn?.addEventListener("click", executeDeleteShipment);

    timeFormatDisplay?.addEventListener("click", () => {
        const current = getTimeFormat();
        const next = current === "12" ? "24" : "12";
        setTimeFormat(next);
        refreshTimeDisplaysForFormatChange();
    });

    document.getElementById("assigned_staff_id_display")?.addEventListener("click", openAssignedStaffPicker);
    document.getElementById("edit_payment_status_display")?.addEventListener("click", openDriverPaymentStatusPicker);
    document.getElementById("payment_option_display")?.addEventListener("click", openBrokerPaymentOptionPicker);
    document.getElementById("edit_shipment_status_display")?.addEventListener("click", openShipmentStatusPicker);

    customSelectCloseBtn?.addEventListener("click", closeCustomSelectModal);
    customSelectModal?.addEventListener("click", (e) => {
        if (e.target === customSelectModal) closeCustomSelectModal();
    });
    customSelectSearch?.addEventListener("input", () => {
        renderCustomSelectItems(customSelectSearch.value);
    });

    populateStateSelect("pickup_state");
    populateStateSelect("delivery_state");

    await loadShipments();
});