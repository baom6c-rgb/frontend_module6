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

    if (t.includes("```")) return true;
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
        "console.log",
        "return ",
    ];

    const hintHit = codeHints.some((h) => t.includes(h));

    if (hasNewline) return hintHit;

    const singleLineStrongHints = [
        "for (",
        "if (",
        "while (",
        "System.out",
        "console.log",
        ";",
        "{",
        "}",
        "=>",
    ];
    const strongHit = singleLineStrongHints.some((h) => t.includes(h));

    return strongHit && hintHit;
}

function detectCodeLanguage(code) {
    const t = String(code || "").trim();
    if (!t) return "text";

    if (
        t.includes("System.out") ||
        t.includes("public class") ||
        t.includes("private ") ||
        t.includes("public ") ||
        t.includes("class ") ||
        t.includes("new ")
    ) {
        return "java";
    }

    if (
        t.includes("console.log") ||
        t.includes("const ") ||
        t.includes("let ") ||
        t.includes("var ") ||
        t.includes("function ") ||
        t.includes("=>")
    ) {
        return "javascript";
    }

    if (
        t.toUpperCase().includes("SELECT ") ||
        t.toUpperCase().includes("FROM ") ||
        t.toUpperCase().includes("WHERE ")
    ) {
        return "sql";
    }

    if (t.includes("<div") || t.includes("</") || t.includes("<html")) {
        return "markup";
    }

    return "text";
}

/**
 * ✅ Tách title/body an toàn để không bị title = ```java
 * - Nếu bắt đầu bằng code fence: title mặc định "Đọc đoạn code sau và chọn đáp án đúng"
 * - Nếu có text trước code fence: title = text trước fence, body = từ fence trở đi
 * - Nếu không có fence: title = dòng 1, body = phần còn lại
 */
function splitTitleAndBody(raw) {
    if (!raw) return { title: "Câu hỏi", body: "" };

    const DEFAULT_CODE_TITLE = "Đọc đoạn code sau và chọn đáp án đúng";
    const text = String(raw).replace(/\r\n/g, "\n");
    const trimmedStart = text.trimStart();

    if (trimmedStart.startsWith("```")) {
        return {
            title: DEFAULT_CODE_TITLE,
            body: trimmedStart.trim(),
        };
    }

    const fenceIdx = text.indexOf("```");
    if (fenceIdx > 0) {
        const before = text.slice(0, fenceIdx).trim();
        const after = text.slice(fenceIdx).trim();
        return {
            title: before || DEFAULT_CODE_TITLE,
            body: after || "",
        };
    }

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

        return { language: detectCodeLanguage(code), code };
    }

    return null;
}

/**
 * ✅ FE-only fallback cho output kiểu DeepSeek:
 * "Cho đoạn code sau: for (...) { ... } Kết quả là gì?"
 *
 * Tách thành:
 * - title
 * - code
 * - suffix
 */
function extractInlineCodeQuestion(raw) {
    if (!raw) return null;
    const text = String(raw).replace(/\r\n/g, "\n").trim();
    if (!text) return null;

    const patterns = [
        /(.*?)(for\s*\([\s\S]*?\)\s*\{[\s\S]*?\})(.*)/i,
        /(.*?)(if\s*\([\s\S]*?\)\s*\{[\s\S]*?\})(.*)/i,
        /(.*?)(while\s*\([\s\S]*?\)\s*\{[\s\S]*?\})(.*)/i,
        /(.*?)(do\s*\{[\s\S]*?\}\s*while\s*\([\s\S]*?\)\s*;?)(.*)/i,
        /(.*?)(function\s+[a-zA-Z_$][\w$]*\s*\([\s\S]*?\)\s*\{[\s\S]*?\})(.*)/i,
        /(.*?)(const\s+[a-zA-Z_$][\w$]*\s*=\s*[\s\S]*?;)(.*)/i,
        /(.*?)(let\s+[a-zA-Z_$][\w$]*\s*=\s*[\s\S]*?;)(.*)/i,
        /(.*?)(var\s+[a-zA-Z_$][\w$]*\s*=\s*[\s\S]*?;)(.*)/i,
        /(.*?)(System\.out\.println\s*\([\s\S]*?\)\s*;)(.*)/i,
        /(.*?)(public\s+class\s+[A-Za-z_$][\w$]*\s*\{[\s\S]*?\})(.*)/i,
        /(.*?)(SELECT[\s\S]+?FROM[\s\S]+?(?:WHERE[\s\S]+?)?;?)(.*)/i,
    ];

    for (const regex of patterns) {
        const match = text.match(regex);
        if (!match) continue;

        const before = (match[1] || "").trim();
        const code = (match[2] || "").trim();
        const after = (match[3] || "").trim();

        if (!code || !looksLikeCode(code)) continue;

        return {
            title: before || "Đọc đoạn code sau và chọn đáp án đúng",
            code,
            suffix: after,
            language: detectCodeLanguage(code),
        };
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

    const rawContent =
        question?.content ??
        question?.question ??
        question?.questionText ??
        question?.title ??
        question?.stem ??
        "Câu hỏi";

    const explicitCode = useMemo(() => {
        const code =
            question?.codeBlock ??
            question?.code ??
            question?.snippet ??
            question?.sourceCode ??
            null;

        if (!code || !String(code).trim()) return null;

        const language = String(
            question?.codeLanguage ?? question?.language ?? detectCodeLanguage(code)
        )
            .trim()
            .toLowerCase();

        return {
            language: language || "text",
            code: String(code),
        };
    }, [question]);

    const { title, body } = useMemo(() => splitTitleAndBody(rawContent), [rawContent]);

    const inlineExtracted = useMemo(() => {
        if (explicitCode) return null;
        if (body) return null;
        return extractInlineCodeQuestion(rawContent);
    }, [explicitCode, body, rawContent]);

    const fenced = useMemo(
        () =>
            explicitCode ||
            parseCodeFence(body) ||
            parseCodeFence(rawContent) ||
            parseInlineBacktick(body) ||
            parseInlineBacktick(rawContent) ||
            (inlineExtracted
                ? { language: inlineExtracted.language, code: inlineExtracted.code }
                : null),
        [explicitCode, body, rawContent, inlineExtracted]
    );

    const showBodyAsCode = useMemo(() => {
        if (fenced) return false;
        return looksLikeCode(body);
    }, [body, fenced]);

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

    const displayTitle = inlineExtracted?.title || title;
    const displaySuffix = inlineExtracted?.suffix || "";

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

            <Box sx={{ mt: 1.25 }}>
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
                    {displayTitle}
                </Typography>

                {(Boolean(body) || Boolean(fenced) || Boolean(displaySuffix)) && (
                    <>
                        {fenced ? (
                            <>
                                <CodeBlock language={fenced.language} code={fenced.code} />

                                {displaySuffix ? (
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
                                            {displaySuffix}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </>
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
                        ) : Boolean(body) ? (
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
                        ) : null}
                    </>
                )}
            </Box>

            {isMcq ? (
                <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
                    {["A", "B", "C", "D"].map((k) => {
                        const text = options?.[k];
                        const disabled = text == null || String(text).trim() === "";

                        return (
                            <AnswerOption
                                key={k}
                                label={k}
                                text={disabled ? "—" : text}
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