import axiosClient from "./axiosClient.js";

// =====================
// USERS
// =====================
export const getAdminUsersApi = (params) =>
    axiosClient.get("/admin/users", { params });

export const createAdminUserApi = (payload) =>
    axiosClient.post("/admin/users", payload);

// =====================
// OPTIONS (ROLE)
// =====================
export const getRoleOptionsApi = () =>
    axiosClient.get("/admin/options/roles");
