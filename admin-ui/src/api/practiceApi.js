// src/features/practice/practiceApi.js
import axiosPrivate from "../api/axiosPrivate";

export const practiceApi = {
    // Preview câu hỏi (không tạo attempt)
    generatePreview: (payload) =>
        axiosPrivate.post("/student/practice/generate", payload),

    // Bắt đầu làm bài -> tạo attemptId
    start: (payload) => axiosPrivate.post("/student/practice/start", payload),

    // Lấy đề theo attemptId để làm
    getAttempt: (attemptId) =>
        axiosPrivate.get(`/student/practice/attempts/${attemptId}`),

    // Nộp bài -> điểm + feedback
    submit: (attemptId, payload) =>
        axiosPrivate.post(`/student/practice/attempts/${attemptId}/submit`, payload),
    
    getReview: (attemptId) =>
        axiosPrivate.get(`/student/practice/attempts/${attemptId}/review`),
};
