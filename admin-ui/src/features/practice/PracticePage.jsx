// src/features/practice/PracticePage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Button,
    Stack,
    Avatar,
    Tooltip,
    Chip,
    Divider,
    keyframes,
} from "@mui/material";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import AccessTimeFilledRoundedIcon from "@mui/icons-material/AccessTimeFilledRounded";

import { practiceApi } from "../../api/practiceApi";
import { materialApi } from "../../api/materialApi";
import { chatApi } from "../../api/chatApi";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import CountdownTimer from "../../components/common/CountdownTimer";

import PracticeHeaderConfig from "./components/chatbot/PracticeHeaderConfig";
import ChatComposer from "./components/chatbot/ChatComposer";

import PracticePlayer from "./components/PracticePlayer";
import PracticeResult from "./components/PracticeResult";
import PracticeReviewDialog from "./components/PracticeReviewDialog";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
    bg: "#F8FAFC",
};

// ===== Typing Indicator (3 dots) =====
const bounce = keyframes`
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
`;

function TypingIndicator() {
    return (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: 24 }}>
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    sx={{
                        width: 6,
                        height: 6,
                        bgcolor: COLORS.textSecondary,
                        borderRadius: "50%",
                        animation: `${bounce} 1.4s infinite ease-in-out both`,
                        animationDelay: `${i * 0.16}s`,
                    }}
                />
            ))}
        </Stack>
    );
}

const MODE = {
    IDLE: "IDLE",
    READY: "READY",
    DOING: "DOING",
    RESULT: "RESULT",
};

const ASSISTANT_MODE = {
    GENERATE: "GENERATE",
    STUDY: "STUDY",
};

const ACTIVE_SESSION_KEY = "practice_active_session_v2";
const RESULT_PERSIST_KEY = "practice_result_v2";

const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

function uid(prefix = "m") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildAttemptDetailFromV2(serverRes, sessionToken) {
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

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt|xlsx)$/i;

const US17_MAX_CHARS = 80;
const US17_MAX_WORDS = 8;
const normalizeSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();

function validateKeywords(raw) {
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

export default function PracticePage() {
    const { showToast } = useToast();

    useEffect(() => {
        document.body.classList.add("practice-focus-mode");

        const fire = (open) => {
            try {
                window.dispatchEvent(
                    new CustomEvent("app:sidebar:set", {
                        detail: { open, source: "PracticePage" },
                    })
                );
            } catch {}
            try {
                if (typeof window?.setSidebarOpen === "function") window.setSidebarOpen(open);
                if (typeof window?.__APP_SET_SIDEBAR_OPEN__ === "function") window.__APP_SET_SIDEBAR_OPEN__(open);
                if (window?.appSidebar && typeof window.appSidebar.setOpen === "function") window.appSidebar.setOpen(open);
            } catch {}
        };

        fire(false);

        return () => {
            document.body.classList.remove("practice-focus-mode");
            fire(true);
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(0);

    const [materialId, setMaterialId] = useState(null);
    const materialIdRef = useRef(null);

    const [mode, setMode] = useState(MODE.IDLE);
    const [sessionToken, setSessionToken] = useState("");
    const sessionTokenRef = useRef("");

    const [startedAtIso, setStartedAtIso] = useState(null);
    const [deadlineIso, setDeadlineIso] = useState(null);

    const [isCanvasOpen, setIsCanvasOpen] = useState(true);

    const [attemptDetail, setAttemptDetail] = useState(null);

    // ✅ NEW: số câu thực tế của attempt (đóng băng) để hiển thị ở RESULT
    const [attemptQuestionCount, setAttemptQuestionCount] = useState(null);

    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    const playerRef = useRef(null);

    const [assistantMode, setAssistantMode] = useState(ASSISTANT_MODE.GENERATE);

    // ✅ Tab rules:
    // - DOING => ẩn "Tạo đề" + chặn không cho switch về GENERATE
    // - GENERATE => ẩn "Hỏi khái niệm"
    const lockGenerate = mode === MODE.DOING;
    const hideStudyWhenGenerate = assistantMode === ASSISTANT_MODE.GENERATE;

    const setAssistantModeSafe = useCallback(
        (next) => {
            if (lockGenerate && next === ASSISTANT_MODE.GENERATE) return;
            setAssistantMode(next);
        },
        [lockGenerate]
    );

    const [messages, setMessages] = useState([
        {
            id: uid("a"),
            role: "assistant",
            text:
                "Gửi học liệu (upload/paste). Sau đó bấm nút Gửi để Fly AI tạo đề. Khi tạo xong bạn có thể “Bắt đầu làm bài”.",
        },
    ]);

    const [studySessionId, setStudySessionId] = useState(null);
    const [studyMessages, setStudyMessages] = useState([
        {
            id: "intro",
            role: "assistant",
            text: "Nhập từ khóa liên quan bài học. Mình chỉ gợi ý khái niệm tổng quát, không đưa đáp án.",
        },
    ]);
    const [studyBooting, setStudyBooting] = useState(false);

    const messagesEndRef = useRef(null);

    const messagesToRender = useMemo(() => {
        return assistantMode === ASSISTANT_MODE.GENERATE ? messages : studyMessages;
    }, [assistantMode, messages, studyMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesToRender, loading, studyBooting]);

    const appendMessage = useCallback((msg) => {
        setMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    const appendStudyMessage = useCallback((msg) => {
        setStudyMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    const configOk = useMemo(() => {
        const n = Number(questionCount);
        return Number.isFinite(n) && n >= 1;
    }, [questionCount]);

    const saveActiveSession = useCallback((next) => {
        try {
            localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next));
        } catch {}
    }, []);

    const clearActiveSession = useCallback(() => {
        try {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
        } catch {}
    }, []);

    const savePersistedResult = useCallback((payload) => {
        try {
            localStorage.setItem(RESULT_PERSIST_KEY, JSON.stringify(payload));
        } catch {}
    }, []);

    const clearPersistedResult = useCallback(() => {
        try {
            localStorage.removeItem(RESULT_PERSIST_KEY);
        } catch {}
    }, []);

    const resetStudyChat = useCallback(() => {
        setStudySessionId(null);
        setStudyBooting(false);
        setStudyMessages([
            {
                id: "intro",
                role: "assistant",
                text: "Nhập từ khóa liên quan bài học. Mình chỉ gợi ý khái niệm tổng quát, không đưa đáp án.",
            },
        ]);
    }, []);

    const resetPracticeState = useCallback(
        (opts = { keepMessages: true }) => {
            clearActiveSession();
            clearPersistedResult();

            setMaterialId(null);
            materialIdRef.current = null;

            setSessionToken("");
            sessionTokenRef.current = "";

            setStartedAtIso(null);
            setDeadlineIso(null);

            setAttemptDetail(null);
            setAttemptQuestionCount(null); // ✅ reset frozen count

            setResult(null);
            setReviewOpen(false);
            setReviewData(null);

            setMode(MODE.IDLE);
            setDurationMinutes(0);
            setIsCanvasOpen(true);

            setAssistantMode(ASSISTANT_MODE.GENERATE);
            resetStudyChat(); // ✅ chỉ reset khi đổi học liệu

            if (opts?.keepMessages) {
                appendMessage({
                    role: "assistant",
                    text: "Ok! Upload/paste học liệu mới rồi bấm Gửi để tạo đề nhé.",
                });
            } else {
                setMessages([{ id: uid("a"), role: "assistant", text: "Ok! Gửi học liệu mới để bắt đầu." }]);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat]
    );

    async function waitForExtractedTextOrReady(id) {
        const MAX_TRIES = 25;
        const SLEEP_MS = 700;

        for (let i = 0; i < MAX_TRIES; i++) {
            try {
                const res = await materialApi.getExtractedText(id);
                const data = unwrap(res);
                const t = typeof data === "string" ? data : data?.text ?? data?.extractedText ?? "";
                if (t && t.trim().length > 0) return t.trim();
            } catch {}
            await new Promise((r) => setTimeout(r, SLEEP_MS));
        }
        return "";
    }

    const handleUploadFile = useCallback(
        async (file) => {
            if (!file) return;

            if (file.size > MAX_SIZE_BYTES) {
                showToast("File quá dung lượng (tối đa 10MB).", "error");
                appendMessage({ role: "assistant", text: "File quá dung lượng (tối đa 10MB). Hãy chọn file nhỏ hơn." });
                return;
            }
            if (!ALLOWED_EXT_REGEX.test(file.name)) {
                showToast("Sai định dạng. Chỉ hỗ trợ PDF/DOCX/TXT/XLSX.", "error");
                appendMessage({
                    role: "assistant",
                    text: "Sai định dạng. Chỉ hỗ trợ PDF/DOCX/TXT/XLSX. Hãy chọn lại file.",
                });
                return;
            }

            appendMessage({ role: "user", text: `📄 Upload: ${file.name}` });
            setLoading(true);
            setLoadingMessage("Đang upload & trích xuất…");

            try {
                const res = await materialApi.upload(file, () => {});
                const data = unwrap(res);
                const id = data?.id || data?.materialId;
                if (!id) throw new Error("Missing materialId from upload response");

                clearPersistedResult();

                setMaterialId(id);
                materialIdRef.current = id;

                setSessionToken("");
                sessionTokenRef.current = "";
                setStartedAtIso(null);
                setDeadlineIso(null);
                setAttemptDetail(null);
                setAttemptQuestionCount(null);

                setResult(null);
                setReviewOpen(false);
                setReviewData(null);
                setMode(MODE.IDLE);
                setDurationMinutes(0);
                clearActiveSession();

                resetStudyChat(); // ✅ đổi học liệu => reset chat

                const extracted = await waitForExtractedTextOrReady(id);

                appendMessage({
                    role: "assistant",
                    text: extracted
                        ? "Upload xong & đã trích xuất. Bây giờ để trống ô nhập và bấm Gửi để Fly AI tạo đề nhé."
                        : "Upload xong. Bây giờ để trống ô nhập và bấm Gửi để Fly AI tạo đề nhé.",
                });

                showToast("Đã nhận học liệu. Bấm Gửi để tạo đề.", "success");
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Upload failed";
                showToast(`Upload học liệu thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không upload/đọc được file. Kiểm tra định dạng/size nhé." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat, showToast]
    );

    const handleSendText = useCallback(
        async (rawText) => {
            const t = String(rawText || "").trim();
            if (!t) return;

            appendMessage({ role: "user", text: t.length > 500 ? t.slice(0, 500) + "…" : t });

            setLoading(true);
            setLoadingMessage("Đang tạo học liệu…");

            try {
                const res = await materialApi.createFromText({ title: "Pasted material", rawText: t });
                const data = unwrap(res);
                const id = data?.id || data?.materialId;
                if (!id) throw new Error("Missing materialId from createFromText response");

                clearPersistedResult();

                setMaterialId(id);
                materialIdRef.current = id;

                setSessionToken("");
                sessionTokenRef.current = "";
                setStartedAtIso(null);
                setDeadlineIso(null);
                setAttemptDetail(null);
                setAttemptQuestionCount(null);

                setResult(null);
                setReviewOpen(false);
                setReviewData(null);
                setMode(MODE.IDLE);
                setDurationMinutes(0);
                clearActiveSession();

                resetStudyChat(); // ✅ đổi học liệu => reset chat

                const extracted = await waitForExtractedTextOrReady(id);

                appendMessage({
                    role: "assistant",
                    text: extracted
                        ? "Đã nhận & trích xuất. Bây giờ để trống ô nhập và bấm Gửi để Fly AI tạo đề nhé."
                        : "Đã nhận học liệu. Bây giờ để trống ô nhập và bấm Gửi để Fly AI tạo đề nhé.",
                });

                showToast("Đã nhận học liệu. Bấm Gửi để tạo đề.", "success");
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Create material failed";
                showToast(`Gửi học liệu thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không tạo được học liệu từ text này. Thử lại nhé." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat, showToast]
    );

    useEffect(() => {
        const boot = async () => {
            if (assistantMode !== ASSISTANT_MODE.STUDY) return;

            const matId = materialIdRef.current ?? materialId;
            if (!matId) return;

            if (studySessionId) return;

            setStudyBooting(true);
            try {
                const s = await chatApi.startSession(matId);
                const sid = s?.sessionId;
                if (!sid) throw new Error("Missing sessionId");

                setStudySessionId(sid);

                const history = await chatApi.getMessages(sid);
                if (Array.isArray(history) && history.length) {
                    const mapped = history.map((m) => ({
                        id: String(m.id),
                        role: String(m.sender || "").toUpperCase() === "USER" ? "user" : "assistant",
                        text: m.content || "",
                    }));
                    setStudyMessages((prev) => {
                        const intro = prev?.[0] ? [prev[0]] : [];
                        return [...intro, ...mapped];
                    });
                }
            } catch (e) {
                console.error(e);
                const msg = e?.response?.data?.message || e?.message || "Start chat failed";
                showToast(`Không mở được chat: ${String(msg)}`, "error");
            } finally {
                setStudyBooting(false);
            }
        };

        boot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assistantMode, materialId, studySessionId]);

    const handleAskStudy = useCallback(
        async (rawKeywords) => {
            if (loading) return;

            const matId = materialIdRef.current ?? materialId;
            if (!matId) {
                showToast("Chưa có học liệu. Hãy upload/paste trước.", "warning");
                return;
            }

            const v = validateKeywords(rawKeywords);
            if (!v.ok) {
                showToast(v.message, "warning");
                return;
            }

            const keywords = v.value;
            appendStudyMessage({ role: "user", text: keywords });

            setStudyBooting(true);
            try {
                let sid = studySessionId;
                if (!sid) {
                    const s = await chatApi.startSession(matId);
                    sid = s?.sessionId;
                    if (!sid) throw new Error("Missing sessionId");
                    setStudySessionId(sid);
                }

                const res = await chatApi.ask(sid, keywords);
                const ans = res?.answer || "Mình chưa đủ ngữ cảnh. Thử nhập từ khóa cụ thể hơn.";
                appendStudyMessage({ role: "assistant", text: ans });
            } catch (e) {
                console.error(e);
                const msg = e?.response?.data?.message || e?.message || "Ask failed";
                showToast(`Không gửi được: ${String(msg)}`, "error");
                appendStudyMessage({
                    role: "assistant",
                    text: "Mình không trả lời được. Hãy thử từ khóa khác xuất hiện trong bài học.",
                });
            } finally {
                setStudyBooting(false);
            }
        },
        [appendStudyMessage, loading, materialId, showToast, studySessionId]
    );

    const generateSessionV2 = useCallback(async () => {
        const matId = materialIdRef.current ?? materialId;

        if (!matId) {
            showToast("Chưa có học liệu. Hãy upload/paste trước.", "warning");
            return { ok: false };
        }
        if (!configOk) {
            showToast("Số câu hỏi chưa hợp lệ.", "warning");
            return { ok: false };
        }

        clearPersistedResult();

        setLoading(true);
        setLoadingMessage("Fly AI đang tạo đề…");
        appendMessage({ role: "assistant", text: "Fly AI đang tạo đề…" });

        try {
            const data = await practiceApi.generateSessionV2({
                materialId: matId,
                numberOfQuestions: Number(questionCount),
            });

            const token = data?.sessionToken;
            const dur = data?.durationMinutes;

            if (!token) throw new Error("Missing sessionToken from server");
            if (!Number.isFinite(Number(dur))) throw new Error("Missing durationMinutes from server");

            setSessionToken(token);
            sessionTokenRef.current = token;

            setDurationMinutes(Number(dur));

            setStartedAtIso(null);
            setDeadlineIso(null);

            setMode(MODE.READY);
            setIsCanvasOpen(true);

            saveActiveSession({
                mode: MODE.READY,
                sessionToken: token,
                attemptId: token,
                materialId: matId,
                questionCount: Number(questionCount),
                durationMinutes: Number(dur),
                startedAtIso: null,
                deadlineIso: null,
            });

            appendMessage({
                role: "assistant",
                text: `Đã tạo đề xong. Thời gian làm bài: ${Number(dur)} phút. Bắt đầu làm bài ngay!`,
            });

            return { ok: true, token, durationMinutes: Number(dur) };
        } catch (e) {
            console.error(e);
            const status = e?.response?.status;
            const serverMsg =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.response?.data ||
                e?.message ||
                "Generate failed";
            showToast(`Không tạo được đề${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
            appendMessage({ role: "assistant", text: "Lỗi tạo đề (AI/Server). Thử gửi lại hoặc đổi học liệu." });
            return { ok: false };
        } finally {
            setLoading(false);
        }
    }, [appendMessage, clearPersistedResult, configOk, materialId, questionCount, saveActiveSession, showToast]);

    const startSessionV2 = useCallback(async () => {
        const token = sessionTokenRef.current || sessionToken;

        if (!token) {
            showToast("Chưa có đề. Hãy bấm Gửi để tạo đề trước.", "warning");
            return;
        }

        setLoading(true);
        setLoadingMessage("Đang bắt đầu làm bài…");

        try {
            const data = await practiceApi.startSessionV2({ sessionToken: token });

            if (Number.isFinite(Number(data?.durationMinutes))) {
                setDurationMinutes(Number(data.durationMinutes));
            }

            const detail = buildAttemptDetailFromV2(data, token);
            setAttemptDetail(detail);

            const qLen = Array.isArray(detail?.questions) ? detail.questions.length : null;
            if (qLen != null) setAttemptQuestionCount(qLen);

            const startedAt = data?.startedAt || null;
            const deadline = data?.deadline || null;

            setStartedAtIso(startedAt);
            setDeadlineIso(deadline);

            setMode(MODE.DOING);
            setIsCanvasOpen(true);

            // ✅ AUTO SWITCH sang STUDY (và DOING sẽ ẩn "Tạo đề")
            setAssistantModeSafe(ASSISTANT_MODE.STUDY);

            saveActiveSession({
                mode: MODE.DOING,
                sessionToken: token,
                attemptId: token,
                materialId: materialIdRef.current ?? materialId,
                questionCount: Number(questionCount),
                durationMinutes: Number.isFinite(Number(data?.durationMinutes))
                    ? Number(data.durationMinutes)
                    : Number(durationMinutes),
                startedAtIso: startedAt,
                deadlineIso: deadline,
            });

            appendMessage({
                role: "assistant",
                text: "Bắt đầu làm bài! Mình đã chuyển sang tab “Hỏi khái niệm” để bạn hỏi nhanh trong lúc làm.",
            });
        } catch (e) {
            console.error(e);
            const status = e?.response?.status;
            const msg =
                e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Start failed";
            showToast(`Không bắt đầu được${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
            appendMessage({
                role: "assistant",
                text: "Không start được. Session có thể đã hết hạn, hãy bấm Gửi để tạo lại đề.",
            });
        } finally {
            setLoading(false);
        }
    }, [appendMessage, durationMinutes, materialId, questionCount, saveActiveSession, sessionToken, showToast, setAssistantModeSafe]);

    const submitSessionV2 = useCallback(
        async (answersArray, meta = {}) => {
            const token = sessionTokenRef.current || sessionToken;
            if (!token) return;

            setLoading(true);
            setLoadingMessage(meta?.timedOut ? "Hết giờ! Đang tự nộp…" : "Đang nộp bài…");

            try {
                const answers = Array.isArray(answersArray) ? answersArray : [];

                const payload = {
                    answers: answers
                        .filter((a) => a && a.questionId)
                        .map((a) => ({
                            questionKey: a.questionId,
                            selectedAnswer: a.selectedAnswer || "",
                            textAnswer: a.textAnswer || "",
                        })),
                };

                const data = await practiceApi.submitSessionV2(token, payload);

                setResult(data);
                setMode(MODE.RESULT);
                setIsCanvasOpen(true);

                const frozenCount =
                    (typeof attemptQuestionCount === "number" ? attemptQuestionCount : null) ??
                    (Array.isArray(attemptDetail?.questions) ? attemptDetail.questions.length : null) ??
                    Number(questionCount);

                savePersistedResult({
                    materialId: materialIdRef.current ?? materialId ?? null,
                    questionCount: Number(questionCount),
                    attemptQuestionCount: frozenCount,
                    durationMinutes: Number(durationMinutes),
                    result: data,
                    savedAt: Date.now(),
                });

                saveActiveSession({
                    mode: MODE.RESULT,
                    sessionToken: token,
                    attemptId: data?.attemptId ?? null,
                    materialId: materialIdRef.current ?? materialId ?? null,
                });

                appendMessage({
                    role: "assistant",
                    text: `Đã nộp bài. Kết quả: ${data?.status || "—"} (${data?.score ?? "?"}%).`,
                });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg =
                    e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Submit failed";
                showToast(`Nộp bài thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không nộp bài được. Thử lại nhé." });
            } finally {
                setLoading(false);
            }
        },
        [
            appendMessage,
            attemptDetail,
            attemptQuestionCount,
            durationMinutes,
            materialId,
            questionCount,
            saveActiveSession,
            savePersistedResult,
            sessionToken,
            showToast,
        ]
    );

    const openReview = useCallback(async () => {
        const attemptId = result?.attemptId;
        if (!attemptId) {
            showToast("Chưa có attemptId để xem review.", "warning");
            return;
        }
        try {
            const data = await practiceApi.review(attemptId);
            setReviewData(data);
            setReviewOpen(true);
        } catch (e) {
            console.error(e);
            const status = e?.response?.status;
            const serverMsg =
                e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Review failed";
            showToast(`Không tải được review${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
        }
    }, [result?.attemptId, showToast]);

    const startRetestV2 = useCallback(
        async (attemptId) => {
            if (!attemptId) return;

            setLoading(true);
            setLoadingMessage("Đang tạo bài thi lại…");

            try {
                const data = await practiceApi.startRetestV2(attemptId);

                const token = data?.sessionToken;
                if (!token) throw new Error("Missing sessionToken from retest start response");

                clearPersistedResult();
                setResult(null);

                setSessionToken(token);
                sessionTokenRef.current = token;

                if (Number.isFinite(Number(data?.durationMinutes))) setDurationMinutes(Number(data.durationMinutes));

                const detail = buildAttemptDetailFromV2(data, token);
                setAttemptDetail(detail);

                const qLen = Array.isArray(detail?.questions) ? detail.questions.length : null;
                if (qLen != null) setAttemptQuestionCount(qLen);

                const startedAt = data?.startedAt || null;
                const deadline = data?.deadline || null;
                setStartedAtIso(startedAt);
                setDeadlineIso(deadline);

                setMode(MODE.DOING);
                setIsCanvasOpen(true);

                // ✅ AUTO SWITCH sang STUDY (và DOING sẽ ẩn "Tạo đề")
                setAssistantModeSafe(ASSISTANT_MODE.STUDY);

                saveActiveSession({
                    mode: MODE.DOING,
                    sessionToken: token,
                    attemptId: token,
                    materialId: materialIdRef.current ?? materialId ?? null,
                    questionCount: Number(questionCount),
                    durationMinutes: Number.isFinite(Number(data?.durationMinutes))
                        ? Number(data.durationMinutes)
                        : Number(durationMinutes),
                    startedAtIso: startedAt,
                    deadlineIso: deadline,
                });

                appendMessage({ role: "assistant", text: "Ok! Mình đã tạo bài thi lại tập trung phần sai. Bắt đầu làm nhé." });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const msg =
                    e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Retest failed";
                showToast(`Không tạo được bài thi lại${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearPersistedResult, durationMinutes, materialId, questionCount, saveActiveSession, showToast, setAssistantModeSafe]
    );

    useEffect(() => {
        let cancelled = false;

        const resume = async () => {
            try {
                const rawResult = localStorage.getItem(RESULT_PERSIST_KEY);
                if (rawResult) {
                    const pr = JSON.parse(rawResult);

                    const r = pr?.result || null;
                    if (r && !cancelled) {
                        if (pr?.materialId) {
                            setMaterialId(pr.materialId);
                            materialIdRef.current = pr.materialId;
                        }

                        if (typeof pr?.questionCount === "number") setQuestionCount(pr.questionCount);
                        if (typeof pr?.durationMinutes === "number") setDurationMinutes(pr.durationMinutes);

                        if (typeof pr?.attemptQuestionCount === "number") setAttemptQuestionCount(pr.attemptQuestionCount);

                        setResult(r);
                        setMode(MODE.RESULT);
                        setIsCanvasOpen(true);
                        return;
                    }
                }

                const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
                const sess = raw ? JSON.parse(raw) : null;
                if (!sess?.sessionToken) return;

                const token = String(sess.sessionToken);
                sessionTokenRef.current = token;
                setSessionToken(token);

                if (typeof sess?.questionCount === "number") setQuestionCount(sess.questionCount);
                if (typeof sess?.durationMinutes === "number") setDurationMinutes(sess.durationMinutes);

                if (sess?.materialId) {
                    setMaterialId(sess.materialId);
                    materialIdRef.current = sess.materialId;
                }

                setLoading(true);
                setLoadingMessage("Đang khôi phục phiên làm bài…");

                const data = await practiceApi.getSessionV2(token);

                if (Number.isFinite(Number(data?.durationMinutes))) {
                    setDurationMinutes(Number(data.durationMinutes));
                }

                const startedAt = data?.startedAt || null;
                const deadline = data?.deadline || null;

                setStartedAtIso(startedAt);
                setDeadlineIso(deadline);

                if (startedAt) {
                    const detail = buildAttemptDetailFromV2(data, token);

                    if (!cancelled) {
                        setAttemptDetail(detail);

                        const qLen = Array.isArray(detail?.questions) ? detail.questions.length : null;
                        if (qLen != null) setAttemptQuestionCount(qLen);

                        setMode(MODE.DOING);
                        setIsCanvasOpen(true);

                        // ✅ AUTO SWITCH sang STUDY khi resume DOING
                        setAssistantModeSafe(ASSISTANT_MODE.STUDY);

                        appendMessage({
                            role: "assistant",
                            text: "Mình đã khôi phục phiên làm bài trước đó (reload không làm mất tiến độ).",
                        });
                    }

                    saveActiveSession({
                        mode: MODE.DOING,
                        sessionToken: token,
                        attemptId: token,
                        materialId: sess?.materialId ?? null,
                        questionCount: typeof sess?.questionCount === "number" ? sess.questionCount : questionCount,
                        durationMinutes: Number.isFinite(Number(data?.durationMinutes))
                            ? Number(data.durationMinutes)
                            : Number(sess?.durationMinutes || 0),
                        startedAtIso: startedAt,
                        deadlineIso: deadline,
                    });
                } else {
                    if (!cancelled) {
                        setMode(MODE.READY);
                        setIsCanvasOpen(true);
                    }

                    saveActiveSession({
                        mode: MODE.READY,
                        sessionToken: token,
                        attemptId: token,
                        materialId: sess?.materialId ?? null,
                        questionCount: typeof sess?.questionCount === "number" ? sess.questionCount : questionCount,
                        durationMinutes: Number.isFinite(Number(data?.durationMinutes))
                            ? Number(data.durationMinutes)
                            : Number(sess?.durationMinutes || 0),
                        startedAtIso: null,
                        deadlineIso: null,
                    });
                }
            } catch (e) {
                console.error(e);
                try {
                    localStorage.removeItem(ACTIVE_SESSION_KEY);
                    localStorage.removeItem(RESULT_PERSIST_KEY);
                } catch {}
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        resume();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appendMessage, questionCount, saveActiveSession, setAssistantModeSafe]);

    const attemptStartTs = useMemo(() => {
        if (startedAtIso) {
            const ts = Date.parse(startedAtIso);
            return Number.isFinite(ts) ? ts : null;
        }
        if (deadlineIso && Number(durationMinutes) > 0) {
            const dts = Date.parse(deadlineIso);
            if (!Number.isFinite(dts)) return null;
            return dts - Number(durationMinutes) * 60 * 1000;
        }
        return null;
    }, [deadlineIso, durationMinutes, startedAtIso]);

    const isSplit = Boolean(materialId || sessionToken || attemptDetail || result);

    const ChatBubble = ({ role, text, children }) => {
        const isUser = role === "user";
        return (
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: isUser ? "row-reverse" : "row" }}>
                <Avatar
                    src={isUser ? undefined : "/images/AI_logo.png"}
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: isUser ? "primary.main" : "transparent",
                        border: isUser ? "none" : `1px solid ${COLORS.border}`,
                    }}
                >
                    {isUser ? "U" : <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />}
                </Avatar>

                <Box sx={{ maxWidth: "80%" }}>
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: COLORS.textSecondary,
                            mb: 0.5,
                            textAlign: isUser ? "right" : "left",
                        }}
                    >
                        {isUser ? "You" : "FLY AI"}
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: isUser ? "primary.light" : "grey.100",
                            color: isUser ? "primary.contrastText" : "text.primary",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            border: isUser ? "none" : `1px solid ${COLORS.border}`,
                        }}
                    >
                        {children ? children : <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>{text}</Typography>}
                    </Paper>
                </Box>
            </Box>
        );
    };

    const ChatTypingBubble = () => {
        return (
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: "row" }}>
                <Avatar
                    src={"/images/AI_logo.png"}
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "transparent",
                        border: `1px solid ${COLORS.border}`,
                    }}
                >
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
                </Avatar>

                <Box sx={{ maxWidth: "80%" }}>
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: COLORS.textSecondary,
                            mb: 0.5,
                            textAlign: "left",
                        }}
                    >
                        FLY AI
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: "grey.100",
                            color: "text.primary",
                            border: `1px solid ${COLORS.border}`,
                        }}
                    >
                        <TypingIndicator />
                    </Paper>
                </Box>
            </Box>
        );
    };

    const doingAttemptId = useMemo(() => {
        const t = sessionTokenRef.current || sessionToken;
        return t || null;
    }, [sessionToken]);

    const durationLabel = useMemo(() => {
        if (Number(durationMinutes) > 0) return durationMinutes;
        if (mode === MODE.IDLE) return 0;
        return durationMinutes;
    }, [durationMinutes, mode]);

    const leftWidth = isCanvasOpen && isSplit ? "30%" : "100%";
    const rightWidth = isCanvasOpen && isSplit ? "70%" : "0%";

    const allowUpload = assistantMode === ASSISTANT_MODE.GENERATE && mode !== MODE.DOING;

    const showFloatingTimer = mode === MODE.DOING && Boolean(attemptStartTs) && Number(durationMinutes) > 0;

    const resultQuestionCount = useMemo(() => {
        if (typeof attemptQuestionCount === "number") return attemptQuestionCount;
        if (Array.isArray(attemptDetail?.questions)) return attemptDetail.questions.length;
        return Number(questionCount);
    }, [attemptDetail?.questions, attemptQuestionCount, questionCount]);

    return (
        <Box
            sx={{
                height: "calc(100vh - var(--app-header-height, 72px))",
                width: "100%",
                bgcolor: COLORS.bg,
                p: 2,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {showFloatingTimer && (
                <Paper
                    elevation={0}
                    sx={{
                        position: "fixed",
                        top: "calc(var(--app-header-height, 72px) + 8px)",
                        right: 18,
                        zIndex: 120,
                        borderRadius: 3,
                        px: 1.5,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        bgcolor: "#fff",
                        border: "1px solid #ffcdd2",
                        boxShadow: "0 10px 30px rgba(211, 47, 47, 0.12)",
                        userSelect: "none",
                    }}
                >
                    <AccessTimeFilledRoundedIcon sx={{ color: "#d32f2f" }} fontSize="small" />
                    <Typography
                        sx={{
                            fontWeight: 900,
                            fontSize: 15,
                            color: "#d32f2f",
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1,
                        }}
                    >
                        <CountdownTimer
                            startTimestamp={attemptStartTs}
                            durationSeconds={Number(durationMinutes) * 60}
                            onExpire={() => playerRef.current?.submit?.({ timedOut: true })}
                        />
                    </Typography>
                </Paper>
            )}

            <Box sx={{ display: "flex", flex: 1, gap: 2, minHeight: 0, overflow: "hidden" }}>
                {/* LEFT: AI Panel */}
                <Box
                    sx={{
                        width: leftWidth,
                        minWidth: isCanvasOpen && isSplit ? 320 : 360,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        transition: "width 0.25s ease",
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: 3,
                            border: `1px solid ${COLORS.border}`,
                            overflow: "hidden",
                            bgcolor: "#fff",
                        }}
                    >
                        <Box sx={{ p: 2, pb: 0 }}>
                            <PracticeHeaderConfig
                                questionCount={questionCount}
                                durationMinutes={durationLabel}
                                onChangeQuestionCount={(v) => setQuestionCount(Number(v))}
                                attemptId={mode === MODE.DOING ? doingAttemptId : null}
                                attemptStartTs={null}
                                onTimeExpired={null}
                            />

                            <Box sx={{ mt: 1.5, px: 0.5 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.25,
                                        borderRadius: 3,
                                        bgcolor: "#fff",
                                        border: `1px solid ${COLORS.border}`,
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                        <Stack sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                                                Bumblefly AI
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                                {assistantMode === ASSISTANT_MODE.GENERATE
                                                    ? "Upload/Paste để tạo đề"
                                                    : "Keyword-only • Không đáp án"}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                            {/* ✅ DOING => ẨN "Tạo đề" */}
                                            {!lockGenerate && (
                                                <Chip
                                                    label="Tạo đề"
                                                    clickable
                                                    color={assistantMode === ASSISTANT_MODE.GENERATE ? "primary" : "default"}
                                                    onClick={() => setAssistantModeSafe(ASSISTANT_MODE.GENERATE)}
                                                />
                                            )}

                                            {/* ✅ GENERATE => ẨN "Hỏi khái niệm" */}
                                            {!hideStudyWhenGenerate && (
                                                <Chip
                                                    label="Hỏi khái niệm"
                                                    clickable
                                                    color={assistantMode === ASSISTANT_MODE.STUDY ? "primary" : "default"}
                                                    onClick={() => setAssistantModeSafe(ASSISTANT_MODE.STUDY)}
                                                />
                                            )}
                                        </Stack>
                                    </Stack>

                                    {assistantMode === ASSISTANT_MODE.STUDY && !(materialIdRef.current ?? materialId) && (
                                        <>
                                            <Divider sx={{ my: 1.2 }} />
                                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                                * Bạn cần upload/paste học liệu trước để chat theo đúng bài.
                                            </Typography>
                                        </>
                                    )}

                                    {assistantMode === ASSISTANT_MODE.STUDY && studyBooting && (
                                        <Typography sx={{ mt: 1, fontSize: 12, color: COLORS.textSecondary }}>
                                            Đang mở session chat…
                                        </Typography>
                                    )}
                                </Paper>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: "auto",
                                px: 2,
                                pt: 2,
                                pb: 2,
                            }}
                        >
                            <Box sx={{ width: "100%" }}>
                                {messagesToRender.map((m) => (
                                    <ChatBubble key={m.id} role={m.role} text={m.text} />
                                ))}
                                {(assistantMode === ASSISTANT_MODE.STUDY ? studyBooting : loading) && <ChatTypingBubble />}
                                <div ref={messagesEndRef} />
                            </Box>
                        </Box>

                        <Box sx={{ p: 2, pt: 0 }}>
                            <ChatComposer
                                allowUpload={allowUpload}
                                onUploadFile={handleUploadFile}
                                onSendText={assistantMode === ASSISTANT_MODE.GENERATE ? handleSendText : handleAskStudy}
                                disabled={
                                    loading ||
                                    (assistantMode === ASSISTANT_MODE.STUDY && !(materialIdRef.current ?? materialId))
                                }
                                helperText={
                                    assistantMode === ASSISTANT_MODE.GENERATE
                                        ? "Upload file xong bấm Gửi để Fly AI tạo đề."
                                        : "Chỉ nhập từ khóa (2–8 từ), không nhập câu hỏi dài."
                                }
                            />
                        </Box>
                    </Paper>
                </Box>

                {/* RIGHT: Canvas */}
                {isSplit && (
                    <Box
                        sx={{
                            width: rightWidth,
                            minWidth: isCanvasOpen ? 420 : 0,
                            height: "100%",
                            display: isCanvasOpen ? "flex" : "none",
                            flexDirection: "column",
                            borderRadius: 3,
                            overflow: "hidden",
                            border: `1px solid ${COLORS.border}`,
                            bgcolor: "#F8F9FA",
                            transition: "width 0.25s ease, min-width 0.25s ease",
                            minHeight: 0,
                        }}
                    >
                        <Box
                            sx={{
                                p: 1.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                bgcolor: "#fff",
                                borderBottom: `1px solid ${COLORS.border}`,
                                flexShrink: 0,
                                gap: 1,
                            }}
                        >
                            <Tooltip title="Đổi học liệu">
                                <Button
                                    onClick={() => resetPracticeState({ keepMessages: true })}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RestartAltRoundedIcon />}
                                    sx={{ borderRadius: 3, fontWeight: 900 }}
                                >
                                    Đổi học liệu
                                </Button>
                            </Tooltip>
                        </Box>

                        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2.5 }}>
                            {mode === MODE.IDLE && (
                                <Box>
                                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5, fontSize: 18 }}>
                                        Sẵn sàng tạo đề
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                                        Upload/paste học liệu xong, bấm <b>Gửi</b> để Fly AI tạo đề.
                                    </Typography>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={generateSessionV2}
                                        disabled={loading || !(materialIdRef.current ?? materialId)}
                                        sx={{
                                            borderRadius: 3,
                                            fontWeight: 900,
                                            bgcolor: COLORS.orange,
                                            "&:hover": { bgcolor: COLORS.orangeHover },
                                        }}
                                    >
                                        Tạo đề ngay
                                    </Button>

                                    {!materialId && (
                                        <Typography sx={{ mt: 2, fontSize: 12, color: COLORS.textSecondary }}>
                                            * Bạn cần upload/paste trước khi tạo đề.
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {mode === MODE.READY && (
                                <Box>
                                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5, fontSize: 18 }}>
                                        Đã tạo đề xong
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 1.5 }}>
                                        Số câu: <b>{Number(questionCount)}</b> • Thời gian:{" "}
                                        <b>{Number(durationMinutes) || "—"} phút</b>
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                                        Bấm “Bắt đầu làm bài” để làm bài ngay. Nếu muốn đổi học liệu thì bấm “Đổi học liệu”.
                                    </Typography>

                                    <Stack spacing={1.5}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={startSessionV2}
                                            disabled={loading}
                                            sx={{
                                                borderRadius: 3,
                                                fontWeight: 900,
                                                bgcolor: COLORS.orange,
                                                "&:hover": { bgcolor: COLORS.orangeHover },
                                            }}
                                        >
                                            Bắt đầu làm bài
                                        </Button>

                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={() => resetPracticeState({ keepMessages: true })}
                                            disabled={loading}
                                            sx={{ borderRadius: 3, fontWeight: 900 }}
                                        >
                                            Đổi học liệu
                                        </Button>
                                    </Stack>
                                </Box>
                            )}

                            {mode === MODE.DOING && (
                                <PracticePlayer
                                    ref={playerRef}
                                    attemptDetail={attemptDetail}
                                    attemptId={attemptDetail?.sessionToken || doingAttemptId}
                                    attemptStartTs={attemptStartTs}
                                    onSubmit={(answersArray, meta) => submitSessionV2(answersArray, meta)}
                                />
                            )}

                            {mode === MODE.RESULT && (
                                <PracticeResult
                                    result={result}
                                    numberOfQuestions={Number(resultQuestionCount)}
                                    onRetry={async () => {
                                        const attemptId = result?.attemptId;
                                        if (attemptId) {
                                            await startRetestV2(attemptId);
                                            return;
                                        }

                                        setResult(null);
                                        setAttemptDetail(null);
                                        setAttemptQuestionCount(null);
                                        setStartedAtIso(null);
                                        setDeadlineIso(null);
                                        setMode(MODE.IDLE);

                                        setSessionToken("");
                                        sessionTokenRef.current = "";

                                        setDurationMinutes(0);

                                        clearActiveSession();
                                        clearPersistedResult();
                                        appendMessage({ role: "assistant", text: "Ok! Bạn có thể bấm “Tạo đề ngay” để làm lại." });
                                    }}
                                    onNewMaterial={() => resetPracticeState({ keepMessages: true })}
                                    onViewReview={openReview}
                                />
                            )}
                        </Box>
                    </Box>
                )}
            </Box>

            {isSplit && (
                <Box
                    sx={{
                        position: "fixed",
                        right: 18,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 99,
                        display: { xs: "none", md: "block" },
                    }}
                >
                    <Tooltip title={isCanvasOpen ? "Đóng" : "Mở"}>
                        <IconButton
                            onClick={() => setIsCanvasOpen((v) => !v)}
                            sx={{
                                borderRadius: 3,
                                bgcolor: "#EC5E32",
                                color: "#fff",
                                border: "1px solid #EC5E32",
                                boxShadow: "0 10px 30px rgba(236,94,50,0.35)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    bgcolor: "#d94f28",
                                    borderColor: "#d94f28",
                                    boxShadow: "0 12px 34px rgba(236,94,50,0.45)",
                                },
                            }}
                        >
                            {isCanvasOpen ? (
                                <ChevronRightRoundedIcon sx={{ color: "#fff" }} />
                            ) : (
                                <ChevronLeftRoundedIcon sx={{ color: "#fff" }} />
                            )}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            <PracticeReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewData} />
            <GlobalLoading open={loading} message={loadingMessage} />
        </Box>
    );
}
