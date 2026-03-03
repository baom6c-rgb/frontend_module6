// src/features/adminExams/AdminExamCreatePage.jsx
import React, { useCallback, useMemo, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

import { materialApi } from "../../api/materialApi";
import { assignedExamApi } from "../../api/assignedExamApi";

import AssignUsersDialog from "./components/AssignUsersDialog";
import QuestionCard from "../practice/components/QuestionCard";

// ✅ NEW: unified datetime helpers
import { toLocalDateTimeOrNull } from "../../utils/datetime";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
    primary: "#2E2D84",
};

const toPositiveIntOrNull = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export default function AdminExamCreatePage() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // Material input
    const [file, setFile] = useState(null);
    const [inputText, setInputText] = useState("");
    const [materialId, setMaterialId] = useState(null);

    // Config
    const [title, setTitle] = useState("Bài kiểm tra AI");
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(20);
    const [openAt, setOpenAt] = useState("");
    const [dueAt, setDueAt] = useState("");

    // Preview
    const [preview, setPreview] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignedUserIds, setAssignedUserIds] = useState([]);

    const materialPresent =
        Boolean(materialId) || Boolean(String(inputText).trim()) || Boolean(file);

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
            console.error("UPLOAD ERROR:", e?.response?.status, e?.response?.data);
            showToast(msg, "error");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = useCallback(async () => {
        const qc = toPositiveIntOrNull(questionCount) ?? 10;
        const dur = toPositiveIntOrNull(durationMinutes) ?? 20;
        const text = String(inputText || "").trim();

        let resolvedMaterialId = materialId;

        if (!resolvedMaterialId && !text && !file) {
            showToast("Cần upload file hoặc paste text trước", "warning");
            return;
        }

        if (file && !resolvedMaterialId) {
            const newId = await handleUpload();
            resolvedMaterialId = newId;
        }

        if (!resolvedMaterialId && !text) {
            showToast("Thiếu học liệu: cần materialId hoặc inputText", "warning");
            return;
        }

        const payload = {
            materialId: resolvedMaterialId || null,
            inputText: resolvedMaterialId ? null : text || null,
            numberOfQuestions: qc,
            durationMinutes: dur,
        };

        setLoading(true);
        setLoadingMessage("AI đang tạo đề (preview)...");
        try {
            const p = await assignedExamApi.adminPreview(payload);
            setPreview(p);
            setPreviewOpen(true);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                JSON.stringify(e?.response?.data) ||
                e?.message ||
                "Tạo preview thất bại";
            console.error("PREVIEW ERROR:", e?.response?.status, e?.response?.data);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    }, [questionCount, durationMinutes, inputText, file, materialId, showToast]);

    const questions = useMemo(() => {
        const q = preview?.questions || preview?.items || preview?.data?.questions || [];
        return Array.isArray(q) ? q : [];
    }, [preview]);

    const canCreate = useMemo(() => {
        const token =
            preview?.previewToken || preview?.sessionToken || preview?.selectionToken || preview?.token;
        return Boolean(token) && Array.isArray(assignedUserIds) && assignedUserIds.length > 0;
    }, [preview, assignedUserIds]);

    const handleCreate = async () => {
        if (!canCreate) {
            showToast("Chọn học viên trước khi tạo", "warning");
            return;
        }

        const qc = toPositiveIntOrNull(questionCount) ?? 10;
        const dur = toPositiveIntOrNull(durationMinutes) ?? 20;
        const previewToken =
            preview?.previewToken || preview?.sessionToken || preview?.selectionToken || preview?.token;

        if (!previewToken) {
            showToast("Thiếu previewToken (hãy tạo preview lại)", "error");
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

        const payload = {
            title: String(title || "Bài kiểm tra AI").trim(),
            previewToken,

            materialId: resolvedMaterialId || null,
            inputText: resolvedMaterialId ? null : text || null,

            numberOfQuestions: qc,
            durationMinutes: dur,

            // ✅ FIX: Send LocalDateTime (no Z) to BE
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
            console.error("CREATE ERROR:", e?.response?.status, e?.response?.data);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary }}>
                        Admin · Tạo bài kiểm tra (AI)
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: COLORS.textSecondary, fontSize: 13.5 }}>
                        Flow giống Practice: upload/paste học liệu → AI preview → gán học viên → tạo bài.
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    onClick={() => navigate("/admin/exams")}
                    sx={{ borderRadius: 2, fontWeight: 900 }}
                >
                    Danh sách bài kiểm tra
                </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                {/* Left: Material */}
                <Paper
                    variant="outlined"
                    sx={{ flex: 1, p: 2.5, borderRadius: 3, borderColor: COLORS.border }}
                >
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 1 }}>
                        1) Học liệu
                    </Typography>

                    <Stack spacing={1.25}>
                        <TextField
                            label="Tên bài kiểm tra"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            size="small"
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                                label="Số câu"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Thời gian (phút)"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                                label="Mở bài (optional)"
                                type="datetime-local"
                                value={openAt}
                                onChange={(e) => setOpenAt(e.target.value)}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Đóng bài (optional)"
                                type="datetime-local"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1 }}
                            />
                        </Stack>

                        <Divider />

                        <Stack spacing={0.5}>
                            <Typography sx={{ fontWeight: 800, color: COLORS.textPrimary, fontSize: 13 }}>
                                Upload file
                            </Typography>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                    variant="outlined"
                                    disabled={!file || loading}
                                    onClick={handleUpload}
                                    sx={{ borderRadius: 2, fontWeight: 900 }}
                                >
                                    Upload
                                </Button>
                                <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary }}>
                                    {materialId ? `materialId: ${materialId}` : ""}
                                </Typography>
                            </Stack>
                        </Stack>

                        <Divider />

                        <Stack spacing={0.75}>
                            <Typography sx={{ fontWeight: 800, color: COLORS.textPrimary, fontSize: 13 }}>
                                Paste text
                            </Typography>
                            <TextField
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Dán nội dung học liệu vào đây…"
                                multiline
                                minRows={7}
                            />
                        </Stack>
                    </Stack>
                </Paper>

                {/* Right: Actions */}
                <Paper
                    variant="outlined"
                    sx={{
                        width: { xs: "100%", lg: 420 },
                        p: 2.5,
                        borderRadius: 3,
                        borderColor: COLORS.border,
                    }}
                >
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 1 }}>
                        2) Tạo đề & gán học viên
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
                        Bấm “Tạo preview” để xem đề. Sau đó chọn học viên và tạo bài kiểm tra.
                    </Typography>

                    <Stack spacing={1.25} sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleGeneratePreview}
                            disabled={!materialPresent || loading}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 900,
                                bgcolor: COLORS.orange,
                                "&:hover": { bgcolor: COLORS.orangeDeep },
                            }}
                        >
                            Tạo preview (AI)
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={() => setAssignOpen(true)}
                            disabled={!preview || loading}
                            sx={{ borderRadius: 2, fontWeight: 900 }}
                        >
                            Gán học viên ({assignedUserIds.length})
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleCreate}
                            disabled={!canCreate || loading}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 900,
                                bgcolor: COLORS.primary,
                                "&:hover": { bgcolor: "#1E1D6F" },
                            }}
                        >
                            Tạo bài kiểm tra & gửi email
                        </Button>

                        <Button
                            variant="text"
                            onClick={resetAll}
                            disabled={loading}
                            sx={{ borderRadius: 2, fontWeight: 900 }}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Paper>
            </Stack>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 900 }}>Preview đề (AI)</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mb: 1.5 }}>
                        Xem nhanh nội dung câu hỏi. (Đây là preview; đề chính thức sẽ được tạo khi bấm “Tạo bài kiểm tra”.)
                    </Typography>
                    <Stack spacing={1.25}>
                        {questions.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography sx={{ color: COLORS.textSecondary }}>
                                    Preview không trả về danh sách câu hỏi (BE có thể đang trả DTO khác). Hãy kiểm tra lại response.
                                </Typography>
                            </Paper>
                        ) : (
                            questions.map((q, idx) => (
                                <QuestionCard key={q.id || idx} question={q} index={idx} />
                            ))
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setPreviewOpen(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                    >
                        Đóng
                    </Button>
                    <Button
                        onClick={() => {
                            setPreviewOpen(false);
                            setAssignOpen(true);
                        }}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            fontWeight: 900,
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