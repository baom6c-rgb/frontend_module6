// src/features/practice/components/PracticeReviewDialog.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Divider,
    Chip,
    Stack,
    Button,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// ✅ Syntax highlight
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function cleanAnswerText(raw) {
    if (raw == null) return "";
    return String(raw)
        .replace(/[‘’]/g, "")
        .replace(/[“”]/g, "")
        .trim();
}

function looksLikeCode(text) {
    if (!text) return false;
    const t = String(text);

    // ✅ Nếu có code fence thì chắc chắn là code
    if (t.includes("```")) return true;

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
    ];
    const hintHit = codeHints.some((h) => t.includes(h));
    return hasNewline && hintHit;
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

function CodeBlock({ language, code }) {
    const label = (language || "code").toUpperCase();

    return (
        <Box
            sx={{
                mt: 1,
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

function QuestionContent({ raw }) {
    const { title, body } = useMemo(() => splitTitleAndBody(raw), [raw]);

    // ✅ ưu tiên parse code fence (đẹp nhất)
    const fenced = useMemo(() => parseCodeFence(body) || parseCodeFence(raw), [body, raw]);

    // ✅ fallback heuristic code (không có fence nhưng vẫn là snippet)
    const showBodyAsCode = useMemo(() => !fenced && looksLikeCode(body), [body, fenced]);

    return (
        <Box sx={{ mt: 0.25 }}>
            <Typography
                sx={{
                    fontWeight: 900,
                    color: "#1B2559",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
            >
                {title}
            </Typography>

            {Boolean(body) && (
                <>
                    {fenced ? (
                        <CodeBlock language={fenced.language} code={fenced.code} />
                    ) : showBodyAsCode ? (
                        <Box
                            sx={{
                                mt: 1,
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
                                    fontWeight: 400, // ✅ BỎ IN ĐẬM
                                }}
                            >
                                {body}
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                mt: 1,
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
                                    fontWeight: 400, // ✅ BỎ IN ĐẬM
                                }}
                            >
                                {body}
                            </Typography>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
}

export default function PracticeReviewDialog({ open, onClose, review }) {
    const [onlyWrong, setOnlyWrong] = useState(false);

    const items = review?.items || [];

    // ✅ giữ số câu gốc trước khi lọc
    const itemsWithNo = useMemo(() => {
        return items.map((it, index) => ({
            ...it,
            _no: index + 1,
        }));
    }, [items]);

    const filtered = useMemo(() => {
        if (!onlyWrong) return itemsWithNo;
        return itemsWithNo.filter((x) => x?.isCorrect === false);
    }, [itemsWithNo, onlyWrong]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 900, color: "#1B2559" }}>
                Xem lại đáp án
                <IconButton onClick={onClose} sx={{ position: "absolute", right: 10, top: 10 }}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: "#F7F9FC" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
                    <Chip label={`Score: ${review?.score ?? 0}/100`} sx={{ fontWeight: 900 }} />
                    <Chip
                        label={`Đúng: ${review?.correctCount ?? 0}/${review?.totalQuestions ?? 0}`}
                        sx={{ fontWeight: 900 }}
                    />

                    <Box sx={{ flex: 1 }} />

                    <Button
                        variant={onlyWrong ? "contained" : "outlined"}
                        onClick={() => setOnlyWrong((v) => !v)}
                        sx={{ fontWeight: 900 }}
                    >
                        {onlyWrong ? "Xem toàn bộ câu" : "Chỉ xem câu sai"}
                    </Button>
                </Stack>

                {filtered.length === 0 ? (
                    <Typography sx={{ color: onlyWrong ? "#1B5E20" : "#ff0202", fontWeight: 800 }}>
                        {onlyWrong ? "Không có câu sai 🎉" : "Không có dữ liệu để hiển thị."}
                    </Typography>
                ) : (
                    filtered.map((q, idx) => {
                        const type = q?.questionType || "MCQ";
                        const rawContent = q?.content ?? q?.question ?? "Câu hỏi";

                        return (
                            <Box
                                key={q.questionId || `${q._no}_${idx}`}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    border: "1px solid #E3E8EF",
                                    bgcolor: "#fff",
                                    mb: 2,
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                        Câu {q._no}:
                                    </Typography>

                                    <Chip
                                        size="small"
                                        label={type === "MCQ" ? "MCQ" : "Tự luận ngắn"}
                                        sx={{
                                            fontWeight: 900,
                                            bgcolor: type === "MCQ" ? "rgba(11,94,215,0.10)" : "rgba(255,140,0,0.12)",
                                            color: type === "MCQ" ? "#0B5ED7" : "#FF8C00",
                                        }}
                                    />

                                    <Chip
                                        size="small"
                                        label={q.isCorrect ? "ĐÚNG" : "SAI"}
                                        sx={{
                                            fontWeight: 900,
                                            bgcolor: q.isCorrect ? "rgba(27,94,32,0.12)" : "rgba(176,0,32,0.12)",
                                            color: q.isCorrect ? "#1B5E20" : "#B00020",
                                        }}
                                    />

                                    {Number.isFinite(q?.score) && Number.isFinite(q?.maxScore) ? (
                                        <Chip size="small" label={`Điểm: ${q.score}/${q.maxScore}`} sx={{ fontWeight: 900 }} />
                                    ) : null}
                                </Stack>

                                {/* ✅ Render content */}
                                <QuestionContent raw={rawContent} />

                                <Divider sx={{ my: 1.5 }} />

                                {/* ===== MCQ ===== */}
                                {type === "MCQ" ? (
                                    <>
                                        {["A", "B", "C", "D"].map((k) => {
                                            const raw = q.options?.[k] || "";
                                            const text = cleanAnswerText(raw); // ✅ XOÁ ‘ ’
                                            const isCorrect = q.correctAnswer === k;
                                            const isSelected = q.selectedAnswer === k;
                                            const isWrongSelected = isSelected && !isCorrect;

                                            return (
                                                <Box
                                                    key={k}
                                                    sx={{
                                                        p: 1.2,
                                                        borderRadius: 2,
                                                        border: "2px solid",
                                                        borderColor: isCorrect ? "#1B5E20" : isWrongSelected ? "#B00020" : "#E3E8EF",
                                                        bgcolor: isCorrect
                                                            ? "rgba(27,94,32,0.08)"
                                                            : isWrongSelected
                                                                ? "rgba(176,0,32,0.06)"
                                                                : "#fff",
                                                        mb: 1,
                                                        display: "flex",
                                                        gap: 1,
                                                        alignItems: "flex-start",
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 900, width: 26 }}>{k}.</Typography>

                                                    {/* ✅ BỎ IN ĐẬM + giữ wrap */}
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 400,
                                                            color: "#1B2559",
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {text || "(trống)"}
                                                    </Typography>

                                                    <Box sx={{ flex: 1 }} />

                                                    {isCorrect ? <Chip size="small" label="ĐÚNG" sx={{ fontWeight: 900 }} /> : null}
                                                </Box>
                                            );
                                        })}
                                    </>
                                ) : (
                                    /* ===== ESSAY ===== */
                                    <Box sx={{ display: "grid", gap: 1.25 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                                                Câu trả lời của bạn
                                            </Typography>
                                            <Typography sx={{ mt: 0.5, color: "#000000", fontWeight: 400, whiteSpace: "pre-wrap" }}>
                                                {q.yourAnswer || "(chưa trả lời)"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                                                Gợi ý đáp án (sample)
                                            </Typography>
                                            <Typography sx={{ mt: 0.5, color: "#716f6f", fontWeight: 400, whiteSpace: "pre-wrap" }}>
                                                {q.sampleAnswer || "(không có)"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* feedback chung per-question */}
                                {q.feedback ? (
                                    <Box sx={{ mt: 1.5 }}>
                                        <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                                            Giải thích / Gợi ý học lại
                                        </Typography>
                                        <Typography sx={{ mt: 0.5, color: "#716f6f", fontWeight: 400, whiteSpace: "pre-wrap" }}>
                                            {q.feedback}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </Box>
                        );
                    })
                )}
            </DialogContent>
        </Dialog>
    );
}