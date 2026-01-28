// src/features/practice/components/QuestionCard.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Chip } from "@mui/material";
import AnswerOption from "./AnswerOption";

export default function QuestionCard({ question, index, value, onChange }) {
    const qType = question?.questionType || "MCQ"; // "MCQ" | "ESSAY"
    const content = question?.content || "Câu hỏi";

    const options = useMemo(() => {
        if (qType !== "MCQ") return null;
        return (
            question?.options || {
                A: question?.optionA,
                B: question?.optionB,
                C: question?.optionC,
                D: question?.optionD,
            }
        );
    }, [qType, question]);

    const selectedAnswer = value?.selectedAnswer || null;
    const textAnswer = value?.textAnswer || "";

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 18 }}>
                    Câu {index + 1}: {content}
                </Typography>

                <Chip
                    size="small"
                    label={qType === "MCQ" ? "Quiz (MCQ)" : "Tự luận ngắn"}
                    sx={{
                        fontWeight: 900,
                        bgcolor: qType === "MCQ" ? "rgba(11,94,215,0.10)" : "rgba(255,140,0,0.12)",
                        color: qType === "MCQ" ? "#0B5ED7" : "#FF8C00",
                    }}
                />
            </Box>

            {qType === "MCQ" ? (
                <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
                    {["A", "B", "C", "D"].map((k) => (
                        <AnswerOption
                            key={k}
                            label={k}
                            text={options?.[k]}
                            selected={selectedAnswer === k}
                            onSelect={() => onChange?.({ selectedAnswer: k })}
                        />
                    ))}
                </Box>
            ) : (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        label="Nhập câu trả lời của bạn"
                        value={textAnswer}
                        onChange={(e) => onChange?.({ textAnswer: e.target.value })}
                        fullWidth
                        multiline
                        minRows={4}
                        placeholder="Trả lời theo ý hiểu của bạn (có phân tích)."
                    />

                    <Typography sx={{ mt: 1, color: "#6C757D", fontWeight: 700, fontSize: 12 }}>
                        Gợi ý: Viết ngắn gọn nhưng có lập luận (vì sao, dẫn ý từ tài liệu, ví dụ…).
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}
