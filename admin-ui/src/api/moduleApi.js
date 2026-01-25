import axiosClient from "./axiosConfig.js";

export const getAllModulesApi = () =>
    axiosClient.get("/modules");