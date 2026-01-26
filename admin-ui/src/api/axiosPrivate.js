import axios from "axios";

const axiosPrivate = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: { "Content-Type": "application/json" },
});

axiosPrivate.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token && token !== "null") {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosPrivate.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;

        // đọc status user hiện tại để biết có phải WAITING không
        let userStatus = "";
        try {
            const u = JSON.parse(localStorage.getItem("userData") || "{}");
            userStatus = String(u?.status || u?.userStatus || "").toUpperCase();
        } catch {
            userStatus = "";
        }

        // ✅ 401: token invalid/expired => logout
        if (status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("userRoles");
            localStorage.removeItem("userData");
            window.location.href = "/login";
            return Promise.reject(err);
        }

        // ✅ 403: nếu WAITING_APPROVAL => redirect về waiting, KHÔNG clear storage
        if (status === 403 && userStatus === "WAITING_APPROVAL") {
            if (!window.location.pathname.startsWith("/users/waiting-approval")) {
                window.location.href = "/users/waiting-approval";
            }
            return Promise.reject(err);
        }

        // ✅ 403: các case khác (ACTIVE nhưng forbidden thật) => cứ trả lỗi, không auto logout
        return Promise.reject(err);
    }
);

export default axiosPrivate;
