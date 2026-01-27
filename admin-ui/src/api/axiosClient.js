import axios from "axios";

const axiosClient = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// 🔥 REQUEST INTERCEPTOR - Sửa key từ "token" → "accessToken"
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken"); // ✅ ĐÃ SỬA

        // 🛠 DEBUG LOGGING - Comment out nếu không cần debug
        console.log("===========================================");
        console.log("📤 AXIOS REQUEST");
        console.log("URL:", config.url);
        console.log("Method:", config.method?.toUpperCase());
        console.log("Token exists:", !!token);
        console.log("Token preview:", token ? token.substring(0, 50) + "..." : "NO TOKEN");

        const isAuthApi =
            config.url?.startsWith("/auth/login") ||
            config.url?.startsWith("/auth/register") ||
            config.url?.startsWith("/auth/google") ||
            config.url?.startsWith("/auth/forgot-password") ||
            config.url?.startsWith("/auth/reset-password");

        console.log("Is Auth API:", isAuthApi);

        if (token && token !== "null" && !isAuthApi) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("✅ Token ADDED to Authorization header");
        } else {
            console.warn("⚠️ Token NOT added to request");
            if (!token) {
                console.warn("   Reason: No token in localStorage");
            } else if (token === "null") {
                console.warn("   Reason: Token is string 'null'");
            } else if (isAuthApi) {
                console.warn("   Reason: Auth API endpoint");
            }
        }
        console.log("===========================================");

        return config;
    },
    (error) => {
        console.error("❌ Request Interceptor Error:", error);
        return Promise.reject(error);
    }
);

// 🔥 RESPONSE INTERCEPTOR - Sửa check token key
axiosClient.interceptors.response.use(
    (response) => {
        // 🛠 DEBUG LOGGING
        console.log("✅ Response received:", response.status, response.config.url);
        return response;
    },
    (error) => {
        // 🛠 DEBUG LOGGING
        console.error("===========================================");
        console.error("❌ AXIOS RESPONSE ERROR");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("URL:", error.config?.url);
            console.error("Data:", error.response.data);

            // 401 Unauthorized - Token hết hạn hoặc không hợp lệ
            if (error.response.status === 401) {
                console.error("🔒 401 Unauthorized - Clearing localStorage and redirecting to login");
                localStorage.clear();
                window.location.href = "/login";
            }

            // 403 Forbidden - Không có quyền truy cập
            if (error.response.status === 403) {
                console.error("🚫 403 Forbidden - Access denied");
                console.error("Check:");
                console.error("  1. Token exists:", !!localStorage.getItem("accessToken")); // ✅ ĐÃ SỬA
                console.error("  2. Authorization header was sent:", !!error.config?.headers?.Authorization);
                console.error("  3. User has correct role (STUDENT)");
            }
        } else if (error.request) {
            console.error("📡 No response received from server");
            console.error("Request:", error.request);
        } else {
            console.error("⚠️ Error:", error.message);
        }
        console.error("===========================================");

        return Promise.reject(error);
    }
);

export default axiosClient;