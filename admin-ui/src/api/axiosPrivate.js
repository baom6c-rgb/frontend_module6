import axios from "axios";

const axiosPrivate = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: { "Content-Type": "application/json" },
});

axiosPrivate.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken"); // ✅ đúng key
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
        // Backend mày hay trả 403 khi user != ACTIVE
        if (status === 401 || status === 403) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("userRoles");
            localStorage.removeItem("userData");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default axiosPrivate;
