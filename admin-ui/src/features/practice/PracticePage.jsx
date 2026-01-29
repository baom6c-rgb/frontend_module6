// src/features/practice/PracticePage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Button,
    Divider,
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
    PREVIEW: "PREVIEW",
    DOING: "DOING",
    RESULT: "RESULT",
};

const attemptStorageKey = (attemptId) => `practice_attempt_${attemptId}`;
const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

function uid(prefix = "m") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizePreviewQuestion(q, idx) {
    const id = q?.questionId ?? q?.id ?? idx;
    const type = (q?.questionType ?? q?.type ?? "MCQ").toString().toUpperCase();
    const text = q?.question ?? q?.content ?? q?.text ?? q?.title ?? `Câu ${idx + 1}`;

    let options = [];
    if (Array.isArray(q?.options)) {
        options = q.options.map((x, i) => ({ key: String.fromCharCode(65 + i), text: String(x) }));
    } else if (q?.options && typeof q.options === "object") {
        options = Object.entries(q.options).map(([k, v]) => ({ key: k, text: String(v) }));
        const order = ["A", "B", "C", "D"];
        options.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }

    return { id, type, text, options };
}

export default function PracticePage() {
    const { showToast } = useToast();

    // ===== loading =====
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // ===== config =====
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(15);

    // ===== material =====
    const [materialId, setMaterialId] = useState(null);
    const materialIdRef = useRef(null);

    // ===== preview =====
    const [previewQuestions, setPreviewQuestions] = useState([]);
    const [previewToken, setPreviewToken] = useState("");
    const previewTokenRef = useRef("");

    // ===== chat =====
    const [messages, setMessages] = useState([
        {
            id: uid("a"),
            role: "assistant",
            text: "Gửi học liệu (upload/paste). Mình sẽ tạo preview câu hỏi và mở Learning Canvas bên phải.",
        },
    ]);
    const [input, setInput] = useState("");

    // ===== split/canvas =====
    const [mode, setMode] = useState(MODE.IDLE);
    const [isCanvasOpen, setIsCanvasOpen] = useState(true);

    // ===== attempt =====
    const [attemptId, setAttemptId] = useState(null);
    const [attemptDetail, setAttemptDetail] = useState(null);

    // ===== result/review =====
    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    // ✅ player ref để timer ngoài gọi auto-submit
    const playerRef = useRef(null);

    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const appendMessage = useCallback((msg) => {
        setMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    const configOk = useMemo(() => {
        const n = Number(questionCount);
        const d = Number(durationMinutes);
        return Number.isFinite(n) && n >= 1 && Number.isFinite(d) && d >= 1;
    }, [questionCount, durationMinutes]);

    const buildConfigPayload = useCallback(
        (matId) => ({
            materialId: matId,
            numberOfQuestions: Number(questionCount),
            durationMinutes: Number(durationMinutes),
        }),
        [questionCount, durationMinutes]
    );

    // ✅ Reset data đúng cách, không làm "rớt UI"
    const resetPracticeState = useCallback(
        (opts = { keepMessages: true }) => {
            if (attemptId) localStorage.removeItem(attemptStorageKey(attemptId));

            // material
            setMaterialId(null);
            materialIdRef.current = null;

            // preview
            setPreviewQuestions([]);
            setPreviewToken("");
            previewTokenRef.current = "";

            // attempt
            setAttemptId(null);
            setAttemptDetail(null);

            // result/review
            setResult(null);
            setReviewOpen(false);
            setReviewData(null);

            // back to upload mode
            setMode(MODE.IDLE);

            // keep input to allow new paste right away
            setInput("");

            // keep canvas open state stable
            setIsCanvasOpen(true);

            if (opts?.keepMessages) {
                appendMessage({
                    role: "assistant",
                    text: "Ok! Gửi học liệu mới (upload/paste) để mình tạo bộ câu hỏi mới nhé.",
                });
            } else {
                setMessages([{ id: uid("a"), role: "assistant", text: "Ok! Gửi học liệu mới để bắt đầu." }]);
            }
        },
        [appendMessage, attemptId]
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
            } catch {
                // ignore
            }
            await new Promise((r) => setTimeout(r, SLEEP_MS));
        }
        return "";
    }

    const generatePreview = useCallback(
        async (matId) => {
            const effectiveMaterialId = matId ?? materialIdRef.current ?? materialId;

            if (!effectiveMaterialId || !configOk) {
                showToast("Chưa có học liệu hoặc cấu hình chưa hợp lệ.", "warning");
                return { ok: false };
            }

            setLoading(true);
            setLoadingMessage("Đang tạo bộ câu hỏi (preview)…");
            appendMessage({ role: "assistant", text: "Đang tạo bộ câu hỏi… (preview)" });

            try {
                const res = await practiceApi.generatePreview(buildConfigPayload(effectiveMaterialId));
                const data = unwrap(res);

                const qs = data?.questions || data?.previewQuestions || [];
                const token = data?.previewToken || data?.token || data?.preview_token || "";

                if (!Array.isArray(qs) || qs.length === 0) throw new Error("Preview questions empty");
                if (!token) throw new Error("Missing previewToken from server");

                setPreviewQuestions(qs);
                setPreviewToken(token);
                previewTokenRef.current = token;

                setMode(MODE.PREVIEW);
                setIsCanvasOpen(true);

                appendMessage({
                    role: "assistant",
                    text: `Đã tạo ${qs.length} câu hỏi preview. Bấm “Bắt đầu làm bài” ở Canvas bên phải nhé.`,
                });

                return { ok: true, questions: qs, token };
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Preview failed";
                showToast(`Không tạo được preview${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Lỗi tạo preview (AI/Server). Thử đổi học liệu hoặc gửi lại." });
                return { ok: false };
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, buildConfigPayload, configOk, materialId, showToast]
    );

    const handleUploadFile = useCallback(
        async (file) => {
            if (!file) return;

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

                setPreviewQuestions([]);
                setPreviewToken("");
                previewTokenRef.current = "";
                setMode(MODE.IDLE);

                const extracted = await waitForExtractedTextOrReady(id);
                appendMessage({
                    role: "assistant",
                    text: extracted ? "Upload xong & đã trích xuất. Mình tạo preview ngay." : "Upload xong. Mình tạo preview ngay.",
                });

                await generatePreview(id);
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
        [appendMessage, generatePreview, showToast]
    );

    const handleSendText = useCallback(
        async () => {
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

                setPreviewQuestions([]);
                setPreviewToken("");
                previewTokenRef.current = "";
                setMode(MODE.IDLE);

                const extracted = await waitForExtractedTextOrReady(id);
                appendMessage({
                    role: "assistant",
                    text: extracted ? "Đã nhận & trích xuất. Mình tạo preview ngay." : "Đã nhận học liệu. Mình tạo preview ngay.",
                });

                await generatePreview(id);
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
        [appendMessage, generatePreview, input, showToast]
    );

    // ✅ auto-retry one time when preview expired (410)
    const startAttempt = useCallback(
        async ({ retried = false } = {}) => {
            const effectiveMaterialId = materialIdRef.current ?? materialId;
            const effectiveToken = previewTokenRef.current ?? previewToken;

            if (!effectiveMaterialId || !effectiveToken) {
                showToast("Chưa có bộ câu hỏi preview hợp lệ.", "warning");
                return;
            }

            setLoading(true);
            setLoadingMessage("Đang tạo attempt…");

            try {
                const payload = {
                    ...buildConfigPayload(effectiveMaterialId),
                    previewToken: effectiveToken,
                    preview_token: effectiveToken,
                };

                const res = await practiceApi.start(payload);
                const data = unwrap(res);

                const newAttemptId = data?.attemptId || data?.id;
                if (!newAttemptId) throw new Error("Missing attemptId");

                setAttemptId(newAttemptId);

                const serverStartTs =
                    typeof data?.startTs === "number"
                        ? data.startTs
                        : typeof data?.startTimestamp === "number"
                            ? data.startTimestamp
                            : Date.now();

                localStorage.setItem(attemptStorageKey(newAttemptId), JSON.stringify({ startTs: serverStartTs, answers: {} }));

                const detailRes = await practiceApi.getAttempt(newAttemptId);
                const detail = unwrap(detailRes);

                setAttemptDetail(detail);
                setMode(MODE.DOING);
                setIsCanvasOpen(true);

                appendMessage({ role: "assistant", text: "Bắt đầu rồi! Làm bài ở Canvas bên phải nhé." });
            } catch (e) {
                console.error(e);

                const status = e?.response?.status;
                const msg =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.response?.data ||
                    e?.message ||
                    "Start attempt failed";

                if ((status === 410 || String(msg).includes("Preview expired")) && !retried) {
                    appendMessage({ role: "assistant", text: "Preview đã hết hạn. Mình tạo preview mới rồi bắt đầu lại nhé." });

                    const r = await generatePreview(effectiveMaterialId);
                    if (r?.ok) {
                        setLoading(false);
                        return startAttempt({ retried: true });
                    }

                    setLoading(false);
                    return;
                }

                showToast(`Không start được attempt${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
                appendMessage({ role: "assistant", text: "Không tạo được attempt. Thử tạo preview lại hoặc đổi học liệu." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, buildConfigPayload, generatePreview, materialId, previewToken, showToast]
    );

    const submitAttempt = useCallback(
        async (answersArray, meta = {}) => {
            if (!attemptId) return;

            setLoading(true);
            setLoadingMessage(meta?.timedOut ? "Hết giờ! Đang tự nộp…" : "Đang nộp bài…");

            try {
                const payload = {
                    answers: Array.isArray(answersArray) ? answersArray : [],
                    timedOut: !!meta?.timedOut,
                };
                const res = await practiceApi.submit(attemptId, payload);
                const data = unwrap(res);

                setResult(data);
                setMode(MODE.RESULT);
                setIsCanvasOpen(true);

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
        [attemptId, appendMessage, showToast]
    );

    const openReview = useCallback(async () => {
        if (!attemptId) return;
        try {
            const res = await practiceApi.getReview(attemptId);
            const data = unwrap(res);
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
    }, [attemptId, showToast]);

    const attemptStartTs = useMemo(() => {
        if (!attemptId) return null;
        try {
            const raw = localStorage.getItem(attemptStorageKey(attemptId));
            const parsed = raw ? JSON.parse(raw) : null;
            return typeof parsed?.startTs === "number" ? parsed.startTs : null;
        } catch {
            return null;
        }
    }, [attemptId]);

    const isSplit = Boolean(previewQuestions?.length || previewToken || attemptId || result);

    const normalizedPreview = useMemo(
        () => (previewQuestions || []).map((q, idx) => normalizePreviewQuestion(q, idx)),
        [previewQuestions]
    );

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

    const PreviewCard = ({ q }) => (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: "divider", bgcolor: "#fff" }}>
            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 1 }}>
                {q.type === "ESSAY" || q.type === "SHORT_ANSWER" ? "Tự luận" : "Trắc nghiệm"} • {q.text}
            </Typography>

            {q.type === "ESSAY" || q.type === "SHORT_ANSWER" ? (
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Ô trả lời tự luận (preview)"
                    disabled
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
            ) : (
                <Stack spacing={1}>
                    {(q.options || []).map((opt) => (
                        <Button
                            key={opt.key}
                            variant="outlined"
                            disabled
                            sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: 2 }}
                        >
                            <b style={{ marginRight: 10 }}>{opt.key}.</b> {opt.text}
                        </Button>
                    ))}
                </Stack>
            )}
        </Paper>
    );

    return (
        <Box sx={{ display: "flex", height: "100vh", width: "100%", bgcolor: COLORS.bg, overflow: "hidden" }}>
            {/* LEFT: Chat Panel */}
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                <Box sx={{ p: 2, pb: 0 }}>
                    <PracticeHeaderConfig
                        questionCount={questionCount}
                        durationMinutes={durationMinutes}
                        onChangeQuestionCount={(v) => setQuestionCount(Number(v))}
                        onChangeDurationMinutes={(v) => setDurationMinutes(Number(v))}
                        // ✅ timer chỉ hiển thị khi đang làm bài -> nộp xong tự dừng
                        attemptId={mode === MODE.DOING ? attemptId : null}
                        attemptStartTs={mode === MODE.DOING ? attemptStartTs : null}
                        onTimeExpired={() => {
                            // ✅ source-of-truth timer ngoài: hết giờ -> submit từ PracticePlayer
                            playerRef.current?.submit?.({ timedOut: true });
                        }}
                    />
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", px: 2, pb: 14, pt: 2, display: "flex", justifyContent: "center" }}>
                    <Box sx={{ width: "100%", maxWidth: 860 }}>
                        {messages.map((m) => (
                            <ChatBubble key={m.id} role={m.role} text={m.text} />
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                {/* Input fixed bottom */}
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
                        <Tooltip title="Upload file">
                            <IconButton component="label" sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
                                <UploadFileRoundedIcon />
                                <input
                                    hidden
                                    type="file"
                                    accept=".pdf,.docx,.txt"
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
                            placeholder="Paste nội dung học liệu hoặc nhập yêu cầu…"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendText();
                                }
                            }}
                            multiline
                            maxRows={4}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#fff" } }}
                        />

                        <IconButton
                            onClick={handleSendText}
                            disabled={loading || !input.trim()}
                            sx={{
                                borderRadius: 2,
                                bgcolor: input.trim() ? COLORS.orange : "transparent",
                                color: input.trim() ? "#fff" : "action.disabled",
                                "&:hover": { bgcolor: input.trim() ? COLORS.orangeHover : "transparent" },
                                border: input.trim() ? "none" : `1px solid ${COLORS.border}`,
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

            {/* RIGHT: Canvas Panel */}
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
                    {mode === MODE.PREVIEW && (
                        <Box>
                            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5, fontSize: 18 }}>
                                Preview câu hỏi
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                                Đây là bộ câu hỏi mẫu. Nhấn “Bắt đầu làm bài” để tạo attempt và bật đồng hồ.
                            </Typography>

                            <Stack spacing={2}>
                                {normalizedPreview.slice(0, 20).map((q) => (
                                    <PreviewCard key={q.id} q={q} />
                                ))}
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => startAttempt({ retried: false })}
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
                        </Box>
                    )}

                    {mode === MODE.DOING && (
                        <PracticePlayer
                            ref={playerRef}
                            attemptDetail={attemptDetail}
                            attemptId={attemptId}
                            onSubmit={(answersArray, meta) => submitAttempt(answersArray, meta)}
                        />
                    )}

                    {mode === MODE.RESULT && (
                        <PracticeResult
                            result={result}
                            numberOfQuestions={Number(questionCount)}
                            onRetry={() => {
                                setMode(MODE.PREVIEW);
                                setResult(null);
                                setAttemptDetail(null);
                                if (attemptId) localStorage.removeItem(attemptStorageKey(attemptId));
                                setAttemptId(null);
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
