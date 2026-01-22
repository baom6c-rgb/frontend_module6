import axiosAuth from "./axiosConfig.js";

export const loginApi = (data) =>
    axiosAuth.post("/auth/login", data);

export const registerApi = (data) =>
    axiosAuth.post("/auth/register", data);

export const googleLoginApi = (idToken) => {
    return axiosAuth.post("/auth/google", {
        idToken: idToken
    });
};