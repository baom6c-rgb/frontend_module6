import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction, IconButton, Paper, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import AccessTimeFilledRoundedIcon from "@mui/icons-material/AccessTimeFilledRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";

import { practiceApi } from "../../api/practiceApi";
import { materialApi } from "../../api/materialApi";
import { chatApi } from "../../api/chatApi";
import axiosPrivate from "../../api/axiosPrivate";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import CountdownTimer from "../../components/common/CountdownTimer";

import PracticeReviewDialog from "./components/PracticeReviewDialog";
import TopicSelectDialog from "./components/TopicSelectDialog";

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

const toPositiveIntOrNull = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

const extractApiMessage = (e, fallback = "Đã xảy ra lỗi.") => {
    const data = e?.response?.data;

    if (typeof data === "string" && data.trim()) return data.trim();
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
    if (typeof e?.message === "string" && e.message.trim()) return e.message.trim();

    return fallback;
};

const buildAssistantErrorText = (prefix, e, fallback) => {
    const msg = extractApiMessage(e, fallback);
    return prefix ? `${prefix} ${msg}` : msg;
};

export default function PracticePage() {
    const { showToast } = useToast();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));

    const [mobileTab, setMobileTab] = useState(0);

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

    const [topicDialogOpen, setTopicDialogOpen] = useState(false);
    const [topicOptions, setTopicOptions] = useState([]);
    const [selectionToken, setSelectionToken] = useState("");
    const [topicLoading, setTopicLoading] = useState(false);

    const [questionCount, setQuestionCount] = useState(null);
    const [durationMinutes, setDurationMinutes] = useState(0);

    const [minutesPerQuestion, setMinutesPerQuestion] = useState(DEFAULT_MINUTES_PER_QUESTION);
    const minutesPerQuestionRef = useRef(DEFAULT_MINUTES_PER_QUESTION);

    const [materialId, setMaterialId] = useState(null);
    const materialIdRef = useRef(null);

    const [mode, setMode] = useState(MODE.IDLE);

    const [sessionToken, setSessionToken] = useState("");
    const sessionTokenRef = useRef("");

    const [startedAtIso, setStartedAtIso] = useState(null);
    const [deadlineIso, setDeadlineIso] = useState(null);

    const [attemptDetail, setAttemptDetail] = useState(null);
    const [attemptQuestionCount, setAttemptQuestionCount] = useState(null);

    const [isCanvasOpen, setIsCanvasOpen] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(true);

    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    const playerRef = useRef(null);
    const confirmRef = useRef(null);

    const [assistantMode, setAssistantMode] = useState(ASSISTANT_MODE.GENERATE);

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
            text: "Gửi học liệu (upload/paste). Sau đó bấm nút Gửi để Fly AI tạo đề. Khi tạo xong bạn có thể “Bắt đầu làm bài”.",
        },
    ]);

    const appendMessage = useCallback((msg) => {
        setMessages((prev) => [...prev, { id: uid(msg.role?.[0] || "m"), ...msg }]);
    }, []);

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
        setStudyMessages([{ id: "intro", role: "assistant", text: "Nhập từ khóa liên quan bài học. Mình chỉ gợi ý khái niệm tổng quát, không đưa đáp án." }]);
    }, []);

    const messagesToRender = useMemo(() => {
        return assistantMode === ASSISTANT_MODE.GENERATE ? messages : studyMessages;
    }, [assistantMode, messages, studyMessages]);

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

    useEffect(() => {
        const mat = materialIdRef.current ?? materialId;
        const safeCount = toPositiveIntOrNull(questionCount);

        const shouldEstimate =
            mode === MODE.IDLE &&
            Boolean(mat) &&
            !sessionTokenRef.current &&
            !sessionToken &&
            !attemptDetail &&
            !result &&
            safeCount != null;

        if (!shouldEstimate) return;

        const est = estimateDurationMinutesByRule(safeCount, minutesPerQuestionRef.current);
        if (est > 0 && est !== Number(durationMinutes)) setDurationMinutes(est);
    }, [attemptDetail, durationMinutes, materialId, mode, questionCount, result, sessionToken]);

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
            setQuestionCount(null);

            setIsCanvasOpen(true);
            setIsChatOpen(true);

            setAssistantMode(ASSISTANT_MODE.GENERATE);
            resetStudyChat();

            if (opts?.keepMessages) {
                appendMessage({ role: "assistant", text: "Ok! Upload/paste học liệu mới rồi bấm Gửi để tạo đề nhé." });
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
                setQuestionCount(null);

                clearActiveSession();
                resetStudyChat();

                setIsChatOpen(true);
                setIsCanvasOpen(true);

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
                appendMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa upload/đọc được file này.",
                        e,
                        "Kiểm tra lại định dạng hoặc dung lượng file nhé."
                    ),
                });
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
                setQuestionCount(null);

                clearActiveSession();
                resetStudyChat();

                setIsChatOpen(true);
                setIsCanvasOpen(true);

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
                appendMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa tạo được học liệu từ nội dung này.",
                        e,
                        "Bạn thử chỉnh lại nội dung rồi gửi lại nhé."
                    ),
                });
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
                showToast(`Không mở được chat: ${extractApiMessage(e, "Start chat failed")}`, "error");
            } finally {
                setStudyBooting(false);
            }
        };

        boot();
    }, [assistantMode, materialId, studySessionId, showToast]);

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
                appendStudyMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa trả lời được cho từ khóa này.",
                        e,
                        "Hãy thử từ khóa khác xuất hiện trong bài học."
                    ),
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

        clearPersistedResult();

        setLoading(true);
        setLoadingMessage("Fly AI đang tạo đề…");
        appendMessage({ role: "assistant", text: "Fly AI đang tạo đề…" });

        const dummyCount = 10;

        try {
            const data = await practiceApi.generateSessionV2({
                materialId: matId,
                numberOfQuestions: dummyCount,
            });

            if (data?.status === "NEED_TOPIC") {
                setSelectionToken(data?.selectionToken || "");
                setTopicOptions(Array.isArray(data?.topics) ? data.topics : []);
                setTopicDialogOpen(true);

                setMode(MODE.IDLE);
                setIsCanvasOpen(true);
                setIsChatOpen(true);

                appendMessage({
                    role: "assistant",
                    text: "Mình thấy học liệu có nhiều phần. Hãy chọn 1 phần (trong popup) để Fly AI tạo đề tập trung đúng nội dung đó nhé!",
                });

                return { ok: false, needTopic: true };
            }

            const token = data?.sessionToken;
            const dur = Number(data?.durationMinutes);
            const beCount = Number(data?.numberOfQuestions);

            if (!token) throw new Error("Missing sessionToken from server");
            if (!Number.isFinite(dur) || dur <= 0) throw new Error("Missing durationMinutes from server");
            if (!Number.isFinite(beCount) || beCount <= 0) throw new Error("Missing numberOfQuestions from server");

            setSessionToken(token);
            sessionTokenRef.current = token;

            setQuestionCount(beCount);
            setDurationMinutes(dur);

            setStartedAtIso(null);
            setDeadlineIso(null);

            setMode(MODE.READY);
            setIsCanvasOpen(true);
            setIsChatOpen(true);

            saveActiveSession({
                mode: MODE.READY,
                sessionToken: token,
                attemptId: token,
                materialId: matId,
                questionCount: beCount,
                durationMinutes: dur,
                startedAtIso: null,
                deadlineIso: null,
            });

            appendMessage({
                role: "assistant",
                text: `Đã tạo đề xong. Số câu: ${beCount}. Thời gian làm bài: ${dur} phút. Bắt đầu làm bài ngay!`,
            });

            return { ok: true, token, durationMinutes: dur };
        } catch (e) {
            console.error(e);
            appendMessage({
                role: "assistant",
                text: buildAssistantErrorText(
                    "Mình chưa tạo được đề.",
                    e,
                    "Bạn thử gửi lại hoặc đổi học liệu nhé."
                ),
            });
            return { ok: false };
        } finally {
            setLoading(false);
        }
    }, [appendMessage, clearPersistedResult, materialId, saveActiveSession, showToast]);

    const handleConfirmTopic = useCallback(
        async (topicIds) => {
            const matId = materialIdRef.current ?? materialId;
            if (!matId) {
                showToast("Chưa có học liệu. Hãy upload/paste trước.", "warning");
                return;
            }
            if (!selectionToken) {
                showToast("Thiếu selectionToken. Vui lòng bấm tạo đề lại.", "warning");
                return;
            }
            if (!Array.isArray(topicIds) || topicIds.length === 0) {
                showToast("Bạn phải chọn ít nhất 1 phần.", "warning");
                return;
            }

            setTopicLoading(true);
            setLoading(true);
            setLoadingMessage("Fly AI đang tạo đề theo phần bạn chọn…");

            try {
                const data = await practiceApi.selectTopicV2({
                    selectionToken,
                    topicIds,
                });

                const token = data?.sessionToken;
                const dur = Number(data?.durationMinutes);
                const beCount = Number(data?.numberOfQuestions);

                if (!token) throw new Error("Missing sessionToken from server");
                if (!Number.isFinite(dur) || dur <= 0) throw new Error("Missing durationMinutes from server");
                if (!Number.isFinite(beCount) || beCount <= 0) throw new Error("Missing numberOfQuestions from server");

                setTopicDialogOpen(false);
                setTopicOptions([]);
                setSelectionToken("");

                setSessionToken(token);
                sessionTokenRef.current = token;

                setQuestionCount(beCount);
                setDurationMinutes(dur);
                setStartedAtIso(null);
                setDeadlineIso(null);

                setMode(MODE.READY);
                setIsCanvasOpen(true);
                setIsChatOpen(true);

                saveActiveSession({
                    mode: MODE.READY,
                    sessionToken: token,
                    attemptId: token,
                    materialId: matId,
                    questionCount: beCount,
                    durationMinutes: dur,
                    startedAtIso: null,
                    deadlineIso: null,
                });

                appendMessage({
                    role: "assistant",
                    text: `Đã tạo đề theo phần bạn chọn. Số câu: ${beCount}. Thời gian: ${dur} phút. Bắt đầu làm bài nhé!`,
                });
            } catch (e) {
                console.error(e);
                appendMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa tạo được đề theo phần bạn chọn.",
                        e,
                        "Bạn thử chọn lại hoặc bấm tạo đề lại nhé."
                    ),
                });
            } finally {
                setTopicLoading(false);
                setLoading(false);
            }
        },
        [appendMessage, materialId, saveActiveSession, selectionToken, showToast]
    );

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
            if (qLen != null) {
                setAttemptQuestionCount(qLen);
                setQuestionCount((prev) => (toPositiveIntOrNull(prev) != null ? prev : qLen));
            }

            const startedAt = data?.startedAt || null;
            const deadline = data?.deadline || null;

            setStartedAtIso(startedAt);
            setDeadlineIso(deadline);

            setMode(MODE.DOING);
            setIsChatOpen(false);
            setIsCanvasOpen(true);

            setAssistantModeSafe(ASSISTANT_MODE.STUDY);

            const safeCount = toPositiveIntOrNull(questionCount) ?? (qLen != null ? qLen : 0);

            saveActiveSession({
                mode: MODE.DOING,
                sessionToken: token,
                attemptId: token,
                materialId: materialIdRef.current ?? materialId,
                questionCount: safeCount,
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
            appendMessage({
                role: "assistant",
                text: buildAssistantErrorText(
                    "Mình chưa bắt đầu được bài làm này.",
                    e,
                    "Session có thể đã hết hạn, bạn hãy bấm Gửi để tạo lại đề nhé."
                ),
            });
            setIsChatOpen(true);
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

                setIsChatOpen(true);
                setIsCanvasOpen(true);

                const frozenCount =
                    (typeof attemptQuestionCount === "number" ? attemptQuestionCount : null) ??
                    (Array.isArray(attemptDetail?.questions) ? attemptDetail.questions.length : null) ??
                    (toPositiveIntOrNull(questionCount) ?? 0);

                savePersistedResult({
                    materialId: materialIdRef.current ?? materialId ?? null,
                    questionCount: toPositiveIntOrNull(questionCount) ?? frozenCount,
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
                appendMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa nộp bài được.",
                        e,
                        "Bạn thử lại nhé."
                    ),
                });
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, attemptDetail, attemptQuestionCount, durationMinutes, materialId, questionCount, saveActiveSession, savePersistedResult, sessionToken]
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
            appendMessage({
                role: "assistant",
                text: buildAssistantErrorText(
                    "Mình chưa tải được phần review.",
                    e,
                    "Bạn thử mở lại nhé."
                ),
            });
        }
    }, [result?.attemptId, showToast, appendMessage]);

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
                if (qLen != null) {
                    setAttemptQuestionCount(qLen);
                    setQuestionCount(qLen);
                }

                const startedAt = data?.startedAt || null;
                const deadline = data?.deadline || null;
                setStartedAtIso(startedAt);
                setDeadlineIso(deadline);

                setMode(MODE.DOING);
                setIsChatOpen(false);
                setIsCanvasOpen(true);

                setAssistantModeSafe(ASSISTANT_MODE.STUDY);

                saveActiveSession({
                    mode: MODE.DOING,
                    sessionToken: token,
                    attemptId: token,
                    materialId: materialIdRef.current ?? materialId ?? null,
                    questionCount: qLen != null ? qLen : toPositiveIntOrNull(questionCount) ?? 0,
                    durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(durationMinutes),
                    startedAtIso: startedAt,
                    deadlineIso: deadline,
                });

                appendMessage({ role: "assistant", text: "Ok! Mình đã tạo bài thi lại tập trung phần sai. Bắt đầu làm nhé." });
            } catch (e) {
                console.error(e);
                appendMessage({
                    role: "assistant",
                    text: buildAssistantErrorText(
                        "Mình chưa tạo được bài thi lại.",
                        e,
                        "Bạn thử lại sau nhé."
                    ),
                });
                setIsChatOpen(true);
            } finally {
                setLoading(false);
            }
        },
        [appendMessage, clearPersistedResult, durationMinutes, materialId, questionCount, saveActiveSession, setAssistantModeSafe]
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
                        setIsChatOpen(true);
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

                const beCount = toPositiveIntOrNull(data?.numberOfQuestions ?? data?.questionCount ?? data?.totalQuestions);
                if (beCount != null) setQuestionCount(beCount);

                const startedAt = data?.startedAt || null;
                const deadline = data?.deadline || null;
                setStartedAtIso(startedAt);
                setDeadlineIso(deadline);

                if (startedAt) {
                    const detail = buildAttemptDetailFromV2(data, token);

                    if (!cancelled) {
                        setAttemptDetail(detail);

                        const qLen = Array.isArray(detail?.questions) ? detail.questions.length : null;
                        if (qLen != null) {
                            setAttemptQuestionCount(qLen);
                            setQuestionCount(qLen);
                        }

                        setMode(MODE.DOING);
                        setIsChatOpen(false);
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
                        questionCount: typeof sess?.questionCount === "number" ? sess.questionCount : 0,
                        durationMinutes: Number.isFinite(Number(data?.durationMinutes)) ? Number(data.durationMinutes) : Number(sess?.durationMinutes || 0),
                        startedAtIso: startedAt,
                        deadlineIso: deadline,
                    });
                } else {
                    if (!cancelled) {
                        setMode(MODE.READY);
                        setIsCanvasOpen(true);
                        setIsChatOpen(true);
                    }

                    saveActiveSession({
                        mode: MODE.READY,
                        sessionToken: token,
                        attemptId: token,
                        materialId: sess?.materialId ?? null,
                        questionCount: typeof sess?.questionCount === "number" ? sess.questionCount : 0,
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
    }, [appendMessage, saveActiveSession, setAssistantModeSafe]);

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
    const isDoing = mode === MODE.DOING;

    const effectiveCanvasOpen = useMemo(() => {
        if (!isSplit) return false;
        if (isDoing) return true;
        return isCanvasOpen;
    }, [isCanvasOpen, isDoing, isSplit]);

    const isChatVisible = useMemo(() => {
        if (!isSplit) return true;
        if (!effectiveCanvasOpen) return true;
        if (isDoing) return isChatOpen;
        return true;
    }, [effectiveCanvasOpen, isChatOpen, isDoing, isSplit]);

    const allowUpload = assistantMode === ASSISTANT_MODE.GENERATE && mode !== MODE.DOING;
    const showFloatingTimer = mode === MODE.DOING && Boolean(attemptStartTs) && Number(durationMinutes) > 0;

    const resultQuestionCount = useMemo(() => {
        if (typeof attemptQuestionCount === "number") return attemptQuestionCount;
        if (Array.isArray(attemptDetail?.questions)) return attemptDetail.questions.length;
        return toPositiveIntOrNull(questionCount) ?? 0;
    }, [attemptDetail?.questions, attemptQuestionCount, questionCount]);

    const handleRequestReset = useCallback(() => {
        if (mode !== MODE.IDLE) {
            confirmRef.current?.requestReset?.();
            return;
        }
        resetPracticeState({ keepMessages: true });
    }, [mode, resetPracticeState]);

    const handleRequestStart = useCallback(() => {
        confirmRef.current?.requestStart?.();
    }, []);

    const handlePlayerSubmit = useCallback((answersArray, meta) => {
        return confirmRef.current?.requestSubmit?.(answersArray, meta) ?? false;
    }, []);

    const leftWidth = useMemo(() => {
        if (isMobile) return "100%";
        if (!isSplit) return "100%";
        if (!effectiveCanvasOpen) return "100%";
        if (isDoing) return isChatOpen ? (isTablet ? "40%" : "30%") : "0%";
        return isTablet ? "40%" : "30%";
    }, [effectiveCanvasOpen, isChatOpen, isDoing, isMobile, isSplit, isTablet]);

    const rightWidth = useMemo(() => {
        if (isMobile) return "100%";
        if (!isSplit) return "0%";
        if (!effectiveCanvasOpen) return "0%";
        if (isDoing) return isChatOpen ? (isTablet ? "60%" : "70%") : "100%";
        return isTablet ? "60%" : "70%";
    }, [effectiveCanvasOpen, isChatOpen, isDoing, isMobile, isSplit, isTablet]);

    const handleRightArrowClick = useCallback(() => {
        if (!isSplit) return;
        if (isDoing) {
            setIsChatOpen((v) => !v);
            return;
        }
        setIsCanvasOpen((v) => !v);
    }, [isDoing, isSplit]);

    const rightArrowTooltip = useMemo(() => {
        if (!isSplit) return "";
        if (isDoing) return isChatOpen ? "Ẩn chat" : "Mở chat";
        return isCanvasOpen ? "Đóng canvas" : "Mở canvas";
    }, [isCanvasOpen, isChatOpen, isDoing, isSplit]);

    const RightArrowIcon = useMemo(() => {
        if (!isSplit) return ChevronRightRoundedIcon;
        if (isDoing) return isChatOpen ? ChevronLeftRoundedIcon : ChevronRightRoundedIcon;
        return isCanvasOpen ? ChevronRightRoundedIcon : ChevronLeftRoundedIcon;
    }, [isCanvasOpen, isChatOpen, isDoing, isSplit]);

    useEffect(() => {
        if (isMobile && isSplit) setMobileTab(1);
    }, [isMobile, isSplit]);

    useEffect(() => {
        if (isMobile && (mode === MODE.DOING || mode === MODE.RESULT)) setMobileTab(1);
    }, [isMobile, mode]);

    const sharedCanvasProps = {
        mode,
        loading,
        materialPresent,
        questionCount,
        durationMinutes,
        minutesPerQuestion,
        resultQuestionCount,
        attemptDetail,
        doingAttemptId,
        attemptStartTs,
        result,
        onGenerate: generateSessionV2,
        onRequestStart: handleRequestStart,
        onRequestReset: handleRequestReset,
        onSubmit: handlePlayerSubmit,
        onRetry: async () => {
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
            setQuestionCount(null);
            clearActiveSession();
            clearPersistedResult();
            setIsChatOpen(true);
            setIsCanvasOpen(true);
            if (isMobile) setMobileTab(0);
            appendMessage({ role: "assistant", text: "Ok! Bạn có thể bấm “Tạo đề ngay” để làm lại." });
        },
        onNewMaterial: () => {
            resetPracticeState({ keepMessages: true });
            if (isMobile) setMobileTab(0);
        },
        onViewReview: openReview,
        playerRef,
    };

    const sharedChatProps = {
        mode,
        assistantMode,
        lockGenerate,
        hideStudyWhenGenerate,
        messagesToRender,
        loading,
        studyBooting,
        materialPresent,
        questionCount,
        durationLabel,
        doingAttemptId,
        onSetAssistantModeSafe: setAssistantModeSafe,
        allowUpload,
        onUploadFile: handleUploadFile,
        onSendText: assistantMode === ASSISTANT_MODE.GENERATE ? handleSendText : handleAskStudy,
        disabledComposer: loading || (assistantMode === ASSISTANT_MODE.STUDY && !materialPresent),
        helperText:
            assistantMode === ASSISTANT_MODE.GENERATE
                ? "Upload file xong bấm Gửi để Fly AI tạo đề."
                : "Chỉ nhập từ khóa (2–8 từ), không nhập câu hỏi dài.",
    };

    const sharedDialogs = (
        <>
            <PracticeConfirmManager
                ref={confirmRef}
                onStart={startSessionV2}
                onReset={() => resetPracticeState({ keepMessages: true })}
                onSubmit={submitSessionV2}
            />
            <PracticeReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewData} />
            <TopicSelectDialog
                open={topicDialogOpen}
                topics={topicOptions}
                loading={topicLoading}
                onClose={() => { if (topicLoading) return; setTopicDialogOpen(false); }}
                onConfirm={handleConfirmTopic}
            />
            <GlobalLoading open={loading} message={loadingMessage} />
        </>
    );

    if (isMobile) {
        return (
            <Box sx={{ height: "calc(100vh - var(--app-header-height, 72px))", width: "100%", bgcolor: COLORS.bg, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                {showFloatingTimer && (
                    <Paper elevation={0} sx={{ position: "fixed", top: "calc(var(--app-header-height, 72px) + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 120, borderRadius: 3, px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 0.75, bgcolor: "#fff", border: "1px solid #ffcdd2", boxShadow: "0 4px 20px rgba(211,47,47,0.18)", userSelect: "none" }}>
                        <AccessTimeFilledRoundedIcon sx={{ color: "#d32f2f", fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: "#d32f2f", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                            <CountdownTimer startTimestamp={attemptStartTs} durationSeconds={Number(durationMinutes) * 60} onExpire={() => playerRef.current?.submit?.({ timedOut: true })} />
                        </Typography>
                    </Paper>
                )}

                <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", p: 1.25 }}>
                    {mobileTab === 0 && (
                        <PracticeChatPanel {...sharedChatProps} width="100%" minWidth={0} />
                    )}
                    {mobileTab === 1 && isSplit && (
                        <PracticeCanvasPanel {...sharedCanvasProps} open width="100%" minWidth={0} />
                    )}
                    {mobileTab === 1 && !isSplit && (
                        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, p: 3 }}>
                            <AssignmentRoundedIcon sx={{ fontSize: 56, color: "#CBD5E1" }} />
                            <Typography sx={{ textAlign: "center", color: "#6C757D", fontSize: 14, lineHeight: 1.6 }}>
                                {"Hãy upload học liệu và bấm "}<b>{"Gửi"}</b>{" ở tab "}<b>{"Chat AI"}</b>{" để Fly AI tạo đề trước nhé."}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <BottomNavigation
                    value={mobileTab}
                    onChange={(_, v) => setMobileTab(v)}
                    sx={{ borderTop: "1px solid #E3E8EF", bgcolor: "#fff", flexShrink: 0, height: 58, "& .MuiBottomNavigationAction-root": { minWidth: 0, py: 0.5 } }}
                >
                    <BottomNavigationAction
                        label="Chat AI"
                        icon={<ChatRoundedIcon />}
                        sx={{ "&.Mui-selected": { color: "#EC5E32" }, "&.Mui-selected .MuiBottomNavigationAction-label": { fontWeight: 700 } }}
                    />
                    <BottomNavigationAction
                        label={mode === MODE.DOING ? "Đang làm" : mode === MODE.RESULT ? "Kết quả" : "Canvas"}
                        icon={
                            <Box sx={{ position: "relative", display: "inline-flex" }}>
                                <AssignmentRoundedIcon />
                                {(mode === MODE.DOING || mode === MODE.RESULT) && (
                                    <Box sx={{ position: "absolute", top: -1, right: -3, width: 8, height: 8, borderRadius: "50%", bgcolor: mode === MODE.DOING ? "#EC5E32" : "#10B981", border: "1.5px solid #fff" }} />
                                )}
                            </Box>
                        }
                        sx={{ "&.Mui-selected": { color: "#EC5E32" }, "&.Mui-selected .MuiBottomNavigationAction-label": { fontWeight: 700 } }}
                    />
                </BottomNavigation>

                {sharedDialogs}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                height: "calc(100vh - var(--app-header-height, 72px))",
                width: "100%",
                bgcolor: COLORS.bg,
                p: { md: 1.5, lg: 2 },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {showFloatingTimer && (
                <Paper elevation={0} sx={{ position: "fixed", top: "calc(var(--app-header-height, 72px) + 8px)", right: 18, zIndex: 120, borderRadius: 3, px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, bgcolor: "#fff", border: "1px solid #ffcdd2", boxShadow: "0 10px 30px rgba(211,47,47,0.12)", userSelect: "none" }}>
                    <AccessTimeFilledRoundedIcon sx={{ color: "#d32f2f" }} fontSize="small" />
                    <Typography sx={{ fontWeight: 900, fontSize: 15, color: "#d32f2f", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                        <CountdownTimer startTimestamp={attemptStartTs} durationSeconds={Number(durationMinutes) * 60} onExpire={() => playerRef.current?.submit?.({ timedOut: true })} />
                    </Typography>
                </Paper>
            )}

            <Box
                sx={{
                    display: "flex",
                    flex: 1,
                    gap: isDoing && isSplit && effectiveCanvasOpen && !isChatOpen ? 0 : 2,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        width: leftWidth,
                        minWidth: !isSplit || !effectiveCanvasOpen ? 360 : 0,
                        overflow: "hidden",
                        flexShrink: 0,
                        transition: "width 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                >
                    <Box
                        sx={{
                            height: "100%",
                            opacity: isChatVisible ? 1 : 0,
                            transform: isChatVisible ? "translateX(0px)" : "translateX(-14px)",
                            transition: "opacity 160ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                            pointerEvents: isChatVisible ? "auto" : "none",
                        }}
                    >
                        <PracticeChatPanel
                            {...sharedChatProps}
                            width="100%"
                            minWidth={0}
                        />
                    </Box>
                </Box>

                {isSplit && effectiveCanvasOpen && (
                    <Box
                        sx={{
                            width: rightWidth,
                            minWidth: 0,
                            overflow: "hidden",
                            transition: "width 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                        }}
                    >
                        <PracticeCanvasPanel
                            {...sharedCanvasProps}
                            open
                            width="100%"
                            minWidth={isTablet ? 300 : 420}
                        />
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
                        zIndex: 200,
                        display: { xs: "none", md: "block" },
                    }}
                >
                    <Tooltip title={rightArrowTooltip}>
                        <IconButton
                            onClick={handleRightArrowClick}
                            sx={{
                                borderRadius: 3,
                                bgcolor: "#EC5E32",
                                color: "#fff",
                                border: "1px solid #EC5E32",
                                boxShadow: "0 10px 30px rgba(236,94,50,0.35)",
                                transition: "all 0.2s ease",
                                width: { md: 34, lg: 40 },
                                height: { md: 34, lg: 40 },
                                "&:hover": {
                                    bgcolor: "#d94f28",
                                    borderColor: "#d94f28",
                                    boxShadow: "0 12px 34px rgba(236,94,50,0.45)",
                                },
                            }}
                        >
                            <RightArrowIcon sx={{ color: "#fff" }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            {sharedDialogs}
        </Box>
    );
}