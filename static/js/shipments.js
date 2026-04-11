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

let shipmentsTable, shipmentsHeaderRow, logoutBtn, shipmentModal, shipmentForm, shipmentLogsModal;
let brokerPriceInput, driverPayInput, calculatedProfitBox, resetColumnsBtn;
let columnToolbar, toggleColumnsBtn, filtersPanel, toggleFiltersBtn, timeFormatSelect, toggleSidebarBtn;
let shipmentModalTitle, shipmentSubmitBtn, shipmentLogsTitle, shipmentLogsContainer;
let visibleColumnList, hiddenColumnList;
let visibleColumnsZone, hiddenColumnsZone;
let filterCompanyReference, filterBrokerReference, filterCreatedDate, filterGlobalSearch, filterMonth;
let filterCreatedDatePickerBtn, pickupDatePickerBtn, deliveryDatePickerBtn;
let editOnlyShipmentStatus, editOnlyPaymentStatus;

let datePickerModal, datePrevMonthBtn, dateNextMonthBtn, dateGrid, dateCurrentMonthLabel, dateCloseBtn, dateClearBtn, dateModalTitle;
let datePickerTargetInputId = null;
let datePickerViewDate = new Date();

let isCreating = false;
let openDropdown = null;
let draggedColumnKey = null;
let allShipments = [];
let filteredShipments = [];

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

function isPrivilegedRole() {
    return PRIVILEGED_ROLES.has(getCurrentUserRole());
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

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
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

function getTimeFormat() {
    return localStorage.getItem(SHIPMENT_TIME_FORMAT_KEY) || "12";
}

function setTimeFormat(value) {
    localStorage.setItem(SHIPMENT_TIME_FORMAT_KEY, value);
}

function openCreateModal() {
    resetShipmentForm();
    document.getElementById("edit_shipment_id").value = "";
    shipmentModalTitle.textContent = "Create Shipment";
    shipmentSubmitBtn.textContent = "Save";
    shipmentSubmitBtn.disabled = false;
    editOnlyShipmentStatus.style.display = "none";
    editOnlyPaymentStatus.style.display = "none";
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

const STATUS_CLASS_MAP = {
    created: "status-created",
    picked_up: "status-picked_up",
    in_transit: "status-in_transit",
    delivered: "status-delivered",
    tonu: "status-tonu",
    canceled: "status-canceled",
    cancelled: "status-canceled"
};

function getStatusClass(status) {
    const key = (status || "").toLowerCase();
    const modifier = STATUS_CLASS_MAP[key] || "status-created";
    return `shipment-status ${modifier}`;
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

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
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

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).replace("T", " ");
    }

    const format = getTimeFormat();

    if (format === "24") {
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    return date.toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function getInputValue(id) {
    return document.getElementById(id)?.value || null;
}

function getNumericValue(id, fallback = 0) {
    const raw = document.getElementById(id)?.value;
    const num = Number(raw);
    return Number.isNaN(num) ? fallback : num;
}

function buildDateTime(dateId, timeId) {
    const dateValue = getInputValue(dateId);
    const time = getInputValue(timeId);

    const isoDate = slashDateToIso(dateValue);
    if (!isoDate) return null;

    return `${isoDate}T${time || "00:00"}`;
}

function splitDateTime(value) {
    if (!value) return { date: "", time: "" };

    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) {
        const [d, t] = String(value).split("T");
        const dateOnly = d ? formatDateToSlash(d) : "";
        return {
            date: dateOnly || "",
            time: (t || "").slice(0, 5)
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

function findColumnByKey(key) {
    return currentColumns.find(col => col.key === key);
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

function reorderWithinVisible(key, targetIndex) {
    const visible = getVisibleColumns();
    const hidden = getHiddenColumns();
    const fromIndex = visible.findIndex(col => col.key === key);

    if (fromIndex < 0) return;

    const [moved] = visible.splice(fromIndex, 1);
    visible.splice(targetIndex, 0, moved);

    currentColumns = [...visible, ...hidden];
}

function reorderWithinHidden(key, targetIndex) {
    const visible = getVisibleColumns();
    const hidden = getHiddenColumns();
    const fromIndex = hidden.findIndex(col => col.key === key);

    if (fromIndex < 0) return;

    const [moved] = hidden.splice(fromIndex, 1);
    hidden.splice(targetIndex, 0, moved);

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
        draggedColumnKey = null;
    });

    chip.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    chip.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!draggedColumnKey || draggedColumnKey === col.key) return;

        if (zoneType === "visible") {
            const draggedCol = findColumnByKey(draggedColumnKey);
            if (!draggedCol) return;

            if (draggedCol.visible) {
                reorderWithinVisible(draggedColumnKey, index);
            } else {
                moveColumnToVisible(draggedColumnKey, index);
            }
        } else {
            const draggedCol = findColumnByKey(draggedColumnKey);
            if (!draggedCol) return;

            if (draggedCol.visible) {
                moveColumnToHidden(draggedColumnKey, index);
            } else {
                reorderWithinHidden(draggedColumnKey, index);
            }
        }

        saveColumnsToStorage();
        renderColumnManager();
        renderHeader();
        renderShipmentsTable(filteredShipments);
    });

    return chip;
}

function setupZoneDrop(zoneEl, zoneType) {
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

        const draggedCol = findColumnByKey(draggedColumnKey);
        if (!draggedCol) return;

        if (zoneType === "visible") {
            if (!draggedCol.visible) {
                moveColumnToVisible(draggedColumnKey);
            }
        } else {
            if (draggedCol.visible) {
                moveColumnToHidden(draggedColumnKey);
            }
        }

        saveColumnsToStorage();
        renderColumnManager();
        renderHeader();
        renderShipmentsTable(filteredShipments);
    });
}

function renderColumnManager() {
    if (!visibleColumnList || !hiddenColumnList) return;

    visibleColumnList.innerHTML = "";
    hiddenColumnList.innerHTML = "";

    const visible = getVisibleColumns();
    const hidden = getHiddenColumns();

    visible.forEach((col, index) => {
        visibleColumnList.appendChild(createColumnChip(col, index, "visible"));
    });

    hidden.forEach((col, index) => {
        hiddenColumnList.appendChild(createColumnChip(col, index, "hidden"));
    });
}

function toggleColumnToolbar() {
    if (!columnToolbar) return;
    columnToolbar.classList.toggle("open");
}

function toggleFiltersPanel() {
    if (!filtersPanel) return;
    filtersPanel.classList.toggle("open");
}

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
}

function showTableLoading() {
    if (!shipmentsTable) return;

    shipmentsTable.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = Math.max(getVisibleColumns().length, 1);
    td.className = "empty-row";
    td.textContent = "Loading shipments...";
    tr.appendChild(td);
    shipmentsTable.appendChild(tr);
}

function showTableError(message) {
    if (!shipmentsTable) return;

    shipmentsTable.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = Math.max(getVisibleColumns().length, 1);
    td.className = "empty-row";
    td.textContent = message || "Failed to load shipments.";
    tr.appendChild(td);
    shipmentsTable.appendChild(tr);
}

function getLocationClass(type, shipmentStatus) {
    const status = (shipmentStatus || "").toLowerCase();

    if (type === "pickup") {
        if (["picked_up", "in_transit", "delivered"].includes(status)) {
            return "loc-done";
        }
        return "loc-pending";
    }

    if (type === "delivery") {
        if (status === "delivered") {
            return "loc-done";
        }
        return "loc-pending";
    }

    return "loc-pending";
}

function createLocationNode(text, type, shipmentStatus) {
    const span = document.createElement("span");
    span.className = `location-pill ${getLocationClass(type, shipmentStatus)}`;
    span.textContent = text || "—";
    span.title = text || "—";
    return span;
}

function canViewFinancials(item) {
    if (isPrivilegedRole()) return true;

    const currentUserId = getCurrentUserId();
    if (!currentUserId) return false;

    const possibleOwnerIds = [
        Number(item?.assigned_staff_id || 0),
        Number(item?.created_by || 0),
        Number(item?.staff_id || 0)
    ].filter(Boolean);

    return possibleOwnerIds.includes(currentUserId);
}

function getCellValue(item, key) {
    switch (key) {
        case "company_reference":
            return item.company_reference || "—";
        case "external_reference":
            return item.external_reference || "—";
        case "shipment_created_date":
            return formatDateOnly(item.shipment_created_date);
        case "unit_number":
            return item.unit_number || "—";
        case "driver_name":
            return item.driver_name || "—";
        case "business_name":
            return item.business_name || "—";
        case "broker_name":
            return item.broker_name || "—";
        case "pickup_city":
            return item.pickup_city || "—";
        case "pickup_state":
            return item.pickup_state || "—";
        case "pickup_datetime":
            return formatDateTime(item.pickup_datetime);
        case "delivery_city":
            return item.delivery_city || "—";
        case "delivery_state":
            return item.delivery_state || "—";
        case "delivery_datetime":
            return formatDateTime(item.delivery_datetime);
        case "miles":
            return formatNumberOrDash(item.miles);
        case "broker_price":
            return formatCurrencyOrDash(item.broker_price);
        case "driver_pay":
            return formatCurrencyOrDash(item.driver_pay);
        case "profit":
            return formatCurrencyOrDash(item.profit);
        case "percentage_of_margin":
            return item.percentage_of_margin !== null && item.percentage_of_margin !== undefined
                ? `${Number(item.percentage_of_margin).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                })}%`
                : "—";
        case "loads_per_day":
            return formatNumberOrDash(item.loads_per_day);
        case "dispatcher_commission_percent":
            return item.dispatcher_commission_percent !== null && item.dispatcher_commission_percent !== undefined
                ? `${Number(item.dispatcher_commission_percent).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                })}%`
                : "—";
        case "staff_full_name":
            return item.staff_full_name || "—";
        case "payment_status":
            return item.payment_status || "—";
        case "comments":
            return item.comments || "—";
        default:
            return "—";
    }
}

function closeOpenDropdown() {
    if (openDropdown) {
        openDropdown.classList.remove("open");
        openDropdown = null;
    }
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

async function deleteShipment(shipmentId) {
    const confirmed = window.confirm("Are you sure you want to delete this shipment?");
    if (!confirmed) return;

    try {
        let response = await fetchWithAuth(`${API_BASE_URL}/shipments/delete/${shipmentId}`, {
            method: "DELETE"
        });

        if (!response || response.status === 404 || response.status === 405) {
            response = await fetchWithAuth(`${API_BASE_URL}/shipments/delete`, {
                method: "DELETE",
                body: JSON.stringify({ shipment_id: shipmentId })
            });
        }

        if (!response) return;

        let result = {};
        try {
            result = await response.json();
        } catch {}

        if (!response.ok) {
            alert(result.detail || "Failed to delete shipment.");
            return;
        }

        await loadShipments();
    } catch (err) {
        console.error("Delete shipment error:", err);
        alert("Server error while deleting shipment.");
    }
}

async function fetchShipmentLogs(shipmentId) {
    const attempts = [
        {
            url: `${API_BASE_URL}/shipments/logs/${shipmentId}`,
            options: { method: "GET" }
        },
        {
            url: `${API_BASE_URL}/shipments/logs?shipment_id=${shipmentId}`,
            options: { method: "GET" }
        },
        {
            url: `${API_BASE_URL}/shipments/logs`,
            options: {
                method: "POST",
                body: JSON.stringify({ shipment_id: shipmentId })
            }
        }
    ];

    for (const attempt of attempts) {
        const response = await fetchWithAuth(attempt.url, attempt.options);
        if (!response) continue;
        if (response.ok) {
            try {
                return await response.json();
            } catch {
                return [];
            }
        }
    }

    return null;
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
            log.user_full_name ||
            log.username ||
            "Unknown User";

        const changedAt =
            formatDateTime(log.changed_at || log.created_at || log.log_created_at || log.timestamp);

        const fieldName =
            log.field_name ||
            log.changed_field ||
            log.action ||
            "Change";

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
                <div class="log-user">${userName}</div>
                <div class="log-date">${changedAt}</div>
            </div>
            <div class="log-field">${fieldName}</div>
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

    if (logs === null) {
        shipmentLogsContainer.innerHTML = `
            <div class="empty-logs">
                Failed to load logs. If your backend endpoint name is different, update fetchShipmentLogs().
            </div>
        `;
        return;
    }

    renderLogs(logs, item.shipment_id);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function saveBrokerNameToHistory(name) {
    if (!name) return;

    try {
        const raw = localStorage.getItem(BROKER_NAMES_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const normalized = String(name).trim();

        if (!normalized) return;

        const filtered = list.filter(item => item.toLowerCase() !== normalized.toLowerCase());
        filtered.unshift(normalized);

        localStorage.setItem(BROKER_NAMES_KEY, JSON.stringify(filtered.slice(0, 50)));
    } catch {}
}

function renderBrokerNameSuggestions() {
    const datalist = document.getElementById("brokerNameSuggestions");
    if (!datalist) return;

    datalist.innerHTML = "";

    try {
        const raw = localStorage.getItem(BROKER_NAMES_KEY);
        const list = raw ? JSON.parse(raw) : [];

        list.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            datalist.appendChild(option);
        });
    } catch {}
}

function fillShipmentForm(item) {
    document.getElementById("edit_shipment_id").value = item.shipment_id || "";
    document.getElementById("external_reference").value = item.external_reference ?? "";
    document.getElementById("unit_number").value = item.unit_number ?? "";
    document.getElementById("driver_name").value = item.driver_name ?? "";
    document.getElementById("business_name").value = item.business_name ?? "";
    document.getElementById("broker_name").value = item.broker_name ?? "";
    document.getElementById("pickup_city").value = item.pickup_city ?? "";
    document.getElementById("pickup_state").value = item.pickup_state ?? "";
    document.getElementById("delivery_city").value = item.delivery_city ?? "";
    document.getElementById("delivery_state").value = item.delivery_state ?? "";
    document.getElementById("miles").value = item.miles ?? "";
    document.getElementById("broker_price").value = item.broker_price ?? "";
    document.getElementById("driver_pay").value = item.driver_pay ?? "";
    document.getElementById("loads_per_day").value = item.loads_per_day ?? "";
    document.getElementById("dispatcher_commission_percent").value = item.dispatcher_commission_percent ?? "";
    document.getElementById("payment_option").value = item.payment_option ?? "";
    document.getElementById("comments").value = item.comments ?? "";
    document.getElementById("edit_shipment_status").value = item.shipment_status ?? "created";
    document.getElementById("edit_payment_status").value = item.payment_status ?? "unpaid";

    const pickup = splitDateTime(item.pickup_datetime);
    document.getElementById("pickup_date").value = pickup.date;
    document.getElementById("pickup_time").value = pickup.time;

    const delivery = splitDateTime(item.delivery_datetime);
    document.getElementById("delivery_date").value = delivery.date;
    document.getElementById("delivery_time").value = delivery.time;

    calculateProfit();
}

function resetShipmentForm() {
    if (shipmentForm) shipmentForm.reset();
    document.getElementById("edit_shipment_id").value = "";
    document.getElementById("edit_shipment_status").value = "created";
    document.getElementById("edit_payment_status").value = "unpaid";
    calculateProfit();
}

function openEditModal(item) {
    resetShipmentForm();
    fillShipmentForm(item);
    shipmentModalTitle.textContent = "Edit Shipment";
    shipmentSubmitBtn.textContent = "Save";
    shipmentSubmitBtn.disabled = false;
    editOnlyShipmentStatus.style.display = "";
    editOnlyPaymentStatus.style.display = "";
    openModal();
}

function createActionsCell(item) {
    const td = document.createElement("td");
    td.className = "actions-cell";

    const btn = document.createElement("button");
    btn.className = "action-menu-btn";
    btn.type = "button";
    btn.textContent = "⋯";

    const dropdown = document.createElement("div");
    dropdown.className = "action-dropdown";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit Shipment";
    editBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        closeOpenDropdown();
        openEditModal(item);
    });
    dropdown.appendChild(editBtn);

    const logsBtn = document.createElement("button");
    logsBtn.type = "button";
    logsBtn.textContent = "View Logs";
    logsBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        closeOpenDropdown();
        await openShipmentLogs(item);
    });
    dropdown.appendChild(logsBtn);

    const nextActions = getNextStatusActions(item.shipment_status);
    if (nextActions.length) {
        const divider = document.createElement("div");
        divider.className = "action-divider";
        dropdown.appendChild(divider);

        nextActions.forEach(statusItem => {
            const actionBtn = document.createElement("button");
            actionBtn.type = "button";
            actionBtn.textContent = statusItem.label;
            actionBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                closeOpenDropdown();
                await updateShipmentStatus(item.shipment_id, statusItem.value);
            });
            dropdown.appendChild(actionBtn);
        });
    }

    const deleteDivider = document.createElement("div");
    deleteDivider.className = "action-divider";
    dropdown.appendChild(deleteDivider);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete Shipment";
    deleteBtn.style.color = "#fca5a5";
    deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        closeOpenDropdown();
        await deleteShipment(item.shipment_id);
    });
    dropdown.appendChild(deleteBtn);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (openDropdown && openDropdown !== dropdown) {
            closeOpenDropdown();
        }

        dropdown.classList.toggle("open");
        openDropdown = dropdown.classList.contains("open") ? dropdown : null;
    });

    dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    td.appendChild(btn);
    td.appendChild(dropdown);

    return td;
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
    const monthValue = (filterMonth?.value || "").trim();

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
    closeOpenDropdown();

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
        allShipments = Array.isArray(data) ? data : [];

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

async function handleCreateOrUpdateShipment(event) {
    event.preventDefault();

    if (isCreating) return;

    const editShipmentId = getInputValue("edit_shipment_id");

    const payload = {
        company_id: 1,
        unit_number: getInputValue("unit_number"),
        external_reference: getInputValue("external_reference"),
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
    const month = String(now.getMonth() + 1).padStart(2, "0");
    filterMonth.value = `${now.getFullYear()}-${month}`;
}

function bindFilterEvents() {
    [filterCompanyReference, filterBrokerReference, filterCreatedDate, filterGlobalSearch, filterMonth]
        .forEach(el => {
            if (el) {
                el.addEventListener("input", refreshFilteredView);
                el.addEventListener("change", refreshFilteredView);
            }
        });
}

function openDatePickerFor(inputId, titleText) {
    datePickerTargetInputId = inputId;
    dateModalTitle.textContent = titleText || "Select Date";

    const input = document.getElementById(inputId);
    const parsed = parseSlashDate(input?.value);
    datePickerViewDate = parsed || new Date();

    renderDatePickerGrid();
    datePickerModal.style.display = "flex";
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

            if (datePickerTargetInputId === "filterCreatedDate") {
                refreshFilteredView();
            }

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
        dateGrid.appendChild(btn);
    }
}

document.addEventListener("click", () => {
    closeOpenDropdown();
});

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        clearAuthAndRedirect();
        return;
    }

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
    pickupDatePickerBtn = document.getElementById("pickupDatePickerBtn");
    deliveryDatePickerBtn = document.getElementById("deliveryDatePickerBtn");
    editOnlyShipmentStatus = document.getElementById("editOnlyShipmentStatus");
    editOnlyPaymentStatus = document.getElementById("editOnlyPaymentStatus");

    datePickerModal = document.getElementById("datePickerModal");
    datePrevMonthBtn = document.getElementById("datePrevMonthBtn");
    dateNextMonthBtn = document.getElementById("dateNextMonthBtn");
    dateGrid = document.getElementById("dateGrid");
    dateCurrentMonthLabel = document.getElementById("dateCurrentMonthLabel");
    dateCloseBtn = document.getElementById("dateCloseBtn");
    dateClearBtn = document.getElementById("dateClearBtn");
    dateModalTitle = document.getElementById("dateModalTitle");

    populateStateSelect("pickup_state");
    populateStateSelect("delivery_state");
    renderBrokerNameSuggestions();
    renderColumnManager();
    renderHeader();
    setDefaultMonthFilter();
    bindFilterEvents();

    timeFormatSelect.value = getTimeFormat();

    loadShipments();

    setupZoneDrop(visibleColumnsZone, "visible");
    setupZoneDrop(hiddenColumnsZone, "hidden");

    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (brokerPriceInput) brokerPriceInput.addEventListener("input", calculateProfit);
    if (driverPayInput) driverPayInput.addEventListener("input", calculateProfit);
    if (shipmentForm) shipmentForm.addEventListener("submit", handleCreateOrUpdateShipment);
    if (resetColumnsBtn) resetColumnsBtn.addEventListener("click", resetColumns);
    if (toggleColumnsBtn) toggleColumnsBtn.addEventListener("click", toggleColumnToolbar);
    if (toggleFiltersBtn) toggleFiltersBtn.addEventListener("click", toggleFiltersPanel);
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener("click", toggleSidebar);

    if (timeFormatSelect) {
        timeFormatSelect.addEventListener("change", () => {
            setTimeFormat(timeFormatSelect.value);
            renderShipmentsTable(filteredShipments);
        });
    }

    if (filterCreatedDatePickerBtn) {
        filterCreatedDatePickerBtn.addEventListener("click", () => {
            openDatePickerFor("filterCreatedDate", "Select Created Date");
        });
    }

    if (pickupDatePickerBtn) {
        pickupDatePickerBtn.addEventListener("click", () => {
            openDatePickerFor("pickup_date", "Select Pickup Date");
        });
    }

    if (deliveryDatePickerBtn) {
        deliveryDatePickerBtn.addEventListener("click", () => {
            openDatePickerFor("delivery_date", "Select Delivery Date");
        });
    }

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
                }
                if (datePickerTargetInputId === "filterCreatedDate") {
                    refreshFilteredView();
                }
            }
            closeDatePickerModal();
        });
    }

    if (shipmentModal) {
        shipmentModal.addEventListener("click", (e) => {
            if (e.target === shipmentModal) {
                closeModal();
            }
        });
    }

    if (shipmentLogsModal) {
        shipmentLogsModal.addEventListener("click", (e) => {
            if (e.target === shipmentLogsModal) {
                closeLogsModal();
            }
        });
    }

    if (datePickerModal) {
        datePickerModal.addEventListener("click", (e) => {
            if (e.target === datePickerModal) {
                closeDatePickerModal();
            }
        });
    }

    calculateProfit();
});