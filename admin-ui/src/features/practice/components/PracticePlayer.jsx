// src/features/practice/components/PracticePlayer.jsx
import React, { useMemo, useState } from "react";
import { Box, Button, Paper, Typography, Divider } from "@mui/material";
import QuestionCard from "./QuestionCard";

export default function PracticePlayer({
                                           attemptDetail,
                                           durationMinutes,
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
        // ✅ nếu qid null -> không thể lưu đáp án
        if (!currentQid) {
            console.warn("❌ Missing questionId in currentQuestion:", currentQuestion);
            return;
        }
        setAnswers((prev) => ({ ...prev, [currentQid]: choice }));
    };

    const canPrev = index > 0;
    const canNext = index < total - 1;

    const handleSubmitClick = () => {
        const answersArray = questions.map((q) => {
            const qid = getQid(q);
            return {
                questionId: qid,
                selectedAnswer: qid ? answers[qid] || null : null,
            };
        });

        onSubmit?.(answersArray);
    };

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
                        Tiến độ: {answeredCount}/{total} • Thời gian: {durationMinutes} phút
                    </Typography>

                    {/* ✅ debug nhẹ: nếu missing id thì thấy ngay */}
                    {!currentQid && (
                        <Typography sx={{ mt: 0.5, color: "#dc3545", fontWeight: 800 }}>
                            Lỗi dữ liệu: Câu hỏi không có questionId/id → không lưu được đáp án.
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Button variant="outlined" onClick={onBackToConfig}>
                        Quay lại cấu hình
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleSubmitClick}
                        disabled={!isAllAnswered}
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
                <Button disabled={!canPrev} variant="outlined" onClick={() => setIndex((i) => i - 1)}>
                    Câu trước
                </Button>

                <Button disabled={!canNext} variant="outlined" onClick={() => setIndex((i) => i + 1)}>
                    Câu tiếp
                </Button>
            </Box>
        </Paper>
    );
}
