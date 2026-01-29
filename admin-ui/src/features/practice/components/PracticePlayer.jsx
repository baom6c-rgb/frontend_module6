// src/features/practice/components/PracticePlayer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Typography, Divider } from "@mui/material";
import QuestionCard from "./QuestionCard";
import CountdownTimer from "../../../components/common/CountdownTimer";

const attemptStorageKey = (attemptId) => `practice_attempt_${attemptId}`;

export default function PracticePlayer({
                                           attemptDetail,
                                           durationMinutes,
                                           attemptId,
                                           onBackToConfig,
                                           onSubmit,
                                       }) {
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

    // ===== Utils =====
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
            // ESSAY
            return !!(a?.textAnswer && a.textAnswer.trim().length > 0);
        });
    }, [questions, answersMap]);

    // ===== Persist startTs + answers (reload giữ giờ + giữ đáp án) =====
    const startTimestamp = useMemo(() => {
        if (!attemptId) return null;
        try {
            const raw = localStorage.getItem(attemptStorageKey(attemptId));
            const parsed = raw ? JSON.parse(raw) : null;
            const ts = parsed?.startTs;
            return typeof ts === "number" ? ts : null;
        } catch {
            return null;
        }
    }, [attemptId]);

    useEffect(() => {
        if (!attemptId) return;

        try {
            const raw = localStorage.getItem(attemptStorageKey(attemptId));
            const parsed = raw ? JSON.parse(raw) : null;
            const savedAnswers = parsed?.answers;
            if (savedAnswers && typeof savedAnswers === "object") {
                setAnswersMap(savedAnswers);
            }
        } catch {
            // ignore
        }
    }, [attemptId]);

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
                })
            );
        } catch {
            // ignore
        }
    }, [attemptId, answersMap]);

    // ===== Prevent accidental reload/back =====
    useEffect(() => {
        const handler = (e) => {
            // chỉ cảnh báo khi đang làm và chưa submit
            if (submittedRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    const durationSeconds = useMemo(() => {
        const m = Number(durationMinutes);
        if (!Number.isFinite(m) || m <= 0) return 0;
        return m * 60;
    }, [durationMinutes]);

    // ===== Submit =====
    const submittedRef = useRef(false);

    const buildAnswersArray = () => {
        return questions.map((q) => {
            const qid = getQid(q);
            const type = q?.questionType;
            const a = qid ? answersMap[qid] : null;

            if (type === "MCQ") {
                return { questionId: qid, selectedAnswer: a?.selectedAnswer ?? null };
            }
            // ESSAY
            return { questionId: qid, textAnswer: a?.textAnswer ?? "" };
        });
    };

    const doSubmit = async (meta = {}) => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        const answersArray = buildAnswersArray();
        await onSubmit?.(answersArray, meta);
    };

    // ===== Render =====
    if (!questions.length) {
        return (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E3E8EF" }}>
                <Typography sx={{ fontWeight: 800, color: "#6C757D" }}>
                    Không có câu hỏi để làm.
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={onBackToConfig}>
                        Quay lại cấu hình
                    </Button>
                </Box>
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
                    {/* Timer: 10s cuối đỏ + hết giờ auto submit */}
                    {startTimestamp && durationSeconds > 0 ? (
                        <CountdownTimer
                            startTimestamp={startTimestamp}
                            durationSeconds={durationSeconds}
                            dangerThreshold={10}
                            onExpire={() => doSubmit({ timedOut: true })}
                        />
                    ) : (
                        <Box sx={{ px: 1.5, py: 0.75, borderRadius: 2, border: "1px solid #E3E8EF" }}>
                            <Typography sx={{ fontWeight: 900, color: "#6C757D" }}>--:--</Typography>
                        </Box>
                    )}

                    <Button variant="outlined" onClick={onBackToConfig} disabled={submittedRef.current}>
                        Quay lại cấu hình
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => doSubmit({ timedOut: false })}
                        disabled={!isAllAnswered || submittedRef.current}
                        sx={{ background: "#EC5E32", fontWeight: 900 }}
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
                    setAnswersMap((prev) => ({ ...prev, [currentQid]: { ...(prev[currentQid] || {}), ...nextValue } }));
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

            {!startTimestamp && (
                <Typography sx={{ mt: 2, color: "#dc3545", fontWeight: 700 }}>
                    Không tìm thấy thời điểm bắt đầu (startTs). Hãy kiểm tra PracticePage đã lưu localStorage sau khi start.
                </Typography>
            )}
        </Paper>
    );
}
