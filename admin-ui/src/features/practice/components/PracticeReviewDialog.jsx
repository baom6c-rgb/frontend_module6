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
    useMediaQuery,
    useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// ✅ Syntax highlight
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function cleanAnswerText(raw) {
    if (raw == null) return "";
    return String(raw)
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .trim();
}

function looksLikeCode(text) {
    if (!text) return false;
    const t = String(text).trim();
    if (!t) return false;

    // ✅ Nếu có code fence thì chắc chắn là code
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

/**
 * ✅ Khớp với QuestionCard.jsx:
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
        return { title: DEFAULT_CODE_TITLE, body: trimmedStart.trim() };
    }

    const fenceIdx = text.indexOf("```");
    if (fenceIdx > 0) {
        const before = text.slice(0, fenceIdx).trim();
        const after = text.slice(fenceIdx).trim();
        return { title: before || DEFAULT_CODE_TITLE, body: after || "" };
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
                mt: 1,
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

/**
 * ✅ Compact code block for MCQ options (khớp AnswerOption.jsx style)
 */
function CodeBlockCompact({ language, code }) {
    const label = (language || "code").toUpperCase();

    return (
        <Box
            sx={{
                border: "1px solid #E3E8EF",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "#0f172a",
                width: "100%",
            }}
        >
            <Box sx={{ px: 1.25, py: 0.5, bgcolor: "rgba(255,255,255,0.06)" }}>
                <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#E5E7EB" }}>
                    {label}
                </Typography>
            </Box>

            <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    background: "transparent",
                    padding: "10px 12px",
                    fontSize: 12,
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
    );
}

function QuestionContent({ raw }) {
    const { title, body } = useMemo(() => splitTitleAndBody(raw), [raw]);

    const fenced = useMemo(
        () =>
            parseCodeFence(body) ||
            parseCodeFence(raw) ||
            parseInlineBacktick(body) ||
            parseInlineBacktick(raw),
        [body, raw]
    );

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
                                    fontWeight: 400,
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
                                    fontWeight: 400,
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

/**
 * ✅ Render MCQ option text like AnswerOption.jsx:
 * - If option contains code fence => compact SyntaxHighlighter
 * - Else => normal Typography
 */
function OptionContent({ raw }) {
    const cleaned = useMemo(() => cleanAnswerText(raw), [raw]);
    const parsed = useMemo(() => parseCodeFence(cleaned), [cleaned]);
    const isCode = Boolean(parsed);

    if (isCode) {
        return <CodeBlockCompact language={parsed.language} code={parsed.code} />;
    }

    return (
        <Typography
            sx={{
                fontWeight: 400,
                color: "#1B2559",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}
        >
            {cleaned || "(trống)"}
        </Typography>
    );
}

// =====================
// ✅ Assigned-exam compatibility helpers (không ảnh hưởng practice)
// =====================
function pickTextAnswer(q) {
    const v =
        q?.yourAnswer ??
        q?.answerText ??
        q?.studentAnswer ??
        q?.userAnswer ??
        q?.submittedAnswer ??
        q?.answer ??
        "";
    return v == null ? "" : String(v);
}

function pickSampleAnswer(q) {
    const v =
        q?.sampleAnswer ??
        q?.expectedAnswer ??
        q?.referenceAnswer ??
        q?.correctAnswerText ??
        q?.correctText ??
        "";

    // ⚠️ nếu correctAnswer là string dài (tự luận) thì dùng luôn
    if (!v && q?.correctAnswer && typeof q.correctAnswer === "string" && q.correctAnswer.length > 2) {
        return q.correctAnswer;
    }
    return v == null ? "" : String(v);
}

function detectQuestionType(q) {
    const rawType = (q?.questionType ?? q?.type ?? "").toString().toUpperCase();
    if (rawType) return rawType;

    const hasOptionsObject =
        q?.options && typeof q.options === "object" && Object.keys(q.options).length > 0;

    const selected = q?.selectedAnswer;
    const selectedLooksLikeChoice =
        typeof selected === "string" && ["A", "B", "C", "D", "E"].includes(selected.toUpperCase());

    if (hasOptionsObject || selectedLooksLikeChoice) return "MCQ";

    return "SHORT_ANSWER";
}

function typeLabel(type, isMcq) {
    if (isMcq) return "MCQ";
    const t = String(type || "").toUpperCase();
    if (t.includes("ESSAY")) return "Tự luận";
    return "Tự luận ngắn";
}

export default function PracticeReviewDialog({ open, onClose, review }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // < 600px

    const [onlyWrong, setOnlyWrong] = useState(false);

    const items = review?.items || [];

    // ✅ FE source-of-truth for count (fix assigned-exam trả totalQuestions thiếu)
    const computedTotal = useMemo(() => items.length, [items]);
    const computedCorrect = useMemo(() => {
        return items.reduce((acc, it) => acc + (it?.isCorrect === true ? 1 : 0), 0);
    }, [items]);

    const totalQuestionsSafe = useMemo(() => {
        const apiTotal = Number(review?.totalQuestions);
        if (!Number.isFinite(apiTotal) || apiTotal <= 0) return computedTotal;
        if (apiTotal !== computedTotal) return computedTotal;
        return apiTotal;
    }, [review?.totalQuestions, computedTotal]);

    const correctCountSafe = useMemo(() => {
        const apiCorrect = Number(review?.correctCount);
        if (!Number.isFinite(apiCorrect) || apiCorrect < 0) return computedCorrect;
        if (apiCorrect !== computedCorrect) return computedCorrect;
        return apiCorrect;
    }, [review?.correctCount, computedCorrect]);

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
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={isMobile}
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    m: isMobile ? 0 : 2,
                },
            }}
        >
            {/* ===== TITLE ===== */}
            <DialogTitle
                sx={{
                    fontWeight: 900,
                    color: "#1B2559",
                    fontSize: { xs: "1rem", sm: "1.25rem" },
                    pr: 6,
                    py: { xs: 1.5, sm: 2 },
                }}
            >
                Xem lại đáp án
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ position: "absolute", right: 10, top: 10 }}
                >
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: "#F7F9FC", p: { xs: 1.5, sm: 2 } }}>
                {/* ===== SCORE + FILTER BUTTON ===== */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                        mb: 2,
                    }}
                >
                    {/* Chips bên trái */}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip
                            size="small"
                            label={`Score: ${review?.score ?? 0}/100`}
                            sx={{ fontWeight: 900, fontSize: { xs: 11, sm: 13 } }}
                        />
                        <Chip
                            size="small"
                            label={`Đúng: ${correctCountSafe}/${totalQuestionsSafe}`}
                            sx={{ fontWeight: 900, fontSize: { xs: 11, sm: 13 } }}
                        />
                    </Stack>

                    {/* Nút bên phải */}
                    <Button
                        size="small"
                        variant={onlyWrong ? "contained" : "outlined"}
                        onClick={() => setOnlyWrong((v) => !v)}
                        sx={{
                            fontWeight: 900,
                            fontSize: { xs: 11, sm: 13 },
                            px: { xs: 1.25, sm: 2 },
                            py: { xs: 0.5, sm: 0.75 },
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                    >
                        {onlyWrong ? "Xem toàn bộ câu" : "Chỉ xem câu sai"}
                    </Button>
                </Box>

                {/* ===== QUESTION LIST ===== */}
                {filtered.length === 0 ? (
                    <Typography sx={{ color: onlyWrong ? "#1B5E20" : "#ff0202", fontWeight: 800 }}>
                        {onlyWrong ? "Không có câu sai 🎉" : "Không có dữ liệu để hiển thị."}
                    </Typography>
                ) : (
                    filtered.map((q, idx) => {
                        // ✅ robust type detect (không làm hỏng practice)
                        const type = detectQuestionType(q);
                        const rawContent =
                            q?.content ??
                            q?.question ??
                            q?.questionText ??
                            q?.title ??
                            q?.stem ??
                            "Câu hỏi";

                        const isMcq = String(type).toUpperCase() === "MCQ";

                        return (
                            <Box
                                key={q.questionId || `${q._no}_${idx}`}
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 3,
                                    border: "1px solid #E3E8EF",
                                    bgcolor: "#fff",
                                    mb: 2,
                                }}
                            >
                                {/* Header: Câu N + chips — 2 dòng gọn gàng trên mobile */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 0.75,
                                        mb: 1,
                                    }}
                                >
                                    {/* Trái: Câu N + loại + đúng/sai */}
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        flexWrap="wrap"
                                        useFlexGap
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 900,
                                                color: "#1B2559",
                                                fontSize: { xs: 13, sm: 15 },
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Câu {q._no}:
                                        </Typography>

                                        <Chip
                                            size="small"
                                            label={typeLabel(type, isMcq)}
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: { xs: 10, sm: 12 },
                                                height: { xs: 22, sm: 24 },
                                                bgcolor: isMcq ? "rgba(11,94,215,0.10)" : "rgba(255,140,0,0.12)",
                                                color: isMcq ? "#0B5ED7" : "#FF8C00",
                                            }}
                                        />

                                        <Chip
                                            size="small"
                                            label={q.isCorrect ? "ĐÚNG" : "SAI"}
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: { xs: 10, sm: 12 },
                                                height: { xs: 22, sm: 24 },
                                                bgcolor: q.isCorrect ? "rgba(27,94,32,0.12)" : "rgba(176,0,32,0.12)",
                                                color: q.isCorrect ? "#1B5E20" : "#B00020",
                                            }}
                                        />
                                    </Stack>

                                    {/* Phải: Điểm */}
                                    {Number.isFinite(q?.score) && Number.isFinite(q?.maxScore) ? (
                                        <Chip
                                            size="small"
                                            label={`Điểm: ${q.score}/${q.maxScore}`}
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: { xs: 10, sm: 12 },
                                                height: { xs: 22, sm: 24 },
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : null}
                                </Box>

                                {/* Question content */}
                                <QuestionContent raw={rawContent} />

                                <Divider sx={{ my: 1.5 }} />

                                {isMcq ? (
                                    <>
                                        {["A", "B", "C", "D"].map((k) => {
                                            const rawOpt = q?.options?.[k];
                                            const isCorrect = q?.correctAnswer === k;
                                            const isSelected = q?.selectedAnswer === k;
                                            const isWrongSelected = isSelected && !isCorrect;

                                            return (
                                                <Box
                                                    key={k}
                                                    sx={{
                                                        p: { xs: 1, sm: 1.2 },
                                                        borderRadius: 2,
                                                        border: "2px solid",
                                                        borderColor: isCorrect
                                                            ? "#1B5E20"
                                                            : isWrongSelected
                                                                ? "#B00020"
                                                                : "#E3E8EF",
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
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 900,
                                                            width: 22,
                                                            fontSize: { xs: 13, sm: 14 },
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {k}.
                                                    </Typography>

                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <OptionContent raw={rawOpt} />
                                                    </Box>

                                                    {isCorrect ? (
                                                        <Chip
                                                            size="small"
                                                            label="ĐÚNG"
                                                            sx={{
                                                                fontWeight: 900,
                                                                fontSize: { xs: 10, sm: 12 },
                                                                height: { xs: 20, sm: 24 },
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    ) : null}
                                                </Box>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <Box sx={{ display: "grid", gap: 1.25 }}>
                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontWeight: 900,
                                                    color: "#2B3674",
                                                    fontSize: { xs: 13, sm: 14 },
                                                }}
                                            >
                                                Câu trả lời của bạn
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    mt: 0.5,
                                                    color: "#000000",
                                                    fontWeight: 400,
                                                    whiteSpace: "pre-wrap",
                                                    fontSize: { xs: 13, sm: 14 },
                                                }}
                                            >
                                                {pickTextAnswer(q) ? pickTextAnswer(q) : "(chưa trả lời)"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontWeight: 900,
                                                    color: "#2B3674",
                                                    fontSize: { xs: 13, sm: 14 },
                                                }}
                                            >
                                                Gợi ý đáp án (sample)
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    mt: 0.5,
                                                    color: "#716f6f",
                                                    fontWeight: 400,
                                                    whiteSpace: "pre-wrap",
                                                    fontSize: { xs: 13, sm: 14 },
                                                }}
                                            >
                                                {pickSampleAnswer(q) ? pickSampleAnswer(q) : "(không có)"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {q?.feedback ? (
                                    <Box sx={{ mt: 1.5 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 900,
                                                color: "#2B3674",
                                                fontSize: { xs: 13, sm: 14 },
                                            }}
                                        >
                                            Giải thích / Gợi ý học lại
                                        </Typography>
                                        <Typography
                                            sx={{
                                                mt: 0.5,
                                                color: "#716f6f",
                                                fontWeight: 400,
                                                whiteSpace: "pre-wrap",
                                                fontSize: { xs: 13, sm: 14 },
                                            }}
                                        >
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