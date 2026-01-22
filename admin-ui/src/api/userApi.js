import axiosAuth from "./axiosConfig.js";

/**
 * Hoàn tất hồ sơ sau Google login
 * User đang ở trạng thái CREATED
 */
export const completeProfileApi = (data) => {
    return axiosAuth.post("/auth/complete-profile", {
        email: data.email,       // 🔥 BẮT BUỘC
        classId: data.classId,
        moduleId: data.moduleId
    });
};