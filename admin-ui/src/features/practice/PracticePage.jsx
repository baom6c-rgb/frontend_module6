// src/features/practice/PracticePage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from "@mui/material";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import AccessTimeFilledRoundedIcon from "@mui/icons-material/AccessTimeFilledRounded";

import { practiceApi } from "../../api/practiceApi";
import { materialApi } from "../../api/materialApi";
import { chatApi } from "../../api/chatApi";
import axiosPrivate from "../../api/axiosPrivate";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import CountdownTimer from "../../components/common/CountdownTimer";

import PracticeReviewDialog from "./components/PracticeReviewDialog";

import PracticeChatPanel from "./components/page/PracticeChatPanel";
import PracticeCanvasPanel from "./components/page/PracticeCanvasPanel";
import PracticeConfirmManager from "./components/page/PracticeConfirmManager";

import {
    ACTIVE_SESSION_KEY,
    ALLOWED_EXT_REGEX,
    ASSISTANT_MODE,
    buildAttemptDetailFromV2,
    COLORS,
    DEFAULT_MINUTES_PER_QUESTION,
    estimateDurationMinutesByRule,
    MAX_SIZE_BYTES,
    MODE,
    RESULT_PERSIST_KEY,
    uid,
    unwrap,
    validateKeywords,
} from "./utils/practicePage.helpers";

export default function PracticePage() {
    const { showToast } = useToast();

    // ===== Focus mode / auto hide sidebar =====
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

    // ===== Loading =====
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // ===== Config =====
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(0);

    // from BE SystemSettings (fallback default)
    const [minutesPerQuestion, setMinutesPerQuestion] = useState(DEFAULT_MINUTES_PER_QUESTION);
    const minutesPerQuestionRef = useRef(DEFAULT_MINUTES_PER_QUESTION);

    // ===== Material / session =====
    const [materialId, setMaterialId] = useState(null);
    const materialIdRef = useRef(null);

    const [mode, setMode] = useState(MODE.IDLE);

    const [sessionToken, setSessionToken] = useState("");
    const sessionTokenRef = useRef("");

    const [startedAtIso, setStartedAtIso] = useState(null);
    const [deadlineIso, setDeadlineIso] = useState(null);

    const [attemptDetail, setAttemptDetail] = useState(null);
    const [attemptQuestionCount, setAttemptQuestionCount] = useState(null);

    // ===== UI =====
    const [isCanvasOpen, setIsCanvasOpen] = useState(true);

    // ===== Result / review =====
    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    // ===== Player ref =====
    const playerRef = useRef(null);

    // ===== Confirm manager =====
    const confirmRef = useRef(null);

    // ===== Assistant tab =====
    const [assistantMode, setAssistantMode] = useState(ASSISTANT_MODE.GENERATE);

    const lockGenerate = mode === MODE.DOING; // DOING => ẩn "Tạo đề" + chặn switch về GENERATE
    const hideStudyWhenGenerate = assistantMode === ASSISTANT_MODE.GENERATE;

    const setAssistantModeSafe = useCallback(
        (next) => {
            if (lockGenerate && next === ASSISTANT_MODE.GENERATE) return;
            setAssistantMode(next);
        },
        [lockGenerate]
    );

    // ===== Chat state =====
    const [messages, setMessages] = useState([
        {
            id: uid("a"),
            role: "assistant",
            text:
                "Gửi học liệu (upload/paste). Sau đó bấm nút Gửi để Fly AI tạo đề. Khi tạo xong bạn có thể “Bắt đầu làm bài”.",
        },
    ]);

    const appendMessage = useCallback((msg) => {
        setMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    // ===== Study chat (keyword-only) =====
    const [studySessionId, setStudySessionId] = useState(null);
    const [studyMessages, setStudyMessages] = useState([
        { id: "intro", role: "assistant", text: "Nhập từ khóa liên quan bài học. Mình chỉ gợi ý khái niệm tổng quát, không đưa đáp án." },
    ]);
    const [studyBooting, setStudyBooting] = useState(false);

    const appendStudyMessage = useCallback((msg) => {
        setStudyMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

    const resetStudyChat = useCallback(() => {
        setStudySessionId(null);
        setStudyBooting(false);
        setStudyMessages([
            { id: "intro", role: "assistant", text: "Nhập từ khóa liên quan bài học. Mình chỉ gợi ý khái niệm tổng quát, không đưa đáp án." },
        ]);
    }, []);

    const messagesToRender = useMemo(() => {
        return assistantMode === ASSISTANT_MODE.GENERATE ? messages : studyMessages;
    }, [assistantMode, messages, studyMessages]);

    // ===== Storage helpers =====
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

    // ===== Fetch settings for minutesPerQuestion =====
    useEffect(() => {
        let mounted = true;

        const pickMpq = (data) => {
            const mpq = data?.minutesPerQuestion ?? data?.minutes_per_question ?? data?.settings?.minutesPerQuestion ?? null;
            const n = Number(mpq);
            return Number.isFinite(n) && n > 0 ? n : null;
        };

        const tryGet = async (url) => {
            try {
                const res = await axiosPrivate.get(url);
                return unwrap(res);
            } catch {
                return null;
            }
        };

        (async () => {
            const urls = ["/api/admin/settings", "/api/settings", "/api/system-settings", "/api/public/settings"];
            for (const url of urls) {
                const d = await tryGet(url);
                if (!mounted || !d) continue;
                const v = pickMpq(d);
                if (v != null) {
                    minutesPerQuestionRef.current = v;
                    setMinutesPerQuestion(v);
                    return;
                }
            }
            minutesPerQuestionRef.current = DEFAULT_MINUTES_PER_QUESTION;
            setMinutesPerQuestion(DEFAULT_MINUTES_PER_QUESTION);
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // ===== Auto-fill duration in READY-TO-GENERATE state =====
    useEffect(() => {
        const mat = materialIdRef.current ?? materialId;
        const shouldEstimate =
            mode === MODE.IDLE &&
            Boolean(mat) &&
            !sessionTokenRef.current &&
            !sessionToken &&
            !attemptDetail &&
            !result;

        if (!shouldEstimate) return;

        const est = estimateDurationMinutesByRule(questionCount, minutesPerQuestionRef.current);
        if (est > 0 && est !== Number(durationMinutes)) setDurationMinutes(est);
    }, [attemptDetail, durationMinutes, materialId, mode, questionCount, result, sessionToken]);

    // ===== Reset practice state =====
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
            setAttemptQuestionCount(null);

            setResult(null);
            setReviewOpen(false);
            setReviewData(null);

            setMode(MODE.IDLE);
            setDurationMinutes(0);
            setIsCanvasOpen(true);

            setAssistantMode(ASSISTANT_MODE.GENERATE);
            resetStudyChat(); // ✅ chỉ reset khi đổi học liệu

            if (opts?.keepMessages) {
                appendMessage({ role: "assistant", text: "Ok! Upload/paste học liệu mới rồi bấm Gửi để tạo đề nhé." });
            } else {
                setMessages([{ id: uid("a"), role: "assistant", text: "Ok! Gửi học liệu mới để bắt đầu." }]);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat]
    );

    // ===== Extracted text polling =====
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

    // ===== Upload file =====
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
                appendMessage({ role: "assistant", text: "Sai định dạng. Chỉ hỗ trợ PDF/DOCX/TXT/XLSX. Hãy chọn lại file." });
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

                resetStudyChat();

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
                const serverMsg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Upload failed";
                showToast(`Upload học liệu thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không upload/đọc được file. Kiểm tra định dạng/size nhé." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat, showToast]
    );

    // ===== Paste text => create material =====
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

                resetStudyChat();

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
                const serverMsg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Create material failed";
                showToast(`Gửi học liệu thất bại${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
                appendMessage({ role: "assistant", text: "Không tạo được học liệu từ text này. Thử lại nhé." });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearActiveSession, clearPersistedResult, resetStudyChat, showToast]
    );

    // ===== Boot study chat when switching to STUDY =====
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

    // ===== Ask study =====
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

    // ===== Generate session =====
    const generateSessionV2 = useCallback(async () => {
        const matId = materialIdRef.current ?? materialId;

        if (!matId) {
            showToast("Chưa có học liệu. Hãy upload/paste trước.", "warning");
            return { ok: false };
        }

        const n = Number(questionCount);
        if (!Number.isFinite(n) || n < 1) {
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
            const serverMsg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Generate failed";
            showToast(`Không tạo được đề${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
            appendMessage({ role: "assistant", text: "Lỗi tạo đề (AI/Server). Thử gửi lại hoặc đổi học liệu." });
            return { ok: false };
        } finally {
            setLoading(false);
        }
    }, [appendMessage, clearPersistedResult, materialId, questionCount, saveActiveSession, showToast]);

    // ===== Start session =====
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

            // ✅ auto switch sang STUDY (DOING ẩn Tạo đề)
            setAssistantModeSafe(ASSISTANT_MODE.STUDY);

            saveActiveSession({
                mode: MODE.DOING,
                sessionToken: token,
                attemptId: token,
                materialId: materialIdRef.current ?? materialId,
                questionCount: Number(questionCount),
                durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(durationMinutes),
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
            const msg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Start failed";
            showToast(`Không bắt đầu được${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
            appendMessage({ role: "assistant", text: "Không start được. Session có thể đã hết hạn, hãy bấm Gửi để tạo lại đề." });
        } finally {
            setLoading(false);
        }
    }, [appendMessage, durationMinutes, materialId, questionCount, saveActiveSession, sessionToken, showToast, setAssistantModeSafe]);

    // ===== Submit session =====
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

                appendMessage({ role: "assistant", text: `Đã nộp bài. Kết quả: ${data?.status || "—"} (${data?.score ?? "?"}%).` });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const serverMsg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Submit failed";
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

    // ===== Review =====
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
            const serverMsg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Review failed";
            showToast(`Không tải được review${status ? ` (${status})` : ""}: ${String(serverMsg)}`, "error");
        }
    }, [result?.attemptId, showToast]);

    // ===== Retest =====
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

                setAssistantModeSafe(ASSISTANT_MODE.STUDY);

                saveActiveSession({
                    mode: MODE.DOING,
                    sessionToken: token,
                    attemptId: token,
                    materialId: materialIdRef.current ?? materialId ?? null,
                    questionCount: Number(questionCount),
                    durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(durationMinutes),
                    startedAtIso: startedAt,
                    deadlineIso: deadline,
                });

                appendMessage({ role: "assistant", text: "Ok! Mình đã tạo bài thi lại tập trung phần sai. Bắt đầu làm nhé." });
            } catch (e) {
                console.error(e);
                const status = e?.response?.status;
                const msg = e?.response?.data?.message || e?.response?.data?.error || e?.response?.data || e?.message || "Retest failed";
                showToast(`Không tạo được bài thi lại${status ? ` (${status})` : ""}: ${String(msg)}`, "error");
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearPersistedResult, durationMinutes, materialId, questionCount, saveActiveSession, showToast, setAssistantModeSafe]
    );

    // ===== Resume session / result from storage =====
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

                if (Number.isFinite(Number(data?.durationMinutes))) setDurationMinutes(Number(data.durationMinutes));

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
                        durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(sess?.durationMinutes || 0),
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
                        durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(sess?.durationMinutes || 0),
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

    // ===== Timer start ts =====
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

    const doingAttemptId = useMemo(() => {
        const t = sessionTokenRef.current || sessionToken;
        return t || null;
    }, [sessionToken]);

    const durationLabel = useMemo(() => {
        if (Number(durationMinutes) > 0) return durationMinutes;
        if (mode === MODE.IDLE) return 0;
        return durationMinutes;
    }, [durationMinutes, mode]);

    const materialPresent = Boolean(materialIdRef.current ?? materialId);

    const isSplit = Boolean(materialId || sessionToken || attemptDetail || result);

    const leftWidth = isCanvasOpen && isSplit ? "30%" : "100%";
    const rightWidth = isCanvasOpen && isSplit ? "70%" : "0%";

    const allowUpload = assistantMode === ASSISTANT_MODE.GENERATE && mode !== MODE.DOING;

    const showFloatingTimer = mode === MODE.DOING && Boolean(attemptStartTs) && Number(durationMinutes) > 0;

    const resultQuestionCount = useMemo(() => {
        if (typeof attemptQuestionCount === "number") return attemptQuestionCount;
        if (Array.isArray(attemptDetail?.questions)) return attemptDetail.questions.length;
        return Number(questionCount);
    }, [attemptDetail?.questions, attemptQuestionCount, questionCount]);

    // ===== Canvas actions (with confirm rules) =====
    const handleRequestReset = useCallback(() => {
        // requirement: after created (READY/DOING/RESULT), reset needs confirm
        if (mode !== MODE.IDLE) {
            confirmRef.current?.requestReset?.();
            return;
        }
        resetPracticeState({ keepMessages: true });
    }, [mode, resetPracticeState]);

    const handleRequestStart = useCallback(() => {
        // only READY has start; confirm required
        confirmRef.current?.requestStart?.();
    }, []);

    const handlePlayerSubmit = useCallback(
        (answersArray, meta) => {
            // requirement: confirm submit for manual submit; timedOut auto submit
            confirmRef.current?.requestSubmit?.(answersArray, meta);
        },
        []
    );

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
                <PracticeChatPanel
                    width={leftWidth}
                    minWidth={isCanvasOpen && isSplit ? 320 : 360}
                    mode={mode}
                    assistantMode={assistantMode}
                    lockGenerate={lockGenerate}
                    hideStudyWhenGenerate={hideStudyWhenGenerate}
                    messagesToRender={messagesToRender}
                    loading={loading}
                    studyBooting={studyBooting}
                    materialPresent={materialPresent}
                    questionCount={questionCount}
                    durationLabel={durationLabel}
                    doingAttemptId={doingAttemptId}
                    onSetAssistantModeSafe={setAssistantModeSafe}
                    allowUpload={allowUpload}
                    onUploadFile={handleUploadFile}
                    onSendText={assistantMode === ASSISTANT_MODE.GENERATE ? handleSendText : handleAskStudy}
                    disabledComposer={
                        loading || (assistantMode === ASSISTANT_MODE.STUDY && !materialPresent)
                    }
                    helperText={
                        assistantMode === ASSISTANT_MODE.GENERATE
                            ? "Upload file xong bấm Gửi để Fly AI tạo đề."
                            : "Chỉ nhập từ khóa (2–8 từ), không nhập câu hỏi dài."
                    }
                />

                {isSplit && (
                    <PracticeCanvasPanel
                        open={isCanvasOpen}
                        width={rightWidth}
                        minWidth={isCanvasOpen ? 420 : 0}
                        mode={mode}
                        loading={loading}
                        materialPresent={materialPresent}
                        questionCount={questionCount}
                        durationMinutes={durationMinutes}
                        minutesPerQuestion={minutesPerQuestion}
                        resultQuestionCount={resultQuestionCount}
                        attemptDetail={attemptDetail}
                        doingAttemptId={doingAttemptId}
                        attemptStartTs={attemptStartTs}
                        result={result}
                        onGenerate={generateSessionV2}
                        onChangeQuestionCount={(v) => setQuestionCount(Number(v))}
                        onRequestStart={handleRequestStart}
                        onRequestReset={handleRequestReset}
                        onSubmit={handlePlayerSubmit}
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
                        playerRef={playerRef}
                    />
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

            <PracticeConfirmManager
                ref={confirmRef}
                onStart={startSessionV2}
                onReset={() => resetPracticeState({ keepMessages: true })}
                onSubmit={submitSessionV2}
            />

            <PracticeReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewData} />
            <GlobalLoading open={loading} message={loadingMessage} />
        </Box>
    );
}
