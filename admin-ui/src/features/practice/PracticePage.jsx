// src/features/practice/PracticePage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Button,
    Stack,
    Avatar,
    Tooltip,
} from "@mui/material";

import SendRoundedIcon from "@mui/icons-material/SendRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import { practiceApi } from "../../api/practiceApi";
import { materialApi } from "../../api/materialApi";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

import PracticeHeaderConfig from "./components/chatbot/PracticeHeaderConfig";
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

const MODE = {
    IDLE: "IDLE",
    READY: "READY",
    DOING: "DOING",
    RESULT: "RESULT",
};

const ACTIVE_SESSION_KEY = "practice_active_session_v2";

const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

function uid(prefix = "m") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ✅ Adapter: dùng questionKey làm questionId (ổn định -> reload không mất đáp án)
function buildAttemptDetailFromV2(serverRes, sessionToken) {
    const qs = Array.isArray(serverRes?.questions) ? serverRes.questions : [];

    const questions = qs
        .map((q) => ({
            questionId: q?.questionKey, // ✅ stable id
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

// ===== Upload validate =====
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt|xlsx)$/i;

export default function PracticePage() {
    const { showToast } = useToast();

    // ===== Optional: basic anti-devtools (UX only, NOT security) =====
    useEffect(() => {
        const onContextMenu = (e) => {
            e.preventDefault();
        };

        const onKeyDown = (e) => {
            const key = String(e.key || "").toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;

            if (e.key === "F12") {
                e.preventDefault();
                return;
            }

            if (ctrl && e.shiftKey && ["i", "j", "c"].includes(key)) {
                e.preventDefault();
                return;
            }

            if (ctrl && key === "u") {
                e.preventDefault();
            }
        };

        document.addEventListener("contextmenu", onContextMenu);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("contextmenu", onContextMenu);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    // ===== loading =====
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // ===== config =====
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(0); // auto from BE

    // ===== material =====
    const [materialId, setMaterialId] = useState(null);
    const materialIdRef = useRef(null);

    // ===== session =====
    const [mode, setMode] = useState(MODE.IDLE);
    const [sessionToken, setSessionToken] = useState("");
    const sessionTokenRef = useRef("");

    // timing from BE
    const [startedAtIso, setStartedAtIso] = useState(null);
    const [deadlineIso, setDeadlineIso] = useState(null);

    // ===== Canvas =====
    const [isCanvasOpen, setIsCanvasOpen] = useState(true);

    // ===== attempt detail =====
    const [attemptDetail, setAttemptDetail] = useState(null);

    // ===== result/review =====
    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    // player ref (timer outside auto-submit)
    const playerRef = useRef(null);

    // ===== chat =====
    const [messages, setMessages] = useState([
        {
            id: uid("a"),
            role: "assistant",
            text:
                "Gửi học liệu (upload/paste). Sau đó bấm nút Gửi để AI tạo đề. Khi tạo xong sẽ hiện “Bắt đầu làm bài” ở Canvas.",
        },
    ]);
    const [input, setInput] = useState("");

    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const appendMessage = useCallback((msg) => {
        setMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    const configOk = useMemo(() => {
        const n = Number(questionCount);
        return Number.isFinite(n) && n >= 1;
    }, [questionCount]);

    // ===== active session persistence =====
    const saveActiveSession = useCallback((next) => {
        try {
            localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
    }, []);

    const clearActiveSession = useCallback(() => {
        try {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
        } catch {
            // ignore
        }
    }, []);

    // ===== Reset state =====
    const resetPracticeState = useCallback(
        (opts = { keepMessages: true }) => {
            clearActiveSession();

            setMaterialId(null);
            materialIdRef.current = null;

            setSessionToken("");
            sessionTokenRef.current = "";

            setStartedAtIso(null);
            setDeadlineIso(null);

            setAttemptDetail(null);

            setResult(null);
            setReviewOpen(false);
            setReviewData(null);

            setMode(MODE.IDLE);
            setDurationMinutes(0);
            setInput("");
            setIsCanvasOpen(true);

            if (opts?.keepMessages) {
                appendMessage({
                    role: "assistant",
                    text: "Ok! Upload/paste học liệu mới rồi bấm Gửi để tạo đề nhé.",
                });
            } else {
                setMessages([{ id: uid("a"), role: "assistant", text: "Ok! Gửi học liệu mới để bắt đầu." }]);
            }
        },
        [appendMessage, clearActiveSession]
    );

    // ===== poll extracted text =====
    async function waitForExtractedTextOrReady(id) {
        const MAX_TRIES = 25;
        const SLEEP_MS = 700;

        for (let i = 0; i < MAX_TRIES; i++) {
            try {
                const res = await materialApi.getExtractedText(id);
                const data = unwrap(res);
                const t = typeof data === "string" ? data : data?.text ?? data?.extractedText ?? "";
                if (t && t.trim().length > 0) return t.trim();
            } catch {
                // ignore
            }
            await new Promise((r) => setTimeout(r, SLEEP_MS));
        }
        return "";
    }

    // =========================
    // Upload file -> chỉ tạo materialId
    // =========================
    const handleUploadFile = useCallback(
        async (file) => {
            if (!file) return;

            // ✅ validate (format/size) ngay tại đây để tránh gọi API vô ích
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

                setMaterialId(id);
                materialIdRef.current = id;

                // reset session state
                setSessionToken("");
                sessionTokenRef.current = "";
                setStartedAtIso(null);
                setDeadlineIso(null);
                setAttemptDetail(null);
                setResult(null);
                setReviewOpen(false);
                setReviewData(null);
                setMode(MODE.IDLE);
                setDurationMinutes(0);
                clearActiveSession();

                const extracted = await waitForExtractedTextOrReady(id);

                appendMessage({
                    role: "assistant",
                    text: extracted
                        ? "Upload xong & đã trích xuất. Bây giờ để trống ô nhập và bấm Gửi để AI tạo đề nhé."
                        : "Upload xong. Bây giờ để trống ô nhập và bấm Gửi để AI tạo đề nhé.",
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
        [appendMessage, clearActiveSession, showToast]
    );

    // =========================
    // Paste text -> tạo materialId
    // =========================
    const handleSendText = useCallback(async () => {
        const rawText = input.trim();
        if (!rawText) return;

        appendMessage({
            role: "user",
            text: rawText.length > 500 ? rawText.slice(0, 500) + "…" : rawText,
        });
        setInput("");

        setLoading(true);
        setLoadingMessage("Đang tạo học liệu…");

        try {
            const res = await materialApi.createFromText({ title: "Pasted material", rawText });
            const data = unwrap(res);
            const id = data?.id || data?.materialId;
            if (!id) throw new Error("Missing materialId from createFromText response");

            setMaterialId(id);
            materialIdRef.current = id;

            // reset session state
            setSessionToken("");
            sessionTokenRef.current = "";
            setStartedAtIso(null);
            setDeadlineIso(null);
            setAttemptDetail(null);
            setResult(null);
            setReviewOpen(false);
            setReviewData(null);
            setMode(MODE.IDLE);
            setDurationMinutes(0);
            clearActiveSession();

            const extracted = await waitForExtractedTextOrReady(id);

            appendMessage({
                role: "assistant",
                text: extracted
                    ? "Đã nhận & trích xuất. Bây giờ để trống ô nhập và bấm Gửi để AI tạo đề nhé."
                    : "Đã nhận học liệu. Bây giờ để trống ô nhập và bấm Gửi để AI tạo đề nhé.",
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
    }, [appendMessage, clearActiveSession, input, showToast]);

    // =========================
    // V2 Step 1: Generate session
    // =========================
    const generateSessionV2 = useCallback(
        async () => {
            const matId = materialIdRef.current ?? materialId;

            if (!matId) {
                showToast("Chưa có học liệu. Hãy upload/paste trước.", "warning");
                return { ok: false };
            }
            if (!configOk) {
                showToast("Số câu hỏi chưa hợp lệ.", "warning");
                return { ok: false };
            }

            setLoading(true);
            setLoadingMessage("AI đang tạo đề…");
            appendMessage({ role: "assistant", text: "AI đang tạo đề… (tự tính thời gian theo số câu)" });

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
                    text: `Đã tạo đề xong. Thời gian làm bài: ${Number(dur)} phút. Bấm “Bắt đầu làm bài” ở Canvas.`,
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
        },
        [appendMessage, configOk, materialId, questionCount, saveActiveSession, showToast]
    );

    // =========================
    // V2 Step 2: Start session
    // =========================
    const startSessionV2 = useCallback(
        async () => {
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

                const startedAt = data?.startedAt || null;
                const deadline = data?.deadline || null;

                setStartedAtIso(startedAt);
                setDeadlineIso(deadline);

                setMode(MODE.DOING);
                setIsCanvasOpen(true);

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

                appendMessage({ role: "assistant", text: "Bắt đầu rồi! Làm bài ở Canvas bên phải nhé." });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const msg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Start session failed";
                showToast(`Không bắt đầu được${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
                appendMessage({
                    role: "assistant",
                    text: "Không start được. Session có thể đã hết hạn, hãy bấm Gửi để tạo lại đề.",
                });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, durationMinutes, materialId, questionCount, saveActiveSession, sessionToken, showToast]
    );

    // =========================
    // Submit V2
    // =========================
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

                saveActiveSession({
                    mode: MODE.RESULT,
                    sessionToken: token,
                    attemptId: data?.attemptId ?? null,
                });

                appendMessage({
                    role: "assistant",
                    text: `Đã nộp bài. Kết quả: ${data?.status || "—"} (${data?.score ?? "?"}%).`,
                });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Submit failed";
                showToast(`Nộp bài thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không nộp bài được. Thử lại nhé." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, saveActiveSession, sessionToken, showToast]
    );

    // =========================
    // Review
    // =========================
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
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.response?.data ||
                e?.message ||
                "Review failed";
            showToast(`Không tải được review${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
        }
    }, [result?.attemptId, showToast]);

    // =========================
    // RESUME after reload
    // =========================
    useEffect(() => {
        let cancelled = false;

        const resume = async () => {
            try {
                const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
                const sess = raw ? JSON.parse(raw) : null;
                if (!sess?.sessionToken) return;

                const token = String(sess.sessionToken);
                sessionTokenRef.current = token;
                setSessionToken(token);

                if (typeof sess?.questionCount === "number") setQuestionCount(sess.questionCount);
                if (typeof sess?.durationMinutes === "number") setDurationMinutes(sess.durationMinutes);

                if (sess?.mode === MODE.RESULT) {
                    if (!cancelled) {
                        setMode(MODE.RESULT);
                        setIsCanvasOpen(true);
                    }
                    return;
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
                        setMode(MODE.DOING);
                        setIsCanvasOpen(true);

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
                } catch {
                    // ignore
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        resume();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== Timer startTs (source-of-truth from BE) =====
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

    const ChatBubble = ({ role, text }) => {
        const isUser = role === "user";
        return (
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: isUser ? "row-reverse" : "row" }}>
                <Avatar
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
                        {isUser ? "You" : "AI"}
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: isUser ? "primary.light" : "grey.100",
                            color: isUser ? "primary.contrastText" : "text.primary",
                            whiteSpace: "pre-wrap",
                            border: isUser ? "none" : `1px solid ${COLORS.border}`,
                        }}
                    >
                        <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>{text}</Typography>
                    </Paper>
                </Box>
            </Box>
        );
    };

    const canClickSend = useMemo(() => {
        const hasMaterial = !!(materialIdRef.current ?? materialId);
        const hasText = !!input.trim();
        if (loading) return false;
        if (hasText) return true;
        return hasMaterial;
    }, [input, loading, materialId]);

    const handleBottomSend = useCallback(async () => {
        if (loading) return;

        if (input.trim()) {
            await handleSendText();
            return;
        }

        await generateSessionV2();
    }, [generateSessionV2, handleSendText, input, loading]);

    const doingAttemptId = useMemo(() => {
        const t = sessionTokenRef.current || sessionToken;
        return t || null;
    }, [sessionToken]);

    return (
        <Box sx={{ display: "flex", height: "100vh", width: "100%", bgcolor: COLORS.bg, overflow: "hidden" }}>
            {/* LEFT: Chat */}
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                <Box sx={{ p: 2, pb: 0 }}>
                    <PracticeHeaderConfig
                        questionCount={questionCount}
                        durationMinutes={durationMinutes}
                        onChangeQuestionCount={(v) => setQuestionCount(Number(v))}
                        onChangeDurationMinutes={() => {
                            showToast("Thời gian được hệ thống tính tự động theo số câu hỏi.", "info");
                        }}
                        attemptId={mode === MODE.DOING ? doingAttemptId : null}
                        attemptStartTs={mode === MODE.DOING ? attemptStartTs : null}
                        onTimeExpired={() => {
                            playerRef.current?.submit?.({ timedOut: true });
                        }}
                    />
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        px: 2,
                        pb: 14,
                        pt: 2,
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Box sx={{ width: "100%", maxWidth: 860 }}>
                        {messages.map((m) => (
                            <ChatBubble key={m.id} role={m.role} text={m.text} />
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                {/* Input bottom */}
                <Box
                    sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        p: 2,
                        bgcolor: "rgba(248,250,252,0.9)",
                        backdropFilter: "blur(10px)",
                        borderTop: `1px solid ${COLORS.border}`,
                    }}
                >
                    <Box sx={{ maxWidth: 860, mx: "auto", display: "flex", gap: 1 }}>
                        <Tooltip title="Upload file (PDF/DOCX/TXT/XLSX)">
                            <IconButton component="label" sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
                                <UploadFileRoundedIcon />
                                <input
                                    hidden
                                    type="file"
                                    accept=".pdf,.docx,.txt,.xlsx"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadFile(f);
                                        e.target.value = "";
                                    }}
                                />
                            </IconButton>
                        </Tooltip>

                        <TextField
                            fullWidth
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste nội dung học liệu… (Enter để gửi text). Nếu đã upload rồi, để trống và bấm Gửi để tạo đề."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleBottomSend();
                                }
                            }}
                            multiline
                            maxRows={4}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#fff" } }}
                        />

                        <IconButton
                            onClick={handleBottomSend}
                            disabled={!canClickSend}
                            sx={{
                                borderRadius: 2,
                                bgcolor: canClickSend ? COLORS.orange : "transparent",
                                color: canClickSend ? "#fff" : "action.disabled",
                                "&:hover": { bgcolor: canClickSend ? COLORS.orangeHover : "transparent" },
                                border: canClickSend ? "none" : `1px solid ${COLORS.border}`,
                            }}
                        >
                            <SendRoundedIcon />
                        </IconButton>
                    </Box>

                    <Typography sx={{ mt: 1, textAlign: "center", fontSize: 12, color: COLORS.textSecondary }}>
                        AI có thể sai. Hãy kiểm chứng lại nội dung quan trọng.
                    </Typography>
                </Box>
            </Box>

            {/* RIGHT: Canvas */}
            <Box
                sx={{
                    width: isCanvasOpen && isSplit ? { xs: 0, md: "45%" } : 0,
                    minWidth: isCanvasOpen && isSplit ? { xs: 0, md: 380 } : 0,
                    height: "100%",
                    borderLeft: `1px solid ${COLORS.border}`,
                    bgcolor: "#F8F9FA",
                    transition: "width 0.25s ease, min-width 0.25s ease",
                    overflow: "hidden",
                    display: { xs: "none", md: "flex" },
                    flexDirection: "column",
                }}
            >
                <Box
                    sx={{
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "#fff",
                        borderBottom: `1px solid ${COLORS.border}`,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <QuizRoundedIcon sx={{ color: "primary.main" }} />
                        <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary }}>Learning Canvas</Typography>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Đổi học liệu">
                            <IconButton onClick={() => resetPracticeState({ keepMessages: true })} size="small">
                                <RestartAltRoundedIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
                    {mode === MODE.IDLE && (
                        <Box>
                            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5, fontSize: 18 }}>
                                Sẵn sàng tạo đề
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                                Upload/paste học liệu xong, bấm <b>Gửi</b> để AI tạo đề. Thời gian làm bài sẽ{" "}
                                <b>tự tính theo số câu</b>.
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
                                Bấm “Bắt đầu làm bài” để vào làm. Nếu muốn đổi học liệu thì bấm “Gửi lại tài liệu”.
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
                                    Gửi lại tài liệu
                                </Button>
                            </Stack>
                        </Box>
                    )}

                    {mode === MODE.DOING && (
                        <PracticePlayer
                            ref={playerRef}
                            attemptDetail={attemptDetail}
                            attemptId={doingAttemptId}
                            attemptStartTs={attemptStartTs}
                            onSubmit={(answersArray, meta) => submitSessionV2(answersArray, meta)}
                        />
                    )}

                    {mode === MODE.RESULT && (
                        <PracticeResult
                            result={result}
                            numberOfQuestions={Number(questionCount)}
                            onRetry={() => {
                                setResult(null);
                                setAttemptDetail(null);
                                setStartedAtIso(null);
                                setDeadlineIso(null);
                                setMode(MODE.IDLE);

                                setSessionToken("");
                                sessionTokenRef.current = "";

                                setDurationMinutes(0);

                                clearActiveSession();
                                appendMessage({ role: "assistant", text: "Ok! Bạn có thể bấm “Tạo đề ngay” để làm lại." });
                            }}
                            onNewMaterial={() => resetPracticeState({ keepMessages: true })}
                            onViewReview={openReview}
                        />
                    )}
                </Box>
            </Box>

            {isSplit && (
                <Box sx={{ position: "fixed", right: 16, bottom: 110, display: { xs: "none", md: "block" } }}>
                    <Tooltip title={isCanvasOpen ? "Đóng Canvas" : "Mở Canvas"}>
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
                                "&:active": {
                                    bgcolor: "#c74724",
                                    borderColor: "#c74724",
                                    boxShadow: "0 6px 18px rgba(236,94,50,0.35)",
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
