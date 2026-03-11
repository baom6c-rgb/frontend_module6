// src/api/assignedExamApi.js
import axiosPrivate from "./axiosPrivate";

/**
 * ✅ Backend routes (current):
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

// =====================
// ✅ Normalizers
// =====================

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

    const durationMinutes = pickFirstPositive(d?.durationMinutes, d?.duration, d?.minutes);

    return {
        ...d,
        previewToken,
        numberOfQuestions,
        durationMinutes,
    };
};

/**
 * ✅ Normalize review to match PracticeReviewDialog:
 * {
 *   score, correctCount, totalQuestions,
 *   items: [...]
 * }
 *
 * Also robust for Admin review response which might have:
 * - scorePct (0..100)
 * - items with "correct" (boolean) instead of "isCorrect"
 * - selectedAnswer might be null if BE not saving answersJson
 */
const normalizeReview = (raw) => {
    const d = unwrap(raw);

    // candidate wrapper
    const candidate = d?.review ?? d?.result ?? d?.data ?? d ?? {};
    const itemsRaw =
        (Array.isArray(candidate?.items) && candidate.items) ||
        (Array.isArray(candidate?.questions) && candidate.questions) ||
        [];

    // normalize items: ensure isCorrect + questionId keys
    const items = itemsRaw.map((it) => {
        const isCorrect =
            typeof it?.isCorrect === "boolean"
                ? it.isCorrect
                : typeof it?.correct === "boolean"
                    ? it.correct
                    : false;

        return {
            ...it,
            questionId: it?.questionId ?? it?.id ?? null,
            isCorrect,
        };
    });

    // derive correctCount if missing / unreliable
    const computedCorrect = items.reduce((acc, it) => acc + (it?.isCorrect === true ? 1 : 0), 0);
    const total = items.length;

    const score =
        candidate?.score ??
        candidate?.scorePct ??
        candidate?.scorePercent ??
        candidate?.resultScore ??
        0;

    const correctCount =
        Number.isFinite(Number(candidate?.correctCount)) && Number(candidate?.correctCount) >= 0
            ? Number(candidate.correctCount)
            : Number.isFinite(Number(candidate?.correct)) && Number(candidate?.correct) >= 0
                ? Number(candidate.correct)
                : computedCorrect;

    const totalQuestions =
        Number.isFinite(Number(candidate?.totalQuestions)) && Number(candidate?.totalQuestions) > 0
            ? Number(candidate.totalQuestions)
            : Number.isFinite(Number(candidate?.total)) && Number(candidate?.total) > 0
                ? Number(candidate.total)
                : Number.isFinite(Number(candidate?.questionCount)) && Number(candidate?.questionCount) > 0
                    ? Number(candidate.questionCount)
                    : total;

    return {
        ...candidate,
        score,
        correctCount,
        totalQuestions,
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

// =====================
// ✅ Base paths (override-able)
// =====================
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

    /**
     * ✅ ADMIN REVIEW (BY EXAM + ASSIGNMENT)
     * GET /api/admin/assigned-exams/{examId}/assignments/{assignmentId}/review
     *
     * Return normalized shape for UI compatibility:
     * { score, correctCount, totalQuestions, items: [...] }
     */
    adminAssignmentReview: async (examId, assignmentId) => {
        const res = await axiosPrivate.get(
            `${API.admin}/${examId}/assignments/${assignmentId}/review`
        );
        return normalizeReview(res);
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

    /**
     * payload recommended:
     * - For MCQ: { answers: { [questionId]: "A" | "B" | "C" | "D" } }
     * - Or direct map: { [questionId]: "A" }
     */
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
     * ✅ STUDENT REVIEW (BY ASSIGNMENT)
     * GET /api/student/assigned-exams/{assignmentId}/review
     */
    studentGetReview: async (assignmentId) => {
        const res = await axiosPrivate.get(`${API.student}/${assignmentId}/review`);
        return normalizeReview(res);
    },

    /**
     * ✅ STUDY GUIDE (BY ASSIGNMENT)
     * GET /api/student/assigned-exams/{assignmentId}/study-guide
     */
    studentGetStudyGuide: async (assignmentId) => {
        const res = await axiosPrivate.get(`${API.student}/${assignmentId}/study-guide`);
        return normalizeStudyGuide(res);
    },

    /**
     * ✅ Utility: allow override base paths if needed
     */
    _setBasePaths: (paths = {}) => {
        if (paths?.admin) API.admin = ensureLeadingSlash(paths.admin);
        if (paths?.student) API.student = ensureLeadingSlash(paths.student);
    },
};