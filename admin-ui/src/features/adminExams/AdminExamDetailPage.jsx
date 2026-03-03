// src/features/adminExams/AdminExamDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";

import { assignedExamApi } from "../../api/assignedExamApi";
import AssignUsersDialog from "./components/AssignUsersDialog";
import QuestionCard from "../practice/components/QuestionCard";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
};

// ======================================================
// ✅ DateTime utils (LOCAL-first for LocalDateTime)
// - If BE returns ISO with timezone -> Date parses normally
// - If BE returns LocalDateTime without timezone (common with Spring LocalDateTime)
//   => treat as LOCAL time (browser local, VN user local)
// ======================================================

function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // Case 1: has timezone -> parse normally
    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // Case 2: LocalDateTime no timezone, maybe with fraction seconds
    // yyyy-MM-ddTHH:mm(:ss)?(.fraction up to 9)?
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

    // keep only milliseconds (first 3 digits)
    const ms = frac ? Number(String(frac).padEnd(3, "0").slice(0, 3)) : 0;

    // ✅ Treat as LOCAL time
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

// ===== datetime-local input helpers =====
// input value needs "YYYY-MM-DDTHH:mm" in LOCAL
const toLocalInput = (isoOrLocalDateTime) => {
    const d = parseServerDateTime(isoOrLocalDateTime);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
};

// ✅ IMPORTANT: Send LocalDateTime string (no Z) for BE LocalDateTime
// "YYYY-MM-DDTHH:mm:ss"
const toLocalDateTimeOrNull = (localStr) => {
    if (!localStr) return null; // empty => null
    // localStr comes from datetime-local: "YYYY-MM-DDTHH:mm"
    // Add seconds ":00" for BE LocalDateTime
    const s = String(localStr).trim();
    if (!s) return null;
    // Guard
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
    return `${s}:00`;
};

// ===== Options helpers (BE trả optionsJson dạng array hoặc map) =====
function parseOptions(optionsJson) {
    if (!optionsJson) return null;
    try {
        const data = JSON.parse(optionsJson);

        // Case 1: object map {A:"",B:""}
        if (data && typeof data === "object" && !Array.isArray(data)) return data;

        // Case 2: array ["opt1","opt2"...] -> map A/B/C/D/E
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

export default function AdminExamDetailPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0);
    const [detail, setDetail] = useState(null);
    const [cheating, setCheating] = useState([]);

    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);

    // editable fields
    const [title, setTitle] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [openAt, setOpenAt] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [assignedUserIds, setAssignedUserIds] = useState([]);

    const loadDetail = async () => {
        if (!examId) return;
        setLoading(true);
        try {
            const d = await assignedExamApi.adminDetail(examId);
            setDetail(d);

            setTitle(d?.title || d?.name || "");
            setDurationMinutes(d?.durationMinutes ?? d?.duration ?? "");

            // openAt/dueAt are LocalDateTime from BE (no timezone) -> treat as LOCAL
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

    // ===== Normalize questions for Practice QuestionCard =====
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

    // ===== Assignment rows =====
    const assignmentRows = useMemo(() => {
        return assignments.map((a, idx) => {
            const startedAtRaw = a.startedAt ?? null;
            const submittedAtRaw = a.submittedAt ?? null;

            return {
                id: a.assignmentId ?? a.id ?? `${a.studentId ?? a.userId ?? idx}`,
                fullName:
                    a.studentFullName ??
                    a.fullName ??
                    a.userFullName ??
                    a.user?.fullName ??
                    a.student?.fullName ??
                    "—",
                email:
                    a.studentEmail ??
                    a.email ??
                    a.userEmail ??
                    a.user?.email ??
                    a.student?.email ??
                    "—",
                status: a.status ?? a.assignmentStatus ?? "—",
                startedAtText: formatServerDateTime(startedAtRaw),
                submittedAtText: formatServerDateTime(submittedAtRaw),
            };
        });
    }, [assignments]);

    const assignmentColumns = useMemo(
        () => [
            { field: "fullName", headerName: "Họ tên", flex: 1, minWidth: 180 },
            { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
            { field: "status", headerName: "Trạng thái", width: 140 },
            { field: "startedAtText", headerName: "Bắt đầu", width: 200 },
            { field: "submittedAtText", headerName: "Nộp", width: 200 },
        ],
        []
    );

    // ===== Cheating rows =====
    // createdAt is often LocalDateTime with microseconds -> parseServerDateTime handles it
    const cheatingRows = useMemo(() => {
        const list = Array.isArray(cheating) ? cheating : [];
        return list.map((c, idx) => {
            const detectedRaw = c.createdAt ?? c.detectedAt ?? c.eventTime ?? c.timestamp ?? null;

            return {
                id: c.id ?? idx,
                fullName: c.studentFullName ?? c.fullName ?? c.userFullName ?? c.user?.fullName ?? "—",
                email: c.studentEmail ?? c.email ?? c.userEmail ?? c.user?.email ?? "—",
                type: c.type ?? "—",
                detectedAtText: formatServerDateTime(detectedRaw),
            };
        });
    }, [cheating]);

    const cheatingColumns = useMemo(
        () => [
            { field: "fullName", headerName: "Học viên", flex: 1, minWidth: 180 },
            { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
            { field: "type", headerName: "Vi phạm", width: 160 },
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

                // ✅ send LocalDateTime string (no Z)
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
                                <Typography sx={{ color: COLORS.textSecondary }}>
                                    Chưa có danh sách câu hỏi (BE trả DTO khác hoặc exam rỗng).
                                </Typography>
                            ) : (
                                questions.map((q, idx) => (
                                    <QuestionCard key={q.id || idx} question={q} index={idx} />
                                ))
                            )}
                        </Stack>
                    )}

                    {tab === 1 && (
                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                            <DataGrid
                                rows={assignmentRows}
                                columns={assignmentColumns}
                                autoHeight
                                disableRowSelectionOnClick
                                pageSizeOptions={[10, 20, 50]}
                                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                            />
                        </Paper>
                    )}

                    {tab === 2 && (
                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                            <DataGrid
                                rows={cheatingRows}
                                columns={cheatingColumns}
                                autoHeight
                                disableRowSelectionOnClick
                                pageSizeOptions={[10, 20, 50]}
                                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                            />
                        </Paper>
                    )}
                </Box>
            </Paper>

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
                            Chỉnh học viên được gán ({assignedUserIds.length})
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setEditOpen(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                    >
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