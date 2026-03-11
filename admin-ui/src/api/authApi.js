import axiosAuth from "./axiosConfig.js";

export const loginApi = (data) => axiosAuth.post("/auth/login", data);

// ✅ OTP register flow
export const requestRegisterOtpApi = (email) =>
    axiosAuth.post("/auth/otp/request", { email });

export const verifyRegisterOtpApi = ({ otpSessionId, email, otp }) =>
    axiosAuth.post("/auth/otp/verify", { otpSessionId, email, otp });

// ✅ Register must include otpSessionId + otp
export const registerApi = (data) => axiosAuth.post("/auth/register", data);

export const googleLoginApi = (idToken) =>
    axiosAuth.post("/auth/google", { idToken });

// ✅ forgot password
export const forgotPasswordApi = (email) =>
    axiosAuth.post("/auth/forgot-password", { email });

// ✅ reset password
export const resetPasswordApi = ({ token, newPassword }) =>
    axiosAuth.post("/auth/reset-password", { token, newPassword });
