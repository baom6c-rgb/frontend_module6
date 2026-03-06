// src/features/adminExams/AdminExamListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Paper,
    Stack,
    Typography,
    IconButton,
    Tooltip,
    Chip,
    TextField,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import { assignedExamApi } from "../../api/assignedExamApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";
import AppPagination from "../../components/common/AppPagination";
import FilterPanel from "../../components/common/FilterPanel";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
    blue: "#1976d2",
    blueDeep: "#1565c0",
    headerBg: "#F8FAFC",
};

// ======================================================
// ✅ DateTime utils (LOCAL-first for LocalDateTime)
// ======================================================
function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?$/
    );
    if (!m) return null;

    const [, yy, mm, dd, hh, mi, ss, frac] = m;
    const ms = frac ? Number(String(frac).padEnd(3, "0").slice(0, 3)) : 0;
    const d = new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss || 0), ms);
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("xs"));

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [confirm, setConfirm] = useState({ open: false, examId: null });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [searchText, setSearchText] = useState("");
    const [dateRange, setDateRange] = useState("all"); // "all" | "7d" | "30d" | "custom"
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const filteredRows = useMemo(() => {
        let result = rows;

        if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            result = result.filter((r) => r.title.toLowerCase().includes(q));
        }

        if (dateRange === "7d" || dateRange === "30d") {
            const days = dateRange === "7d" ? 7 : 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            result = result.filter((r) => {
                const d = parseServerDateTime(r.openAt);
                return d && d >= cutoff;
            });
        } else if (dateRange === "custom") {
            if (customFrom) {
                const from = new Date(customFrom);
                result = result.filter((r) => {
                    const d = parseServerDateTime(r.openAt);
                    return d && d >= from;
                });
            }
            if (customTo) {
                const to = new Date(customTo);
                to.setHours(23, 59, 59, 999);
                result = result.filter((r) => {
                    const d = parseServerDateTime(r.openAt);
                    return d && d <= to;
                });
            }
        }

        return result;
    }, [rows, searchText, dateRange, customFrom, customTo]);

    useEffect(() => {
        setPaginationModel((p) => ({ ...p, page: 0 }));
    }, [searchText, dateRange, customFrom, customTo]);

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
                    examId,
                    title: e.title || e.name || "—",
                    assignedCount: e.assignedCount ?? e.totalAssigned ?? e.assignmentsCount ?? 0,
                    durationMinutes: e.durationMinutes ?? e.duration ?? "—",
                    openAtText: formatServerDateTime(openAtRaw),
                    dueAtText: formatServerDateTime(dueAtRaw),
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
            {
                field: "title",
                headerName: "Tên bài kiểm tra",
                flex: 1,
                minWidth: 220,
            },
            {
                field: "assignedCount",
                headerName: "Số học viên đã gán",
                width: 170,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "durationMinutes",
                headerName: "Thời gian làm bài",
                width: 120,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => (
                    <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {params.value !== "—" ? `${params.value} phút` : "—"}
                    </Box>
                ),
            },
            {
                field: "openAtText",
                headerName: "Thời gian mở đề",
                width: 175,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "dueAtText",
                headerName: "Thời gian đóng đề",
                width: 175,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "actions",
                headerName: "Hành động",
                width: 130,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => (
                    <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                            <Tooltip title="Xem chi tiết">
                                <IconButton
                                    size="small"
                                    onClick={() => navigate(`/admin/exams/${params.row.examId}`)}
                                    sx={{
                                        color: COLORS.blue,
                                        borderRadius: "8px",
                                        transition: "all 160ms ease",
                                        "&:hover": {
                                            bgcolor: "#1976d214",
                                            transform: "translateY(-1px)",
                                        },
                                        "&:active": { transform: "translateY(0px)" },
                                    }}
                                >
                                    <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa bài kiểm tra">
                                <IconButton
                                    size="small"
                                    onClick={() => setConfirm({ open: true, examId: params.row.examId })}
                                    sx={{
                                        color: "error.main",
                                        borderRadius: "8px",
                                        transition: "all 160ms ease",
                                        "&:hover": {
                                            bgcolor: "#ef444414",
                                            transform: "translateY(-1px)",
                                        },
                                        "&:active": { transform: "translateY(0px)" },
                                    }}
                                >
                                    <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Box>
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

        setRows((prev) => prev.filter((r) => r.examId !== examId));

        try {
            await assignedExamApi.adminDelete(examId);
            showToast("Đã xóa bài kiểm tra", "success");
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
            {/* ── Header ── */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                mb={2.5}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                        Bài kiểm tra đã tạo
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.textSecondary, mt: 0.4 }}>
                        Quản lý tất cả bài kiểm tra trong hệ thống
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => navigate("/admin/exams/create")}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        px: 2.5,
                        py: 1,
                        bgcolor: COLORS.orange,
                        boxShadow: "0 2px 8px rgba(236,94,50,0.35)",
                        "&:hover": {
                            bgcolor: COLORS.orangeDeep,
                            boxShadow: "0 4px 12px rgba(236,94,50,0.45)",
                        },
                    }}
                >
                    Tạo bài kiểm tra
                </Button>
            </Stack>

            <FilterPanel
                search={{
                    placeholder: "Tìm kiếm theo tên bài kiểm tra...",
                    value: searchText,
                    onChange: setSearchText,
                }}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((v) => !v)}
                onReset={() => {
                    setSearchText("");
                    setDateRange("all");
                    setCustomFrom("");
                    setCustomTo("");
                    setShowFilters(false);
                }}
                resetTooltip="Xóa bộ lọc"
                fields={{
                    result: {
                        enabled: true,
                        label: "Khoảng thời gian mở đề",
                        value: dateRange,
                        options: [
                            { value: "all",    label: "Tất cả" },
                            { value: "7d",     label: "7 ngày gần nhất" },
                            { value: "30d",    label: "30 ngày gần nhất" },
                            { value: "custom", label: "Tùy chọn" },
                        ],
                        onChange: (val) => {
                            setDateRange(val);
                            if (val !== "custom") { setCustomFrom(""); setCustomTo(""); }
                        },
                        loading: false,
                    },
                    ...(dateRange === "custom" ? {
                        startDate: {
                            enabled: true,
                            label: "Từ ngày",
                            value: customFrom,
                            onChange: setCustomFrom,
                        },
                        endDate: {
                            enabled: true,
                            label: "Đến ngày",
                            value: customTo,
                            onChange: setCustomTo,
                        },
                    } : {}),
                }}
            />
            <Paper
                elevation={0}
                sx={{
                    mt: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: COLORS.border,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    <DataGrid
                        rows={filteredRows}
                        getRowId={(row) => row.examId}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                        disableColumnMenu
                        hideFooter
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 20, 50]}
                        autoHeight
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

                {/* ── Footer / Pagination ── */}
                <Box
                    sx={{
                        px: 1.5,
                        py: 1,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "wrap",
                    }}
                >
                    {/* Stats */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={`Tổng: ${filteredRows.length}`}
                            size="small"
                            sx={{ fontWeight: 600, bgcolor: "#E8EDF5", color: COLORS.textPrimary }}
                        />
                    </Stack>

                    {/* Pagination */}
                    <Box sx={{ flexShrink: 0 }}>
                        <AppPagination
                            page={paginationModel.page + 1}
                            pageSize={paginationModel.pageSize}
                            total={filteredRows.length}
                            onPageChange={(nextPage1) =>
                                setPaginationModel((p) => ({ ...p, page: nextPage1 - 1 }))
                            }
                            onPageSizeChange={(nextSize) =>
                                setPaginationModel({ page: 0, pageSize: nextSize })
                            }
                            showPageSize={!isMobile}
                        />
                    </Box>
                </Box>
            </Paper>

            <GlobalLoading open={loading} message="Đang xử lý..." />

            <AppConfirm
                open={confirm.open}
                title="Xóa bài kiểm tra?"
                message="Bài kiểm tra và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?"
                onClose={() => setConfirm({ open: false, examId: null })}
                onConfirm={handleDelete}
                confirmText="Xóa"
                cancelText="Hủy"
            />
        </Box>
    );
}