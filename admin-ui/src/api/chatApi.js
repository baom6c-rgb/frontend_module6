// src/api/chatApi.js
import axiosPrivate from "./axiosPrivate";

export const chatApi = {
    startSession: (materialId) =>
        axiosPrivate.post("/student/chat/session", { materialId }).then((r) => r.data),

    getMessages: (sessionId) =>
        axiosPrivate.get(`/student/chat/session/${sessionId}`).then((r) => r.data),

    ask: (sessionId, keywords) =>
        axiosPrivate.post(`/student/chat/session/${sessionId}/ask`, { keywords }).then((r) => r.data),
};
