// src/api/practiceApi.js
import axiosPrivate from "./axiosPrivate";

/**
 * Some endpoints may return:
 * - { ...payload }
 * - { data: ...payload }
 * - axios response -> { data: ... }
 *
 * This helper normalizes to the actual payload object.
 */
const unwrap = (resOrData) => {
    // If caller already did .then(r => r.data), resOrData is payload
    const d = resOrData?.data ?? resOrData;
    return d?.data ?? d; // support {data:{...}} nesting
};

const toPositiveNumberOrNull = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

const pickFirstPositiveNumber = (...vals) => {
    for (const v of vals) {
        const n = toPositiveNumberOrNull(v);
        if (n != null) return n;
    }
    return null;
};

/**
 * Normalize V2 generate session response for FE usage.
 * BE may name fields differently depending on DTO / mapping.
 */
const normalizeGenerateSessionV2 = (raw) => {
    const d = unwrap(raw);

    const sessionToken =
        d?.sessionToken ??
        d?.token ??
        d?.previewToken ??
        d?.session_token ??
        null;

    const numberOfQuestions = pickFirstPositiveNumber(
        d?.numberOfQuestions,
        d?.totalQuestions,
        d?.questionCount,
        d?.totalQuestionCount,
        d?.totalQuestion,
        d?.count
    );

    const durationMinutes = pickFirstPositiveNumber(
        d?.durationMinutes,
        d?.duration,
        d?.timeMinutes,
        d?.minutes
    );

    return {
        ...d,
        sessionToken,
        numberOfQuestions,
        durationMinutes,
    };
};

export const practiceApi = {
    // ===== V1 (cũ) =====
    generatePreview: async (payload) => {
        const res = await axiosPrivate.post("/student/practice/generate", payload);
        return unwrap(res);
    },

    start: async (payload) => {
        const res = await axiosPrivate.post("/student/practice/start", payload);
        return unwrap(res);
    },

    getAttempt: async (attemptId) => {
        const res = await axiosPrivate.get(`/student/practice/attempts/${attemptId}`);
        return unwrap(res);
    },

    submit: async (attemptId, payload) => {
        const res = await axiosPrivate.post(
            `/student/practice/attempts/${attemptId}/submit`,
            payload
        );
        return unwrap(res);
    },

    review: async (attemptId) => {
        const res = await axiosPrivate.get(
            `/student/practice/attempts/${attemptId}/review`
        );
        return unwrap(res);
    },

    // ✅ Lazy-load study guide (generate on demand)
    getStudyGuide: async (attemptId) => {
        const res = await axiosPrivate.get(
            `/student/practice/attempts/${attemptId}/study-guide`
        );
        return unwrap(res);
    },

    // ===== V2 (mới) =====
    generateSessionV2: async (payload) => {
        const res = await axiosPrivate.post("/student/practice/v2/generate", payload);
        return normalizeGenerateSessionV2(res);
    },


    selectTopicV2: async ({ selectionToken, topicIds }) => {
        const res = await axiosPrivate.post("/student/practice/v2/select-topic", {
            selectionToken,
            topicIds,
        });
        return normalizeGenerateSessionV2(res);
    },

    startSessionV2: async (payload) => {
        const res = await axiosPrivate.post("/student/practice/v2/start", payload);
        return unwrap(res);
    },

    getSessionV2: async (sessionToken) => {
        const res = await axiosPrivate.get(
            `/student/practice/v2/sessions/${sessionToken}`
        );
        return unwrap(res);
    },

    submitSessionV2: async (sessionToken, payload) => {
        const res = await axiosPrivate.post(
            `/student/practice/v2/sessions/${sessionToken}/submit`,
            payload
        );
        return unwrap(res);
    },

    // ===== V2 Retest =====
    getRetestStatusV2: async (attemptId) => {
        const res = await axiosPrivate.get(
            `/student/practice/v2/attempts/${attemptId}/retest-status`
        );
        return unwrap(res);
    },

    startRetestV2: async (attemptId) => {
        const res = await axiosPrivate.post(
            `/student/practice/v2/attempts/${attemptId}/retest/start`
        );
        return unwrap(res);
    },
};
