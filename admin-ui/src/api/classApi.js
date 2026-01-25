import axiosClient from "./axiosConfig.js";

export const getAllClassesApi = () => {
    return axiosClient.get("/classes");
};