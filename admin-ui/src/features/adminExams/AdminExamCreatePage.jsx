// src/features/adminExams/AdminExamCreatePage.jsx
import React, { useCallback, useMemo, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
    Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

import { materialApi } from "../../api/materialApi";
import { assignedExamApi } from "../../api/assignedExamApi";

import AssignUsersDialog from "./components/AssignUsersDialog";
import QuestionCard from "../practice/components/QuestionCard";

import { toLocalDateTimeOrNull } from "../../utils/datetime";

// ── Icons ──────────────────────────────────────────────
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TitleRoundedIcon from "@mui/icons-material/TitleRounded";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
    primary: "#2E2D84",
    primaryLight: "#EEEEF8",
    green: "#16A34A",
    greenLight: "#DCFCE7",
};

const clampInt = (v, min, max) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
};

const toNonNegativeIntOrZero = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
};

const toPositiveIntOrNull = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

// ── Reusable section label ────────────────────────────
function SectionBadge({ number, label }) {
    return (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0 }}>
            <Box
                sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    bgcolor: COLORS.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1 }}>
                    {number}
                </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, color: COLORS.textPrimary, fontSize: 15 }}>
                {label}
            </Typography>
        </Stack>
    );
}

// ── Field label with icon ─────────────────────────────
function FieldLabel({ icon, label, right }) {
    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
            <Box sx={{ color: COLORS.textSecondary, display: "flex" }}>{icon}</Box>
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    flex: 1,
                }}
            >
                {label}
            </Typography>
            {right}
        </Stack>
    );
}

// ── Step indicator for right panel ───────────────────
function StepRow({ step, label, done, active }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
                sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    flexShrink: 0,
                    mt: 0.15,
                    bgcolor: done ? COLORS.green : active ? COLORS.orange : "#E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: done || active ? "#fff" : COLORS.textSecondary,
                    }}
                >
                    {step}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 13,
                    color: done ? COLORS.green : active ? COLORS.textPrimary : COLORS.textSecondary,
                    fontWeight: done || active ? 600 : 400,
                    lineHeight: 1.6,
                }}
            >
                {label}
            </Typography>
        </Stack>
    );
}

export default function AdminExamCreatePage() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    const [file, setFile] = useState(null);
    const [inputText, setInputText] = useState("");
    const [materialId, setMaterialId] = useState(null);

    const [title, setTitle] = useState("Bài kiểm tra AI");

    // ✅ Admin chọn cơ cấu câu hỏi
    const [mcqCount, setMcqCount] = useState(8);
    const [essayCount, setEssayCount] = useState(2);

    // ✅ duration do admin chọn (BE yêu cầu required)
    const [durationMinutes, setDurationMinutes] = useState(20);

    const [openAt, setOpenAt] = useState("");
    const [dueAt, setDueAt] = useState("");

    const [preview, setPreview] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignedUserIds, setAssignedUserIds] = useState([]);

    const materialPresent =
        Boolean(materialId) || Boolean(String(inputText).trim()) || Boolean(file);

    const totalQuestions = useMemo(() => {
        const mcq = toNonNegativeIntOrZero(mcqCount);
        const essay = toNonNegativeIntOrZero(essayCount);
        return mcq + essay;
    }, [mcqCount, essayCount]);

    const isQuestionMixValid = useMemo(() => {
        return totalQuestions >= 1 && totalQuestions <= 30;
    }, [totalQuestions]);

    const isTimeWindowValid = useMemo(() => {
        // datetime-local string compare is not reliable across formats, convert to Date
        const o = openAt ? new Date(openAt) : null;
        const d = dueAt ? new Date(dueAt) : null;
        if (!o || !d) return true; // allow missing
        if (Number.isNaN(o.getTime()) || Number.isNaN(d.getTime())) return true;
        return o.getTime() <= d.getTime();
    }, [openAt, dueAt]);

    const resetAll = () => {
        setFile(null);
        setInputText("");
        setMaterialId(null);
        setPreview(null);
        setPreviewOpen(false);
        setAssignOpen(false);
        setAssignedUserIds([]);
        setOpenAt("");
        setDueAt("");

        // reset config
        setTitle("Bài kiểm tra AI");
        setMcqCount(8);
        setEssayCount(2);
        setDurationMinutes(20);
    };

    const handleUpload = async () => {
        if (!file) return null;
        setLoading(true);
        setLoadingMessage("Đang upload học liệu...");
        try {
            const res = await materialApi.uploadAdmin(file);
            const d = res?.data?.data ?? res?.data ?? res;
            const id = d?.id ?? d?.materialId;
            if (!id) throw new Error("Upload OK nhưng không nhận được materialId");
            setMaterialId(id);
            showToast("Upload học liệu thành công", "success");
            return id;
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                JSON.stringify(e?.response?.data) ||
                e?.message ||
                "Upload thất bại";
            showToast(msg, "error");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = useCallback(async () => {
        const text = String(inputText || "").trim();
        let resolvedMaterialId = materialId;

        const mcq = toNonNegativeIntOrZero(mcqCount);
        const essay = toNonNegativeIntOrZero(essayCount);
        const total = mcq + essay;

        const dur = toPositiveIntOrNull(durationMinutes);

        if (!resolvedMaterialId && !text && !file) {
            showToast("Cần upload file hoặc paste text trước", "warning");
            return;
        }
        if (!dur) {
            showToast("Thời gian làm bài (phút) phải > 0", "warning");
            return;
        }
        if (total < 1 || total > 30) {
            showToast("Tổng số câu phải từ 1 đến 30", "warning");
            return;
        }
        if (!isTimeWindowValid) {
            showToast("Thời gian mở đề phải <= thời gian đóng đề", "warning");
            return;
        }

        if (file && !resolvedMaterialId) {
            const newId = await handleUpload();
            resolvedMaterialId = newId;
        }
        if (!resolvedMaterialId && !text) {
            showToast("Thiếu học liệu!", "warning");
            return;
        }

        // ✅ BE mới: preview nhận mcqCount + essayCount
        const payload = {
            materialId: resolvedMaterialId || null,
            inputText: resolvedMaterialId ? null : text || null,
            mcqCount: mcq,
            essayCount: essay,
        };

        setLoading(true);
        setLoadingMessage("AI đang tạo bài kiểm tra...");
        try {
            const p = await assignedExamApi.adminPreview(payload);
            setPreview(p);
            setPreviewOpen(true);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                JSON.stringify(e?.response?.data) ||
                e?.message ||
                "Tạo bài kiểm tra thất bại";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    }, [
        inputText,
        file,
        materialId,
        mcqCount,
        essayCount,
        durationMinutes,
        isTimeWindowValid,
        showToast,
    ]);

    const questions = useMemo(() => {
        const q = preview?.questions || preview?.items || preview?.data?.questions || [];
        return Array.isArray(q) ? q : [];
    }, [preview]);

    const canCreate = useMemo(() => {
        const token =
            preview?.previewToken ||
            preview?.sessionToken ||
            preview?.selectionToken ||
            preview?.token;
        const dur = toPositiveIntOrNull(durationMinutes);
        return Boolean(token) && Boolean(dur) && Array.isArray(assignedUserIds) && assignedUserIds.length > 0;
    }, [preview, assignedUserIds, durationMinutes]);

    const handleCreate = async () => {
        if (!canCreate) {
            showToast("Chọn học viên + đảm bảo có preview trước khi tạo", "warning");
            return;
        }

        const dur = toPositiveIntOrNull(durationMinutes);
        if (!dur) {
            showToast("Thời gian làm bài (phút) phải > 0", "warning");
            return;
        }
        if (!isQuestionMixValid) {
            showToast("Tổng số câu phải từ 1 đến 30", "warning");
            return;
        }
        if (!isTimeWindowValid) {
            showToast("Thời gian mở đề phải <= thời gian đóng đề", "warning");
            return;
        }

        const previewToken =
            preview?.previewToken || preview?.sessionToken || preview?.selectionToken || preview?.token;

        if (!previewToken) {
            showToast("Thiếu previewToken (hãy tạo lại bài kiểm tra)", "error");
            return;
        }

        let resolvedMaterialId = materialId;
        const text = String(inputText || "").trim();

        if (file && !resolvedMaterialId) {
            const newId = await handleUpload();
            resolvedMaterialId = newId;
        }
        if (!resolvedMaterialId && !text) {
            showToast("Thiếu học liệu: cần upload file hoặc paste text", "warning");
            return;
        }
        if (!Array.isArray(assignedUserIds) || assignedUserIds.length === 0) {
            showToast("Chọn ít nhất 1 học viên để gán", "warning");
            return;
        }

        // ✅ BE create mới: durationMinutes required, KHÔNG cần numberOfQuestions
        // ✅ mcq/essay cũng KHÔNG cần gửi (đã nằm trong preview cached questions)
        const payload = {
            title: String(title || "Bài kiểm tra").trim(),
            previewToken,
            materialId: resolvedMaterialId || null,
            inputText: resolvedMaterialId ? null : text || null,
            durationMinutes: dur,
            openAt: toLocalDateTimeOrNull(openAt),
            dueAt: toLocalDateTimeOrNull(dueAt),
            assignedUserIds,
        };

        setLoading(true);
        setLoadingMessage("Đang tạo bài kiểm tra và gửi email...");
        try {
            const created = await assignedExamApi.adminCreate(payload);
            const examId = created?.examId ?? created?.id ?? created?.data?.examId ?? created?.data?.id;
            showToast("Tạo & gán bài kiểm tra thành công", "success");
            resetAll();
            if (examId) navigate(`/admin/exams/${examId}`);
            else navigate("/admin/exams");
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                JSON.stringify(e?.response?.data) ||
                e?.message ||
                "Tạo bài kiểm tra thất bại";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ── derived states for step indicator ─────────────
    const step1Done = materialPresent;
    const step2Done = Boolean(preview);
    const step3Done = assignedUserIds.length > 0;

    const mixChip = (
        <Chip
            size="small"
            label={`Tổng: ${totalQuestions}`}
            sx={{
                height: 22,
                fontWeight: 800,
                bgcolor: isQuestionMixValid ? COLORS.greenLight : "#FEE2E2",
                color: isQuestionMixValid ? COLORS.green : "#B91C1C",
            }}
        />
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
            {/* ── Page Header ─────────────────────────────── */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mb: 2.5 }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                        Tạo bài kiểm tra
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mt: 0.4 }}>
                        Tạo bài kiểm tra mới cho học viên
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => navigate("/admin/exams")}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        bgcolor: COLORS.primary,
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#1E1D6F", boxShadow: "none" },
                    }}
                >
                    Danh sách bài kiểm tra
                </Button>
            </Stack>

            {/* ── Main Layout ──────────────────────────────── */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="flex-start">
                {/* ════ LEFT PANEL ════ */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        width: { xs: "100%", md: "auto" },
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: COLORS.border,
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            px: 3,
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: COLORS.border,
                            bgcolor: "background.paper",
                        }}
                    >
                        <SectionBadge number="1" label="Học liệu & Cấu hình đề" />
                    </Box>

                    <Box sx={{ p: 3 }}>
                        <Stack spacing={2.5}>
                            {/* ── Tên bài kiểm tra ── */}
                            <Box>
                                <FieldLabel label="Tên bài kiểm tra" />
                                <TextField
                                    fullWidth
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    size="small"
                                    placeholder="Nhập tên bài kiểm tra..."
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />
                            </Box>

                            {/* ── MCQ + ESSAY + Duration ── */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <Box sx={{ flex: 1 }}>
                                    <FieldLabel
                                        icon={<AccessTimeRoundedIcon sx={{ fontSize: 15 }} />}
                                        label="Số câu TRẮC NGHIỆM"
                                        right={mixChip}
                                    />
                                    <TextField
                                        fullWidth
                                        value={mcqCount}
                                        onChange={(e) => setMcqCount(clampInt(e.target.value, 0, 30) ?? 0)}
                                        size="small"
                                        type="number"
                                        inputProps={{ min: 0, max: 30 }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    />
                                </Box>

                                <Box sx={{ flex: 1 }}>
                                    <FieldLabel
                                        icon={<AccessTimeRoundedIcon sx={{ fontSize: 15 }} />}
                                        label="Số câu TỰ LUẬN"
                                    />
                                    <TextField
                                        fullWidth
                                        value={essayCount}
                                        onChange={(e) => setEssayCount(clampInt(e.target.value, 0, 30) ?? 0)}
                                        size="small"
                                        type="number"
                                        inputProps={{ min: 0, max: 30 }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    />
                                </Box>
                            </Stack>

                            <Box>
                                <FieldLabel
                                    icon={<AccessTimeRoundedIcon sx={{ fontSize: 15 }} />}
                                    label="Thời gian làm bài (phút)"
                                />
                                <TextField
                                    fullWidth
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    size="small"
                                    type="number"
                                    inputProps={{ min: 1, max: 180 }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />
                                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 0.75 }}>
                                    Gợi ý: tối thiểu {MINUTES_HINT()} phút, tối đa 180 phút.
                                </Typography>
                            </Box>

                            {/* ── Thời gian mở / đóng ── */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: "100%" }}>
                                <Box sx={{ flex: 1 }}>
                                    <FieldLabel
                                        icon={<CalendarMonthRoundedIcon sx={{ fontSize: 15 }} />}
                                        label="Thời gian mở đề"
                                    />
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        value={openAt}
                                        onChange={(e) => setOpenAt(e.target.value)}
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <FieldLabel
                                        icon={<CalendarMonthRoundedIcon sx={{ fontSize: 15 }} />}
                                        label="Thời gian đóng đề"
                                    />
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        value={dueAt}
                                        onChange={(e) => setDueAt(e.target.value)}
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    />
                                </Box>
                            </Stack>

                            {!isTimeWindowValid && (
                                <Typography sx={{ fontSize: 12, color: "#B91C1C", fontWeight: 700 }}>
                                    Thời gian mở đề phải nhỏ hơn hoặc bằng thời gian đóng đề.
                                </Typography>
                            )}

                            {/* ── Upload file ── */}
                            <Box>
                                <FieldLabel icon={<UploadFileRoundedIcon sx={{ fontSize: 15 }} />} label="Upload tài liệu" />
                                <Box
                                    component="label"
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        px: 2,
                                        py: 1.5,
                                        borderRadius: 2,
                                        border: "1.5px dashed",
                                        borderColor: file ? COLORS.green : COLORS.border,
                                        bgcolor: file ? COLORS.greenLight : "#FAFBFC",
                                        cursor: "pointer",
                                        transition: "all 200ms ease",
                                        "&:hover": { borderColor: COLORS.primary, bgcolor: COLORS.primaryLight },
                                    }}
                                >
                                    <UploadFileRoundedIcon sx={{ fontSize: 22, color: file ? COLORS.green : COLORS.textSecondary }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: file ? COLORS.green : COLORS.textPrimary,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {file ? file.name : "Chọn file để upload"}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 0.25 }}>
                                            {file ? `${(file.size / 1024).toFixed(1)} KB` : "Hỗ trợ: PDF, DOC, DOCX, TXT"}
                                        </Typography>
                                    </Box>
                                    {file && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setFile(null);
                                                setMaterialId(null);
                                            }}
                                            sx={{
                                                color: COLORS.textSecondary,
                                                "&:hover": { color: "error.main", bgcolor: "#FEE2E2" },
                                                flexShrink: 0,
                                            }}
                                        >
                                            <ClearRoundedIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt"
                                        style={{ display: "none" }}
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                </Box>
                            </Box>

                            {/* ── Nhập nội dung ── */}
                            <Box>
                                <FieldLabel icon={<ArticleRoundedIcon sx={{ fontSize: 15 }} />} label="Hoặc nhập nội dung trực tiếp" />
                                <TextField
                                    fullWidth
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Dán nội dung tài liệu vào đây để AI tạo câu hỏi..."
                                    multiline
                                    minRows={6}
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13 },
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </Paper>

                {/* ════ RIGHT PANEL ════ */}
                <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
                    <Stack spacing={2}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: COLORS.border,
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    px: 3,
                                    py: 2,
                                    borderBottom: "1px solid",
                                    borderColor: COLORS.border,
                                    bgcolor: "background.paper",
                                }}
                            >
                                <SectionBadge number="2" label="Tạo & Gán học viên" />
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Stack spacing={1.5} sx={{ mb: 3 }}>
                                    <StepRow step="1" label="Cung cấp học liệu hoặc nội dung" done={step1Done} active={!step1Done} />
                                    <StepRow step="2" label='Bấm "Xem trước đề bài" để AI tạo câu hỏi' done={step2Done} active={step1Done && !step2Done} />
                                    <StepRow step="3" label="Chọn học viên sẽ làm bài" done={step3Done} active={step2Done && !step3Done} />
                                    <StepRow step="4" label='Bấm "Tạo & gửi" để hoàn tất' done={false} active={step3Done} />
                                </Stack>

                                <Stack spacing={1.25}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<PreviewRoundedIcon />}
                                        onClick={handleGeneratePreview}
                                        disabled={!materialPresent || loading || !isQuestionMixValid}
                                        sx={{
                                            borderRadius: 2,
                                            fontWeight: 700,
                                            py: 1.1,
                                            bgcolor: COLORS.orange,
                                            boxShadow: "0 2px 8px rgba(236,94,50,0.35)",
                                            "&:hover": {
                                                bgcolor: COLORS.orangeDeep,
                                                boxShadow: "0 4px 12px rgba(236,94,50,0.45)",
                                            },
                                            "&.Mui-disabled": {
                                                bgcolor: "#E2E8F0",
                                                color: "#94A3B8",
                                                boxShadow: "none",
                                            },
                                        }}
                                    >
                                        Xem trước đề bài
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<PeopleAltRoundedIcon />}
                                        onClick={() => setAssignOpen(true)}
                                        disabled={!preview || loading}
                                        sx={{
                                            borderRadius: 2,
                                            fontWeight: 700,
                                            py: 1.1,
                                            borderColor: assignedUserIds.length > 0 ? COLORS.green : COLORS.border,
                                            color: assignedUserIds.length > 0 ? COLORS.green : COLORS.textSecondary,
                                            "&:hover": { borderColor: COLORS.primary, color: COLORS.primary, bgcolor: COLORS.primaryLight },
                                            "&.Mui-disabled": { borderColor: "#E2E8F0", color: "#94A3B8" },
                                        }}
                                    >
                                        Gán học viên làm bài
                                        {assignedUserIds.length > 0 && (
                                            <Chip
                                                label={assignedUserIds.length}
                                                size="small"
                                                color="success"
                                                sx={{
                                                    ml: 1,
                                                    height: 20,
                                                    fontWeight: 800,
                                                    "& .MuiChip-label": { px: 0.75 },
                                                }}
                                            />
                                        )}
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<SendRoundedIcon />}
                                        onClick={handleCreate}
                                        disabled={!canCreate || loading}
                                        sx={{
                                            borderRadius: 2,
                                            fontWeight: 700,
                                            py: 1.1,
                                            bgcolor: COLORS.primary,
                                            boxShadow: "0 2px 8px rgba(46,45,132,0.25)",
                                            "&:hover": { bgcolor: "#1E1D6F", boxShadow: "0 4px 12px rgba(46,45,132,0.35)" },
                                            "&.Mui-disabled": { bgcolor: "#E2E8F0", color: "#94A3B8", boxShadow: "none" },
                                        }}
                                    >
                                        Tạo bài kiểm tra & gửi cho học viên
                                    </Button>
                                </Stack>

                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <Chip
                                        size="small"
                                        label={`Trắc nghiệm: ${toNonNegativeIntOrZero(mcqCount)}`}
                                        sx={{ fontWeight: 800, bgcolor: "#E0F2FE" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Tự luận: ${toNonNegativeIntOrZero(essayCount)}`}
                                        sx={{ fontWeight: 800, bgcolor: "#F3E8FF" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Tổng số câu: ${totalQuestions}`}
                                        sx={{ fontWeight: 900, bgcolor: isQuestionMixValid ? COLORS.greenLight : "#FEE2E2", color: isQuestionMixValid ? COLORS.green : "#B91C1C" }}
                                    />
                                </Stack>
                            </Box>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: COLORS.border,
                                p: 2,
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                alignItems: { xs: "flex-start", sm: "center" },
                                justifyContent: "space-between",
                                gap: 1.5,
                            }}
                        >
                            <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>
                                    Bắt đầu lại từ đầu?
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                    Xóa toàn bộ dữ liệu hiện tại
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<RefreshRoundedIcon />}
                                onClick={resetAll}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    width: { xs: "100%", sm: "auto" },
                                    bgcolor: COLORS.orange,
                                    boxShadow: "none",
                                    "&:hover": { bgcolor: COLORS.orangeDeep, boxShadow: "none" },
                                    flexShrink: 0,
                                }}
                            >
                                Tạo lại
                            </Button>
                        </Paper>
                    </Stack>
                </Box>
            </Stack>

            {/* ── Preview Dialog ───────────────────────────── */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <span>Xem trước đề bài</span>
                        <Chip
                            size="small"
                            label={`Trắc nghiệm ${toNonNegativeIntOrZero(mcqCount)} • Tự luận ${toNonNegativeIntOrZero(essayCount)} • Tổng số câu ${totalQuestions}`}
                            sx={{ ml: 1, fontWeight: 800 }}
                        />
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 2 }}>
                        Xem nhanh nội dung câu hỏi. Đề chính thức sẽ được tạo khi bấm "Tạo bài kiểm tra".
                    </Typography>
                    <Stack spacing={1.25}>
                        {questions.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: "center" }}>
                                <Typography sx={{ color: COLORS.textSecondary }}>
                                    Preview không trả về danh sách câu hỏi. Hãy kiểm tra lại.
                                </Typography>
                            </Paper>
                        ) : (
                            questions.map((q, idx) => (
                                <QuestionCard key={q.id || idx} question={q} index={idx} />
                            ))
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={() => setPreviewOpen(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Đóng
                    </Button>
                    <Button
                        onClick={() => {
                            setPreviewOpen(false);
                            setAssignOpen(true);
                        }}
                        variant="contained"
                        startIcon={<PeopleAltRoundedIcon />}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            bgcolor: COLORS.orange,
                            "&:hover": { bgcolor: COLORS.orangeDeep },
                        }}
                    >
                        Gán học viên
                    </Button>
                </DialogActions>
            </Dialog>

            <AssignUsersDialog
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                initialSelectedIds={assignedUserIds}
                onConfirm={(ids) => setAssignedUserIds(ids)}
            />

            <GlobalLoading open={loading} message={loadingMessage} />
        </Box>
    );
}

/**
 * Hint text: giữ gọn, tránh hardcode quá nhiều.
 * (BE clamp 5..180, nhưng FE chỉ gợi ý)
 */
function MINUTES_HINT() {
    return 5;
}