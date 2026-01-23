import axiosPrivate from "./axiosPrivate";

export const adminUserApi = {
    // approvals
    getPendingApprovals: () => axiosPrivate.get("/admin/approvals/pending"),
    approvePendingUser: (id) => axiosPrivate.post(`/admin/approvals/${id}/approve`),
    rejectPendingUser: (id) => axiosPrivate.post(`/admin/approvals/${id}/reject`),

    // US6 lists
    getActiveStudents: () => axiosPrivate.get("/admin/students/active"),
    getBlockedStudents: () => axiosPrivate.get("/admin/students/blocked"),

    // US6 actions
    blockStudent: (id) => axiosPrivate.post(`/admin/students/${id}/block`),
    unblockStudent: (id) => axiosPrivate.post(`/admin/students/${id}/unblock`),

    // US5 edit user
    getUserDetail: (id) => axiosPrivate.get(`/admin/users/${id}`),
    updateUser: (id, payload) => axiosPrivate.put(`/admin/users/${id}`, payload),

    // options for edit form
    getClassOptions: () => axiosPrivate.get("/admin/options/classes"),
    getModuleOptions: () => axiosPrivate.get("/admin/options/modules"),
};
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
