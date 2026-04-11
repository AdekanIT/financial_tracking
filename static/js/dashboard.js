const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

let totalProfitEl, totalShipmentsEl, totalGrossEl, topDispatcherEl;
let dispatcherTableBody, userNameEl, logoutBtn, chartTabs;
let dashboardTitleEl, dashboardSubtitleEl, tableTitleEl, tableSubtitleEl;

let profitChartInstance = null;
let currentChartType = "line";
let dashboardPayload = null;

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

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
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

function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function setUserName() {
    if (!userNameEl) return;

    const user = getUserData();
    userNameEl.textContent =
        user?.staff_full_name ||
        user?.staff_username ||
        "User";
}

function setDashboardLabels() {
    const user = getUserData();
    const role = (user?.job_title || "").toLowerCase();

    if (!dashboardTitleEl || !dashboardSubtitleEl || !tableTitleEl || !tableSubtitleEl) return;

    if (role === "dispatcher") {
        dashboardTitleEl.textContent = "Personal Dashboard";
        dashboardSubtitleEl.textContent = "Your personal shipment profit and trend overview";
        tableTitleEl.textContent = "Latest Period Breakdown";
        tableSubtitleEl.textContent = "Your latest visible breakdown data";
        return;
    }

    dashboardTitleEl.textContent = "Company Dashboard";
    dashboardSubtitleEl.textContent = "Company shipment profit and performance trends";
    tableTitleEl.textContent = "Latest Period Breakdown";
    tableSubtitleEl.textContent = "Performance details for the latest visible period";
}

function getLatestMonthBlock() {
    const months = dashboardPayload?.months;
    if (!Array.isArray(months) || months.length === 0) return null;
    return months[months.length - 1];
}

function getLatestBreakdown() {
    const latest = getLatestMonthBlock();
    return Array.isArray(latest?.breakdown) ? latest.breakdown : [];
}

function updateSummaryCards() {
    const latest = getLatestMonthBlock();

    if (!latest) {
        if (totalProfitEl) totalProfitEl.textContent = "$0";
        if (totalShipmentsEl) totalShipmentsEl.textContent = "0";
        if (totalGrossEl) totalGrossEl.textContent = "$0";
        if (topDispatcherEl) topDispatcherEl.textContent = "—";
        return;
    }

    if (totalProfitEl) totalProfitEl.textContent = formatCurrency(latest.profit);
    if (totalShipmentsEl) totalShipmentsEl.textContent = String(latest.shipments ?? 0);
    if (totalGrossEl) totalGrossEl.textContent = formatCurrency(latest.gross);

    if (topDispatcherEl) {
        topDispatcherEl.textContent = latest.period_label || "Current Period";
    }
}

function createTextCell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
}

function renderTable() {
    if (!dispatcherTableBody) return;

    const breakdown = getLatestBreakdown();
    dispatcherTableBody.innerHTML = "";

    if (breakdown.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "empty-row";
        td.textContent = "No dashboard breakdown data found.";
        tr.appendChild(td);
        dispatcherTableBody.appendChild(tr);
        return;
    }

    const totalProfit = breakdown.reduce(
        (sum, item) => sum + Number(item.profit || 0), 0
    );

    breakdown.forEach((item, index) => {
        const share = totalProfit > 0
            ? ((Number(item.profit || 0) / totalProfit) * 100)
            : 0;

        const tr = document.createElement("tr");
        tr.appendChild(createTextCell(index + 1));
        tr.appendChild(createTextCell(item.label || "-"));
        tr.appendChild(createTextCell(item.shipments ?? 0));
        tr.appendChild(createTextCell(formatCurrency(item.profit || 0)));
        tr.appendChild(createTextCell(`${share.toFixed(1)}%`));
        dispatcherTableBody.appendChild(tr);
    });
}

const CHART_COLORS = {
    line: "rgba(96, 165, 250, 1)",
    lineFill: "rgba(96, 165, 250, 0.18)",
    point: "rgba(147, 197, 253, 1)",
    bar: "rgba(59, 130, 246, 0.8)",
    doughnut: [
        "rgba(59, 130, 246, 0.95)",
        "rgba(96, 165, 250, 0.95)",
        "rgba(147, 197, 253, 0.95)",
        "rgba(56, 189, 248, 0.95)",
        "rgba(125, 211, 252, 0.95)",
        "rgba(37, 99, 235, 0.95)"
    ],
    text: "#dce7f5",
    gridLine: "rgba(255,255,255,0.05)"
};

function baseScalesConfig() {
    return {
        x: {
            ticks: { color: CHART_COLORS.text },
            grid: { color: CHART_COLORS.gridLine }
        },
        y: {
            ticks: { color: CHART_COLORS.text },
            grid: { color: CHART_COLORS.gridLine }
        }
    };
}

function baseLegendConfig() {
    return { labels: { color: CHART_COLORS.text } };
}

function destroyChart() {
    if (profitChartInstance) {
        profitChartInstance.destroy();
        profitChartInstance = null;
    }
}

function getCanvas() {
    const canvas = document.getElementById("profitChart");
    if (!canvas || !dashboardPayload) return null;
    return canvas;
}

function renderLineChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const months = dashboardPayload.months || [];
    if (months.length === 0) return;

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: months.map(m => m.period_label),
            datasets: [{
                label: "Profit by Month",
                data: months.map(m => Number(m.profit || 0)),
                borderColor: CHART_COLORS.line,
                backgroundColor: CHART_COLORS.lineFill,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: CHART_COLORS.point
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: baseLegendConfig() },
            scales: baseScalesConfig()
        }
    });
}

function renderBarChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const months = dashboardPayload.months || [];
    if (months.length === 0) return;

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: months.map(m => m.period_label),
            datasets: [{
                label: "Profit by Month",
                data: months.map(m => Number(m.profit || 0)),
                backgroundColor: CHART_COLORS.bar,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: baseLegendConfig() },
            scales: baseScalesConfig()
        }
    });
}

function renderDoughnutChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const breakdown = getLatestBreakdown();
    if (breakdown.length === 0) return;

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: breakdown.map(b => b.label),
            datasets: [{
                label: "Latest Period Contribution",
                data: breakdown.map(b => Number(b.profit || 0)),
                backgroundColor: CHART_COLORS.doughnut,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: baseLegendConfig() }
        }
    });
}

const CHART_RENDERERS = {
    line: renderLineChart,
    bar: renderBarChart,
    doughnut: renderDoughnutChart
};

function renderCurrentChart() {
    destroyChart();
    const renderer = CHART_RENDERERS[currentChartType] || renderLineChart;
    renderer();
}

function initChartTabs() {
    if (!chartTabs) return;

    chartTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            chartTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const type = tab.dataset.chart;
            if (type && type !== currentChartType) {
                currentChartType = type;
                renderCurrentChart();
            }
        });
    });
}

function showTableLoading() {
    if (!dispatcherTableBody) return;
    dispatcherTableBody.innerHTML = "";

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = "Loading dashboard data...";
    tr.appendChild(td);
    dispatcherTableBody.appendChild(tr);
}

function showTableError(message) {
    if (!dispatcherTableBody) return;
    dispatcherTableBody.innerHTML = "";

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = message || "Failed to load dashboard data.";
    tr.appendChild(td);
    dispatcherTableBody.appendChild(tr);
}

async function loadDashboardData() {
    showTableLoading();

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/analytics/dashboard`);
        if (!response) return;

        if (!response.ok) {
            showTableError("Server returned an error. Please try again.");
            return;
        }

        dashboardPayload = await response.json();

        updateSummaryCards();
        renderTable();
        renderCurrentChart();

    } catch (err) {
        console.error("Dashboard load error:", err);
        showTableError("Failed to load dashboard data.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!getToken()) {
        clearAuthAndRedirect();
        return;
    }

    totalProfitEl = document.getElementById("totalProfit");
    totalShipmentsEl = document.getElementById("totalShipments");
    totalGrossEl = document.getElementById("totalGross");
    topDispatcherEl = document.getElementById("topDispatcher");
    dispatcherTableBody = document.getElementById("dispatcherTableBody");
    userNameEl = document.getElementById("userName");
    logoutBtn = document.getElementById("logoutBtn");
    chartTabs = document.querySelectorAll(".chart-tab");
    dashboardTitleEl = document.getElementById("dashboardTitle");
    dashboardSubtitleEl = document.getElementById("dashboardSubtitle");
    tableTitleEl = document.getElementById("tableTitle");
    tableSubtitleEl = document.getElementById("tableSubtitle");

    setUserName();
    setDashboardLabels();
    initChartTabs();
    loadDashboardData();

    if (logoutBtn) logoutBtn.addEventListener("click", logout);
});