// src/features/practice/components/QuestionCard.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Chip } from "@mui/material";
import AnswerOption from "./AnswerOption";

export default function QuestionCard({ question, index, value, onChange }) {
    const qType = useMemo(
        () => String(question?.questionType || "MCQ").trim().toUpperCase(),
        [question?.questionType]
    );

    const isMcq = qType === "MCQ";
    const isEssay = qType === "ESSAY" || qType === "SHORT_ANSWER";

    const content = question?.content || "Câu hỏi";

    const options = useMemo(() => {
        if (!isMcq) return null;

        const fromMap = question?.options;
        if (fromMap && typeof fromMap === "object") return fromMap;

        // fallback legacy fields
        return {
            A: question?.optionA,
            B: question?.optionB,
            C: question?.optionC,
            D: question?.optionD,
        };
    }, [isMcq, question]);

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
                    label={isMcq ? "Quiz (MCQ)" : "Tự luận ngắn"}
                    sx={{
                        fontWeight: 900,
                        bgcolor: isMcq ? "rgba(11,94,215,0.10)" : "rgba(255,140,0,0.12)",
                        color: isMcq ? "#0B5ED7" : "#FF8C00",
                    }}
                />
            </Box>

            {isMcq ? (
                <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
                    {["A", "B", "C", "D"].map((k) => {
                        const text = options?.[k];
                        const disabled = !text;

                        return (
                            <AnswerOption
                                key={k}
                                label={k}
                                text={text || "—"}
                                selected={selectedAnswer === k}
                                disabled={disabled}
                                onSelect={() => {
                                    if (disabled) return;
                                    // ✅ chọn MCQ => clear textAnswer để payload sạch
                                    onChange?.({ selectedAnswer: k, textAnswer: "" });
                                }}
                            />
                        );
                    })}
                </Box>
            ) : (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        label="Nhập câu trả lời của bạn"
                        value={textAnswer}
                        onChange={(e) => {
                            const next = e.target.value;
                            // ✅ nhập tự luận => (optional) clear selectedAnswer
                            onChange?.({ textAnswer: next, selectedAnswer: null });
                        }}
                        fullWidth
                        multiline
                        minRows={4}
                        placeholder="Trả lời theo ý hiểu của bạn (có phân tích)."
                    />

                    <Typography sx={{ mt: 1, color: "#6C757D", fontWeight: 700, fontSize: 12 }}>
                        Gợi ý: Viết ngắn gọn nhưng có lập luận (vì sao, dẫn ý từ tài liệu, ví dụ…).
                    </Typography>

                    {!isEssay && (
                        <Typography sx={{ mt: 1, color: "#dc3545", fontWeight: 800, fontSize: 12 }}>
                            Loại câu hỏi không hỗ trợ: {qType}
                        </Typography>
                    )}
                </Box>
            )}
        </Paper>
    );
}
