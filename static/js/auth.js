function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function getUserRole() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const data = parseJwt(token);
    return data?.role || null;
}