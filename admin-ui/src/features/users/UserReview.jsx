import React, { useState, useEffect } from "react";
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

// Import API - ✅ Đúng path theo cấu trúc project
import { getMyExamAttemptsApi, getExamAttemptsStatsApi } from "../../api/examApi";

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

export default function UserReview() {
    const [tests, setTests] = useState([]);
    const [filteredTests, setFilteredTests] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedRow, setExpandedRow] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        totalTests: 0,
        averageScore: 0,
        passedTests: 0,
        rank: 0,
        totalStudents: 150,
    });

    // Filter states
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState("Tất cả");
    const [selectedClass, setSelectedClass] = useState("Tất cả");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Dynamic filter options
    const [modules, setModules] = useState(["Tất cả"]);
    const [classes, setClasses] = useState(["Tất cả"]);

    // 🔥 FETCH DATA với debug logging
    useEffect(() => {
        let alive = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log("===========================================");
                console.log("🚀 UserReview: Starting data fetch");
                console.log("===========================================");

                // Check token
                const token = localStorage.getItem("accessToken");
                console.log("🔐 Token check:");
                console.log("   Has token:", !!token);
                console.log("   Token preview:", token ? token.substring(0, 50) + "..." : "NO TOKEN");

                if (!token || token === "null") {
                    throw new Error("No valid token. Please login.");
                }

                console.log("📡 Fetching exam attempts and stats...");

                // Fetch parallel
                const [attemptsRes, statsRes] = await Promise.all([
                    getMyExamAttemptsApi(),
                    getExamAttemptsStatsApi()
                ]);

                if (!alive) return;

                console.log("📥 Responses received");
                console.log("   Attempts data:", attemptsRes?.data);
                console.log("   Stats data:", statsRes?.data);

                // Process attempts
                if (attemptsRes?.data) {
                    const data = Array.isArray(attemptsRes.data) ? attemptsRes.data : [];
                    console.log("✅ Loaded", data.length, "exam attempts");

                    if (data.length > 0) {
                        console.log("📝 First record:", data[0]);
                    }

                    setTests(data);
                    setFilteredTests(data);

                    // Extract modules & classes
                    const mods = new Set(data.map(e => e.module || e.moduleName).filter(Boolean));
                    const cls = new Set(data.map(e => e.className || e.class).filter(Boolean));
                    setModules(["Tất cả", ...Array.from(mods)]);
                    setClasses(["Tất cả", ...Array.from(cls)]);
                }

                // Process stats
                if (statsRes?.data) {
                    console.log("✅ Stats loaded");
                    setStats({
                        totalTests: statsRes.data.totalTests || 0,
                        averageScore: statsRes.data.averageScore || 0,
                        passedTests: statsRes.data.passedTests || 0,
                        rank: statsRes.data.rank || 0,
                        totalStudents: statsRes.data.totalStudents || 150,
                    });
                }

                console.log("✅ Fetch completed successfully");
                console.log("===========================================");

            } catch (err) {
                if (!alive) return;

                console.error("❌ ERROR in UserReview:", err);
                console.error("Error response:", err.response);

                if (err.response?.status === 401) {
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = "/login";
                    }, 2000);
                } else if (err.response?.status === 403) {
                    setError("Access denied. Please check your token or login again.");
                } else {
                    setError(err.message || "Failed to load data");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => { alive = false; };
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = [...tests];

        if (searchText) {
            filtered = filtered.filter(t =>
                (t.name || t.examName || "").toLowerCase().includes(searchText.toLowerCase()) ||
                (t.module || t.moduleName || "").toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (selectedModule !== "Tất cả") {
            filtered = filtered.filter(t => (t.module || t.moduleName) === selectedModule);
        }

        if (selectedClass !== "Tất cả") {
            filtered = filtered.filter(t => (t.className || t.class) === selectedClass);
        }

        if (startDate) {
            filtered = filtered.filter(t => new Date(t.date || t.submitTime) >= new Date(startDate));
        }

        if (endDate) {
            filtered = filtered.filter(t => new Date(t.date || t.submitTime) <= new Date(endDate));
        }

        setFilteredTests(filtered);
        setPage(0);
    }, [tests, searchText, selectedModule, selectedClass, startDate, endDate]);

    // Handlers
    const handleChangePage = (e, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleExpandRow = (id) => setExpandedRow(expandedRow === id ? null : id);
    const handleViewDetail = (test) => { setSelectedTest(test); setDetailDialogOpen(true); };
    const handleCloseDetail = () => { setDetailDialogOpen(false); setSelectedTest(null); };
    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule("Tất cả");
        setSelectedClass("Tất cả");
        setStartDate("");
        setEndDate("");
    };

    // Utilities
    const getScoreColor = (score) => score >= 80 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger;
    const getScoreLabel = (score) => score >= 80 ? "Xuất sắc" : score >= 50 ? "Đạt" : "Chưa đạt";
    const formatDateTime = (d) => d ? new Date(d).toLocaleString("vi-VN") : "N/A";
    const formatDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "N/A";

    // Loading state
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: COLORS.bgLight }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress size={60} />
                    <Typography sx={{ fontWeight: 700 }}>Đang tải dữ liệu...</Typography>
                    <Typography sx={{ fontSize: 14, color: COLORS.textSecondary }}>
                        Check Console (F12) để xem chi tiết
                    </Typography>
                </Stack>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: COLORS.bgLight, p: 3 }}>
                <Paper sx={{ p: 4, maxWidth: 600, textAlign: "center", borderRadius: "16px" }}>
                    <Typography sx={{ fontSize: 48, mb: 2 }}>⚠️</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, mb: 2, color: COLORS.danger }}>
                        Đã xảy ra lỗi
                    </Typography>
                    <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
                    <Typography sx={{ mb: 3, color: COLORS.textSecondary }}>
                        Mở Console (F12) để xem chi tiết lỗi
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button variant="contained" onClick={() => window.location.reload()}
                                sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                            Tải lại trang
                        </Button>
                        <Button variant="outlined" onClick={() => window.location.href = "/login"}
                                sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
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

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {[
                        { label: "Tổng bài test", value: stats.totalTests, icon: AssignmentIcon, color: COLORS.primaryBlue },
                        { label: "Điểm TB", value: stats.averageScore.toFixed(1), icon: TrendingIcon, color: COLORS.success },
                        { label: "Bài test đạt", value: stats.passedTests, icon: CheckIcon, color: COLORS.warning },
                        { label: "Xếp hạng", value: `${stats.rank}/${stats.totalStudents}`, icon: SchoolIcon, color: COLORS.secondaryOrange },
                    ].map((stat, i) => (
                        <Grid item xs={12} md={3} key={i}>
                            <Paper sx={{ p: 3, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}` }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ width: 56, height: 56, borderRadius: "12px", bgcolor: stat.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <stat.icon sx={{ color: stat.color, fontSize: 28 }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 700 }}>{stat.label}</Typography>
                                        <Typography sx={{ fontSize: 28, fontWeight: 900, color: COLORS.textPrimary }}>{stat.value}</Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* Filters */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}` }}>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                placeholder="Tìm kiếm theo tên bài test, module..."
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
                                            {modules.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <FormControl fullWidth>
                                        <InputLabel>Lớp học</InputLabel>
                                        <Select value={selectedClass} label="Lớp học" onChange={(e) => setSelectedClass(e.target.value)} sx={{ borderRadius: "12px" }}>
                                            {classes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField fullWidth type="date" label="Từ ngày" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                               InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }} />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField fullWidth type="date" label="Đến ngày" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                               InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }} />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <Button fullWidth variant="outlined" onClick={handleResetFilters}
                                            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, height: "56px" }}>
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
                                        <TableCell key={h} sx={{ fontWeight: 900, color: COLORS.textPrimary }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>
                                                Không có dữ liệu
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((test) => {
                                        const id = test.id || test.attemptId;
                                        return (
                                            <React.Fragment key={id}>
                                                <TableRow hover>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {test.name || test.examName || "Bài test"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={test.module || test.moduleName || "N/A"} size="small" sx={{ fontWeight: 700 }} />
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {test.className || test.class || "N/A"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <CalendarToday sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                                                            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                                                {formatDate(test.date || test.submitTime)}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontWeight: 900, color: getScoreColor(test.score || 0) }}>
                                                            {test.score || 0}/{test.totalScore || 100}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={getScoreLabel(test.score || 0)}
                                                              sx={{ bgcolor: getScoreColor(test.score || 0) + "20", color: getScoreColor(test.score || 0), fontWeight: 700 }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton size="small" onClick={() => handleViewDetail(test)}
                                                                    sx={{ bgcolor: COLORS.primaryBlue + "10", "&:hover": { bgcolor: COLORS.primaryBlue + "20" } }}>
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
                                                                        { label: "Thời gian", value: `${test.duration || 0} phút`, icon: Timer },
                                                                        { label: "Tổng câu hỏi", value: `${test.questions || test.totalQuestions || 0} câu` },
                                                                        { label: "Câu đúng", value: `${test.correctAnswers || 0}/${test.questions || test.totalQuestions || 0}`, icon: CheckCircle, color: COLORS.success },
                                                                        { label: "Tỷ lệ đúng", value: `${(test.questions || test.totalQuestions) > 0 ? ((test.correctAnswers / (test.questions || test.totalQuestions)) * 100).toFixed(1) : 0}%` },
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
                <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth
                        PaperProps={{ sx: { borderRadius: "16px" } }}>
                    <DialogTitle>
                        <Typography sx={{ fontWeight: 900 }}>Chi tiết bài test</Typography>
                    </DialogTitle>
                    <DialogContent>
                        {selectedTest && (
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 2 }}>
                                    {selectedTest.name || selectedTest.examName}
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Module</Typography>
                                        <Chip label={selectedTest.module || selectedTest.moduleName || "N/A"} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Lớp học</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>
                                            {selectedTest.className || selectedTest.class || "N/A"}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Ngày làm bài</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>
                                            {formatDateTime(selectedTest.date || selectedTest.submitTime)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Thời gian</Typography>
                                        <Typography sx={{ fontWeight: 700 }}>{selectedTest.duration || 0} phút</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Điểm số</Typography>
                                        <Typography sx={{ fontWeight: 900, fontSize: 24, color: getScoreColor(selectedTest.score || 0) }}>
                                            {selectedTest.score || 0}/{selectedTest.totalScore || 100}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>Kết quả</Typography>
                                        <Chip label={getScoreLabel(selectedTest.score || 0)}
                                              sx={{ bgcolor: getScoreColor(selectedTest.score || 0) + "20", color: getScoreColor(selectedTest.score || 0), fontWeight: 700 }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            Bạn đã trả lời đúng {selectedTest.correctAnswers || 0}/{selectedTest.questions || selectedTest.totalQuestions || 0} câu hỏi
                                            ({(selectedTest.questions || selectedTest.totalQuestions) > 0
                                            ? ((selectedTest.correctAnswers / (selectedTest.questions || selectedTest.totalQuestions)) * 100).toFixed(1)
                                            : 0}%)
                                        </Alert>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleCloseDetail} variant="contained"
                                sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}