import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

// Tạo axios instance cho dashboard
const dashboardClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor - Tự động gắn token
dashboardClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");

        if (token && token !== "null") {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor - Xử lý lỗi 401
dashboardClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

// =====================================================
// DASHBOARD API
// =====================================================

/**
 * Lấy thống kê dashboard của học viên
 * GET /users/dashboard/stats
 * Không cần truyền userId vì backend lấy từ JWT token
 */
export const getDashboardStatsApi = () => {
    return dashboardClient.get("/users/dashboard/stats");
};

export default dashboardClient;