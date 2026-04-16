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

function isPersonalRole() {
    const role = getCurrentRole();
    return role === "dispatcher" || role === "hr";
}

function isCompanyRole() {
    const role = getCurrentRole();
    return ["manager", "accounting", "supervisor"].includes(role);
}

function setSidebarLinkVisibility(href, allowedRoles, getRoleFn) {
    const role = getRoleFn();

    document.querySelectorAll(`a.nav-link[href="${href}"]`).forEach((el) => {
        el.style.display = allowedRoles.includes(role) ? "" : "none";
    });
}

function applySidebarRoleVisibility() {
    setSidebarLinkVisibility("/users", ["manager"], getCurrentRole);
    setSidebarLinkVisibility("/archive", ["manager", "supervisor", "hr", "accounting"], getCurrentRole);
}

function setDashboardLabels() {
    if (!dashboardTitleEl || !dashboardSubtitleEl || !tableTitleEl || !tableSubtitleEl) return;

    if (isPersonalRole()) {
        dashboardTitleEl.textContent = "Personal Dashboard";
        dashboardSubtitleEl.textContent = "Your shipment activity, contribution and trend overview";
        tableTitleEl.textContent = "Personal Breakdown";
        tableSubtitleEl.textContent = "Your selected period breakdown";
        if (thLabelEl) thLabelEl.textContent = "Label";
        return;
    }

    dashboardTitleEl.textContent = "Company Dashboard";
    dashboardSubtitleEl.textContent = "Company shipment analytics, dispatcher contribution and profit trend";
    tableTitleEl.textContent = "Dispatcher Breakdown";
    tableSubtitleEl.textContent = "Dispatcher contribution breakdown for the selected period";
    if (thLabelEl) thLabelEl.textContent = "Dispatcher";
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

function toLocalDate(dateValue) {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek(dateValue) {
    const d = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function getEndOfWeek(dateValue) {
    const start = getStartOfWeek(dateValue);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
}

function isSameDay(dateA, dateB) {
    return dateA && dateB &&
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate();
}

function isSameMonth(dateA, dateB) {
    return dateA && dateB &&
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth();
}

function isDateInRange(dateValue, startDate, endDate) {
    return dateValue && startDate && endDate && dateValue >= startDate && dateValue <= endDate;
}

function getBlockStartDate(block) {
    const label = String(block?.period_label || "").trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        return toLocalDate(label);
    }

    if (/^\d{4}-\d{2}$/.test(label)) {
        return toLocalDate(`${label}-01`);
    }

    if (/^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/.test(label)) {
        return toLocalDate(label.split(" to ")[0]);
    }

    return null;
}

function getBlockEndDate(block) {
    const label = String(block?.period_label || "").trim();

    if (/^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/.test(label)) {
        return toLocalDate(label.split(" to ")[1]);
    }

    const start = getBlockStartDate(block);
    if (!start) return null;

    if (currentPeriodType === "day") return new Date(start);

    if (currentPeriodType === "week") {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return end;
    }

    return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

function getCurrentPeriodBlock() {
    const periods = getPeriodsArray();
    if (!periods.length) return null;

    const today = getTodayLocal();

    if (currentPeriodType === "day") {
        const exact = periods.find(block => isSameDay(getBlockStartDate(block), today));
        if (exact) return exact;
    }

    if (currentPeriodType === "week") {
        const exact = periods.find(block => {
            const start = getBlockStartDate(block);
            const end = getBlockEndDate(block);
            return isDateInRange(today, start, end);
        });
        if (exact) return exact;
    }

    if (currentPeriodType === "month") {
        const exact = periods.find(block => isSameMonth(getBlockStartDate(block), today));
        if (exact) return exact;
    }

    const enriched = periods.map(block => ({
        block,
        start: getBlockStartDate(block),
        end: getBlockEndDate(block)
    })).filter(item => item.start);

    const nonFuture = enriched.filter(item => item.start <= today);
    if (nonFuture.length) {
        nonFuture.sort((a, b) => a.start - b.start);
        return nonFuture[nonFuture.length - 1].block;
    }

    return periods[0];
}

function normalizeTimeBreakdown(periodBlock) {
    if (!periodBlock || !Array.isArray(periodBlock.breakdown)) return [];

    const totalProfit = periodBlock.breakdown.reduce((sum, item) => sum + Number(item.profit || 0), 0);

    return periodBlock.breakdown.map(item => ({
        label: item.label || "Unknown",
        shipments: Number(item.shipments || 0),
        profit: Number(item.profit || 0),
        gross: Number(item.gross || 0),
        share_percent: totalProfit > 0 ? (Number(item.profit || 0) / totalProfit) * 100 : 0
    }));
}

function normalizeCompanyContributionBreakdown(periodBlock) {
    if (!periodBlock || !Array.isArray(periodBlock.contribution_breakdown)) return [];

    return periodBlock.contribution_breakdown.map(item => ({
        staff_id: item.staff_id ?? null,
        label: item.label || "Unknown",
        shipments: Number(item.shipments || 0),
        profit: Number(item.profit || 0),
        gross: Number(item.gross || 0),
        share_percent: Number(item.share_percent || 0)
    }));
}

function normalizeDispatcherStats(periodBlock) {
    if (!periodBlock || !Array.isArray(periodBlock.dispatcher_stats)) return [];

    const totalProfit = periodBlock.dispatcher_stats.reduce((sum, item) => sum + Number(item.profit || 0), 0);

    return periodBlock.dispatcher_stats.map(item => ({
        label: item.staff_full_name || "Unknown",
        shipments: Number(item.shipments || 0),
        profit: Number(item.profit || 0),
        gross: Number(item.gross || 0),
        share_percent: totalProfit > 0 ? (Number(item.profit || 0) / totalProfit) * 100 : 0
    }));
}

function getSelectedTableRows() {
    const currentBlock = getCurrentPeriodBlock();
    if (!currentBlock) return [];

    if (isPersonalRole()) {
        return normalizeTimeBreakdown(currentBlock);
    }

    return normalizeCompanyContributionBreakdown(currentBlock).sort((a, b) => {
        if (b.profit !== a.profit) return b.profit - a.profit;
        if (b.shipments !== a.shipments) return b.shipments - a.shipments;
        return String(a.label).localeCompare(String(b.label));
    });
}

function getStableColorForIndex(index) {
    return STAFF_COLOR_PALETTE[index % STAFF_COLOR_PALETTE.length];
}

function getCompanyRoleColorMap() {
    const periods = getPeriodsArray();
    const names = [];

    periods.forEach(period => {
        normalizeCompanyContributionBreakdown(period).forEach(item => {
            if (!names.includes(item.label)) names.push(item.label);
        });
    });

    const map = {};
    names.forEach((name, index) => {
        map[name] = getStableColorForIndex(index);
    });

    return map;
}
function getPeriodTotals(periodBlock) {
    if (!periodBlock) return { profit: 0, shipments: 0, gross: 0 };

    return {
        profit: Number(periodBlock.profit || 0),
        shipments: Number(periodBlock.shipments || 0),
        gross: Number(periodBlock.gross || 0)
    };
}

function updateSummaryCards() {
    const currentBlock = getCurrentPeriodBlock();

    if (!currentBlock) {
        if (totalProfitEl) totalProfitEl.textContent = "$0";
        if (totalShipmentsEl) totalShipmentsEl.textContent = "0";
        if (totalGrossEl) totalGrossEl.textContent = "$0";
        if (topDispatcherEl) topDispatcherEl.textContent = "—";
        if (legendTotalProfitEl) legendTotalProfitEl.textContent = "$0";
        if (legendTotalPeriodLabelEl) legendTotalPeriodLabelEl.textContent = "Selected period";
        return;
    }

    const totals = getPeriodTotals(currentBlock);

    if (totalProfitEl) totalProfitEl.textContent = formatCurrency(totals.profit);
    if (totalShipmentsEl) totalShipmentsEl.textContent = String(totals.shipments);
    if (totalGrossEl) totalGrossEl.textContent = formatCurrency(totals.gross);
    if (topDispatcherEl) topDispatcherEl.textContent = currentBlock.period_label || "Selected Period";

    if (legendTotalProfitEl) legendTotalProfitEl.textContent = formatCurrency(totals.profit);
    if (legendTotalPeriodLabelEl) legendTotalPeriodLabelEl.textContent = currentBlock.period_label || "Selected period";
}

function createTextCell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
}

function renderTable() {
    if (!dispatcherTableBody) return;

    const rows = getSelectedTableRows();
    dispatcherTableBody.innerHTML = "";

    if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "empty-row";
        td.textContent = "No breakdown data found for the selected period.";
        tr.appendChild(td);
        dispatcherTableBody.appendChild(tr);
        return;
    }

    rows.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.appendChild(createTextCell(index + 1));
        tr.appendChild(createTextCell(item.label || "-"));
        tr.appendChild(createTextCell(item.shipments ?? 0));
        tr.appendChild(createTextCell(formatCurrency(item.profit || 0)));
        tr.appendChild(createTextCell(`${Number(item.share_percent || 0).toFixed(1)}%`));
        dispatcherTableBody.appendChild(tr);
    });
}

function renderLegendRows(rows, totalProfit) {
    if (!legendListEl) return;

    legendListEl.innerHTML = "";

    if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "legend-empty";
        empty.textContent = "No contribution data found for the selected period.";
        legendListEl.appendChild(empty);
        return;
    }

    rows.forEach((item, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "legend-item";

        const colorDot = document.createElement("span");
        colorDot.className = "legend-color";
        colorDot.style.background = item.color || getStableColorForIndex(index);

        const content = document.createElement("div");

        const mainRow = document.createElement("div");
        mainRow.className = "legend-main";

        const name = document.createElement("div");
        name.className = "legend-name";
        name.textContent = item.label || "Unknown";

        const profit = document.createElement("div");
        profit.className = "legend-profit";
        profit.textContent = formatCurrency(item.value || 0);

        mainRow.appendChild(name);
        mainRow.appendChild(profit);

        const sub = document.createElement("div");
        sub.className = "legend-sub";

        const share = totalProfit > 0 ? (Number(item.value || 0) / totalProfit) * 100 : 0;
        sub.innerHTML = `<span>Share: ${share.toFixed(1)}%</span>`;

        content.appendChild(mainRow);
        content.appendChild(sub);

        wrapper.appendChild(colorDot);
        wrapper.appendChild(content);

        legendListEl.appendChild(wrapper);
    });
}

function renderLegend() {
    if (!legendListEl) return;

    legendListEl.innerHTML = "";

    if (currentChartType !== "doughnut") {
        const empty = document.createElement("div");
        empty.className = "legend-empty";
        empty.textContent = "Switch to Contribution to see the selected period split.";
        legendListEl.appendChild(empty);
        return;
    }

    const data = getContributionChartData();
    renderLegendRows(data.rows, data.totalProfit);
}

function updateChartTexts() {
    if (!analyticsSubtitleEl || !legendTitleEl || !legendSubtitleEl) return;

    if (isPersonalRole()) {
        if (currentChartType === "doughnut") {
            legendTitleEl.textContent = "Contribution";
            legendSubtitleEl.textContent = "Your selected period split";
            analyticsSubtitleEl.textContent = "Personal contribution for the selected period.";
        } else if (currentChartType === "line") {
            legendTitleEl.textContent = "Contribution Panel";
            legendSubtitleEl.textContent = "Switch to Contribution to see the selected period split";
            analyticsSubtitleEl.textContent = `Trend shows your profit across visible ${currentPeriodType} periods.`;
        } else {
            legendTitleEl.textContent = "Contribution Panel";
            legendSubtitleEl.textContent = "Switch to Contribution to see the selected period split";
            analyticsSubtitleEl.textContent = `Bar shows your profit across visible ${currentPeriodType} periods.`;
        }
        return;
    }

    if (currentChartType === "doughnut") {
        legendTitleEl.textContent = "Dispatcher Contribution";
        legendSubtitleEl.textContent = "Dispatcher split for the selected period";
        analyticsSubtitleEl.textContent = "Contribution shows how selected period profit is divided between dispatchers.";
    } else if (currentChartType === "line") {
        legendTitleEl.textContent = "Contribution Panel";
        legendSubtitleEl.textContent = "Switch to Contribution to see dispatcher split";
        analyticsSubtitleEl.textContent = `Trend shows dispatcher profit movement across visible ${currentPeriodType} periods.`;
    } else {
        legendTitleEl.textContent = "Contribution Panel";
        legendSubtitleEl.textContent = "Switch to Contribution to see dispatcher split";
        analyticsSubtitleEl.textContent = `Bar compares dispatcher profit across visible ${currentPeriodType} periods.`;
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

function getContributionChartData() {
    const currentBlock = getCurrentPeriodBlock();
    if (!currentBlock) {
        return { rows: [], totalProfit: 0, centerText: "$0" };
    }

    if (isPersonalRole()) {
        const rows = normalizeTimeBreakdown(currentBlock).map((item, index) => ({
            label: item.label,
            value: item.profit,
            color: getStableColorForIndex(index)
        }));

        const totalProfit = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

        return {
            rows,
            totalProfit,
            centerText: formatCurrency(totalProfit)
        };
    }

    const colorMap = getCompanyRoleColorMap();
    const rows = normalizeCompanyContributionBreakdown(currentBlock).map((item, index) => ({
        label: item.label,
        value: item.profit,
        color: colorMap[item.label] || getStableColorForIndex(index)
    }));

    const totalProfit = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

    return {
        rows,
        totalProfit,
        centerText: formatCurrency(totalProfit)
    };
}

function renderDoughnutChart() {
    const canvas = getCanvas();
    if (!canvas) return;

    const contributionData = getContributionChartData();
    const rows = contributionData.rows || [];
    if (!rows.length) return;

    const labels = rows.map(item => item.label);
    const values = rows.map(item => Number(item.value || 0));
    const colors = rows.map(item => item.color || getStableColorForIndex(0));

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                label: "Contribution",
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
            renderCenterTextPlugin("Selected Profit", contributionData.centerText)
        ]
    });
}

function renderPersonalLineChart(periods) {
    const canvas = getCanvas();
    if (!canvas) return;

    const labels = periods.map(item => item.period_label);
    const values = periods.map(item => Number(item.profit || 0));

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "My Profit",
                data: values,
                borderColor: CHART_COLORS.companyLine,
                backgroundColor: CHART_COLORS.companyFill,
                fill: true,
                tension: 0.30,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: BASE_ANIMATION,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: baseLegendConfig(true),
                tooltip: {
                    backgroundColor: "rgba(15, 23, 34, 0.96)",
                    borderColor: "rgba(96, 165, 250, 0.18)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#dce7f5",
                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: baseScalesConfig(false)
        }
    });
}

function renderCompanyLineChart(periods) {
    const canvas = getCanvas();
    if (!canvas) return;

    const colorMap = getCompanyRoleColorMap();
    const names = Object.keys(colorMap);

    const datasets = names.map((name, index) => ({
        label: name,
        data: periods.map(period => {
            const row = normalizeCompanyContributionBreakdown(period).find(item => item.label === name);
            return row ? Number(row.profit || 0) : 0;
        }),
        borderColor: colorMap[name] || getStableColorForIndex(index),
        backgroundColor: colorMap[name] || getStableColorForIndex(index),
        fill: false,
        tension: 0.30,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2
    }));

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
            interaction: { mode: "index", intersect: false },
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

function renderLineChart() {
    const periods = getPeriodsArray();
    if (!periods.length) return;

    if (isPersonalRole()) {
        renderPersonalLineChart(periods);
        return;
    }

    renderCompanyLineChart(periods);
}

function renderPersonalBarChart(periods) {
    const canvas = getCanvas();
    if (!canvas) return;

    const labels = periods.map(item => item.period_label);
    const values = periods.map(item => Number(item.profit || 0));

    profitChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "My Profit",
                data: values,
                backgroundColor: "rgba(59, 130, 246, 0.90)",
                borderRadius: 8,
                maxBarThickness: 56
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: BASE_ANIMATION,
            plugins: {
                legend: baseLegendConfig(true),
                tooltip: {
                    backgroundColor: "rgba(15, 23, 34, 0.96)",
                    borderColor: "rgba(96, 165, 250, 0.18)",
                    borderWidth: 1,
                    titleColor: "#f8fbff",
                    bodyColor: "#dce7f5",
                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: baseScalesConfig(false)
        }
    });
}

function renderCompanyBarChart(periods) {
    const canvas = getCanvas();
    if (!canvas) return;

    const colorMap = getCompanyRoleColorMap();
    const names = Object.keys(colorMap);

    const datasets = names.map((name, index) => ({
        label: name,
        data: periods.map(period => {
            const row = normalizeCompanyContributionBreakdown(period).find(item => item.label === name);
            return row ? Number(row.profit || 0) : 0;
        }),
        backgroundColor: colorMap[name] || getStableColorForIndex(index),
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
            interaction: { mode: "index", intersect: false },
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

function renderBarChart() {
    const periods = getPeriodsArray();
    if (!periods.length) return;

    if (isPersonalRole()) {
        renderPersonalBarChart(periods);
        return;
    }

    renderCompanyBarChart(periods);
}

const CHART_RENDERERS = {
    doughnut: renderDoughnutChart,
    line: renderLineChart,
    bar: renderBarChart
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
        console.log("dashboard payload:", rawPayload);

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
    applySidebarRoleVisibility();
    applyNotesVisibility();
    initChartTabs();
    initPeriodTabs();
    initTopMenu();
    loadDashboardData();

    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener("click", toggleSidebar);
});