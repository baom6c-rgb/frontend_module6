// src/features/practice/utils/practicePage.helpers.js

export const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
    bg: "#F8FAFC",
};

export const MODE = {
    IDLE: "IDLE",
    READY: "READY",
    DOING: "DOING",
    RESULT: "RESULT",
};

export const ASSISTANT_MODE = {
    GENERATE: "GENERATE",
    STUDY: "STUDY",
};

export const ACTIVE_SESSION_KEY = "practice_active_session_v2";
export const RESULT_PERSIST_KEY = "practice_result_v2";

export const DEFAULT_MINUTES_PER_QUESTION = 2.0;
export const DURATION_MIN_MINUTES = 5;
export const DURATION_MAX_MINUTES = 120;

export const MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt|xlsx)$/i;

export const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

export function uid(prefix = "m") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function buildAttemptDetailFromV2(serverRes, sessionToken) {
    const qs = Array.isArray(serverRes?.questions) ? serverRes.questions : [];

    const questions = qs
        .map((q) => ({
            questionId: q?.questionKey,
            questionType: q?.questionType,
            content: q?.content,
            options: q?.options || null,
        }))
        .filter((q) => !!q.questionId);

    return {
        attemptId: null,
        examId: null,
        durationMinutes: serverRes?.durationMinutes ?? null,
        questions,
        sessionToken: sessionToken || serverRes?.sessionToken || "",
    };
}

// ===== US17 validation =====
const US17_MAX_CHARS = 80;
const US17_MAX_WORDS = 8;

export const normalizeSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();

export function validateKeywords(raw) {
    const s = normalizeSpaces(raw);

    if (!s) return { ok: false, message: "Nhập 2–5 từ khóa ngắn gọn." };
    if (s.length > US17_MAX_CHARS) return { ok: false, message: `Từ khóa tối đa ${US17_MAX_CHARS} ký tự.` };

    if (String(raw || "").includes("\n") || String(raw || "").includes("\r") || String(raw || "").includes("\t")) {
        return { ok: false, message: "Không dán nguyên câu hỏi (không xuống dòng). Chỉ nhập từ khóa." };
    }

    if (/[?.!:;]/.test(s)) return { ok: false, message: "Chỉ nhập từ khóa, không nhập dạng câu hỏi." };

    if (!/^[\p{L}\p{N}\s,_\-+/]+$/u.test(s)) return { ok: false, message: "Từ khóa có ký tự không hợp lệ." };

    const words = s.split(" ").filter(Boolean);
    if (words.length > US17_MAX_WORDS) return { ok: false, message: `Tối đa ${US17_MAX_WORDS} từ.` };

    return { ok: true, value: s };
}

export function estimateDurationMinutesByRule(questionCount, minutesPerQuestion) {
    const n = Number(questionCount);
    if (!Number.isFinite(n) || n <= 0) return 0;

    const mpq = Number(minutesPerQuestion);
    const used = Number.isFinite(mpq) && mpq > 0 ? mpq : DEFAULT_MINUTES_PER_QUESTION;

    let mins = Math.round(n * used);
    if (!Number.isFinite(mins)) mins = 0;

    mins = Math.max(DURATION_MIN_MINUTES, Math.min(DURATION_MAX_MINUTES, mins));
    return mins;
}
