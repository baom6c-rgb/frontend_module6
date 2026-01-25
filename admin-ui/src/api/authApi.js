import axiosAuth from "./axiosConfig.js";

export const loginApi = (data) => axiosAuth.post("/auth/login", data);

export const registerApi = (data) => axiosAuth.post("/auth/register", data);

export const googleLoginApi = (idToken) =>
    axiosAuth.post("/auth/google", { idToken });

// ✅ forgot password
export const forgotPasswordApi = (email) =>
    axiosAuth.post("/auth/forgot-password", { email });

// ✅ reset password
export const resetPasswordApi = ({ token, newPassword }) =>
    axiosAuth.post("/auth/reset-password", { token, newPassword });
