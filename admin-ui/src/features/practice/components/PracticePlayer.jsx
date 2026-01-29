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

const attemptStorageKey = (attemptId) => `practice_attempt_${attemptId}`;

const PracticePlayer = forwardRef(function PracticePlayer(
    { attemptDetail, attemptId, onSubmit },
    ref
) {
    const questions = attemptDetail?.questions || [];
    const total = questions.length;

    const [index, setIndex] = useState(0);

    /**
     * answersMap:
     * {
     *   [questionId]: { selectedAnswer?: "A"|"B"|"C"|"D", textAnswer?: string }
     * }
     */
    const [answersMap, setAnswersMap] = useState({});

    const getQid = (q) => q?.questionId ?? q?.id ?? null;

    const currentQuestion = questions[index];
    const currentQid = useMemo(() => getQid(currentQuestion), [currentQuestion]);

    const answeredCount = useMemo(() => Object.keys(answersMap).length, [answersMap]);

    const isAllAnswered = useMemo(() => {
        if (!questions.length) return false;
        return questions.every((q) => {
            const qid = getQid(q);
            if (!qid) return false;

            const type = q?.questionType;
            const a = answersMap[qid];

            if (type === "MCQ") return !!a?.selectedAnswer;
            // ESSAY / SHORT_ANSWER
            return !!(a?.textAnswer && a.textAnswer.trim().length > 0);
        });
    }, [questions, answersMap]);

    // ===== Persist startTs + answers + index (reload giữ đáp án + đang ở câu nào) =====
    useEffect(() => {
        if (!attemptId) return;

        try {
            const raw = localStorage.getItem(attemptStorageKey(attemptId));
            const parsed = raw ? JSON.parse(raw) : null;

            const savedAnswers = parsed?.answers;
            if (savedAnswers && typeof savedAnswers === "object") {
                setAnswersMap(savedAnswers);
            }

            // restore index nếu hợp lệ
            const savedIndex = Number(parsed?.index);
            if (!Number.isNaN(savedIndex) && savedIndex >= 0) {
                setIndex(savedIndex);
            }

            // Nếu chưa có startTs thì set (KHÔNG overwrite nếu đã có)
            if (!parsed?.startTs) {
                localStorage.setItem(
                    attemptStorageKey(attemptId),
                    JSON.stringify({
                        startTs: Date.now(),
                        answers: savedAnswers || {},
                        index: Number.isFinite(savedIndex) ? savedIndex : 0,
                    })
                );
            }
        } catch {
            // ignore
        }
    }, [attemptId]);

    // clamp index khi questions load xong (tránh index vượt quá total sau reload)
    useEffect(() => {
        if (!total) return;
        setIndex((i) => Math.max(0, Math.min(i, total - 1)));
    }, [total]);

    useEffect(() => {
        if (!attemptId) return;

        try {
            const raw = localStorage.getItem(attemptStorageKey(attemptId));
            const parsed = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
                attemptStorageKey(attemptId),
                JSON.stringify({
                    startTs: parsed?.startTs ?? Date.now(),
                    answers: answersMap,
                    index,
                })
            );
        } catch {
            // ignore
        }
    }, [attemptId, answersMap, index]);

    // ===== Prevent accidental reload/back (chỉ khi chưa submit) =====
    const submittedRef = useRef(false);

    useEffect(() => {
        const handler = (e) => {
            if (submittedRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    // ===== Build answers =====
    const buildAnswersArray = () => {
        return questions.map((q) => {
            const qid = getQid(q);
            const type = q?.questionType;
            const a = qid ? answersMap[qid] : null;

            if (type === "MCQ") {
                return { questionId: qid, selectedAnswer: a?.selectedAnswer ?? null };
            }
            // ESSAY / SHORT_ANSWER
            return { questionId: qid, textAnswer: a?.textAnswer ?? "" };
        });
    };

    const doSubmit = async (meta = {}) => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        const answersArray = buildAnswersArray();
        await onSubmit?.(answersArray, meta);
    };

    // ===== Expose methods for "timer outside" to call =====
    useImperativeHandle(ref, () => ({
        getAnswersArray: () => buildAnswersArray(),
        submit: (meta) => doSubmit(meta),
    }));

    // ===== Render =====
    if (!questions.length) {
        return (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E3E8EF" }}>
                <Typography sx={{ fontWeight: 800, color: "#6C757D" }}>
                    Không có câu hỏi để làm.
                </Typography>
            </Paper>
        );
    }

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
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                    <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 18 }}>
                        3) Làm bài
                    </Typography>

                    <Typography sx={{ mt: 0.5, color: "#6C757D", fontWeight: 700 }}>
                        Tiến độ: {answeredCount}/{total}
                    </Typography>

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
