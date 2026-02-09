// src/api/adminSettingsApi.js
import axiosPrivate from "./axiosPrivate";

export const adminSettingsApi = {
    get: () =>
        axiosPrivate.get("/admin/settings").then((res) => res.data),

    update: (payload) =>
        axiosPrivate.put("/admin/settings", payload).then((res) => res.data),

    // ===== Model AI =====
    getAi: () =>
        axiosPrivate.get("/admin/settings/ai").then((res) => res.data),

    updateAi: (payload) =>
        axiosPrivate.put("/admin/settings/ai", payload).then((res) => res.data),
};
