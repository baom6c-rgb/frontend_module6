// src/api/assignedExamApi.js
import axiosPrivate from "./axiosPrivate";

/**
 * NOTE:
 * - Endpoint paths follow BE convention in your backend:
 *   Admin:   /api/admin/assigned-exams/**
 *   Student: /api/student/assigned-exams/**
 * - If BE changes, update only strings here.
 */

const unwrap = (resOrData) => {
    const d = resOrData?.data ?? resOrData;
    return d?.data ?? d;
};

const toPositiveNumberOrNull = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

const pickFirstPositive = (...vals) => {
    for (const v of vals) {
        const n = toPositiveNumberOrNull(v);
        if (n != null) return n;
    }
    return null;
};

const ensureLeadingSlash = (p) => (p?.startsWith("/") ? p : `/${p || ""}`);

// Similar to practiceApi.normalizeGenerateSessionV2
const normalizePreview = (raw) => {
    const d = unwrap(raw);

    const previewToken =
        d?.previewToken ??
        d?.sessionToken ??
        d?.token ??
        d?.selectionToken ??
        null;

    const numberOfQuestions = pickFirstPositive(
        d?.numberOfQuestions,
        d?.totalQuestions,
        d?.questionCount,
        d?.totalQuestionCount,
        d?.count
    );

    const durationMinutes = pickFirstPositive(
        d?.durationMinutes,
        d?.duration,
        d?.minutes
    );

    return {
        ...d,
        previewToken,
        numberOfQuestions,
        durationMinutes,
    };
};

/**
 * Review payload normalize:
 * PracticeReviewDialog expects:
 * {
 *   score, correctCount, totalQuestions,
 *   items: [{ questionId, questionType, content, options, correctAnswer, selectedAnswer, isCorrect, feedback, ... }]
 * }
 *
 * Nếu BE trả key khác, ta normalize "nhẹ" ở đây để FE khỏi vỡ.
 */
const normalizeReview = (raw) => {
    const d = unwrap(raw);

    // direct match
    if (d?.items && Array.isArray(d.items)) return d;

    // common wrappers
    const candidate = d?.review ?? d?.result ?? d?.data ?? d;
    if (candidate?.items && Array.isArray(candidate.items)) return candidate;

    // fallback: ensure structure at least
    return {
        score: candidate?.score ?? candidate?.scorePct ?? 0,
        correctCount: candidate?.correctCount ?? candidate?.correct ?? 0,
        totalQuestions:
            candidate?.totalQuestions ??
            candidate?.total ??
            candidate?.questionCount ??
            0,
        items: Array.isArray(candidate?.questions) ? candidate.questions : [],
    };
};

const API = {
    admin: "/admin/assigned-exams",
    student: "/student/assigned-exams",
    // optional: attempt review endpoint (nếu BE dùng exam-attempts)
    attempts: "/exam-attempts",
};

export const assignedExamApi = {
    // =====================
    // ADMIN
    // =====================
    adminPreview: async (payload) => {
        const res = await axiosPrivate.post(`${API.admin}/preview`, payload);
        return normalizePreview(res);
    },

    adminCreate: async (payload) => {
        const res = await axiosPrivate.post(`${API.admin}`, payload);
        return unwrap(res);
    },

    adminList: async (params) => {
        const res = await axiosPrivate.get(`${API.admin}`, { params });
        return unwrap(res);
    },

    adminDetail: async (examId) => {
        const res = await axiosPrivate.get(`${API.admin}/${examId}`);
        return unwrap(res);
    },

    adminUpdate: async (examId, payload) => {
        const res = await axiosPrivate.put(`${API.admin}/${examId}`, payload);
        return unwrap(res);
    },

    adminDelete: async (examId) => {
        const res = await axiosPrivate.delete(`${API.admin}/${examId}`);
        return unwrap(res);
    },

    adminCheatingLogs: async (examId) => {
        const res = await axiosPrivate.get(`${API.admin}/${examId}/cheating`);
        return unwrap(res);
    },

    // =====================
    // STUDENT
    // =====================
    studentList: async (params) => {
        const res = await axiosPrivate.get(`${API.student}`, { params });
        return unwrap(res);
    },

    studentStart: async (assignmentId) => {
        const res = await axiosPrivate.post(`${API.student}/${assignmentId}/start`);
        return unwrap(res);
    },

    studentSubmit: async (assignmentId, payload) => {
        const res = await axiosPrivate.post(
            `${API.student}/${assignmentId}/submit`,
            payload
        );
        return unwrap(res);
    },

    studentReportCheating: async (assignmentId, payload) => {
        const res = await axiosPrivate.post(
            `${API.student}/${assignmentId}/cheating`,
            payload
        );
        return unwrap(res);
    },

    /**
     * ✅ REVIEW (by assignment)
     * FE AssignedExamsPage dùng để mở PracticeReviewDialog sau khi làm xong.
     * Endpoint đề xuất: GET /api/student/assigned-exams/{assignmentId}/review
     * Nếu BE khác path, chỉ cần sửa string ở đây.
     */
    studentGetReview: async (assignmentId) => {
        const res = await axiosPrivate.get(`${API.student}/${assignmentId}/review`);
        return normalizeReview(res);
    },

    /**
     * ✅ REVIEW (by attempt) - optional
     * Endpoint đề xuất: GET /api/exam-attempts/{attemptId}/review
     * Nếu list trả attemptId thì dùng cái này sẽ chuẩn nhất.
     */
    studentGetReviewByAttempt: async (attemptId) => {
        const res = await axiosPrivate.get(`${API.attempts}/${attemptId}/review`);
        return normalizeReview(res);
    },

    /**
     * ✅ Utility: allow override base paths in rare cases (multi-deploy / gateway)
     * Not required, but safe to keep.
     */
    _setBasePaths: (paths = {}) => {
        if (paths?.admin) API.admin = ensureLeadingSlash(paths.admin);
        if (paths?.student) API.student = ensureLeadingSlash(paths.student);
        if (paths?.attempts) API.attempts = ensureLeadingSlash(paths.attempts);
    },
};