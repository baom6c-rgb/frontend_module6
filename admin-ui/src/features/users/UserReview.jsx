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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Collapse,
    Alert,
    CircularProgress,
    Container,
} from "@mui/material";
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

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedRow, setExpandedRow] = useState(null);
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

    useEffect(() => setPage(0), [searchText, selectedModule, selectedClass, startDate, endDate]);

    const handleChangePage = (e, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };
    const handleExpandRow = (id) => setExpandedRow(expandedRow === id ? null : id);
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
                            color={COLORS.secondaryOrange}
                        />
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<TrendingIcon />}
                            title="ĐIỂM TB"
                            value={stats.averageScore}
                            subtitle="Trung bình các bài thi"
                            color={COLORS.success}
                        />
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <StatCard
                            icon={<SchoolIcon />}
                            title="XẾP HẠNG"
                            value={`#${stats.rank}`}
                            subtitle={`Trong tổng ${stats.totalStudents} học viên`}
                            color={COLORS.secondaryOrange}
                        />
                    </Grid>
                </Grid>

                {/* Filters */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}` }}>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                placeholder="Tìm kiếm theo tên bài test, module, lớp..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            />
                            <Button
                                variant={showFilters ? "contained" : "outlined"}
                                startIcon={<FilterList />}
                                onClick={() => setShowFilters(!showFilters)}
                                sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, minWidth: 150 }}
                            >
                                Bộ lọc
                            </Button>
                        </Stack>

                        <Collapse in={showFilters}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Module</InputLabel>
                                        <Select value={selectedModule} label="Module" onChange={(e) => setSelectedModule(e.target.value)} sx={{ borderRadius: "12px" }}>
                                            {modules.map((m) => (
                                                <MenuItem key={m} value={m}>{m}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Lớp học</InputLabel>
                                        <Select value={selectedClass} label="Lớp học" onChange={(e) => setSelectedClass(e.target.value)} sx={{ borderRadius: "12px" }}>
                                            {classes.map((c) => (
                                                <MenuItem key={c} value={c}>{c}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Từ ngày"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Đến ngày"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={2}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={handleResetFilters}
                                        sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, height: "56px" }}
                                    >
                                        Xóa bộ lọc
                                    </Button>
                                </Grid>
                            </Grid>
                        </Collapse>
                    </Stack>
                </Paper>

                <Typography sx={{ mb: 2, color: COLORS.textSecondary, fontWeight: 700 }}>
                    Hiển thị {filteredTests.length} kết quả{filteredTests.length !== tests.length && ` (từ ${tests.length} bài test)`}
                </Typography>

                {/* Table */}
                <Paper sx={{ borderRadius: "16px", overflow: "hidden", border: `1px solid ${COLORS.borderLight}` }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: COLORS.bgLight }}>
                                    {["Tên bài test", "Module", "Lớp học", "Ngày làm", "Điểm", "Kết quả", "Chi tiết", ""].map((h) => (
                                        <TableCell key={h} sx={{ fontWeight: 900, color: COLORS.textPrimary }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {filteredTests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>Không có dữ liệu</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((test) => {
                                        const id = test.id;
                                        return (
                                            <React.Fragment key={id}>
                                                <TableRow hover>
                                                    <TableCell sx={{ fontWeight: 700 }}>{test.name}</TableCell>

                                                    <TableCell>
                                                        <Chip label={test.module} size="small" sx={{ fontWeight: 700 }} />
                                                    </TableCell>

                                                    <TableCell sx={{ fontWeight: 700 }}>{test.className}</TableCell>

                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <CalendarToday sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                                                            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                                                {formatDate(test.submitTime || test.startTime)}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Typography sx={{ fontWeight: 900, color: getScoreColor(test.scorePct) }}>
                                                            {test.scorePct}/{test.totalScore}
                                                        </Typography>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Chip
                                                            label={getScoreLabel(test.scorePct)}
                                                            sx={{
                                                                bgcolor: getScoreColor(test.scorePct) + "20",
                                                                color: getScoreColor(test.scorePct),
                                                                fontWeight: 700,
                                                            }}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetail(test)}
                                                            sx={{ bgcolor: COLORS.primaryBlue + "10", "&:hover": { bgcolor: COLORS.primaryBlue + "20" } }}
                                                        >
                                                            <Visibility sx={{ color: COLORS.primaryBlue }} />
                                                        </IconButton>
                                                    </TableCell>

                                                    <TableCell>
                                                        <IconButton size="small" onClick={() => handleExpandRow(id)}>
                                                            {expandedRow === id ? <ExpandLess /> : <ExpandMore />}
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>

                                                <TableRow>
                                                    <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                                                        <Collapse in={expandedRow === id} timeout="auto" unmountOnExit>
                                                            <Box sx={{ p: 3, bgcolor: COLORS.bgLight }}>
                                                                <Grid container spacing={3}>
                                                                    {[
                                                                        { label: "Thời gian", value: `${test.durationMinutes} phút`, icon: Timer },
                                                                        { label: "Tổng câu hỏi", value: `${test.totalQuestions} câu` },
                                                                        { label: "Câu đúng", value: `${test.correctAnswers}/${test.totalQuestions}`, icon: CheckCircle, color: COLORS.success },
                                                                        { label: "Tỷ lệ đúng", value: `${test.accuracy}%` },
                                                                    ].map((item, i) => (
                                                                        <Grid item xs={12} md={3} key={i}>
                                                                            <Stack spacing={0.5}>
                                                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#707EAE" }}>
                                                                                    {item.label}
                                                                                </Typography>
                                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                                    {item.icon && <item.icon sx={{ fontSize: 18, color: item.color || COLORS.primaryBlue }} />}
                                                                                    <Typography sx={{ fontWeight: 700 }}>{item.value}</Typography>
                                                                                </Stack>
                                                                            </Stack>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>

                                                                {test.totalQuestions > 0 && test._raw?.correctAnswers == null && test._raw?.correctCount == null && (
                                                                    <Alert severity="info" sx={{ mt: 2 }}>
                                                                        “Câu đúng” đang hiển thị theo ước tính dựa trên điểm phần trăm vì BE chưa trả trường correctCount.
                                                                    </Alert>
                                                                )}
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={filteredTests.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số hàng:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                    />
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
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            Bạn trả lời đúng {selectedTest.correctAnswers}/{selectedTest.totalQuestions} câu ({selectedTest.accuracy}%)
                                        </Alert>
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
