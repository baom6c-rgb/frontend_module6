// src/api/userApi.js
import axiosPrivate from "./axiosPrivate";
import axiosAuth from "./axiosConfig.js";

// ✅ giữ nguyên
export const completeProfileApi = (data) => {
    return axiosAuth.post("/auth/complete-profile", {
        email: data.email,
        classId: data.classId,
        moduleId: data.moduleId,
    });
};

// ✅ NEW: profile
export const getMyProfileApi = () => axiosPrivate.get("/users/me/profile");

// payload FE gửi lên chỉ gồm field được phép sửa (fullName, address, classId)
export const updateMyProfileApi = (payload) => axiosPrivate.put("/users/me/profile", payload);

// ✅ NEW: avatar upload (multipart)
export const uploadMyAvatarApi = (file) => {
    const fd = new FormData();
    fd.append("file", file);

    return axiosPrivate.post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};
