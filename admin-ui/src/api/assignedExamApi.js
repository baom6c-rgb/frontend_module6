// src/api/assignedExamApi.js
import axiosPrivate from "./axiosPrivate";

/**
 * ✅ Backend of your project (current):
 * Admin:   /api/admin/assigned-exams/**
 * Student: /api/student/assigned-exams/**
 *
 * Student review/study-guide are BY assignmentId:
 * - GET /api/student/assigned-exams/{assignmentId}/review
 * - GET /api/student/assigned-exams/{assignmentId}/study-guide
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

// Similar to practiceApi.normalizeGenerateSessionV2 (for Admin preview)
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
 * ✅ Review normalize to match PracticeReviewDialog:
 * {
 *   score, correctCount, totalQuestions,
 *   items: [...]
 * }
 */
const normalizeReview = (raw) => {
    const d = unwrap(raw);

    // already ok
    if (d?.items && Array.isArray(d.items)) return d;

    // wrapped forms
    const candidate = d?.review ?? d?.result ?? d?.data ?? d;
    if (candidate?.items && Array.isArray(candidate.items)) return candidate;

    // fallback mapping
    const items =
        (Array.isArray(candidate?.items) && candidate.items) ||
        (Array.isArray(candidate?.questions) && candidate.questions) ||
        [];

    return {
        score: candidate?.score ?? candidate?.scorePct ?? 0,
        correctCount: candidate?.correctCount ?? candidate?.correct ?? 0,
        totalQuestions:
            candidate?.totalQuestions ??
            candidate?.total ??
            candidate?.questionCount ??
            items.length ??
            0,
        items,
    };
};

/**
 * ✅ Study guide normalize:
 * BE returns: { studyGuide: "..." }
 */
const normalizeStudyGuide = (raw) => {
    const d = unwrap(raw);
    const guide =
        d?.studyGuide ??
        d?.data?.studyGuide ??
        (typeof d === "string" ? d : "");
    return { studyGuide: guide || "" };
};

const API = {
    admin: "/admin/assigned-exams",
    student: "/student/assigned-exams",
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
     * ✅ REVIEW (BY ASSIGNMENT) — matches your BE
     * GET /api/student/assigned-exams/{assignmentId}/review
     */
    studentGetReview: async (assignmentId) => {
        const res = await axiosPrivate.get(`${API.student}/${assignmentId}/review`);
        return normalizeReview(res);
    },

    /**
     * ✅ STUDY GUIDE (BY ASSIGNMENT) — matches your BE
     * GET /api/student/assigned-exams/{assignmentId}/study-guide
     */
    studentGetStudyGuide: async (assignmentId) => {
        const res = await axiosPrivate.get(`${API.student}/${assignmentId}/study-guide`);
        return unwrap(res);
    },

    /**
     * ✅ Utility: allow override base paths if needed
     */
    _setBasePaths: (paths = {}) => {
        if (paths?.admin) API.admin = ensureLeadingSlash(paths.admin);
        if (paths?.student) API.student = ensureLeadingSlash(paths.student);
    },
};