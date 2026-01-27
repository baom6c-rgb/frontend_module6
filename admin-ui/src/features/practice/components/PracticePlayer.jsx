// src/features/practice/components/PracticePlayer.jsx
import React, { useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Typography, Divider } from "@mui/material";
import QuestionCard from "./QuestionCard";

// ✅ NEW: countdown dùng chung
import CountdownTimer from "../../../components/common/CountdownTimer";

const attemptStorageKey = (attemptId) => `practice_attempt_${attemptId}`;

export default function PracticePlayer({
                                           attemptDetail,
                                           durationMinutes,
                                           attemptId,        // ✅ NEW
                                           onBackToConfig,
                                           onSubmit,
                                       }) {
    const questions = attemptDetail?.questions || [];
    const total = questions.length;

    const [index, setIndex] = useState(0);

    // answers: { [questionId]: "A"|"B"|"C"|"D" }
    const [answers, setAnswers] = useState({});

    const currentQuestion = questions[index];

    // ✅ lấy qid chắc chắn hơn (hỗ trợ nhiều shape)
    const getQid = (q) =>
        q?.questionId ??
        q?.id ??
        q?.question?.id ??
        q?.question?.questionId ??
        null;

    const currentQid = useMemo(() => getQid(currentQuestion), [currentQuestion]);

    const selectedForCurrent = useMemo(() => {
        if (!currentQid) return null;
        return answers[currentQid] || null;
    }, [answers, currentQid]);

    const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

    const isAllAnswered = useMemo(() => {
        if (!questions.length) return false;
        return questions.every((q) => {
            const qid = getQid(q);
            return qid && !!answers[qid];
        });
    }, [questions, answers]);

    const setAnswerForCurrent = (choice) => {
        if (!currentQid) {
            console.warn("❌ Missing questionId in currentQuestion:", currentQuestion);
            return;
        }
        setAnswers((prev) => ({ ...prev, [currentQid]: choice }));
    };

    const canPrev = index > 0;
    const canNext = index < total - 1;

    // ✅ build answers payload (dùng cho submit tay + auto submit)
    const buildAnswersArray = () => {
        return questions.map((q) => {
            const qid = getQid(q);
            return {
                questionId: qid,
                selectedAnswer: qid ? answers[qid] || null : null,
            };
        });
    };

    // ✅ chặn submit nhiều lần (auto submit + click)
    const submittedRef = useRef(false);

    const doSubmit = async () => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        const answersArray = buildAnswersArray();
        await onSubmit?.(answersArray);
    };

    // ✅ đọc startTs từ localStorage để reload vẫn chạy tiếp
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

    const durationSeconds = useMemo(() => {
        const m = Number(durationMinutes);
        if (!Number.isFinite(m) || m <= 0) return 0;
        return m * 60;
    }, [durationMinutes]);

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
                            Lỗi dữ liệu: Câu hỏi không có questionId/id → không lưu được đáp án.
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    {/* ✅ Timer: 10s cuối đỏ + hết giờ auto submit */}
                    {startTimestamp && durationSeconds > 0 ? (
                        <CountdownTimer
                            startTimestamp={startTimestamp}
                            durationSeconds={durationSeconds}
                            dangerThreshold={10}
                            onExpire={doSubmit}
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
                        onClick={doSubmit}
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
                selectedAnswer={selectedForCurrent}
                onSelectAnswer={setAnswerForCurrent}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2, gap: 1 }}>
                <Button disabled={!canPrev || submittedRef.current} variant="outlined" onClick={() => setIndex((i) => i - 1)}>
                    Câu trước
                </Button>

                <Button disabled={!canNext || submittedRef.current} variant="outlined" onClick={() => setIndex((i) => i + 1)}>
                    Câu tiếp
                </Button>
            </Box>

            {/* ✅ Hint nhỏ nếu thiếu startTimestamp */}
            {!startTimestamp && (
                <Typography sx={{ mt: 2, color: "#dc3545", fontWeight: 700 }}>
                    Không tìm thấy thời điểm bắt đầu (startTs). Hãy kiểm tra PracticePage đã lưu localStorage sau khi start chưa.
                </Typography>
            )}
        </Paper>
    );
}
