// src/api/adminSettingsApi.js
import axiosPrivate from "./axiosPrivate";

export const adminSettingsApi = {
    get: () =>
        axiosPrivate.get("/admin/settings").then((res) => res.data),

    update: (payload) =>
        axiosPrivate.put("/admin/settings", payload).then((res) => res.data),
};
