// src/features/practice/components/QuestionCard.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Chip } from "@mui/material";
import AnswerOption from "./AnswerOption";

function looksLikeCode(text) {
    if (!text) return false;
    const t = String(text);

    // Heuristic đơn giản: có xuống dòng + ký tự hay gặp trong code/config
    const hasNewline = t.includes("\n");
    const codeHints = ["{", "}", ";", "=>", "function", "const ", "let ", "var ", "import ", "export ", "class ", "public ", "private ", "@", "SELECT ", "FROM ", "WHERE ", "application.", "spring.", "http", "JWT", "Bearer "];
    const hintHit = codeHints.some((h) => t.includes(h));
    return hasNewline && hintHit;
}

function splitTitleAndBody(raw) {
    if (!raw) return { title: "Câu hỏi", body: "" };

    const text = String(raw);

    // Nếu có nhiều dòng: dòng đầu làm title ngắn, phần sau là body (hay là code/snippet)
    const lines = text.split("\n");
    if (lines.length >= 2) {
        const first = lines[0].trim();
        const rest = lines.slice(1).join("\n").trim();

        // Nếu dòng đầu quá ngắn hoặc kiểu "Cho đoạn code sau:" thì vẫn giữ làm title
        return {
            title: first || "Câu hỏi",
            body: rest,
        };
    }

    return { title: text.trim() || "Câu hỏi", body: "" };
}

export default function QuestionCard({ question, index, value, onChange }) {
    const qType = useMemo(
        () => String(question?.questionType || "MCQ").trim().toUpperCase(),
        [question?.questionType]
    );

    const isMcq = qType === "MCQ";
    const isEssay = qType === "ESSAY" || qType === "SHORT_ANSWER";

    // NOTE: backend schema thường dùng "question", nhưng project mày đang map về "content"
    // => giữ ưu tiên content, fallback sang question để tránh mất dữ liệu
    const rawContent =
        question?.content ??
        question?.question ??
        "Câu hỏi";

    const { title, body } = useMemo(() => splitTitleAndBody(rawContent), [rawContent]);

    const showBodyAsCode = useMemo(() => looksLikeCode(body), [body]);

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
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 18 }}>
                    Câu {index + 1}:
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

            {/* Question content */}
            <Box sx={{ mt: 1.25 }}>
                {/* Title line (luôn hiển thị) */}
                <Typography
                    sx={{
                        fontWeight: 900,
                        color: "#1B2559",
                        fontSize: 16,
                        lineHeight: 1.35,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                >
                    {title}
                </Typography>

                {/* Body (nếu có) */}
                {Boolean(body) && (
                    <Box
                        sx={{
                            mt: 1.25,
                            border: "1px solid #E3E8EF",
                            borderRadius: 2,
                            bgcolor: showBodyAsCode ? "#F7F9FC" : "#FFFFFF",
                            p: 1.25,
                        }}
                    >
                        <Typography
                            sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                fontFamily: showBodyAsCode
                                    ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                                    : "inherit",
                                fontSize: showBodyAsCode ? 13 : 14,
                                lineHeight: showBodyAsCode ? 1.5 : 1.55,
                                color: "#1B2559",
                            }}
                        >
                            {body}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Answers */}
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
