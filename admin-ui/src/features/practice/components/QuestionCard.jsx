// src/features/practice/components/QuestionCard.jsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import AnswerOption from "./AnswerOption";

export default function QuestionCard({ question, index, selectedAnswer, onSelectAnswer }) {
    const content = question?.content || question?.question || "Câu hỏi";
    const options = question?.options || {
        A: question?.optionA,
        B: question?.optionB,
        C: question?.optionC,
        D: question?.optionD,
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
            <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 18 }}>
                Câu {index + 1}: {content}
            </Typography>

            <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
                {["A", "B", "C", "D"].map((k) => (
                    <AnswerOption
                        key={k}
                        label={k}
                        text={options?.[k]}
                        selected={selectedAnswer === k}
                        onSelect={() => onSelectAnswer(k)}
                    />
                ))}
            </Box>
        </Paper>
    );
}
