const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

let totalProfitEl, totalShipmentsEl, totalGrossEl, topDispatcherEl;
let dispatcherTableBody, userNameEl, logoutBtn, toggleSidebarBtn;
let dashboardTitleEl, dashboardSubtitleEl, tableTitleEl, tableSubtitleEl;
let chartTabs, periodTabs, thLabelEl, analyticsSubtitleEl;
let legendListEl, legendTitleEl, legendSubtitleEl, legendTotalProfitEl, legendTotalPeriodLabelEl;
let topMenuBtn, topMenuDropdown, toggleNotesBtn, refreshDashboardBtn, notesCardEl;

let profitChartInstance = null;
let dashboardPayload = null;

let currentChartType = "doughnut";
let currentPeriodType = "month";
let notesVisible = true;

const STAFF_COLOR_PALETTE = [
    "rgba(59, 130, 246, 0.95)",
    "rgba(16, 185, 129, 0.95)",
    "rgba(245, 158, 11, 0.95)",
    "rgba(236, 72, 153, 0.95)",
    "rgba(139, 92, 246, 0.95)",
    "rgba(6, 182, 212, 0.95)",
    "rgba(239, 68, 68, 0.95)",
    "rgba(132, 204, 22, 0.95)",
    "rgba(249, 115, 22, 0.95)",
    "rgba(168, 85, 247, 0.95)",
    "rgba(14, 165, 233, 0.95)",
    "rgba(20, 184, 166, 0.95)"
];

const CHART_COLORS = {
    companyLine: "rgba(255, 255, 255, 0.95)",
    companyFill: "rgba(255, 255, 255, 0.08)",
    point: "rgba(255, 255, 255, 1)",
    text: "#dce7f5",
    gridLine: "rgba(255,255,255,0.05)"
};

const BASE_ANIMATION = {
    duration: 950,
    easing: "easeOutQuart"
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

function getCurrentRole() {
    const user = getUserData();
    return String(user?.job_title || "").toLowerCase();
}

function setDashboardLabels() {
    const role = getCurrentRole();

    if (!dashboardTitleEl || !dashboardSubtitleEl || !tableTitleEl || !tableSubtitleEl) return;

    if (role === "dispatcher") {
        dashboardTitleEl.textContent = "Personal Dashboard";
        dashboardSubtitleEl.textContent = "Your shipment activity, contribution and trend overview";
        tableTitleEl.textContent = "Personal Breakdown";
        tableSubtitleEl.textContent = "Your selected period breakdown";
        if (thLabelEl) thLabelEl.textContent = "Label";
        return;
    }

    dashboardTitleEl.textContent = "Company Dashboard";
    dashboardSubtitleEl.textContent = "Company shipment analytics, staff contribution and profit trend";
    tableTitleEl.textContent = "Staff Breakdown";
    tableSubtitleEl.textContent = "Staff contribution breakdown for the selected period";
    if (thLabelEl) thLabelEl.textContent = "Staff";
}

function baseScalesConfig(isStacked = false) {
    return {
        x: {
            stacked: isStacked,
            ticks: { color: CHART_COLORS.text },
            grid: { color: CHART_COLORS.gridLine }
        },
        y: {
            stacked: isStacked,
            beginAtZero: true,
            ticks: { color: CHART_COLORS.text },
            grid: { color: CHART_COLORS.gridLine }
        }
    };
}

function baseLegendConfig(display = true) {
    return {
        display,
        labels: {
            color: CHART_COLORS.text,
            boxWidth: 14,
            boxHeight: 14,
            padding: 14
        }
    };
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

function getPeriodsArray() {
    if (!dashboardPayload) return [];
    if (currentPeriodType === "day") return Array.isArray(dashboardPayload.days) ? dashboardPayload.days : [];
    if (currentPeriodType === "week") return Array.isArray(dashboardPayload.weeks) ? dashboardPayload.weeks : [];
    return Array.isArray(dashboardPayload.months) ? dashboardPayload.months : [];
}

function getLatestPeriodBlock() {
    const periods = getPeriodsArray();
    if (!periods.length) return null;
    return periods[periods.length - 1];
}

function normalizeContributionBreakdown(periodBlock) {
    if (!periodBlock) return [];

    if (Array.isArray(periodBlock.contribution_breakdown) && periodBlock.contribution_breakdown.length > 0) {
        return periodBlock.contribution_breakdown.map(item => ({
            staff_id: item.staff_id ?? null,
            label: item.label || "Unknown",
            shipments: Number(item.shipments || 0),
            profit: Number(item.profit || 0),
            gross: Number(item.gross || 0),
            share_percent: Number(item.share_percent || 0)
        }));
    }

    if (Array.isArray(periodBlock.breakdown) && periodBlock.breakdown.length > 0) {
        const total = periodBlock.breakdown.reduce((sum, item) => sum + Number(item.profit || 0), 0);

        return periodBlock.breakdown.map(item => ({
            staff_id: null,
            label: item.label || "Unknown",
            shipments: Number(item.shipments || 0),
            profit: Number(item.profit || 0),
            gross: Number(item.gross || 0),
            share_percent: total > 0 ? (Number(item.profit || 0) / total) * 100 : 0
        }));
    }

    return [];
}

function getStableColorForIndex(index) {
    return STAFF_COLOR_PALETTE[index % STAFF_COLOR_PALETTE.length];
}

function getStaffColorMapFromPeriods(periods) {
    const uniqueLabels = [];

    periods.forEach(period => {
        const breakdown = normalizeContributionBreakdown(period);
        breakdown.forEach(item => {
            if (!uniqueLabels.includes(item.label)) {
                uniqueLabels.push(item.label);
            }
        });
    });

    const colorMap = {};
    uniqueLabels.forEach((label, index) => {
        colorMap[label] = getStableColorForIndex(index);
    });

    return colorMap;
}

function getCurrentColorMap() {
    return getStaffColorMapFromPeriods(getPeriodsArray());
}

function updateSummaryCards() {
    const latest = getLatestPeriodBlock();

    if (!latest) {
        if (totalProfitEl) totalProfitEl.textContent = "$0";
        if (totalShipmentsEl) totalShipmentsEl.textContent = "0";
        if (totalGrossEl) totalGrossEl.textContent = "$0";
        if (topDispatcherEl) topDispatcherEl.textContent = "—";
        if (legendTotalProfitEl) legendTotalProfitEl.textContent = "$0";
        if (legendTotalPeriodLabelEl) legendTotalPeriodLabelEl.textContent = "Selected period";
        return;
    }

    if (totalProfitEl) totalProfitEl.textContent = formatCurrency(latest.profit);
    if (totalShipmentsEl) totalShipmentsEl.textContent = String(latest.shipments ?? 0);
    if (totalGrossEl) totalGrossEl.textContent = formatCurrency(latest.gross);
    if (topDispatcherEl) topDispatcherEl.textContent = latest.period_label || "Selected Period";

    if (legendTotalProfitEl) legendTotalProfitEl.textContent = formatCurrency(latest.profit);
    if (legendTotalPeriodLabelEl) legendTotalPeriodLabelEl.textContent = latest.period_label || "Selected period";
}

function createTextCell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
}

function renderTable() {
    if (!dispatcherTableBody) return;

    const latest = getLatestPeriodBlock();
    const breakdown = normalizeContributionBreakdown(latest);

    dispatcherTableBody.innerHTML = "";

    if (!breakdown.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "empty-row";
        td.textContent = "No breakdown data found for the selected period.";
        tr.appendChild(td);
        dispatcherTableBody.appendChild(tr);
        return;
    }

    const sorted = [...breakdown].sort((a, b) => b.profit - a.profit);

    sorted.forEach((item, index) => {
        const share = item.share_percent || 0;
        const tr = document.createElement("tr");
        tr.appendChild(createTextCell(index + 1));
        tr.appendChild(createTextCell(item.label || "-"));
        tr.appendChild(createTextCell(item.shipments ?? 0));
        tr.appendChild(createTextCell(formatCurrency(item.profit || 0)));
        tr.appendChild(createTextCell(`${share.toFixed(1)}%`));
        dispatcherTableBody.appendChild(tr);
    });
}

function renderLegend() {
    if (!legendListEl) return;

    const latest = getLatestPeriodBlock();
    const breakdown = normalizeContributionBreakdown(latest);
    const colorMap = getCurrentColorMap();

    legendListEl.innerHTML = "";

    if (!breakdown.length || currentChartType !== "doughnut") {
        const empty = document.createElement("div");
        empty.className = "legend-empty";
        empty.textContent =
            currentChartType === "doughnut"
                ? "No contribution data found for the selected period."
                : "Switch to Contribution to see the current selected period split.";
        legendListEl.appendChild(empty);
        return;
    }

    const sorted = [...breakdown].sort((a, b) => b.profit - a.profit);

    sorted.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = "legend-item";

        const colorDot = document.createElement("span");
        colorDot.className = "legend-color";
        colorDot.style.background = colorMap[item.label] || getStableColorForIndex(0);

        const content = document.createElement("div");

        const mainRow = document.createElement("div");
        mainRow.className = "legend-main";

        const name = document.createElement("div");
        name.className = "legend-name";
        name.textContent = item.label || "Unknown";

        const profit = document.createElement("div");
        profit.className = "legend-profit";
        profit.textContent = formatCurrency(item.profit || 0);

        mainRow.appendChild(name);
        mainRow.appendChild(profit);

        const sub = document.createElement("div");
        sub.className = "legend-sub";
        sub.innerHTML = `
            <span>Shipments: ${item.shipments ?? 0}</span>
            <span>Share: ${(item.share_percent || 0).toFixed(1)}%</span>
        `;

        content.appendChild(mainRow);
        content.appendChild(sub);

        wrapper.appendChild(colorDot);
        wrapper.appendChild(content);

        legendListEl.appendChild(wrapper);
    });
}

function updateChartTexts() {
    if (!analyticsSubtitleEl || !legendTitleEl || !legendSubtitleEl) return;

    const latest = getLatestPeriodBlock();
    const periodLabel = latest?.period_label || "selected period";

    if (currentChartType === "doughnut") {
        analyticsSubtitleEl.textContent =
            `Contribution shows only the current selected ${currentPeriodType}.`;
        legendTitleEl.textContent = "Contributions";
        legendSubtitleEl.textContent = `Current selected period staff contribution · ${periodLabel}`;
    } else if (currentChartType === "line") {
        analyticsSubtitleEl.textContent =
            `Trend shows company and staff profit movement across visible ${currentPeriodType} periods.`;
        legendTitleEl.textContent = "Contribution Panel";
        legendSubtitleEl.textContent = "Switch to Contribution to see the current selected period split";
    } else {
        analyticsSubtitleEl.textContent =
            `Bar compares stacked staff contributions across visible ${currentPeriodType} periods.`;
        legendTitleEl.textContent = "Contribution Panel";
        legendSubtitleEl.textContent = "Switch to Contribution to see the current selected period split";
    }
}

function renderCenterTextPlugin(textTop, textBottom) {
    return {
        id: "centerTextPlugin",
        afterDraw(chart) {
            if (chart.config.type !== "doughnut") return;

            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || !meta.data.length) return;

            const x = meta.data[0].x;
            const y = meta.data[0].y;

            ctx.save();
            ctx.textAlign = "center";
            ctx.fillStyle = "#f8fbff";

            ctx.font = "700 12px Arial";
            ctx.fillText(textTop, x, y - 8);

            ctx.font = "800 18px Arial";
            ctx.fillText(textBottom, x, y + 16);
            ctx.restore();
        }
    };
}

function renderDoughnutChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const latest = getLatestPeriodBlock();
    const breakdown = normalizeContributionBreakdown(latest);
    if (!breakdown.length) return;

    const sorted = [...breakdown].sort((a, b) => b.profit - a.profit);
    const colorMap = getCurrentColorMap();

    const labels = sorted.map(item => item.label);
    const values = sorted.map(item => Number(item.profit || 0));
    const colors = sorted.map(item => colorMap[item.label]);

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                label: "Staff contribution",
                data: values,
                backgroundColor: colors,
                borderColor: "rgba(11, 17, 24, 0.85)",
                borderWidth: 2,
                hoverOffset: 10,
                cutout: "66%",
                spacing: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: BASE_ANIMATION,
            plugins: {
                legend: baseLegendConfig(false),
                tooltip: {
                    backgroundColor: "rgba(15, 23, 34, 0.96)",
                    borderColor: "rgba(96, 165, 250, 0.18)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#dce7f5",
                    callbacks: {
                        label(context) {
                            const value = Number(context.raw || 0);
                            const total = values.reduce((sum, v) => sum + Number(v || 0), 0);
                            const share = total > 0 ? (value / total) * 100 : 0;
                            return `${context.label}: ${formatCurrency(value)} (${share.toFixed(1)}%)`;
                        }
                    }
                }
            }
        },
        plugins: [
            renderCenterTextPlugin("Current Profit", formatCurrency(latest.profit || 0))
        ]
    });
}

function renderLineChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const periods = getPeriodsArray();
    if (!periods.length) return;

    const colorMap = getCurrentColorMap();
    const staffNames = Object.keys(colorMap);

    const datasets = [{
        label: "Company Total",
        data: periods.map(item => Number(item.profit || 0)),
        borderColor: CHART_COLORS.companyLine,
        backgroundColor: CHART_COLORS.companyFill,
        fill: true,
        tension: 0.34,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: CHART_COLORS.point,
        borderWidth: 3
    }];

    staffNames.forEach(name => {
        datasets.push({
            label: name,
            data: periods.map(period => {
                const breakdown = normalizeContributionBreakdown(period);
                const matched = breakdown.find(item => item.label === name);
                return matched ? Number(matched.profit || 0) : 0;
            }),
            borderColor: colorMap[name],
            backgroundColor: colorMap[name],
            fill: false,
            tension: 0.30,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2
        });
    });

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: periods.map(item => item.period_label),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: BASE_ANIMATION,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: baseLegendConfig(true),
                tooltip: {
                    backgroundColor: "rgba(15, 23, 34, 0.96)",
                    borderColor: "rgba(96, 165, 250, 0.18)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#dce7f5"
                }
            },
            scales: baseScalesConfig(false)
        }
    });
}

function renderStackedBarChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const periods = getPeriodsArray();
    if (!periods.length) return;

    const colorMap = getCurrentColorMap();
    const staffNames = Object.keys(colorMap);

    if (!staffNames.length) {
        profitChartInstance = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: periods.map(item => item.period_label),
                datasets: [{
                    label: "Profit",
                    data: periods.map(item => Number(item.profit || 0)),
                    backgroundColor: "rgba(59, 130, 246, 0.95)",
                    borderRadius: 8,
                    maxBarThickness: 48
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: BASE_ANIMATION,
                plugins: { legend: baseLegendConfig(true) },
                scales: baseScalesConfig(false)
            }
        });
        return;
    }

    const datasets = staffNames.map(name => ({
        label: name,
        data: periods.map(period => {
            const breakdown = normalizeContributionBreakdown(period);
            const matched = breakdown.find(item => item.label === name);
            return matched ? Number(matched.profit || 0) : 0;
        }),
        backgroundColor: colorMap[name],
        borderRadius: 8,
        maxBarThickness: 48
    }));

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: periods.map(item => item.period_label),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: BASE_ANIMATION,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: baseLegendConfig(true),
                tooltip: {
                    backgroundColor: "rgba(15, 23, 34, 0.96)",
                    borderColor: "rgba(96, 165, 250, 0.18)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#dce7f5"
                }
            },
            scales: baseScalesConfig(true)
        }
    });
}

const CHART_RENDERERS = {
    doughnut: renderDoughnutChart,
    line: renderLineChart,
    bar: renderStackedBarChart
};

function renderCurrentChart() {
    destroyChart();
    updateChartTexts();

    const renderer = CHART_RENDERERS[currentChartType] || renderDoughnutChart;
    renderer();
    renderLegend();
}

function activateButtonGroup(buttons, activeValue, datasetKey) {
    buttons.forEach(btn => {
        if (btn.dataset[datasetKey] === activeValue) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

function initChartTabs() {
    if (!chartTabs) return;

    chartTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const type = tab.dataset.chart;
            if (!type || type === currentChartType) return;

            currentChartType = type;
            activateButtonGroup(chartTabs, currentChartType, "chart");
            renderCurrentChart();
        });
    });
}

function initPeriodTabs() {
    if (!periodTabs) return;

    periodTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const type = tab.dataset.period;
            if (!type || type === currentPeriodType) return;

            currentPeriodType = type;
            activateButtonGroup(periodTabs, currentPeriodType, "period");
            updateSummaryCards();
            renderTable();
            renderCurrentChart();
        });
    });
}

function showTableMessage(message) {
    if (!dispatcherTableBody) return;

    dispatcherTableBody.innerHTML = "";

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = message;
    tr.appendChild(td);
    dispatcherTableBody.appendChild(tr);
}

function showTableLoading() {
    showTableMessage("Loading dashboard data...");
}

function closeTopMenu() {
    if (!topMenuDropdown) return;
    topMenuDropdown.classList.remove("open");
}

function toggleTopMenu() {
    if (!topMenuDropdown) return;
    topMenuDropdown.classList.toggle("open");
}

function applyNotesVisibility() {
    if (!notesCardEl || !toggleNotesBtn) return;

    if (notesVisible) {
        notesCardEl.classList.remove("hidden");
        toggleNotesBtn.textContent = "Hide dashboard notes";
    } else {
        notesCardEl.classList.add("hidden");
        toggleNotesBtn.textContent = "Show dashboard notes";
    }
}

function normalizeDashboardPayload(payload) {
    return {
        type: payload?.type || "",
        days: Array.isArray(payload?.days) ? payload.days : [],
        weeks: Array.isArray(payload?.weeks) ? payload.weeks : [],
        months: Array.isArray(payload?.months) ? payload.months : []
    };
}

async function loadDashboardData() {
    showTableLoading();

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/analytics/dashboard`);
        if (!response) return;

        if (!response.ok) {
            showTableMessage("Server returned an error. Please try again.");
            return;
        }

        const rawPayload = await response.json();
        dashboardPayload = normalizeDashboardPayload(rawPayload);

        updateSummaryCards();
        renderTable();
        renderCurrentChart();

    } catch (err) {
        console.error("Dashboard load error:", err);
        showTableMessage("Failed to load dashboard data.");
    }
}

function initTopMenu() {
    if (topMenuBtn) {
        topMenuBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleTopMenu();
        });
    }

    if (toggleNotesBtn) {
        toggleNotesBtn.addEventListener("click", () => {
            notesVisible = !notesVisible;
            applyNotesVisibility();
            closeTopMenu();
        });
    }

    if (refreshDashboardBtn) {
        refreshDashboardBtn.addEventListener("click", async () => {
            closeTopMenu();
            await loadDashboardData();
        });
    }

    document.addEventListener("click", (event) => {
        if (!topMenuDropdown || !topMenuBtn) return;

        const clickedInsideMenu = topMenuDropdown.contains(event.target);
        const clickedButton = topMenuBtn.contains(event.target);

        if (!clickedInsideMenu && !clickedButton) {
            closeTopMenu();
        }
    });
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
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");

    dashboardTitleEl = document.getElementById("dashboardTitle");
    dashboardSubtitleEl = document.getElementById("dashboardSubtitle");
    tableTitleEl = document.getElementById("tableTitle");
    tableSubtitleEl = document.getElementById("tableSubtitle");

    chartTabs = document.querySelectorAll('#chartTabs .control-btn');
    periodTabs = document.querySelectorAll('#periodTabs .control-btn');
    thLabelEl = document.getElementById("thLabel");
    analyticsSubtitleEl = document.getElementById("analyticsSubtitle");

    legendListEl = document.getElementById("legendList");
    legendTitleEl = document.getElementById("legendTitle");
    legendSubtitleEl = document.getElementById("legendSubtitle");
    legendTotalProfitEl = document.getElementById("legendTotalProfit");
    legendTotalPeriodLabelEl = document.getElementById("legendTotalPeriodLabel");

    topMenuBtn = document.getElementById("topMenuBtn");
    topMenuDropdown = document.getElementById("topMenuDropdown");
    toggleNotesBtn = document.getElementById("toggleNotesBtn");
    refreshDashboardBtn = document.getElementById("refreshDashboardBtn");
    notesCardEl = document.getElementById("notesCard");

    setUserName();
    setDashboardLabels();
    applyNotesVisibility();
    initChartTabs();
    initPeriodTabs();
    initTopMenu();
    loadDashboardData();

    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener("click", toggleSidebar);
});