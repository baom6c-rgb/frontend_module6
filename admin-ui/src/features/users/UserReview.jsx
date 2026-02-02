import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Divider,
    InputAdornment,
    Alert,
    CircularProgress,
    Container,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
    Search,
    FilterList,
    CalendarToday,
    Timer,
    Visibility,
    ExpandMore,
    ExpandLess,
    CheckCircle,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingIcon,
    School as SchoolIcon,
    Check as CheckIcon,
} from "@mui/icons-material";

import { getMyExamAttemptsApi } from "../../api/examApi";
import { getDashboardStatsApi } from "../../api/dashboardApi";
import FilterPanel from "../../components/common/FilterPanel.jsx";
import AppPagination from "../../components/common/AppPagination.jsx";

const COLORS = {
    primaryBlue: "#0B5ED7",
    secondaryOrange: "#FF8C00",
    bgWhite: "#FFFFFF",
    bgLight: "#F7F9FC",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    borderLight: "#E3E8EF",
    success: "#05CD99",
    warning: "#FFB547",
    danger: "#EE5D50",
};

const ALL = "Tất cả";

const safeNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const formatDateTime = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

const formatDateTimeSplit = (dateStr) => {
    if (!dateStr) return { date: "—", time: "—" };
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date, time };
};

function normalizeAttempt(raw) {
    const id = raw?.id ?? raw?.attemptId ?? raw?.examAttemptId ?? null;

    const submitTime = raw?.submitTime ?? raw?.date ?? raw?.submittedAt ?? raw?.endTime ?? null;
    const startTime = raw?.startTime ?? raw?.startedAt ?? null;

    const name =
        raw?.name ??
        raw?.examName ??
        raw?.examTitle ??
        raw?.title ??
        (String(raw?.type || "").toUpperCase().includes("PRACTICE") ? "Bài thi PRACTICE" : "Bài test");

    const module =
        raw?.module ??
        raw?.moduleName ??
        raw?.learningModuleName ??
        raw?.learningModule ??
        raw?.moduleTitle ??
        raw?.module_code ??
        null;

    const className =
        raw?.className ??
        raw?.class ??
        raw?.classroomName ??
        raw?.classroom ??
        raw?.classTitle ??
        raw?.class_code ??
        null;

    const totalQuestions = safeNum(
        raw?.totalQuestions ??
        raw?.questions ??
        raw?.questionCount ??
        raw?.totalQuestion ??
        raw?.numQuestions,
        0
    );

    // attempt.score bên BE đang là % (0..100)
    const scorePct = safeNum(raw?.score ?? raw?.scorePct ?? raw?.percentage ?? 0, 0);

    const totalScore = safeNum(raw?.totalScore ?? raw?.totalPoints ?? raw?.maxScore ?? 100, 100);

    const directCorrect = raw?.correctAnswers ?? raw?.correctCount ?? raw?.numCorrect ?? raw?.correct ?? null;
    let correctAnswers = directCorrect == null ? null : safeNum(directCorrect, 0);

    if (correctAnswers == null) {
        if (totalQuestions > 0) {
            const estimated = Math.round((scorePct / 100) * totalQuestions);
            correctAnswers = Math.max(0, Math.min(totalQuestions, estimated));
        } else {
            correctAnswers = 0;
        }
    }

    let durationMinutes =
        raw?.durationMinutes ?? raw?.duration ?? raw?.timeMinutes ?? raw?.minutes ?? null;

    if (durationMinutes == null && startTime && submitTime) {
        const diffMs = new Date(submitTime).getTime() - new Date(startTime).getTime();
        durationMinutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    }
    durationMinutes = safeNum(durationMinutes, 0);

    const accuracy =
        totalQuestions > 0 ? Number(((correctAnswers / totalQuestions) * 100).toFixed(1)) : 0;

    return {
        _raw: raw,
        id,
        name,
        module: module || "Chưa gắn module",
        className: className || "Chưa gắn lớp",
        submitTime,
        startTime,
        scorePct,
        totalScore,
        totalQuestions,
        correctAnswers,
        accuracy,
        durationMinutes,
    };
}

const StatCard = ({ icon, title, value, subtitle, color }) => (
    <Paper
        elevation={0}
        sx={{
            p: 3,
            borderRadius: "16px",
            border: `1px solid ${COLORS.borderLight}`,
            height: "100%",
            background: COLORS.bgWhite,
            transition: "all 0.25s ease",
            "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0px 18px 40px rgba(0,0,0,0.06)",
                borderColor: color,
            },
        }}
    >
        <Stack direction="row" alignItems="center" spacing={2}>
            <Box
                sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "12px",
                    bgcolor: color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
            </Box>

            <Box>
                <Typography sx={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 800 }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1.1 }}>
                    {value}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#8A94A6", fontWeight: 700 }}>
                    {subtitle}
                </Typography>
            </Box>
        </Stack>
    </Paper>
);

export default function UserReview() {
    const [testsRaw, setTestsRaw] = useState([]);
    const tests = useMemo(() => testsRaw.map(normalizeAttempt), [testsRaw]);

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [selectedTest, setSelectedTest] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Stats giống Dashboard (dùng chung getDashboardStatsApi)
    const [stats, setStats] = useState({
        completedLessons: 0,
        onlineTime: 0,
        averageScore: 0,
        rank: 0,
        totalStudents: 0,
    });

    // Filters
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState(ALL);
    const [selectedClass, setSelectedClass] = useState(ALL);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const [modules, setModules] = useState([ALL]);
    const [classes, setClasses] = useState([ALL]);

    useEffect(() => {
        let alive = true;

        const fetchAll = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem("accessToken");
                if (!token || token === "null") throw new Error("No valid token. Please login.");

                // ✅ chạy song song: attempts + dashboard stats
                const [attemptsRes, dashStatsRes] = await Promise.allSettled([
                    getMyExamAttemptsApi(),
                    getDashboardStatsApi(),
                ]);

                if (!alive) return;

                // attempts
                if (attemptsRes.status === "fulfilled") {
                    const data = Array.isArray(attemptsRes.value?.data) ? attemptsRes.value.data : [];
                    setTestsRaw(data);

                    const normalized = data.map(normalizeAttempt);
                    const mods = new Set(normalized.map((e) => e.module).filter(Boolean));
                    const cls = new Set(normalized.map((e) => e.className).filter(Boolean));
                    setModules([ALL, ...Array.from(mods)]);
                    setClasses([ALL, ...Array.from(cls)]);
                } else {
                    console.error("UserReview attempts error:", attemptsRes.reason);
                    throw attemptsRes.reason;
                }

                // stats (dashboard)
                if (dashStatsRes.status === "fulfilled") {
                    const s = dashStatsRes.value?.data || {};
                    setStats({
                        completedLessons: safeNum(s.completedLessons, 0),
                        onlineTime: safeNum(s.onlineTime, 0),
                        averageScore: safeNum(s.averageScore, 0),
                        rank: safeNum(s.rank, 0),
                        totalStudents: safeNum(s.totalStudents, 0),
                    });
                } else {
                    console.warn("UserReview dashboard stats error:", dashStatsRes.reason);
                    // không block UI nếu stats fail
                }
            } catch (err) {
                if (!alive) return;

                if (err?.response?.status === 401) {
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = "/login";
                    }, 1200);
                } else if (err?.response?.status === 403) {
                    setError("Access denied. Please check your token or login again.");
                } else {
                    setError(err?.message || "Failed to load data");
                }
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchAll();
        return () => {
            alive = false;
        };
    }, []);

    const filteredTests = useMemo(() => {
        let filtered = [...tests];

        if (searchText.trim()) {
            const s = searchText.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    (t.name || "").toLowerCase().includes(s) ||
                    (t.module || "").toLowerCase().includes(s) ||
                    (t.className || "").toLowerCase().includes(s)
            );
        }

        if (selectedModule !== ALL) filtered = filtered.filter((t) => t.module === selectedModule);
        if (selectedClass !== ALL) filtered = filtered.filter((t) => t.className === selectedClass);

        if (startDate) {
            filtered = filtered.filter((t) => new Date(t.submitTime || t.startTime) >= new Date(startDate));
        }
        if (endDate) {
            filtered = filtered.filter((t) => new Date(t.submitTime || t.startTime) <= new Date(endDate));
        }

        return filtered;
    }, [tests, searchText, selectedModule, selectedClass, startDate, endDate]);

    useEffect(() => setPaginationModel(prev => ({ ...prev, page: 0 })), [searchText, selectedModule, selectedClass, startDate, endDate]);

    const handleViewDetail = (test) => {
        setSelectedTest(test);
        setDetailDialogOpen(true);
    };
    const handleCloseDetail = () => {
        setDetailDialogOpen(false);
        setSelectedTest(null);
    };
    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule(ALL);
        setSelectedClass(ALL);
        setStartDate("");
        setEndDate("");
    };

    const getScoreColor = (scorePct) =>
        scorePct >= 80 ? COLORS.success : scorePct >= 50 ? COLORS.warning : COLORS.danger;

    const getScoreLabel = (scorePct) =>
        scorePct >= 80 ? "Xuất sắc" : scorePct >= 50 ? "Đạt" : "Chưa đạt";

    const columns = useMemo(() => {
        const pageOffset = paginationModel.page * paginationModel.pageSize;

        const centerCell = (children) => (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {children}
            </Box>
        );

        return [
            {
                field: "stt",
                headerName: "STT",
                width: 80,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const idx = params.api.getRowIndexRelativeToVisibleRows(params.id);
                    return centerCell(pageOffset + idx + 1);
                },
            },
            {
                field: "name",
                headerName: "Tên bài test",
                flex: 1.5,
                minWidth: 200,
                renderCell: (params) => params.value,
            },
            {
                field: "module",
                headerName: "Module",
                flex: 1,
                minWidth: 150,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => params.value,
            },
            {
                field: "className",
                headerName: "Lớp học",
                flex: 1,
                minWidth: 150,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => params.value,
            },
            {
                field: "submitTime",
                headerName: "Ngày làm",
                flex: 0.9,
                minWidth: 120,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const { date, time } = formatDateTimeSplit(params.value || params.row.startTime);
                    return (
                        <Box sx={{ textAlign: "center" }}>
                            <div>{date}</div>
                            <div>{time}</div>
                        </Box>
                    );
                },
            },
            {
                field: "scorePct",
                headerName: "Điểm",
                flex: 0.7,
                minWidth: 100,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => (
                    <span style={{ color: getScoreColor(params.value) }}>
                        {params.value}/{params.row.totalScore}
                    </span>
                ),
            },
            {
                field: "result",
                headerName: "Kết quả",
                flex: 1,
                minWidth: 130,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const scorePercent = params.row.totalScore
                        ? (Number(params.row.scorePct) / Number(params.row.totalScore)) * 100
                        : 0;
                    const isPassed = scorePercent >= 50;

                    return (
                        <span style={{ color: isPassed ? COLORS.success : COLORS.danger }}>
                            {isPassed ? "Đạt" : "Không đạt"}
                        </span>
                    );
                },
            },
            {
                field: "actions",
                headerName: "Chi tiết",
                width: 100,
                sortable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => (
                    <IconButton
                        size="small"
                        onClick={() => handleViewDetail(params.row)}
                        sx={{
                            bgcolor: COLORS.primaryBlue + "10",
                            "&:hover": { bgcolor: COLORS.primaryBlue + "20" }
                        }}
                    >
                        <Visibility sx={{ color: COLORS.primaryBlue }} />
                    </IconButton>
                ),
            },
        ];
    }, [paginationModel.page, paginationModel.pageSize]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: COLORS.bgLight }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress size={60} />
                    <Typography sx={{ fontWeight: 700 }}>Đang tải dữ liệu...</Typography>
                </Stack>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: COLORS.bgLight, p: 3 }}>
                <Paper sx={{ p: 4, maxWidth: 600, textAlign: "center", borderRadius: "16px" }}>
                    <Typography sx={{ fontSize: 48, mb: 2 }}>⚠️</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, mb: 2, color: COLORS.danger }}>
                        Đã xảy ra lỗi
                    </Typography>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button variant="contained" onClick={() => window.location.reload()} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                            Tải lại trang
                        </Button>
                        <Button variant="outlined" onClick={() => (window.location.href = "/login")} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                            Đăng nhập lại
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: COLORS.bgLight, minHeight: "100vh", py: 4 }}>
            <Container maxWidth="xl">
                <Typography variant="h4" sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 3 }}>
                    Đánh giá học tập
                </Typography>

                {/* ✅ Stats giống Dashboard */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<AssignmentIcon />}
                            title="HOÀN THÀNH"
                            value={stats.completedLessons}
                            subtitle="Bài kiểm tra đã nộp"
                            color={COLORS.primaryBlue}
                        />
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<Timer />}
                            title="THỜI GIAN"
                            value={`${stats.onlineTime}h`}
                            subtitle="Tổng thời lượng học"
                            color={COLORS.success}
                        />
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<TrendingIcon />}
                            title="ĐIỂM TRUNG BÌNH"
                            value={`${stats.averageScore}%`}
                            subtitle="Tỉ lệ hoàn thành"
                            color={COLORS.warning}
                        />
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<CheckCircle />}
                            title="THỨ HẠNG"
                            value={`${stats.rank}/${stats.totalStudents}`}
                            subtitle={`Trong tổng ${stats.totalStudents} học viên`}
                            color={COLORS.secondaryOrange}
                        />
                    </Grid>
                </Grid>

                {/* Filters */}
                <FilterPanel
                    search={{
                        placeholder: "Tìm kiếm theo tên bài test, module, lớp...",
                        value: searchText,
                        onChange: setSearchText,
                    }}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onReset={handleResetFilters}
                    resetTooltip="Xóa bộ lọc"
                    fields={{
                        module: {
                            enabled: true,
                            label: "Module",
                            value: selectedModule,
                            options: modules.map((m) => ({ value: m, label: m })),
                            onChange: setSelectedModule,
                            loading: false,
                        },
                        class: {
                            enabled: true,
                            label: "Lớp học",
                            value: selectedClass,
                            options: classes.map((c) => ({ value: c, label: c })),
                            onChange: setSelectedClass,
                            loading: false,
                        },
                        startDate: {
                            enabled: true,
                            label: "Từ ngày",
                            value: startDate,
                            onChange: setStartDate,
                        },
                        endDate: {
                            enabled: true,
                            label: "Đến ngày",
                            value: endDate,
                            onChange: setEndDate,
                        },
                    }}
                />
                <Box sx={{ my: 3 }} />

                <Typography sx={{ mb: 2, color: COLORS.textSecondary, fontWeight: 700 }}>
                    Hiển thị {filteredTests.length} kết quả{filteredTests.length !== tests.length && ` (từ ${tests.length} bài test)`}
                </Typography>

                {/* DataGrid - PHẦN DUY NHẤT ĐƯỢC SỬA */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 420,
                    }}
                >
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <DataGrid
                            rows={filteredTests}
                            columns={columns}
                            loading={loading}
                            disableRowSelectionOnClick
                            getRowId={(r) => r.id ?? `${Math.random()}`}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[10, 25, 50]}
                            disableColumnMenu
                            hideFooter
                            sx={{
                                border: 0,
                                height: "100%",
                                "& .MuiDataGrid-columnHeaders": {
                                    bgcolor: "background.paper",
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                },
                                "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
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
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 1,
                            flexWrap: "wrap",
                        }}
                    >
                        <AppPagination
                            page={paginationModel.page + 1}
                            pageSize={paginationModel.pageSize}
                            total={filteredTests.length}
                            onPageChange={(nextPage) => setPaginationModel((p) => ({ ...p, page: nextPage - 1 }))}
                            onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                            pageSizeOptions={[10, 25, 50]}
                            loading={loading}
                        />
                    </Box>
                </Paper>

                {/* Detail Dialog */}
                <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
                    <DialogTitle>
                        <Typography sx={{ fontWeight: 900 }}>Chi tiết bài test</Typography>
                    </DialogTitle>
                    <DialogContent>
                        {selectedTest && (
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 2 }}>{selectedTest.name}</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Module</Typography>
                                        <Chip label={selectedTest.module} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Lớp học</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{selectedTest.className}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Ngày làm bài</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{formatDateTime(selectedTest.submitTime || selectedTest.startTime)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Thời gian</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{selectedTest.durationMinutes} phút</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Điểm số</Typography>
                                        <Typography sx={{ fontWeight: 900, fontSize: 24, color: getScoreColor(selectedTest.scorePct) }}>
                                            {selectedTest.scorePct}/{selectedTest.totalScore}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Kết quả</Typography>
                                        <Chip
                                            label={getScoreLabel(selectedTest.scorePct)}
                                            sx={{ bgcolor: getScoreColor(selectedTest.scorePct) + "20", color: getScoreColor(selectedTest.scorePct), fontWeight: 700 }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleCloseDetail} variant="contained" sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}