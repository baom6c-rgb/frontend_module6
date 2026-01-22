import axios from "axios";

const axiosClient = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// 🔥 REQUEST INTERCEPTOR
axiosClient.interceptors.request.use(
    (config) => {
        // ✅ SỬA Ở ĐÂY
        const token = localStorage.getItem("token");

        const isAuthApi =
            config.url?.startsWith("/auth/login") ||
            config.url?.startsWith("/auth/register") ||
            config.url?.startsWith("/auth/google");

        if (token && token !== "null" && !isAuthApi) {
            config.headers.Authorization = `Bearer ${token}`;
        }


        return config;
    },
    (error) => Promise.reject(error)
);

// 🔥 RESPONSE INTERCEPTOR
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default axiosClient;