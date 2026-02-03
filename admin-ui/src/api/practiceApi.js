// src/api/practiceApi.js
import axiosPrivate from "./axiosPrivate";

export const practiceApi = {
    // ===== V1 (cũ) =====
    generatePreview: (payload) =>
        axiosPrivate.post("/student/practice/generate", payload).then((r) => r.data),

    start: (payload) =>
        axiosPrivate.post("/student/practice/start", payload).then((r) => r.data),

    getAttempt: (attemptId) =>
        axiosPrivate.get(`/student/practice/attempts/${attemptId}`).then((r) => r.data),

    submit: (attemptId, payload) =>
        axiosPrivate.post(`/student/practice/attempts/${attemptId}/submit`, payload).then((r) => r.data),

    review: (attemptId) =>
        axiosPrivate.get(`/student/practice/attempts/${attemptId}/review`).then((r) => r.data),

    // ===== V2 (mới) =====
    generateSessionV2: (payload) =>
        axiosPrivate.post("/student/practice/v2/generate", payload).then((r) => r.data),

    startSessionV2: (payload) =>
        axiosPrivate.post("/student/practice/v2/start", payload).then((r) => r.data),

    getSessionV2: (sessionToken) =>
        axiosPrivate.get(`/student/practice/v2/sessions/${sessionToken}`).then((r) => r.data),

    submitSessionV2: (sessionToken, payload) =>
        axiosPrivate
            .post(`/student/practice/v2/sessions/${sessionToken}/submit`, payload)
            .then((r) => r.data),

    // ===== V2 Retest =====
    getRetestStatusV2: (attemptId) =>
        axiosPrivate
            .get(`/student/practice/v2/attempts/${attemptId}/retest-status`)
            .then((r) => r.data),

    startRetestV2: (attemptId) =>
        axiosPrivate
            .post(`/student/practice/v2/attempts/${attemptId}/retest/start`)
            .then((r) => r.data),
};
