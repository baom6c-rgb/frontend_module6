// src/features/adminExams/AdminExamDetailPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";
import AppPagination from "../../components/common/AppPagination";

import { assignedExamApi } from "../../api/assignedExamApi";
import AssignUsersDialog from "./components/AssignUsersDialog";
import QuestionCard from "../practice/components/QuestionCard";

// ✅ Syntax highlight (match PracticeReviewDialog)
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
};

// ======================================================
// DateTime utils (LOCAL-first for LocalDateTime)
// ======================================================
function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // has timezone -> parse normally
    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // LocalDateTime no timezone
    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?$/
    );
    if (!m) return null;

    const [, yy, mm, dd, hh, mi, ss, frac] = m;
    const year = Number(yy);
    const month = Number(mm) - 1;
    const day = Number(dd);
    const hour = Number(hh);
    const minute = Number(mi);
    const second = Number(ss || 0);
    const ms = frac ? Number(String(frac).padEnd(3, "0").slice(0, 3)) : 0;

    const d = new Date(year, month, day, hour, minute, second, ms);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatServerDateTime(input) {
    const d = parseServerDateTime(input);
    if (!d) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    } catch {
        return d.toLocaleString();
    }
}

const toLocalInput = (isoOrLocalDateTime) => {
    const d = parseServerDateTime(isoOrLocalDateTime);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
};

const toLocalDateTimeOrNull = (localStr) => {
    if (!localStr) return null;
    const s = String(localStr).trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
    return `${s}:00`;
};

// ======================================================
// Options helpers
// ======================================================
function parseOptions(optionsJson) {
    if (!optionsJson) return null;
    try {
        const data = JSON.parse(optionsJson);

        // object map {A:..., B:...}
        if (data && typeof data === "object" && !Array.isArray(data)) return data;

        // array -> map to A,B,C...
        if (Array.isArray(data)) {
            const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
            const out = {};
            data.forEach((text, idx) => {
                if (idx < labels.length) out[labels[idx]] = String(text ?? "").trim();
            });
            return out;
        }
    } catch {
        // ignore
    }
    return null;
}

// ======================================================
// ✅ Review UI: render code like PracticeReviewDialog
// ======================================================
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
    ];
    const hintHit = codeHints.some((h) => t.includes(h));

    if (hasNewline) return hintHit;

    const singleLineStrongHints = ["for (", "if (", "while (", "System.out", ";", "{", "}", "=>"];
    const strongHit = singleLineStrongHints.some((h) => t.includes(h));
    return strongHit && hintHit;
}

/**
 * Split title/body like QuestionCard behavior
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
                border: `1px solid ${COLORS.border}`,
                bgcolor: "#0f172a",
            }}
        >
            <Box sx={{ px: 1.25, py: 0.75, bgcolor: "rgba(255,255,255,0.06)" }}>
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

function CodeBlockCompact({ language, code }) {
    const label = (language || "code").toUpperCase();

    return (
        <Box
            sx={{
                border: `1px solid ${COLORS.border}`,
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
                    color: COLORS.textPrimary,
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
                                border: `1px solid ${COLORS.border}`,
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
                                    color: COLORS.textPrimary,
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
                                border: `1px solid ${COLORS.border}`,
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
                                    color: COLORS.textPrimary,
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

function OptionContent({ raw }) {
    const cleaned = useMemo(() => cleanAnswerText(raw), [raw]);
    const parsed = useMemo(() => parseCodeFence(cleaned), [cleaned]);
    const isCode = Boolean(parsed);

    if (isCode) return <CodeBlockCompact language={parsed.language} code={parsed.code} />;

    return (
        <Typography
            sx={{
                fontWeight: 400,
                color: COLORS.textPrimary,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}
        >
            {cleaned || "(trống)"}
        </Typography>
    );
}

// ======================================================
// ✅ Review mapping helpers (selected answer + essay rendering)
// ======================================================
function normalizeChoiceToKey(raw, options) {
    if (raw == null) return null;

    if (typeof raw === "number" && Number.isFinite(raw)) {
        const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
        return labels[raw] ?? null;
    }

    const s = String(raw).trim();
    if (!s) return null;

    const upper = s.toUpperCase();
    if (/^[A-H]$/.test(upper)) return upper;

    if (/^\d+$/.test(s)) {
        const idx = Number(s);
        const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
        return labels[idx] ?? labels[idx - 1] ?? null;
    }

    // if server returns TEXT -> map back to key
    if (options && typeof options === "object") {
        const target = s.replace(/\s+/g, " ").trim().toLowerCase();
        for (const [k, v] of Object.entries(options)) {
            const vv = String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
            if (vv && vv === target) return String(k).toUpperCase();
        }
    }

    return null;
}

function pickSelectedAnswer(it, options) {
    const raw =
        it?.selectedAnswer ??
        it?.yourAnswer ??
        it?.studentAnswer ??
        it?.userAnswer ??
        it?.submittedAnswer ??
        it?.chosenAnswer ??
        it?.pickedAnswer ??
        it?.answer ??
        it?.answerKey ??
        it?.selectedOption ??
        null;

    return normalizeChoiceToKey(raw, options);
}

// ✅ ESSAY: student's text answer (very robust fallback)
function pickEssayAnswerText(it) {
    const v =
        it?.yourAnswerText ?? // already normalized by other layer
        it?.yourAnswer ??
        it?.selectedAnswer ?? // fallback from BE if reused field
        it?.answerText ??
        it?.studentAnswerText ??
        it?.studentTextAnswer ??
        it?.responseText ??
        it?.writtenAnswer ??
        it?.essayAnswer ??
        it?.textAnswer ??
        it?.studentAnswer ??
        it?.userAnswer ??
        it?.submittedAnswer ??
        it?.answer ??
        it?.essay ??
        it?.text ??
        "";
    return v == null ? "" : String(v);
}

// essay: sample/rubric stored in "explanation" (q.analysis)
// sometimes is JSON: { sampleAnswer, keywords, maxScore }
function pickEssaySample(explanation) {
    if (!explanation) return "";
    const s = String(explanation);

    try {
        const obj = JSON.parse(s);
        if (obj && typeof obj === "object") {
            const sample = obj.sampleAnswer ?? obj.expectedAnswer ?? obj.referenceAnswer ?? "";
            const keywords = Array.isArray(obj.keywords) ? obj.keywords.filter(Boolean) : [];
            const maxScore = obj.maxScore;

            const parts = [];
            if (sample) parts.push(String(sample));
            if (keywords.length) parts.push(`Keywords: ${keywords.join(", ")}`);
            if (Number.isFinite(Number(maxScore))) parts.push(`Max score: ${Number(maxScore)}`);

            return parts.filter(Boolean).join("\n");
        }
    } catch {
        // ignore
    }
    return s;
}

function detectQuestionType(it) {
    const rawType = (it?.questionType ?? it?.type ?? "").toString().toUpperCase();
    if (rawType) return rawType;

    const optionsObj = it?.options && typeof it.options === "object" ? it.options : null;
    const optionsFromJson = parseOptions(it?.optionsJson);
    const hasOptions = (optionsObj && Object.keys(optionsObj).length > 0) || (optionsFromJson && Object.keys(optionsFromJson).length > 0);

    const selected = it?.selectedAnswer;
    const selectedLooksLikeChoice =
        typeof selected === "string" && ["A", "B", "C", "D", "E", "F", "G", "H"].includes(selected.toUpperCase());

    if (hasOptions || selectedLooksLikeChoice) return "MCQ";
    return "ESSAY";
}

function typeLabel(type) {
    const t = String(type || "").toUpperCase();
    if (t === "MCQ") return "MCQ";
    if (t.includes("SHORT")) return "Tự luận ngắn";
    return "Tự luận";
}

function normalizeReviewItem(it) {
    const options =
        it?.options && typeof it.options === "object"
            ? it.options
            : parseOptions(it?.optionsJson) || null;

    const type = detectQuestionType(it);
    const isMcq = String(type).toUpperCase() === "MCQ";

    const correct = isMcq
        ? normalizeChoiceToKey(it?.correctAnswer ?? it?.correctOption ?? it?.answerCorrect ?? null, options)
        : null;

    const selected = isMcq ? pickSelectedAnswer(it, options) : null;

    const isCorrect =
        typeof it?.isCorrect === "boolean"
            ? it.isCorrect
            : typeof it?.correct === "boolean"
                ? it.correct
                : isMcq && correct && selected
                    ? correct === selected
                    : false;

    const essayText = !isMcq ? pickEssayAnswerText(it) : "";

    return {
        questionId: it?.questionId ?? it?.id ?? null,
        questionType: type,
        content: it?.content ?? it?.question ?? it?.questionText ?? "",
        optionsJson: it?.optionsJson ?? null,
        options,

        // MCQ
        correctAnswer: correct,
        selectedAnswer: selected,

        // ESSAY
        yourAnswerText: essayText,
        sampleAnswerText: !isMcq ? pickEssaySample(it?.feedback ?? it?.explanation ?? it?.analysis ?? "") : "",

        isCorrect,
        explanation: it?.explanation ?? it?.analysis ?? "",
    };
}

export default function AdminExamDetailPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0);
    const [detail, setDetail] = useState(null);
    const [cheating, setCheating] = useState([]);

    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);

    // pagination
    const [assignPagination, setAssignPagination] = useState({ page: 0, pageSize: 10 });
    const [cheatingPagination, setCheatingPagination] = useState({ page: 0, pageSize: 10 });

    // editable fields
    const [title, setTitle] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [openAt, setOpenAt] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [assignedUserIds, setAssignedUserIds] = useState([]);

    // ===== Review dialog state =====
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [reviewMeta, setReviewMeta] = useState(null);
    const [reviewItems, setReviewItems] = useState([]);
    const [onlyWrong, setOnlyWrong] = useState(false);

    const loadDetail = async () => {
        if (!examId) return;
        setLoading(true);
        try {
            const d = await assignedExamApi.adminDetail(examId);
            setDetail(d);

            setTitle(d?.title || d?.name || "");
            setDurationMinutes(d?.durationMinutes ?? d?.duration ?? "");

            // NOTE: detail response may not have openAt/dueAt top-level
            setOpenAt(toLocalInput(d?.openAt || d?.availableFrom));
            setDueAt(toLocalInput(d?.dueAt || d?.availableTo));

            const assignments = d?.assignments || d?.assignedUsers || [];
            const ids = Array.isArray(assignments)
                ? assignments
                    .map((a) => a.userId ?? a.studentId ?? a.user?.id ?? a.student?.id)
                    .filter(Boolean)
                : [];
            setAssignedUserIds(ids);
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Không tải được chi tiết", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadCheating = async () => {
        if (!examId) return;
        try {
            const d = await assignedExamApi.adminCheatingLogs(examId);
            const list = Array.isArray(d) ? d : d?.items || d?.content || [];
            setCheating(Array.isArray(list) ? list : []);
        } catch {
            setCheating([]);
        }
    };

    useEffect(() => {
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    useEffect(() => {
        if (tab !== 2) return;
        loadCheating();
        const t = setInterval(loadCheating, 5000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, examId]);

    const questions = useMemo(() => {
        const q = detail?.questions || detail?.items || [];
        const arr = Array.isArray(q) ? q : [];
        return arr.map((it, idx) => {
            const optionsMap =
                it?.options && typeof it.options === "object" ? it.options : parseOptions(it?.optionsJson);

            return {
                ...it,
                id: it?.id ?? it?.questionId ?? idx,
                questionType: it?.questionType ?? it?.type,
                content: it?.content ?? it?.question ?? "",
                question: it?.question ?? it?.content ?? "",
                options: optionsMap ?? it?.options ?? null,
                optionsJson: it?.optionsJson ?? null,
            };
        });
    }, [detail]);

    const assignments = useMemo(() => {
        const a = detail?.assignments || detail?.assignedUsers || [];
        return Array.isArray(a) ? a : [];
    }, [detail]);

    const assignmentRows = useMemo(() => {
        return assignments.map((a, idx) => {
            const startedAtRaw = a.startedAt ?? null;
            const submittedAtRaw = a.submittedAt ?? null;

            const assignmentId = a.assignmentId ?? a.id ?? null;
            const attemptId = a.attemptId ?? a.attempt?.id ?? null;

            return {
                id: assignmentId ?? `${a.studentId ?? idx}`,
                assignmentId,
                attemptId,

                fullName: a.studentFullName ?? "—",
                email: a.studentEmail ?? "—",
                status: a.status ?? "—",

                startedAtText: formatServerDateTime(startedAtRaw),
                submittedAtText: formatServerDateTime(submittedAtRaw),
            };
        });
    }, [assignments]);

    const openReviewForRow = useCallback(
        async (row) => {
            const assignmentId = row?.assignmentId;
            if (!assignmentId) {
                showToast("Không tìm thấy assignmentId", "error");
                return;
            }

            setReviewOpen(true);
            setOnlyWrong(false);
            setReviewLoading(true);
            setReviewError("");
            setReviewMeta({
                fullName: row.fullName,
                email: row.email,
                status: row.status,
                startedAtText: row.startedAtText,
                submittedAtText: row.submittedAtText,
                score: null,
                correctCount: null,
                totalQuestions: null,
            });
            setReviewItems([]);

            try {
                const data = await assignedExamApi.adminAssignmentReview(examId, assignmentId);

                const itemsRaw = Array.isArray(data?.items) ? data.items : [];
                const normalizedItems = itemsRaw.map(normalizeReviewItem);
                setReviewItems(normalizedItems);

                const computedTotal = normalizedItems.length;
                const computedCorrect = normalizedItems.reduce((acc, it) => acc + (it?.isCorrect === true ? 1 : 0), 0);

                setReviewMeta((prev) => ({
                    ...prev,
                    score: Number.isFinite(Number(data?.score)) ? Number(data.score) : Number(data?.scorePct) || 0,
                    correctCount:
                        Number.isFinite(Number(data?.correctCount)) && Number(data.correctCount) >= 0
                            ? Number(data.correctCount)
                            : computedCorrect,
                    totalQuestions:
                        Number.isFinite(Number(data?.totalQuestions)) && Number(data.totalQuestions) > 0
                            ? Number(data.totalQuestions)
                            : computedTotal,
                    attemptId: data?.attemptId ?? null,
                }));
            } catch (e) {
                const msg = e?.response?.data?.message || e?.message || "Không tải được review";
                setReviewError(msg);
            } finally {
                setReviewLoading(false);
            }
        },
        [examId, showToast]
    );

    const assignmentColumns = useMemo(
        () => [
            { field: "fullName", headerName: "Họ tên", flex: 1, minWidth: 180 },
            { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
            {
                field: "status",
                headerName: "Trạng thái",
                width: 140,
                renderCell: (params) => {
                    const map = {
                        ASSIGNED: "Đã giao",
                        STARTED: "Đang làm",
                        SUBMITTED: "Đã nộp",
                        CANCELED: "Đã hủy",
                    };
                    return <span>{map[params.value] ?? params.value}</span>;
                },
            },
            { field: "startedAtText", headerName: "Bắt đầu", width: 200 },
            { field: "submittedAtText", headerName: "Nộp", width: 200 },
            {
                field: "actions",
                headerName: "",
                width: 90,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                renderCell: (params) => {
                    const row = params.row;
                    const hasAttempt = Boolean(row.attemptId);
                    const isSubmitted = String(row.status || "").toUpperCase() === "SUBMITTED";
                    const canView = hasAttempt || isSubmitted;

                    return (
                        <Tooltip title={canView ? "Xem lại kết quả" : "Chưa có bài làm"}>
                            <span>
                                <IconButton size="small" disabled={!canView} onClick={() => openReviewForRow(row)}>
                                    <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    );
                },
            },
        ],
        [openReviewForRow]
    );

    const cheatingRows = useMemo(() => {
        const list = Array.isArray(cheating) ? cheating : [];
        return list.map((c, idx) => {
            const detectedRaw = c.createdAt ?? c.detectedAt ?? c.eventTime ?? c.timestamp ?? null;
            return {
                id: c.id ?? idx,
                fullName: c.studentFullName ?? "—",
                email: c.studentEmail ?? "—",
                type: c.type ?? "—",
                detectedAtText: formatServerDateTime(detectedRaw),
            };
        });
    }, [cheating]);

    const cheatingColumns = useMemo(
        () => [
            { field: "fullName", headerName: "Học viên", flex: 1, minWidth: 180 },
            { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
            {
                field: "type",
                headerName: "Vi phạm",
                width: 200,
                renderCell: (params) => {
                    const map = {
                        TAB_SWITCH: "Chuyển tab",
                        VISIBILITY_HIDDEN: "Ẩn tab trình duyệt",
                        DEVTOOLS: "Mở DevTools",
                        COPY: "Sao chép nội dung",
                        PASTE: "Dán nội dung",
                        FULLSCREEN_EXIT: "Thoát toàn màn hình",
                        BLUR: "Rời khỏi trang",
                    };
                    const label = map[params.value] ?? params.value;
                    return <span>{label}</span>;
                },
            },
            { field: "detectedAtText", headerName: "Thời gian", width: 220 },
        ],
        []
    );

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                title: String(title || "").trim(),
                durationMinutes: Number(durationMinutes) || null,
                openAt: toLocalDateTimeOrNull(openAt),
                dueAt: toLocalDateTimeOrNull(dueAt),
                assignedUserIds,
            };

            await assignedExamApi.adminUpdate(examId, payload);
            showToast("Đã cập nhật", "success");
            setEditOpen(false);
            await loadDetail();
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Cập nhật thất bại", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setConfirmDel(false);
        setLoading(true);
        try {
            await assignedExamApi.adminDelete(examId);
            showToast("Đã xóa bài kiểm tra", "success");
            navigate("/admin/exams");
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Xóa thất bại", "error");
        } finally {
            setLoading(false);
        }
    };

    // ===== Review derived =====
    const reviewItemsWithNo = useMemo(
        () => reviewItems.map((it, index) => ({ ...it, _no: index + 1 })),
        [reviewItems]
    );

    const reviewFiltered = useMemo(() => {
        if (!onlyWrong) return reviewItemsWithNo;
        return reviewItemsWithNo.filter((x) => x?.isCorrect === false);
    }, [reviewItemsWithNo, onlyWrong]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary }}>
                        {detail?.title || detail?.name || `Bài kiểm tra #${examId}`}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                        <Chip label={`Số câu: ${questions.length || "—"}`} />
                        <Chip label={`Thời gian: ${detail?.durationMinutes ?? detail?.duration ?? "—"} phút`} />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate("/admin/exams")}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                    >
                        Quay lại
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setEditOpen(true)}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 900,
                            bgcolor: COLORS.orange,
                            "&:hover": { bgcolor: COLORS.orangeDeep },
                        }}
                    >
                        Sửa
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setConfirmDel(true)}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                    >
                        Xóa
                    </Button>
                </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: COLORS.border, overflow: "hidden" }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1 }}>
                    <Tab label="Câu hỏi" />
                    <Tab label={`Học viên (${assignments.length})`} />
                    <Tab label="Gian lận" />
                </Tabs>
                <Divider />

                <Box sx={{ p: 2.5 }}>
                    {tab === 0 && (
                        <Stack spacing={1.25}>
                            {questions.length === 0 ? (
                                <Typography sx={{ color: COLORS.textSecondary }}>Chưa có danh sách câu hỏi.</Typography>
                            ) : (
                                questions.map((q, idx) => <QuestionCard key={q.id || idx} question={q} index={idx} />)
                            )}
                        </Stack>
                    )}

                    {tab === 1 && (
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: COLORS.border,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <Box sx={{ flex: 1, minHeight: 0 }}>
                                <DataGrid
                                    rows={assignmentRows}
                                    columns={assignmentColumns}
                                    autoHeight
                                    disableRowSelectionOnClick
                                    disableColumnMenu
                                    hideFooter
                                    paginationModel={assignPagination}
                                    onPaginationModelChange={setAssignPagination}
                                    pageSizeOptions={[10, 25, 50]}
                                    sx={{
                                        border: 0,
                                        height: "100%",
                                        "& .MuiDataGrid-columnHeaders": {
                                            bgcolor: "background.paper",
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                        },
                                        "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
                                        "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
                                    }}
                                />
                            </Box>

                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    borderTop: "1px solid",
                                    borderColor: "divider",
                                    display: "flex",
                                    flexDirection: { xs: "column", md: "row" },
                                    alignItems: { xs: "flex-end", md: "center" },
                                    justifyContent: "space-between",
                                    gap: 1,
                                }}
                            >
                                <Chip label={`Tổng: ${assignmentRows.length}`} size="small" sx={{ justifyContent: "center" }} />
                                <Box sx={{ alignSelf: "flex-end" }}>
                                    <AppPagination
                                        page={assignPagination.page + 1}
                                        pageSize={assignPagination.pageSize}
                                        total={assignmentRows.length}
                                        onPageChange={(p) => setAssignPagination((prev) => ({ ...prev, page: p - 1 }))}
                                        onPageSizeChange={(s) => setAssignPagination({ page: 0, pageSize: s })}
                                    />
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {tab === 2 && (
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: COLORS.border,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <Box sx={{ flex: 1, minHeight: 0 }}>
                                <DataGrid
                                    rows={cheatingRows}
                                    columns={cheatingColumns}
                                    autoHeight
                                    disableRowSelectionOnClick
                                    disableColumnMenu
                                    hideFooter
                                    paginationModel={cheatingPagination}
                                    onPaginationModelChange={setCheatingPagination}
                                    pageSizeOptions={[10, 25, 50]}
                                    sx={{
                                        border: 0,
                                        height: "100%",
                                        "& .MuiDataGrid-columnHeaders": {
                                            bgcolor: "background.paper",
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                        },
                                        "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
                                        "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
                                    }}
                                />
                            </Box>

                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    borderTop: "1px solid",
                                    borderColor: "divider",
                                    display: "flex",
                                    flexDirection: { xs: "column", md: "row" },
                                    alignItems: { xs: "flex-end", md: "center" },
                                    justifyContent: "space-between",
                                    gap: 1,
                                }}
                            >
                                <Chip label={`Tổng: ${cheatingRows.length}`} size="small" sx={{ justifyContent: "center" }} />
                                <Box sx={{ alignSelf: "flex-end" }}>
                                    <AppPagination
                                        page={cheatingPagination.page + 1}
                                        pageSize={cheatingPagination.pageSize}
                                        total={cheatingRows.length}
                                        onPageChange={(p) => setCheatingPagination((prev) => ({ ...prev, page: p - 1 }))}
                                        onPageSizeChange={(s) => setCheatingPagination({ page: 0, pageSize: s })}
                                    />
                                </Box>
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Paper>

            {/* ======================================================
                ✅ Review dialog (UI giống PracticeReviewDialog)
               ====================================================== */}
            <Dialog
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                fullWidth
                fullScreen={isMobile}
                maxWidth="md"
                PaperProps={{
                    sx: { borderRadius: isMobile ? 0 : 3, m: isMobile ? 0 : 2 },
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 900,
                        color: COLORS.textPrimary,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                        pr: 6,
                        py: { xs: 1.5, sm: 2 },
                    }}
                >
                    Xem lại đáp án
                    <IconButton
                        onClick={() => setReviewOpen(false)}
                        size="small"
                        sx={{ position: "absolute", right: 10, top: 10 }}
                    >
                        <CloseRoundedIcon />
                    </IconButton>

                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mt: 0.5 }}>
                        {reviewMeta?.fullName || "—"} · {reviewMeta?.email || "—"}
                    </Typography>
                </DialogTitle>

                <DialogContent dividers sx={{ bgcolor: "#F7F9FC", p: { xs: 1.5, sm: 2 } }}>
                    {reviewLoading && (
                        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 1, color: COLORS.textSecondary }}>Đang tải review...</Typography>
                        </Stack>
                    )}

                    {!reviewLoading && reviewError && <Alert severity="error">{reviewError}</Alert>}

                    {!reviewLoading && !reviewError && (
                        <>
                            {/* Score + filter */}
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
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    <Chip
                                        size="small"
                                        label={`Score: ${Number.isFinite(Number(reviewMeta?.score)) ? Number(reviewMeta.score) : 0}/100`}
                                        sx={{ fontWeight: 900, fontSize: { xs: 11, sm: 13 } }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Đúng: ${Number(reviewMeta?.correctCount ?? 0)}/${Number(
                                            reviewMeta?.totalQuestions ?? reviewItems.length
                                        )}`}
                                        sx={{ fontWeight: 900, fontSize: { xs: 11, sm: 13 } }}
                                    />
                                </Stack>

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

                            {reviewFiltered.length === 0 ? (
                                <Typography sx={{ color: onlyWrong ? "#1B5E20" : "#ff0202", fontWeight: 800 }}>
                                    {onlyWrong ? "Không có câu sai 🎉" : "Không có dữ liệu để hiển thị."}
                                </Typography>
                            ) : (
                                reviewFiltered.map((q, idx) => {
                                    const type = String(q?.questionType || "").toUpperCase();
                                    const isMcq = type === "MCQ";
                                    const rawContent = q?.content || "Câu hỏi";

                                    return (
                                        <Box
                                            key={q.questionId || `${q._no}_${idx}`}
                                            sx={{
                                                p: { xs: 1.5, sm: 2 },
                                                borderRadius: 3,
                                                border: `1px solid ${COLORS.border}`,
                                                bgcolor: "#fff",
                                                mb: 2,
                                            }}
                                        >
                                            {/* Header */}
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
                                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 900,
                                                            color: COLORS.textPrimary,
                                                            fontSize: { xs: 13, sm: 15 },
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        Câu {q._no}:
                                                    </Typography>

                                                    <Chip
                                                        size="small"
                                                        label={typeLabel(type)}
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
                                            </Box>

                                            {/* Question content */}
                                            <QuestionContent raw={rawContent} />

                                            <Divider sx={{ my: 1.5 }} />

                                            {isMcq ? (
                                                <>
                                                    {["A", "B", "C", "D"].map((k) => {
                                                        const rawOpt = q?.options?.[k];
                                                        const isCorrect = String(q?.correctAnswer || "").toUpperCase() === k;
                                                        const isSelected = String(q?.selectedAnswer || "").toUpperCase() === k;
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
                                                                            : COLORS.border,
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

                                                    <Typography sx={{ mt: 0.5, fontSize: 13, color: COLORS.textSecondary }}>
                                                        Học viên chọn: <b>{q?.selectedAnswer || "—"}</b> · Đáp án đúng:{" "}
                                                        <b>{q?.correctAnswer || "—"}</b>
                                                    </Typography>
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
                                                            Câu trả lời của học viên
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                mt: 0.5,
                                                                color: "#000",
                                                                fontWeight: 400,
                                                                whiteSpace: "pre-wrap",
                                                                fontSize: { xs: 13, sm: 14 },
                                                            }}
                                                        >
                                                            {q?.yourAnswerText && String(q.yourAnswerText).trim()
                                                                ? q.yourAnswerText
                                                                : "(chưa trả lời)"}
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
                                                            {q?.sampleAnswerText && String(q.sampleAnswerText).trim()
                                                                ? q.sampleAnswerText
                                                                : "(không có)"}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}

                                            {/* Explanation (MCQ) */}
                                            {q?.explanation && isMcq ? (
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
                                                        {q.explanation}
                                                    </Typography>
                                                </Box>
                                            ) : null}
                                        </Box>
                                    );
                                })
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button variant="outlined" onClick={() => setReviewOpen(false)} sx={{ borderRadius: 2, fontWeight: 900 }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 900 }}>Sửa bài kiểm tra</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.25} sx={{ mt: 1 }}>
                        <TextField label="Tên bài" value={title} onChange={(e) => setTitle(e.target.value)} />
                        <TextField
                            label="Thời gian (phút)"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                                label="Mở bài"
                                type="datetime-local"
                                value={openAt}
                                onChange={(e) => setOpenAt(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Đóng bài"
                                type="datetime-local"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1 }}
                            />
                        </Stack>
                        <Button
                            variant="outlined"
                            onClick={() => setAssignOpen(true)}
                            sx={{ borderRadius: 2, fontWeight: 900 }}
                        >
                            Chọn lại học viên được gán ({assignedUserIds.length})
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditOpen(false)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 900 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            fontWeight: 900,
                            bgcolor: COLORS.orange,
                            "&:hover": { bgcolor: COLORS.orangeDeep },
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            <AssignUsersDialog
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                initialSelectedIds={assignedUserIds}
                onConfirm={(ids) => setAssignedUserIds(ids)}
            />

            <GlobalLoading open={loading} message="Đang xử lý..." />

            <AppConfirm
                open={confirmDel}
                title="Xóa bài kiểm tra?"
                message="Bài kiểm tra và dữ liệu liên quan sẽ bị xóa."
                onClose={() => setConfirmDel(false)}
                onConfirm={handleDelete}
                confirmText="Xóa"
                cancelText="Hủy"
            />
        </Box>
    );
}