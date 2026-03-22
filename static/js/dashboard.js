async function load() {
    const data = await apiRequest("/analytics/dashboard");
    totalProfit.innerText = data.total_profit;
}
load();