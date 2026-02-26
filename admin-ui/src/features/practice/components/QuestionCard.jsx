// src/features/practice/components/QuestionCard.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Chip } from "@mui/material";
import AnswerOption from "./AnswerOption";

// ✅ Syntax highlight
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function looksLikeCode(text) {
    if (!text) return false;
    const t = String(text).trim();
    if (!t) return false;

    // ✅ Có code fence -> chắc chắn là code
    if (t.includes("```")) return true;

    // ✅ Inline code bọc bằng backtick đơn -> coi như code
    if (t.startsWith("`") && t.endsWith("`") && t.length >= 3) return true;

    const hasNewline = t.includes("\n");

    const codeHints = [
        "{",
        "}",
        ";",
        "=>",
        "function",
        "const ",
        "let ",
        "var ",
        "import ",
        "export ",
        "class ",
        "public ",
        "private ",
        "@",
        "SELECT ",
        "FROM ",
        "WHERE ",
        "application.",
        "spring.",
        "http",
        "JWT",
        "Bearer ",
        "System.out",
        "for (",
        "if (",
        "while (",
    ];

    const hintHit = codeHints.some((h) => t.includes(h));

    // ✅ Nếu nhiều dòng: chỉ cần có hint
    if (hasNewline) return hintHit;

    // ✅ Nếu 1 dòng: cần "strong hint"
    const singleLineStrongHints = ["for (", "if (", "while (", "System.out", ";", "{", "}", "=>"];
    const strongHit = singleLineStrongHints.some((h) => t.includes(h));

    return strongHit && hintHit;
}

function splitTitleAndBody(raw) {
    if (!raw) return { title: "Câu hỏi", body: "" };

    const text = String(raw);
    const lines = text.split("\n");

    if (lines.length >= 2) {
        const first = lines[0].trim();
        const rest = lines.slice(1).join("\n").trim();
        return { title: first || "Câu hỏi", body: rest };
    }

    return { title: text.trim() || "Câu hỏi", body: "" };
}

/**
 * ✅ Parse markdown code fence:
 * ```java
 * code...
 * ```
 */
function parseCodeFence(text) {
    if (!text) return null;
    const t = String(text);

    const start = t.indexOf("```");
    if (start === -1) return null;

    const after = t.slice(start + 3);
    const firstLineEnd = after.indexOf("\n");
    if (firstLineEnd === -1) return null;

    const lang = after.slice(0, firstLineEnd).trim() || "text";
    const rest = after.slice(firstLineEnd + 1);

    const end = rest.lastIndexOf("```");
    if (end === -1) return null;

    const code = rest.slice(0, end).trimEnd();
    if (!code) return null;

    return { language: lang.toLowerCase(), code };
}

/**
 * ✅ Parse inline backtick:
 * `code...`
 * (chỉ áp dụng khi toàn bộ text là 1 inline code)
 */
function parseInlineBacktick(text) {
    if (!text) return null;
    const t = String(text).trim();

    if (t.startsWith("`") && t.endsWith("`") && t.length >= 3) {
        const code = t.slice(1, -1).trim();
        if (!code) return null;

        const language =
            code.includes("System.out") ||
            code.includes("public ") ||
            code.includes("private ") ||
            code.includes("class ") ||
            code.includes("for (") ||
            code.includes("if (") ||
            code.includes("while (")
                ? "java"
                : "text";

        return { language, code };
    }

    return null;
}

function CodeBlock({ language, code }) {
    const label = (language || "code").toUpperCase();

    return (
        <Box
            sx={{
                mt: 1.25,
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #E3E8EF",
                bgcolor: "#0f172a",
            }}
        >
            {/* Header giống IDE (không có nút copy) */}
            <Box
                sx={{
                    px: 1.25,
                    py: 0.75,
                    bgcolor: "rgba(255,255,255,0.06)",
                }}
            >
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#E5E7EB" }}>
                    {label}
                </Typography>
            </Box>

            {/* Code */}
            <Box sx={{ px: 1, pb: 1 }}>
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        background: "transparent",
                        fontSize: 13,
                        lineHeight: 1.55,
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        },
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </Box>
        </Box>
    );
}

export default function QuestionCard({ question, index, value, onChange }) {
    const qType = useMemo(
        () => String(question?.questionType || "MCQ").trim().toUpperCase(),
        [question?.questionType]
    );

    const isMcq = qType === "MCQ";
    const isEssay = qType === "ESSAY" || qType === "SHORT_ANSWER";

    const rawContent = question?.content ?? question?.question ?? "Câu hỏi";

    const { title, body } = useMemo(() => splitTitleAndBody(rawContent), [rawContent]);

    // ✅ ưu tiên: code fence -> inline backtick -> fallback heuristic
    const fenced = useMemo(
        () =>
            parseCodeFence(body) ||
            parseCodeFence(rawContent) ||
            parseInlineBacktick(body) ||
            parseInlineBacktick(rawContent),
        [body, rawContent]
    );

    // ✅ fallback heuristic code (không có fence/backtick nhưng vẫn là snippet)
    const showBodyAsCode = useMemo(() => !fenced && looksLikeCode(body), [body, fenced]);

    const options = useMemo(() => {
        if (!isMcq) return null;

        const fromMap = question?.options;
        if (fromMap && typeof fromMap === "object") return fromMap;

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
                {/* Title line */}
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

                {/* Body */}
                {Boolean(body) && (
                    <>
                        {fenced ? (
                            <CodeBlock language={fenced.language} code={fenced.code} />
                        ) : showBodyAsCode ? (
                            <Box
                                sx={{
                                    mt: 1.25,
                                    border: "1px solid #E3E8EF",
                                    borderRadius: 2,
                                    bgcolor: "#F7F9FC",
                                    p: 1.25,
                                }}
                            >
                                <Typography
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        fontFamily:
                                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                        color: "#1B2559",
                                    }}
                                >
                                    {body}
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    mt: 1.25,
                                    border: "1px solid #E3E8EF",
                                    borderRadius: 2,
                                    bgcolor: "#FFFFFF",
                                    p: 1.25,
                                }}
                            >
                                <Typography
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        fontSize: 14,
                                        lineHeight: 1.55,
                                        color: "#1B2559",
                                    }}
                                >
                                    {body}
                                </Typography>
                            </Box>
                        )}
                    </>
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