// src/features/practice/components/PracticePlayer.jsx
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { Box, Button, Paper, Typography, Divider } from "@mui/material";
import QuestionCard from "./QuestionCard";
import QuizProgressBar from "./QuizProgressBar";

/**
 * V2 NOTE:
 * - attemptId nên = sessionToken (unique per session)
 * - answersMap key nên dùng questionId ổn định (ở PracticePage đã set questionId = questionKey)
 * - timer: startTs lấy từ BE (attemptStartTs) và persist để reload không reset
 */
const buildStorageKey = (attemptId, attemptDetail) => {
    if (attemptId && String(attemptId).trim()) return `practice_v2_attempt_${String(attemptId).trim()}`;

    const token = attemptDetail?.sessionToken || attemptDetail?.token || null;
    if (token && String(token).trim()) return `practice_v2_attempt_${String(token).trim()}`;

    return "practice_v2_attempt_unknown";
};

const PracticePlayer = forwardRef(function PracticePlayer(
    { attemptDetail, attemptId, attemptStartTs, onSubmit },
    ref
) {
    const questions = attemptDetail?.questions || [];
    const total = questions.length;

    const storageKey = useMemo(
        () => buildStorageKey(attemptId, attemptDetail),
        [attemptId, attemptDetail]
    );

    const [index, setIndex] = useState(0);

    /**
     * answersMap:
     * {
     *   [questionId]: { selectedAnswer?: "A"|"B"|"C"|"D", textAnswer?: string }
     * }
     */
    const [answersMap, setAnswersMap] = useState({});

    // submission flag (doesn't trigger re-render)
    const submittedRef = useRef(false);

    const getQid = (q) => q?.questionId ?? q?.id ?? null;

    const currentQuestion = questions[index];
    const currentQid = useMemo(() => getQid(currentQuestion), [currentQuestion]);

    // ✅ Danh sách ID để ProgressBar map trạng thái answered/pending
    const questionIds = useMemo(() => questions.map((q) => getQid(q)), [questions]);

    const answeredCount = useMemo(() => {
        return questions.reduce((acc, q) => {
            const qid = getQid(q);
            if (!qid) return acc;

            const type = String(q?.questionType || "").toUpperCase();
            const a = answersMap[qid];

            if (type === "MCQ") return acc + (a?.selectedAnswer ? 1 : 0);
            return acc + (a?.textAnswer && a.textAnswer.trim().length > 0 ? 1 : 0);
        }, 0);
    }, [answersMap, questions]);

    const isAllAnswered = useMemo(() => {
        if (!questions.length) return false;
        return questions.every((q) => {
            const qid = getQid(q);
            if (!qid) return false;

            const type = String(q?.questionType || "").toUpperCase();
            const a = answersMap[qid];

            if (type === "MCQ") return !!a?.selectedAnswer;
            return !!(a?.textAnswer && a.textAnswer.trim().length > 0);
        });
    }, [questions, answersMap]);

    /**
     * ✅ Restore answers/index + startTs on mount OR when storageKey changes
     * - startTs ưu tiên attemptStartTs (BE) để timer không reset
     * - nếu local chưa có startTs, set lần đầu
     */
    useEffect(() => {
        submittedRef.current = false;

        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : null;

            const savedAnswers = parsed?.answers;
            if (savedAnswers && typeof savedAnswers === "object") {
                setAnswersMap(savedAnswers);
            } else {
                setAnswersMap({});
            }

            const savedIndex = Number(parsed?.index);
            if (!Number.isNaN(savedIndex) && savedIndex >= 0) {
                setIndex(savedIndex);
            } else {
                setIndex(0);
            }

            // ✅ startTs: ưu tiên BE startTs, fallback local, cuối cùng Date.now
            const beTs = Number.isFinite(Number(attemptStartTs)) ? Number(attemptStartTs) : null;
            const localTs = Number.isFinite(Number(parsed?.startTs)) ? Number(parsed.startTs) : null;
            const finalTs = beTs ?? localTs ?? Date.now();

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    startTs: finalTs,
                    answers: savedAnswers || {},
                    index: !Number.isNaN(savedIndex) && savedIndex >= 0 ? savedIndex : 0,
                })
            );
        } catch {
            setAnswersMap({});
            setIndex(0);

            // best-effort write startTs
            try {
                const beTs = Number.isFinite(Number(attemptStartTs)) ? Number(attemptStartTs) : null;
                localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                        startTs: beTs ?? Date.now(),
                        answers: {},
                        index: 0,
                    })
                );
            } catch {
                // ignore
            }
        }
    }, [storageKey, attemptStartTs]);

    // clamp index when questions load
    useEffect(() => {
        if (!total) return;
        setIndex((i) => Math.max(0, Math.min(i, total - 1)));
    }, [total]);

    /**
     * ✅ Persist answers + index (keep startTs stable)
     */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : {};

            const beTs = Number.isFinite(Number(attemptStartTs)) ? Number(attemptStartTs) : null;
            const localTs = Number.isFinite(Number(parsed?.startTs)) ? Number(parsed.startTs) : null;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    startTs: beTs ?? localTs ?? Date.now(),
                    answers: answersMap,
                    index,
                })
            );
        } catch {
            // ignore
        }
    }, [storageKey, answersMap, index, attemptStartTs]);

    // ===== Prevent accidental reload/back (chỉ khi chưa submit) =====
    useEffect(() => {
        const handler = (e) => {
            if (submittedRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    // ===== Anti-cheat (best-effort): chặn F12/DevTools hotkeys + chuột phải + copy/paste =====
    // Lưu ý: Không thể chặn DevTools 100% (người dùng vẫn mở được bằng cách khác).
    useEffect(() => {
        const onKeyDown = (e) => {
            if (submittedRef.current) return;

            const key = String(e.key || "").toLowerCase();
            const ctrlOrMeta = e.ctrlKey || e.metaKey;

            // F12
            if (e.key === "F12") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Ctrl/Meta + Shift + I/J/C (DevTools)
            if (ctrlOrMeta && e.shiftKey && ["i", "j", "c"].includes(key)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Ctrl/Meta + U (View source)
            if (ctrlOrMeta && key === "u") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Optional: chặn copy/paste/select all trong lúc làm bài
            if (ctrlOrMeta && ["c", "v", "x", "a"].includes(key)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        };

        const onContextMenu = (e) => {
            if (submittedRef.current) return;
            e.preventDefault();
        };

        const onCopyCutPaste = (e) => {
            if (submittedRef.current) return;
            e.preventDefault();
        };

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("contextmenu", onContextMenu, true);
        document.addEventListener("copy", onCopyCutPaste, true);
        document.addEventListener("cut", onCopyCutPaste, true);
        document.addEventListener("paste", onCopyCutPaste, true);

        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("contextmenu", onContextMenu, true);
            document.removeEventListener("copy", onCopyCutPaste, true);
            document.removeEventListener("cut", onCopyCutPaste, true);
            document.removeEventListener("paste", onCopyCutPaste, true);
        };
    }, []);

    // ===== Build answers array =====
    const buildAnswersArray = () => {
        return questions.map((q) => {
            const qid = getQid(q);
            const type = String(q?.questionType || "").toUpperCase();
            const a = qid ? answersMap[qid] : null;

            if (type === "MCQ") {
                return {
                    questionId: qid,
                    selectedAnswer: a?.selectedAnswer ?? null,
                    textAnswer: "",
                };
            }
            return { questionId: qid, textAnswer: a?.textAnswer ?? "", selectedAnswer: null };
        });
    };

    const doSubmit = async (meta = {}) => {
        if (submittedRef.current) return;

        submittedRef.current = true;
        const answersArray = buildAnswersArray();

        try {
            await onSubmit?.(answersArray, meta);
        } catch (e) {
            submittedRef.current = false;
            throw e;
        }
    };

    useImperativeHandle(ref, () => ({
        getAnswersArray: () => buildAnswersArray(),
        submit: (meta) => doSubmit(meta),
    }));

    if (!questions.length) {
        return (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E3E8EF" }}>
                <Typography sx={{ fontWeight: 800, color: "#6C757D" }}>
                    Không có câu hỏi để làm.
                </Typography>
            </Paper>
        );
    }

    const handleNavigate = (newIndex) => {
        if (submittedRef.current) return;
        const safeIndex = Math.max(0, Math.min(Number(newIndex) || 0, total - 1));
        setIndex(safeIndex);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid #E3E8EF",
                bgcolor: "#fff",
            }}
        >
            {/* ✅ PROGRESS BAR (Navigation) */}
            <QuizProgressBar
                total={total}
                currentIndex={index}
                answersMap={answersMap}
                questionIds={questionIds}
                onNavigate={handleNavigate}
                disabled={submittedRef.current}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                    <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 18 }}>
                        3) Làm bài
                    </Typography>

                    {/* ❌ BỎ text tiến độ theo yêu cầu (không show “Tiến độ” ở header) */}
                    {/* <Typography sx={{ mt: 0.5, color: "#6C757D", fontWeight: 700 }}>
                        Tiến độ: {answeredCount}/{total}
                    </Typography> */}

                    {!currentQid && (
                        <Typography sx={{ mt: 0.5, color: "#dc3545", fontWeight: 800 }}>
                            Lỗi dữ liệu: Câu hỏi không có questionId → không lưu được đáp án.
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Button
                        variant="contained"
                        onClick={() => doSubmit({ timedOut: false })}
                        disabled={!isAllAnswered || submittedRef.current}
                        sx={{
                            background: "#EC5E32",
                            fontWeight: 900,
                            "&:hover": { background: "#d94f28" },
                        }}
                    >
                        Nộp bài
                    </Button>
                </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <QuestionCard
                question={currentQuestion}
                index={index}
                value={currentQid ? answersMap[currentQid] : null}
                onChange={(nextValue) => {
                    if (!currentQid) return;
                    setAnswersMap((prev) => ({
                        ...prev,
                        [currentQid]: { ...(prev[currentQid] || {}), ...nextValue },
                    }));
                }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2, gap: 1 }}>
                <Button
                    disabled={index <= 0 || submittedRef.current}
                    variant="outlined"
                    onClick={() => setIndex((i) => i - 1)}
                >
                    Câu trước
                </Button>

                <Button
                    disabled={index >= total - 1 || submittedRef.current}
                    variant="outlined"
                    onClick={() => setIndex((i) => i + 1)}
                >
                    Câu tiếp
                </Button>
            </Box>
        </Paper>
    );
});

export default PracticePlayer;
