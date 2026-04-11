const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";

const MANAGER_ONLY_ROLES = new Set(["manager"]);
const USER_ADMIN_ROLES = new Set(["manager", "hr"]);

let logoutBtn, toggleSidebarBtn, toggleNotesBtn, toggleFiltersBtn;
let refreshUsersBtn, openCreateUserBtn, openPasswordModalBtn, previewUsersBtn;
let runUserFiltersBtn, resetUserFiltersBtn, loadUserLogsBtn, refreshLogsBtn;
let collapseUsersTableBtn, collapseLogsBtn;

let usersNotesPanel, usersFiltersPanel, usersTablePanel, userLogsPanel;
let usersTableBody, userLogsList;
let usersPreviewCard, usersPreviewContent;

let summaryTotalUsers, summaryActiveUsers, summaryInactiveUsers, summaryPrivilegedUsers;
let usersStatusText, usersResultInfo;

let userSearchInput, jobTitleFilter, statusFilter, logsUserFilter;
let jobTitleFilterDisplay, statusFilterDisplay;

let createUserModal, createUserForm, closeCreateUserModalBtn, submitCreateUserBtn;
let createUsername, createFullName, createJobTitle, createPassword, createJobTitleDisplay;

let changePasswordModal, changePasswordForm, closePasswordModalBtn, submitPasswordChangeBtn;
let passwordStaffId, newPassword;

let usersSelectModal, usersSelectModalTitle, usersSelectOptionList, usersSelectCloseBtn;
let currentSelectTarget = null;

let confirmStatusModal, confirmStatusText, closeConfirmStatusModalBtn, cancelConfirmStatusBtn, confirmStatusActionBtn;
let pendingStatusAction = null;

let currentUsers = [];
let currentLogs = [];
let isCreatingUser = false;
let isChangingPassword = false;

const SELECT_OPTIONS = {
    createJobTitle: [
        { value: "manager", label: "Manager" },
        { value: "accounting", label: "Accounting" },
        { value: "supervisor", label: "Supervisor" },
        { value: "dispatcher", label: "Dispatcher" },
        { value: "tracking", label: "Tracking" },
        { value: "hr", label: "HR" }
    ],
    jobTitleFilter: [
        { value: "", label: "All Roles" },
        { value: "manager", label: "Manager" },
        { value: "accounting", label: "Accounting" },
        { value: "supervisor", label: "Supervisor" },
        { value: "dispatcher", label: "Dispatcher" },
        { value: "tracking", label: "Tracking" },
        { value: "hr", label: "HR" }
    ],
    statusFilter: [
        { value: "", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
    ]
};

// ============================================================
// AUTH / USER HELPERS
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

function getCurrentUserRole() {
    const user = getUserData();
    return String(user?.job_title || "").trim().toLowerCase();
}

function isManagerOnlyRole() {
    return MANAGER_ONLY_ROLES.has(getCurrentUserRole());
}

function isUserAdminRole() {
    return USER_ADMIN_ROLES.has(getCurrentUserRole());
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
// BASIC UI HELPERS
// ============================================================

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
}

function togglePanel(panel) {
    if (!panel) return;
    panel.classList.toggle("open");
}

function setStatus(text) {
    if (usersStatusText) {
        usersStatusText.textContent = text;
    }
}

function setResultInfo(text) {
    if (usersResultInfo) {
        usersResultInfo.textContent = text;
    }
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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
    if (data && typeof data === "object" && !data.error) return [data];
    return [];
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

// ============================================================
// SELECT MODAL
// ============================================================

function getSelectLabel(selectName, value) {
    const options = SELECT_OPTIONS[selectName] || [];
    const found = options.find((item) => item.value === value);
    return found ? found.label : "";
}

function setSelectValue(selectName, value) {
    if (selectName === "createJobTitle") {
        if (createJobTitle) createJobTitle.value = value;
        if (createJobTitleDisplay) createJobTitleDisplay.value = getSelectLabel(selectName, value);
        return;
    }

    if (selectName === "jobTitleFilter") {
        if (jobTitleFilter) jobTitleFilter.value = value;
        if (jobTitleFilterDisplay) jobTitleFilterDisplay.value = getSelectLabel(selectName, value);
        return;
    }

    if (selectName === "statusFilter") {
        if (statusFilter) statusFilter.value = value;
        if (statusFilterDisplay) statusFilterDisplay.value = getSelectLabel(selectName, value);
    }
}

function openSelectModal(targetName, titleText) {
    currentSelectTarget = targetName;
    if (!usersSelectModal || !usersSelectOptionList) return;

    const options = SELECT_OPTIONS[targetName] || [];
    usersSelectOptionList.innerHTML = "";

    if (usersSelectModalTitle) {
        usersSelectModalTitle.textContent = titleText || "Select Option";
    }

    options.forEach((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "select-option-btn";
        btn.textContent = option.label;
        btn.addEventListener("click", () => {
            setSelectValue(targetName, option.value);
            closeSelectModal();

            if (targetName === "jobTitleFilter" || targetName === "statusFilter") {
                refreshUsersView();
            }
        });
        usersSelectOptionList.appendChild(btn);
    });

    usersSelectModal.classList.remove("hidden");
    usersSelectModal.style.display = "flex";
}

function closeSelectModal() {
    currentSelectTarget = null;
    if (!usersSelectModal) return;
    usersSelectModal.style.display = "none";
    usersSelectModal.classList.add("hidden");
}

// ============================================================
// CUSTOM CONFIRM MODAL
// ============================================================

function openConfirmStatusModal(text, onConfirm, dangerLabel = "Confirm") {
    pendingStatusAction = onConfirm;

    if (confirmStatusText) {
        confirmStatusText.textContent = text;
    }

    if (confirmStatusActionBtn) {
        confirmStatusActionBtn.textContent = dangerLabel;
    }

    if (confirmStatusModal) {
        confirmStatusModal.classList.remove("hidden");
        confirmStatusModal.style.display = "flex";
    }
}

function closeConfirmStatusModal() {
    pendingStatusAction = null;

    if (!confirmStatusModal) return;
    confirmStatusModal.style.display = "none";
    confirmStatusModal.classList.add("hidden");
}

// ============================================================
// ROLE-BASED UI
// ============================================================

function applyRoleBasedUI() {
    const canAdminUsers = isUserAdminRole();

    if (openCreateUserBtn) {
        openCreateUserBtn.classList.toggle("hidden", !canAdminUsers);
    }

    if (openPasswordModalBtn) {
        openPasswordModalBtn.classList.toggle("hidden", !canAdminUsers);
    }

    if (!canAdminUsers) {
        setStatus("Access limited");
        setResultInfo("Only manager and HR can manage users.");
    }
}

// ============================================================
// TABLE HELPERS
// ============================================================

function showUsersTableLoading(message = "Loading users...") {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-row">${message}</td>
        </tr>
    `;
}

function showUsersTableError(message = "Failed to load users.") {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-row">${message}</td>
        </tr>
    `;
}

function showUsersEmpty(message = "No users found.") {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-row">${message}</td>
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

function createStatusCell(isActive) {
    const td = document.createElement("td");

    const span = document.createElement("span");
    span.className = `active-pill ${isActive ? "is-active" : "is-inactive"}`;
    span.textContent = isActive ? "Active" : "Inactive";

    td.appendChild(span);
    return td;
}

function createActionButton(text, onClick, options = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `action-small-btn ${options.danger ? "danger" : ""}`;
    btn.textContent = text;

    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await onClick();
    });

    return btn;
}

function renderUsersTable(rows) {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
        showUsersEmpty("No users found for the current filters.");
        return;
    }

    rows.forEach((user) => {
        const tr = document.createElement("tr");

        tr.appendChild(createCell(user.staff_id ?? "—"));
        tr.appendChild(createCell(user.staff_username || "—"));
        tr.appendChild(createCell(user.staff_full_name || "—"));
        tr.appendChild(createRoleCell(user.job_title || "—"));
        tr.appendChild(createStatusCell(Boolean(user.is_active)));
        tr.appendChild(createCell(formatDateTime(user.created_at)));

        const actionsTd = document.createElement("td");
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "action-group";

        if (isUserAdminRole()) {
            actionsWrap.appendChild(createActionButton("Password", async () => {
                openPasswordModalWithUser(user);
            }));
        }

        if (isManagerOnlyRole()) {
            const nextActive = !Boolean(user.is_active);
            actionsWrap.appendChild(createActionButton(
                nextActive ? "Activate" : "Deactivate",
                async () => {
                    const actionText = nextActive ? "activate" : "deactivate";
                    openConfirmStatusModal(
                        `Are you sure you want to ${actionText} user "${user.staff_full_name || user.staff_username || user.staff_id}"?`,
                        async () => {
                            closeConfirmStatusModal();
                            await changeUserStatus(user.staff_id, nextActive);
                        },
                        nextActive ? "Activate" : "Deactivate"
                    );
                },
                { danger: !nextActive }
            ));
        }

        actionsWrap.appendChild(createActionButton("Logs", async () => {
            await loadUserLogs(user.staff_id);
        }));

        actionsTd.appendChild(actionsWrap);
        tr.appendChild(actionsTd);

        usersTableBody.appendChild(tr);
    });
}

// ============================================================
// PREVIEW
// ============================================================

function previewUsers() {
    if (!usersPreviewCard || !usersPreviewContent) return;

    const filtered = applyUserFilters(currentUsers);
    usersPreviewCard.classList.remove("hidden");

    if (!filtered.length) {
        usersPreviewContent.innerHTML = `<div class="empty-row">No users found for preview.</div>`;
        setStatus("Preview ready");
        setResultInfo("0 user(s) in preview");
        return;
    }

    let html = "";

    filtered.forEach((user) => {
        const fullName = escapeHtml(user.staff_full_name || "—");
        const username = escapeHtml(user.staff_username || "—");
        const role = escapeHtml(user.job_title || "—");
        const status = Boolean(user.is_active) ? "Active" : "Inactive";
        const createdAt = escapeHtml(formatDateTime(user.created_at));
        const staffId = escapeHtml(String(user.staff_id ?? "—"));

        html += `
            <div class="preview-user-card">
                <div class="preview-user-name">${fullName}</div>
                <div class="preview-user-meta">
                    <strong>Staff ID:</strong> ${staffId}<br>
                    <strong>Username:</strong> ${username}<br>
                    <strong>Role:</strong> ${role}<br>
                    <strong>Status:</strong> ${status}<br>
                    <strong>Created At:</strong> ${createdAt}
                </div>
            </div>
        `;
    });

    usersPreviewContent.innerHTML = html;
    setStatus("Preview ready");
    setResultInfo(`${filtered.length} user(s) in preview`);
}

// ============================================================
// LOGS RENDER
// ============================================================

function renderUserLogs(logs, filteredStaffId = null) {
    if (!userLogsList) return;

    userLogsList.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
        userLogsList.innerHTML = `<div class="empty-row">No logs found.</div>`;
        return;
    }

    const rows = filteredStaffId
        ? logs.filter((log) => Number(log.staff_id) === Number(filteredStaffId))
        : logs;

    if (!rows.length) {
        userLogsList.innerHTML = `<div class="empty-row">No logs found for this user.</div>`;
        return;
    }

    rows.forEach((log) => {
        const card = document.createElement("div");
        card.className = "log-card";

        const changedBy =
            log.changed_by_name ||
            `Staff #${log.changed_by || "—"}`;

        const affectedUser =
            log.affected_user_name ||
            log.affected_username ||
            `Staff #${log.staff_id || "—"}`;

        const createdAt = formatDateTime(log.created_at);
        const actionType = log.action_type || "Change";

        card.innerHTML = `
            <div class="log-card-top">
                <div class="log-user">${escapeHtml(affectedUser)}</div>
                <div class="log-date">${escapeHtml(createdAt)}</div>
            </div>
            <div class="log-field">${escapeHtml(actionType)}</div>
            <div class="log-values">
                <div class="log-value-box"><strong>Affected Username:</strong> ${escapeHtml(log.affected_username || "—")}</div>
                <div class="log-value-box"><strong>Changed By:</strong> ${escapeHtml(changedBy)}</div>
                <div class="log-value-box"><strong>Staff ID:</strong> ${escapeHtml(String(log.staff_id ?? "—"))}</div>
            </div>
        `;

        userLogsList.appendChild(card);
    });
}

// ============================================================
// SUMMARY
// ============================================================

function updateSummaryCards(rows) {
    const totalUsers = rows.length;
    const activeUsers = rows.filter((row) => Boolean(row.is_active)).length;
    const inactiveUsers = totalUsers - activeUsers;
    const privilegedUsers = rows.filter((row) => {
        const role = String(row.job_title || "").trim().toLowerCase();
        return role === "manager" || role === "hr";
    }).length;

    if (summaryTotalUsers) summaryTotalUsers.textContent = String(totalUsers);
    if (summaryActiveUsers) summaryActiveUsers.textContent = String(activeUsers);
    if (summaryInactiveUsers) summaryInactiveUsers.textContent = String(inactiveUsers);
    if (summaryPrivilegedUsers) summaryPrivilegedUsers.textContent = String(privilegedUsers);
}

// ============================================================
// FILTERS
// ============================================================

function applyUserFilters(rows) {
    const searchValue = String(userSearchInput?.value || "").trim().toLowerCase();
    const jobTitleValue = String(jobTitleFilter?.value || "").trim().toLowerCase();
    const statusValue = String(statusFilter?.value || "").trim().toLowerCase();

    return (rows || []).filter((row) => {
        const username = String(row.staff_username || "").toLowerCase();
        const fullName = String(row.staff_full_name || "").toLowerCase();
        const jobTitle = String(row.job_title || "").trim().toLowerCase();
        const active = Boolean(row.is_active);

        if (searchValue) {
            const haystack = `${username} ${fullName}`;
            if (!haystack.includes(searchValue)) {
                return false;
            }
        }

        if (jobTitleValue && jobTitle !== jobTitleValue) {
            return false;
        }

        if (statusValue === "active" && !active) {
            return false;
        }

        if (statusValue === "inactive" && active) {
            return false;
        }

        return true;
    });
}

function refreshUsersView() {
    const filtered = applyUserFilters(currentUsers);
    renderUsersTable(filtered);
    updateSummaryCards(filtered);
    setResultInfo(`${filtered.length} user(s) shown`);
}

// ============================================================
// USERS LOAD
// ============================================================

async function loadUsers() {
    if (!isUserAdminRole()) {
        showUsersTableError("Only manager or HR can access user records.");
        return;
    }

    showUsersTableLoading("Loading users...");
    setStatus("Loading users...");
    setResultInfo("Requesting user records...");

    const response = await fetchWithAuth(`${API_BASE_URL}/users/all`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed");
        setResultInfo("Network request failed");
        showUsersTableError("Network error while loading users.");
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load users.");
        setStatus("Error");
        setResultInfo(message);
        showUsersTableError(message);
        return;
    }

    const data = await response.json();
    currentUsers = normalizeToArray(data);

    refreshUsersView();
    setStatus("Users loaded");
}

async function loadUserLogs(staffId = null) {
    if (!isUserAdminRole()) {
        if (userLogsList) {
            userLogsList.innerHTML = `<div class="empty-row">Only manager or HR can access user logs.</div>`;
        }
        return;
    }

    if (userLogsList) {
        userLogsList.innerHTML = `<div class="empty-row">Loading logs...</div>`;
    }

    setStatus("Loading logs...");
    setResultInfo("Requesting user logs...");

    const response = await fetchWithAuth(`${API_BASE_URL}/users/logs`, {
        method: "GET"
    });

    if (!response) {
        setStatus("Failed");
        setResultInfo("Network request failed");
        if (userLogsList) {
            userLogsList.innerHTML = `<div class="empty-row">Network error while loading logs.</div>`;
        }
        return;
    }

    if (!response.ok) {
        const message = await parseErrorResponse(response, "Failed to load user logs.");
        setStatus("Error");
        setResultInfo(message);
        if (userLogsList) {
            userLogsList.innerHTML = `<div class="empty-row">${message}</div>`;
        }
        return;
    }

    const data = await response.json();
    currentLogs = normalizeToArray(data);

    const explicitStaffId = staffId || String(logsUserFilter?.value || "").trim() || null;
    renderUserLogs(currentLogs, explicitStaffId);

    setStatus("Logs loaded");
    setResultInfo(`${currentLogs.length} log entr${currentLogs.length === 1 ? "y" : "ies"} loaded`);
}

// ============================================================
// CREATE USER
// ============================================================

function clearCreateUserErrors() {
    [createUsername, createFullName, createJobTitleDisplay, createPassword].forEach((el) => {
        el?.classList.remove("field-error");
    });
}

function validateCreateUserForm() {
    clearCreateUserErrors();

    const username = String(createUsername?.value || "").trim();
    const fullName = String(createFullName?.value || "").trim();
    const jobTitle = String(createJobTitle?.value || "").trim();
    const password = String(createPassword?.value || "");

    let valid = true;

    if (!username) {
        createUsername?.classList.add("field-error");
        valid = false;
    }

    if (!fullName) {
        createFullName?.classList.add("field-error");
        valid = false;
    }

    if (!jobTitle) {
        createJobTitleDisplay?.classList.add("field-error");
        valid = false;
    }

    if (!password) {
        createPassword?.classList.add("field-error");
        valid = false;
    }

    return valid;
}

function openCreateUserModal() {
    if (!isUserAdminRole()) return;

    resetCreateUserForm();
    if (!createUserModal) return;

    createUserModal.classList.remove("hidden");
    createUserModal.style.display = "flex";
}

function closeCreateUserModal() {
    if (!createUserModal) return;

    createUserModal.style.display = "none";
    createUserModal.classList.add("hidden");
}

function resetCreateUserForm() {
    if (createUserForm) createUserForm.reset();
    setSelectValue("createJobTitle", "");
    clearCreateUserErrors();
}

async function createUser(event) {
    event.preventDefault();

    if (!isUserAdminRole()) {
        alert("Only manager or HR can create users.");
        return;
    }

    if (isCreatingUser) return;

    if (!validateCreateUserForm()) {
        alert("Please fill in all required user fields.");
        return;
    }

    isCreatingUser = true;

    if (submitCreateUserBtn) {
        submitCreateUserBtn.disabled = true;
        submitCreateUserBtn.textContent = "Creating...";
    }

    setStatus("Creating user...");
    setResultInfo("Submitting new user account...");

    try {
        const payload = {
            staff_username: String(createUsername.value || "").trim(),
            full_name: String(createFullName.value || "").trim(),
            job_title: String(createJobTitle.value || "").trim(),
            password: String(createPassword.value || "")
        };

        const qs = buildQueryString(payload);

        const response = await fetchWithAuth(`${API_BASE_URL}/users/create?${qs}`, {
            method: "POST"
        });

        if (!response) {
            setStatus("Failed");
            setResultInfo("Network request failed");
            return;
        }

        if (!response.ok) {
            const message = await parseErrorResponse(response, "Failed to create user.");
            alert(message);
            setStatus("Error");
            setResultInfo(message);
            return;
        }

        const data = await response.json();
        alert(data.message || "User created successfully.");

        closeCreateUserModal();
        await loadUsers();
        await loadUserLogs();

        setStatus("User created");
        setResultInfo("User record created successfully");

    } catch (err) {
        console.error("Create user error:", err);
        alert("Server error while creating user.");
        setStatus("Error");
        setResultInfo("Server error while creating user");
    } finally {
        isCreatingUser = false;

        if (submitCreateUserBtn) {
            submitCreateUserBtn.disabled = false;
            submitCreateUserBtn.textContent = "Create User";
        }
    }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

function clearPasswordErrors() {
    [passwordStaffId, newPassword].forEach((el) => {
        el?.classList.remove("field-error");
    });
}

function validatePasswordForm() {
    clearPasswordErrors();

    const staffIdValue = String(passwordStaffId?.value || "").trim();
    const newPasswordValue = String(newPassword?.value || "");

    let valid = true;

    if (!staffIdValue) {
        passwordStaffId?.classList.add("field-error");
        valid = false;
    }

    if (!newPasswordValue) {
        newPassword?.classList.add("field-error");
        valid = false;
    }

    return valid;
}

function openPasswordModal() {
    if (!isUserAdminRole()) return;

    resetPasswordForm();
    if (!changePasswordModal) return;

    changePasswordModal.classList.remove("hidden");
    changePasswordModal.style.display = "flex";
}

function openPasswordModalWithUser(user) {
    openPasswordModal();
    if (passwordStaffId && user?.staff_id !== undefined) {
        passwordStaffId.value = user.staff_id;
    }
}

function closePasswordModal() {
    if (!changePasswordModal) return;

    changePasswordModal.style.display = "none";
    changePasswordModal.classList.add("hidden");
}

function resetPasswordForm() {
    if (changePasswordForm) changePasswordForm.reset();
    clearPasswordErrors();
}

async function changePassword(event) {
    event.preventDefault();

    if (!isUserAdminRole()) {
        alert("Only manager or HR can change passwords.");
        return;
    }

    if (isChangingPassword) return;

    if (!validatePasswordForm()) {
        alert("Please fill in both Staff ID and New Password.");
        return;
    }

    isChangingPassword = true;

    if (submitPasswordChangeBtn) {
        submitPasswordChangeBtn.disabled = true;
        submitPasswordChangeBtn.textContent = "Updating...";
    }

    setStatus("Changing password...");
    setResultInfo("Submitting password update...");

    try {
        const payload = {
            staff_id: String(passwordStaffId.value || "").trim(),
            new_password: String(newPassword.value || "")
        };

        const qs = buildQueryString(payload);

        const response = await fetchWithAuth(`${API_BASE_URL}/users/change-password?${qs}`, {
            method: "POST"
        });

        if (!response) {
            setStatus("Failed");
            setResultInfo("Network request failed");
            return;
        }

        if (!response.ok) {
            const message = await parseErrorResponse(response, "Failed to change password.");
            alert(message);
            setStatus("Error");
            setResultInfo(message);
            return;
        }

        const data = await response.json();
        alert(data.message || "Password updated successfully.");

        closePasswordModal();
        await loadUserLogs(payload.staff_id);

        setStatus("Password updated");
        setResultInfo("Password changed successfully");

    } catch (err) {
        console.error("Change password error:", err);
        alert("Server error while changing password.");
        setStatus("Error");
        setResultInfo("Server error while changing password");
    } finally {
        isChangingPassword = false;

        if (submitPasswordChangeBtn) {
            submitPasswordChangeBtn.disabled = false;
            submitPasswordChangeBtn.textContent = "Update Password";
        }
    }
}

// ============================================================
// CHANGE STATUS
// ============================================================

async function changeUserStatus(staffId, isActive) {
    if (!isManagerOnlyRole()) {
        alert("Only manager can change user status.");
        return;
    }

    setStatus("Updating status...");
    setResultInfo(`Trying to update user #${staffId}...`);

    try {
        const payload = {
            staff_id: staffId,
            is_active: isActive
        };

        const qs = buildQueryString(payload);

        const response = await fetchWithAuth(`${API_BASE_URL}/users/change-status?${qs}`, {
            method: "POST"
        });

        if (!response) {
            setStatus("Failed");
            setResultInfo("Network request failed");
            return;
        }

        if (!response.ok) {
            const message = await parseErrorResponse(response, "Failed to change user status.");
            alert(message);
            setStatus("Error");
            setResultInfo(message);
            return;
        }

        const data = await response.json();
        alert(data.message || "User status updated successfully.");

        await loadUsers();
        await loadUserLogs(staffId);

        setStatus("Status updated");
        setResultInfo(`User #${staffId} status updated`);

    } catch (err) {
        console.error("Change status error:", err);
        alert("Server error while changing user status.");
        setStatus("Error");
        setResultInfo("Server error while changing user status");
    }
}

// ============================================================
// RESET / FILTER ACTIONS
// ============================================================

function resetFilters() {
    if (userSearchInput) userSearchInput.value = "";
    if (logsUserFilter) logsUserFilter.value = "";
    setSelectValue("jobTitleFilter", "");
    setSelectValue("statusFilter", "");

    refreshUsersView();

    if (usersPreviewCard) {
        usersPreviewCard.classList.add("hidden");
    }

    if (usersPreviewContent) {
        usersPreviewContent.innerHTML = "No preview yet";
    }

    if (currentLogs.length) {
        renderUserLogs(currentLogs, null);
    } else if (userLogsList) {
        userLogsList.innerHTML = `<div class="empty-row">No logs loaded yet.</div>`;
    }

    setStatus("Ready");
    setResultInfo("Filters were reset");
}

// ============================================================
// DOM CACHE
// ============================================================

function cacheDom() {
    logoutBtn = document.getElementById("logoutBtn");
    toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    toggleNotesBtn = document.getElementById("toggleNotesBtn");
    toggleFiltersBtn = document.getElementById("toggleFiltersBtn");

    refreshUsersBtn = document.getElementById("refreshUsersBtn");
    openCreateUserBtn = document.getElementById("openCreateUserBtn");
    openPasswordModalBtn = document.getElementById("openPasswordModalBtn");
    previewUsersBtn = document.getElementById("previewUsersBtn");
    runUserFiltersBtn = document.getElementById("runUserFiltersBtn");
    resetUserFiltersBtn = document.getElementById("resetUserFiltersBtn");
    loadUserLogsBtn = document.getElementById("loadUserLogsBtn");
    refreshLogsBtn = document.getElementById("refreshLogsBtn");
    collapseUsersTableBtn = document.getElementById("collapseUsersTableBtn");
    collapseLogsBtn = document.getElementById("collapseLogsBtn");

    usersNotesPanel = document.getElementById("usersNotesPanel");
    usersFiltersPanel = document.getElementById("usersFiltersPanel");
    usersTablePanel = document.getElementById("usersTablePanel");
    userLogsPanel = document.getElementById("userLogsPanel");

    usersTableBody = document.getElementById("usersTableBody");
    userLogsList = document.getElementById("userLogsList");
    usersPreviewCard = document.getElementById("usersPreviewCard");
    usersPreviewContent = document.getElementById("usersPreviewContent");

    summaryTotalUsers = document.getElementById("summaryTotalUsers");
    summaryActiveUsers = document.getElementById("summaryActiveUsers");
    summaryInactiveUsers = document.getElementById("summaryInactiveUsers");
    summaryPrivilegedUsers = document.getElementById("summaryPrivilegedUsers");

    usersStatusText = document.getElementById("usersStatusText");
    usersResultInfo = document.getElementById("usersResultInfo");

    userSearchInput = document.getElementById("userSearchInput");
    jobTitleFilter = document.getElementById("jobTitleFilter");
    statusFilter = document.getElementById("statusFilter");
    logsUserFilter = document.getElementById("logsUserFilter");
    jobTitleFilterDisplay = document.getElementById("jobTitleFilterDisplay");
    statusFilterDisplay = document.getElementById("statusFilterDisplay");

    createUserModal = document.getElementById("createUserModal");
    createUserForm = document.getElementById("createUserForm");
    closeCreateUserModalBtn = document.getElementById("closeCreateUserModalBtn");
    submitCreateUserBtn = document.getElementById("submitCreateUserBtn");
    createUsername = document.getElementById("createUsername");
    createFullName = document.getElementById("createFullName");
    createJobTitle = document.getElementById("createJobTitle");
    createPassword = document.getElementById("createPassword");
    createJobTitleDisplay = document.getElementById("createJobTitleDisplay");

    changePasswordModal = document.getElementById("changePasswordModal");
    changePasswordForm = document.getElementById("changePasswordForm");
    closePasswordModalBtn = document.getElementById("closePasswordModalBtn");
    submitPasswordChangeBtn = document.getElementById("submitPasswordChangeBtn");
    passwordStaffId = document.getElementById("passwordStaffId");
    newPassword = document.getElementById("newPassword");

    usersSelectModal = document.getElementById("usersSelectModal");
    usersSelectModalTitle = document.getElementById("usersSelectModalTitle");
    usersSelectOptionList = document.getElementById("usersSelectOptionList");
    usersSelectCloseBtn = document.getElementById("usersSelectCloseBtn");

    confirmStatusModal = document.getElementById("confirmStatusModal");
    confirmStatusText = document.getElementById("confirmStatusText");
    closeConfirmStatusModalBtn = document.getElementById("closeConfirmStatusModalBtn");
    cancelConfirmStatusBtn = document.getElementById("cancelConfirmStatusBtn");
    confirmStatusActionBtn = document.getElementById("confirmStatusActionBtn");
}

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {
    logoutBtn?.addEventListener("click", logout);
    toggleSidebarBtn?.addEventListener("click", toggleSidebar);

    toggleNotesBtn?.addEventListener("click", () => togglePanel(usersNotesPanel));
    toggleFiltersBtn?.addEventListener("click", () => togglePanel(usersFiltersPanel));

    collapseUsersTableBtn?.addEventListener("click", () => togglePanel(usersTablePanel));
    collapseLogsBtn?.addEventListener("click", () => togglePanel(userLogsPanel));

    refreshUsersBtn?.addEventListener("click", async () => {
        await loadUsers();
    });

    previewUsersBtn?.addEventListener("click", previewUsers);

    refreshLogsBtn?.addEventListener("click", async () => {
        const staffId = String(logsUserFilter?.value || "").trim() || null;
        await loadUserLogs(staffId);
    });

    runUserFiltersBtn?.addEventListener("click", () => {
        refreshUsersView();
        setStatus("Filters applied");
    });

    resetUserFiltersBtn?.addEventListener("click", resetFilters);

    loadUserLogsBtn?.addEventListener("click", async () => {
        const staffId = String(logsUserFilter?.value || "").trim() || null;
        await loadUserLogs(staffId);
    });

    openCreateUserBtn?.addEventListener("click", openCreateUserModal);
    closeCreateUserModalBtn?.addEventListener("click", closeCreateUserModal);
    createUserModal?.addEventListener("click", closeCreateUserModal);
    createUserForm?.addEventListener("submit", createUser);

    openPasswordModalBtn?.addEventListener("click", openPasswordModal);
    closePasswordModalBtn?.addEventListener("click", closePasswordModal);
    changePasswordModal?.addEventListener("click", closePasswordModal);
    changePasswordForm?.addEventListener("submit", changePassword);

    usersSelectCloseBtn?.addEventListener("click", closeSelectModal);
    usersSelectModal?.addEventListener("click", closeSelectModal);

    closeConfirmStatusModalBtn?.addEventListener("click", closeConfirmStatusModal);
    cancelConfirmStatusBtn?.addEventListener("click", closeConfirmStatusModal);
    confirmStatusModal?.addEventListener("click", closeConfirmStatusModal);
    confirmStatusActionBtn?.addEventListener("click", async () => {
        if (typeof pendingStatusAction === "function") {
            await pendingStatusAction();
        }
    });

    jobTitleFilterDisplay?.addEventListener("click", () => {
        openSelectModal("jobTitleFilter", "Select Job Title");
    });

    statusFilterDisplay?.addEventListener("click", () => {
        openSelectModal("statusFilter", "Select Status");
    });

    createJobTitleDisplay?.addEventListener("click", () => {
        openSelectModal("createJobTitle", "Select Job Title");
    });

    userSearchInput?.addEventListener("input", refreshUsersView);

    [
        createUsername,
        createFullName,
        createJobTitleDisplay,
        createPassword,
        passwordStaffId,
        newPassword
    ].forEach((el) => {
        el?.addEventListener("input", () => el.classList.remove("field-error"));
        el?.addEventListener("change", () => el.classList.remove("field-error"));
    });
}

// ============================================================
// INIT
// ============================================================

async function initUsersPage() {
    cacheDom();
    applyRoleBasedUI();
    bindEvents();

    setSelectValue("jobTitleFilter", "");
    setSelectValue("statusFilter", "");
    setSelectValue("createJobTitle", "");

    setStatus("Loading...");
    setResultInfo("Preparing users page...");

    if (!isUserAdminRole()) {
        showUsersTableError("Only manager or HR can access this page.");
        if (userLogsList) {
            userLogsList.innerHTML = `<div class="empty-row">Only manager or HR can access user logs.</div>`;
        }
        setStatus("Access denied");
        setResultInfo("This page is restricted by role.");
        return;
    }

    await loadUsers();
    await loadUserLogs();
}

document.addEventListener("DOMContentLoaded", initUsersPage);