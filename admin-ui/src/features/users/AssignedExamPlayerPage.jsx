// src/features/users/AssignedExamPlayerPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, Stack, Typography, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import { assignedExamApi } from "../../api/assignedExamApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";

import PracticePlayer from "../practice/components/PracticePlayer";
import PracticeReviewDialog from "../practice/components/PracticeReviewDialog";
import AssignedExamResult from "./components/AssignedExamResult";

import CountdownTimer from "../../components/common/CountdownTimer";
import { parseServerDateTime } from "../../utils/datetime";

const MODE = {
    DOING: "DOING",
    RESULT: "RESULT",
};

// ✅ robust error extractor
function extractApiError(e) {
    const status = e?.response?.status;
    const data = e?.response?.data;

    if (typeof data === "string" && data.trim()) {
        return status ? `HTTP ${status} · ${data.trim().replace(/^"|"$/g, "")}` : data.trim();
    }

    const msg =
        data?.message ||
        data?.detail ||
        data?.error ||
        data?.title ||
        data?.reason ||
        data?.msg ||
        data?.data?.message ||
        data?.data?.detail ||
        data?.data?.error ||
        data?.data?.title;

    if (msg) return status ? `HTTP ${status} · ${String(msg)}` : String(msg);
    if (status) return `HTTP ${status}`;
    return e?.message || "Đã xảy ra lỗi";
}

const useCheatReporter = (assignmentId) => {
    const lastRef = useRef({});

    return useCallback(
        async (type, meta = {}) => {
            const key = String(type || "UNKNOWN");
            const now = Date.now();
            const last = lastRef.current[key] || 0;
            if (now - last < 2000) return; // throttle 2s/type
            lastRef.current[key] = now;

            try {
                await assignedExamApi.studentReportCheating(assignmentId, { type: key, ...meta });
            } catch {
                // ignore
            }
        },
        [assignmentId]
    );
};

function normalizeAssignedStartResponse(raw) {
    const d = raw?.data ?? raw;

    const qArr = Array.isArray(d?.questions) ? d.questions : [];
    const normalizedQuestions = qArr
        .map((q, idx) => {
            if (!q) return null;
            return {
                questionId: q.questionId ?? q.id ?? idx,
                id: q.questionId ?? q.id ?? idx,
                questionType: q.questionType ?? q.type ?? "MCQ",
                content: q.content ?? q.question ?? "",
                question: q.question ?? q.content ?? "",
                options: q.options && typeof q.options === "object" ? q.options : null,
            };
        })
        .filter(Boolean);

    return {
        ...d,
        questions: normalizedQuestions,
        durationMinutes: d.durationMinutes ?? d.duration ?? null,
    };
}

// =====================
// ✅ Local draft answers persistence
// =====================
function buildDraftKey(assignmentId, attemptId) {
    const a = assignmentId ?? "na";
    const t = attemptId ?? "na";
    return `assigned_exam_draft_v1:${a}:${t}`;
}

function safeParseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// draft item shape (MCQ): { questionId, selectedAnswer }
// draft item shape (SHORT_ANSWER / others): { questionId, yourAnswer }
function normalizeDraftArray(draft) {
    if (!Array.isArray(draft)) return [];
    return draft
        .map((x) => {
            if (!x) return null;
            const qid = x.questionId ?? x.id;
            if (qid == null) return null;
            const out = { questionId: qid };
            if (x.selectedAnswer != null) out.selectedAnswer = String(x.selectedAnswer);
            if (x.yourAnswer != null) out.yourAnswer = String(x.yourAnswer);
            return out;
        })
        .filter(Boolean);
}

export default function AssignedExamPlayerPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const playerRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    const [mode, setMode] = useState(MODE.DOING);

    const [attemptDetail, setAttemptDetail] = useState(null);
    const [attemptId, setAttemptId] = useState(null);
    const [attemptStartTs, setAttemptStartTs] = useState(Date.now());

    const [startError, setStartError] = useState(null);

    const [result, setResult] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    // ✅ draft answers (persist on reload)
    const [draftAnswers, setDraftAnswers] = useState([]);

    // ✅ confirm submit bridge
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const pendingSubmitRef = useRef(null); // { answersArray, resolve(boolean) }

    const reportCheat = useCheatReporter(assignmentId);

    // derived
    const durationSeconds = useMemo(() => {
        const m = Number(attemptDetail?.durationMinutes);
        if (!Number.isFinite(m) || m <= 0) return 0;
        return Math.floor(m * 60);
    }, [attemptDetail?.durationMinutes]);

    const draftKey = useMemo(() => buildDraftKey(assignmentId, attemptId), [assignmentId, attemptId]);

    // ====== load draft from localStorage when attemptId ready
    useEffect(() => {
        if (!attemptId) return;
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;

        const parsed = safeParseJson(raw);
        const restored = normalizeDraftArray(parsed?.answers ?? parsed);
        if (restored.length) setDraftAnswers(restored);
    }, [attemptId, draftKey]);

    // ====== persist draft to localStorage
    useEffect(() => {
        if (!attemptId) return;
        try {
            localStorage.setItem(
                draftKey,
                JSON.stringify({
                    updatedAt: Date.now(),
                    answers: draftAnswers,
                })
            );
        } catch {
            // ignore
        }
    }, [draftAnswers, attemptId, draftKey]);

    const clearDraft = useCallback(() => {
        if (!attemptId) return;
        try {
            localStorage.removeItem(draftKey);
        } catch {
            // ignore
        }
    }, [attemptId, draftKey]);

    const boot = useCallback(async () => {
        if (!assignmentId) return;

        setStartError(null);
        setAttemptDetail(null);
        setAttemptId(null);
        setDraftAnswers([]);
        setResult(null);
        setMode(MODE.DOING);

        setLoading(true);
        setLoadingMessage("Đang bắt đầu bài kiểm tra...");

        try {
            const res = await assignedExamApi.studentStart(assignmentId);
            const normalized = normalizeAssignedStartResponse(res);

            setAttemptDetail(normalized);
            const newAttemptId = normalized?.attemptId ?? normalized?.id ?? assignmentId;
            setAttemptId(newAttemptId);

            // ✅ parse LocalDateTime as LOCAL (VN)
            const startedAtRaw = normalized?.startTime ?? normalized?.startedAt ?? null;
            const startedAtDate = parseServerDateTime(startedAtRaw);
            if (startedAtDate) setAttemptStartTs(startedAtDate.getTime());
            else setAttemptStartTs(Date.now());

            if (!Array.isArray(normalized?.questions) || normalized.questions.length === 0) {
                setStartError("Bài kiểm tra chưa có câu hỏi. Vui lòng báo admin kiểm tra đề.");
            }
        } catch (e) {
            const msg = extractApiError(e);
            showToast(msg, "error");
            setStartError(msg);
        } finally {
            setLoading(false);
        }
    }, [assignmentId, showToast]);

    useEffect(() => {
        boot();
    }, [boot]);

    // =====================
    // ✅ Anti-cheat: chặn F12/devtools hotkeys + copy/paste + contextmenu
    // =====================
    useEffect(() => {
        if (mode !== MODE.DOING) return;

        const onKeyDown = (e) => {
            const key = String(e.key || "").toLowerCase();

            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // F12
            if (e.key === "F12") {
                e.preventDefault();
                reportCheat("DEVTOOLS_KEY", { key: "F12" });
                return;
            }

            // Ctrl+Shift+I/J/C (DevTools)
            if (ctrl && shift && ["i", "j", "c"].includes(key)) {
                e.preventDefault();
                reportCheat("DEVTOOLS_KEY", { key: `Ctrl+Shift+${key.toUpperCase()}` });
                return;
            }

            // Ctrl+U (view source)
            if (ctrl && key === "u") {
                e.preventDefault();
                reportCheat("VIEW_SOURCE", { key: "Ctrl+U" });
                return;
            }

            // Ctrl+S (save)
            if (ctrl && key === "s") {
                e.preventDefault();
                reportCheat("SAVE_PAGE", { key: "Ctrl+S" });
                return;
            }

            // Copy/Cut/Paste
            if (ctrl && ["c", "x", "v"].includes(key)) {
                e.preventDefault();
                reportCheat("CLIPBOARD_KEY", { key: `Ctrl+${key.toUpperCase()}` });
                return;
            }
        };

        const onContextMenu = (e) => {
            e.preventDefault();
            reportCheat("CONTEXT_MENU");
        };

        const onCopy = (e) => {
            e.preventDefault();
            reportCheat("COPY");
        };
        const onCut = (e) => {
            e.preventDefault();
            reportCheat("CUT");
        };
        const onPaste = (e) => {
            e.preventDefault();
            reportCheat("PASTE");
        };

        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("contextmenu", onContextMenu, true);
        window.addEventListener("copy", onCopy, true);
        window.addEventListener("cut", onCut, true);
        window.addEventListener("paste", onPaste, true);

        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("contextmenu", onContextMenu, true);
            window.removeEventListener("copy", onCopy, true);
            window.removeEventListener("cut", onCut, true);
            window.removeEventListener("paste", onPaste, true);
        };
    }, [mode, reportCheat]);

    // ✅ tab visibility (switch tab)
    useEffect(() => {
        if (mode !== MODE.DOING) return;

        const onVisibility = () => {
            if (document.hidden) reportCheat("TAB_HIDDEN");
        };

        document.addEventListener("visibilitychange", onVisibility, true);
        return () => document.removeEventListener("visibilitychange", onVisibility, true);
    }, [mode, reportCheat]);

    // ✅ beforeunload: cảnh báo rời trang (và vẫn giữ draft vì đã lưu localStorage)
    useEffect(() => {
        if (mode !== MODE.DOING) return;

        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "";
            reportCheat("BEFORE_UNLOAD");
            return "";
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [mode, reportCheat]);

    // =====================
    // ✅ Draft answers update helper (called by PracticePlayer)
    // =====================
    const handleDraftChange = useCallback((nextDraftArray) => {
        setDraftAnswers(normalizeDraftArray(nextDraftArray));
    }, []);

    // =====================
    // ✅ Submit confirm bridge
    // =====================
    const openSubmitConfirm = useCallback((answersArray) => {
        return new Promise((resolve) => {
            pendingSubmitRef.current = { answersArray, resolve };
            setSubmitConfirmOpen(true);
        });
    }, []);

    const closeSubmitConfirm = useCallback(() => {
        setSubmitConfirmOpen(false);
        // cancel submit => resolve false
        if (pendingSubmitRef.current?.resolve) {
            pendingSubmitRef.current.resolve(false);
        }
        pendingSubmitRef.current = null;
    }, []);

    // ✅ submit thật sự (gọi API)
    const submitNow = useCallback(
        async (answersArray) => {
            setLoading(true);
            setLoadingMessage("Đang nộp bài...");
            try {
                const payload = { answers: answersArray };
                const res = await assignedExamApi.studentSubmit(assignmentId, payload);
                setResult(res);
                setMode(MODE.RESULT);

                // ✅ nộp xong thì clear draft để khỏi “đè” lần sau
                clearDraft();
                return true;
            } catch (e) {
                const msg = extractApiError(e);
                showToast(msg, "error");
                try {
                    playerRef.current?.unlock?.();
                } catch {}
                return false;
            } finally {
                setLoading(false);
            }
        },
        [assignmentId, clearDraft, showToast]
    );

    // ✅ onSubmit mà PracticePlayer gọi -> mở confirm trước
    const handleSubmit = useCallback(
        async (answersArray) => {
            if (loading || submitLoading) return false;
            const ok = await openSubmitConfirm(answersArray);
            return ok;
        },
        [loading, submitLoading, openSubmitConfirm]
    );

    // ✅ auto-submit when timer expires (KHÔNG confirm)
    const handleExpire = useCallback(async () => {
        if (mode !== MODE.DOING) return;

        reportCheat("TIME_EXPIRED");

        // ✅ submit ngay bằng draft (không confirm)
        const payloadAnswers = Array.isArray(draftAnswers) ? draftAnswers : [];
        await submitNow(payloadAnswers);
    }, [mode, reportCheat, draftAnswers, submitNow]);

    // ✅ xem lại đáp án: gọi endpoint review của assigned-exams
    const handleViewReview = useCallback(async () => {
        if (!assignmentId) return;

        try {
            setLoading(true);
            setLoadingMessage("Đang tải đáp án...");
            const review = await assignedExamApi.studentGetReview(assignmentId);
            setReviewData(review);
            setReviewOpen(true);
        } catch (e) {
            const msg = extractApiError(e);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    }, [assignmentId, showToast]);

    const hasQuestions = useMemo(() => {
        return Array.isArray(attemptDetail?.questions) && attemptDetail.questions.length > 0;
    }, [attemptDetail]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 980, mx: "auto" }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#1B2559" }}>
                        Làm bài kiểm tra
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: "#6C757D", fontSize: 13.5 }}>
                        Không thoát tab, không copy/paste, không mở DevTools.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    {/* ✅ Timer giống Practice */}
                    {mode === MODE.DOING && durationSeconds > 0 ? (
                        <CountdownTimer
                            startTimestamp={attemptStartTs}
                            durationSeconds={durationSeconds}
                            onExpire={handleExpire}
                            dangerThreshold={30}
                        />
                    ) : null}

                    <Button
                        variant="outlined"
                        onClick={() => navigate("/users/exams")}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                    >
                        Quay lại danh sách
                    </Button>
                </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ mt: 2, borderRadius: 3, borderColor: "#E3E8EF", overflow: "hidden" }}>
                <Box sx={{ p: 2.5 }}>
                    {mode === MODE.DOING && (
                        <>
                            {startError ? (
                                <Box>
                                    <Typography sx={{ color: "#D32F2F", fontWeight: 900 }}>
                                        Không thể bắt đầu bài kiểm tra
                                    </Typography>
                                    <Typography sx={{ mt: 0.5, color: "#6C757D", fontWeight: 700 }}>
                                        {startError}
                                    </Typography>
                                </Box>
                            ) : !hasQuestions ? (
                                <Typography sx={{ color: "#6C757D", fontWeight: 700 }}>
                                    Không có câu hỏi để làm.
                                </Typography>
                            ) : (
                                <PracticePlayer
                                    ref={playerRef}
                                    attemptDetail={attemptDetail}
                                    attemptId={attemptId}
                                    attemptStartTs={attemptStartTs}
                                    onSubmit={handleSubmit}
                                    // ✅ giữ đáp án khi reload (PracticePlayer cần support 2 props này)
                                    initialAnswers={draftAnswers}
                                    onAnswersChange={handleDraftChange}
                                />
                            )}
                        </>
                    )}

                    {mode === MODE.RESULT && (
                        <AssignedExamResult
                            assignmentId={assignmentId}
                            result={result}
                            numberOfQuestions={attemptDetail?.questions?.length || 0}
                            onViewReview={handleViewReview}
                        />
                    )}
                </Box>
            </Paper>

            <PracticeReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewData} />

            {/* ✅ Confirm submit */}
            <AppConfirm
                open={submitConfirmOpen}
                onClose={closeSubmitConfirm}
                title="Xác nhận nộp bài?"
                message={
                    <Box>
                        <Typography sx={{ color: "#2B3674", fontWeight: 900 }}>
                            Bạn chắc chắn muốn nộp bài ngay bây giờ?
                        </Typography>
                        <Typography sx={{ mt: 0.75, color: "#6C757D", fontWeight: 700, lineHeight: 1.6 }}>
                            Sau khi nộp, bạn không thể quay lại sửa đáp án. Hệ thống sẽ chấm điểm và lưu kết quả.
                        </Typography>
                    </Box>
                }
                confirmText="Nộp bài"
                cancelText="Hủy"
                variant="danger"
                toastOnSuccess={false}
                autoCloseOnSuccess={false}
                loading={submitLoading}
                onConfirm={async () => {
                    const pending = pendingSubmitRef.current;
                    if (!pending?.answersArray || !pending?.resolve) return;

                    try {
                        setSubmitLoading(true);
                        const ok = await submitNow(pending.answersArray);

                        pending.resolve(ok);
                        pendingSubmitRef.current = null;

                        if (ok) setSubmitConfirmOpen(false);
                        // fail => giữ dialog mở để user thử lại / hủy
                    } finally {
                        setSubmitLoading(false);
                    }
                }}
            />

            <GlobalLoading open={loading} message={loadingMessage} />
        </Box>
    );
}