// src/api/adminAnalyticsApi.js
import axiosPrivate from "./axiosPrivate";

export const adminAnalyticsApi = {
    overview: (payload) =>
        axiosPrivate.post("/admin/analytics/overview", payload).then((r) => r.data),

    aiInsights: (payload) =>
        axiosPrivate.post("/admin/analytics/ai-insights", payload).then((r) => r.data),
};
