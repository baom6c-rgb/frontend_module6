import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

// Tạo axios instance cho dashboard
const dashboardClient = axios.create({
    baseURL:import.meta.env.VITE_API_URL || BASE_URL,
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

// =====================================================
// ADMIN DASHBOARD API (BỔ SUNG ĐÚNG THỨ CẦN)
// =====================================================

/**
 * Tổng quan admin dashboard
 * POST /admin/analytics/overview
 * Trả full response (bao gồm students + atRiskStudents + timeSeries...)
 */
export const getAdminAnalyticsOverviewApi = (payload) => {
    return dashboardClient.post("/admin/analytics/overview", payload);
};

/**
 * AI insights cho admin dashboard
 * POST /admin/analytics/ai-insights
 */
export const getAdminAiInsightsApi = (payload) => {
    return dashboardClient.post("/admin/analytics/ai-insights", payload);
};

export default dashboardClient;
