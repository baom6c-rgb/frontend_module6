// src/features/adminExams/AdminExamListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, Stack, Typography, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import { assignedExamApi } from "../../api/assignedExamApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";

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
// - If BE returns LocalDateTime without timezone -> treat as LOCAL time
// ======================================================
function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // Has timezone (Z or +07:00) => safe parse
    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // LocalDateTime: YYYY-MM-DDTHH:mm:ss(.SSS...)
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

    // ✅ Treat as LOCAL
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

export default function AdminExamListPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [confirm, setConfirm] = useState({ open: false, examId: null });

    const load = async () => {
        setLoading(true);
        try {
            const data = await assignedExamApi.adminList();
            const list = Array.isArray(data) ? data : data?.items || data?.content || [];

            const mapped = list.map((e) => {
                const examId = e.examId ?? e.id;
                const openAtRaw = e.openAt ?? e.availableFrom ?? null;
                const dueAtRaw = e.dueAt ?? e.availableTo ?? null;

                return {
                    examId, // ✅ always keep examId
                    title: e.title || e.name || "—",
                    assignedCount: e.assignedCount ?? e.totalAssigned ?? e.assignmentsCount ?? 0,
                    durationMinutes: e.durationMinutes ?? e.duration ?? "—",

                    openAtText: formatServerDateTime(openAtRaw),
                    dueAtText: formatServerDateTime(dueAtRaw),

                    // keep raw for debugging
                    openAt: openAtRaw,
                    dueAt: dueAtRaw,
                };
            });

            setRows(mapped);
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Không tải được danh sách", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = useMemo(
        () => [
            { field: "title", headerName: "Bài kiểm tra", flex: 1, minWidth: 220 },
            { field: "assignedCount", headerName: "Đã gán", width: 100 },
            { field: "durationMinutes", headerName: "Thời gian", width: 110 },
            { field: "openAtText", headerName: "Mở", width: 190 },
            { field: "dueAtText", headerName: "Đóng", width: 190 },
            {
                field: "actions",
                headerName: "",
                width: 120,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => navigate(`/admin/exams/${params.row.examId}`)}>
                                <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <IconButton
                                size="small"
                                onClick={() => setConfirm({ open: true, examId: params.row.examId })}
                            >
                                <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                ),
            },
        ],
        [navigate]
    );

    const handleDelete = async () => {
        const examId = confirm.examId;
        if (!examId) return;

        setConfirm({ open: false, examId: null });
        setLoading(true);

        // ✅ Optimistic remove (UI mất ngay)
        setRows((prev) => prev.filter((r) => r.examId !== examId));

        try {
            await assignedExamApi.adminDelete(examId);
            showToast("Đã xóa bài kiểm tra", "success");
            // ✅ refetch để chắc chắn đồng bộ
            await load();
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Xóa thất bại", "error");
            await load();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary }}>
                        Admin · Bài kiểm tra đã tạo
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: COLORS.textSecondary, fontSize: 13.5 }}>
                        Xem / sửa / xóa bài kiểm tra, danh sách học viên được gán và log gian lận.
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => navigate("/admin/exams/create")}
                    sx={{ borderRadius: 2, fontWeight: 900, bgcolor: COLORS.orange, "&:hover": { bgcolor: COLORS.orangeDeep } }}
                >
                    Tạo bài kiểm tra
                </Button>
            </Stack>

            <Paper variant="outlined" sx={{ mt: 2, borderRadius: 3, borderColor: COLORS.border, overflow: "hidden" }}>
                <DataGrid
                    rows={rows}
                    getRowId={(row) => row.examId} // ✅ key đúng
                    columns={columns}
                    autoHeight
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 20, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                />
            </Paper>

            <GlobalLoading open={loading} message="Đang xử lý..." />

            <AppConfirm
                open={confirm.open}
                title="Xóa bài kiểm tra?"
                message="Bài kiểm tra và dữ liệu liên quan sẽ bị xóa."
                onClose={() => setConfirm({ open: false, examId: null })}
                onConfirm={handleDelete}
                confirmText="Xóa"
                cancelText="Hủy"
            />
        </Box>
    );
}