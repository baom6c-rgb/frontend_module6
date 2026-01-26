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

// Import API - bạn cần tạo file này
import { getMyExamAttemptsApi } from "../../api/examApi";

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

    // Filter states
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState("Tất cả");
    const [selectedClass, setSelectedClass] = useState("Tất cả");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Dynamic filter options từ data
    const [modules, setModules] = useState(["Tất cả"]);
    const [classes, setClasses] = useState(["Tất cả"]);

    // Fetch exam attempts from API
    useEffect(() => {
        let alive = true;

        const fetchExamAttempts = async () => {
            try {
                setLoading(true);
                const response = await getMyExamAttemptsApi();

                if (!alive) return;

                if (response && response.data) {
                    const examData = response.data;
                    setTests(examData);
                    setFilteredTests(examData);

                    // Tạo danh sách module và class từ dữ liệu
                    const moduleSet = new Set(examData.map(exam => exam.module).filter(Boolean));
                    const classSet = new Set(examData.map(exam => exam.class).filter(Boolean));

                    setModules(["Tất cả", ...Array.from(moduleSet)]);
                    setClasses(["Tất cả", ...Array.from(classSet)]);

                    setError(null);
                } else {
                    setError("Không thể tải dữ liệu bài kiểm tra.");
                }
            } catch (err) {
                if (!alive) return;
                console.error("Error fetching exam attempts:", err);
                setError("Không thể tải dữ liệu bài kiểm tra. Vui lòng kiểm tra lại kết nối Server.");
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchExamAttempts();

        return () => {
            alive = false;
        };
    }, []);

    // Apply filters
    useEffect(() => {
        let result = tests;

        if (searchText) {
            result = result.filter((test) =>
                test.name?.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (selectedModule !== "Tất cả") {
            result = result.filter((test) => test.module === selectedModule);
        }

        if (selectedClass !== "Tất cả") {
            result = result.filter((test) => test.class === selectedClass);
        }

        if (startDate) {
            result = result.filter((test) => test.date >= startDate);
        }
        if (endDate) {
            result = result.filter((test) => test.date <= endDate);
        }

        setFilteredTests(result);
        setPage(0);
    }, [searchText, selectedModule, selectedClass, startDate, endDate, tests]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleExpandRow = (testId) => {
        setExpandedRow(expandedRow === testId ? null : testId);
    };

    const handleViewDetail = (test) => {
        setSelectedTest(test);
        setDetailDialogOpen(true);
    };

    const handleCloseDetail = () => {
        setDetailDialogOpen(false);
        setSelectedTest(null);
    };

    const clearFilters = () => {
        setSearchText("");
        setSelectedModule("Tất cả");
        setSelectedClass("Tất cả");
        setStartDate("");
        setEndDate("");
    };

    const getScoreColor = (score) => {
        if (score >= 80) return COLORS.success;
        if (score >= 60) return COLORS.warning;
        return COLORS.danger;
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return "Giỏi";
        if (score >= 60) return "Khá";
        return "Cần cải thiện";
    };

    // Statistics
    const totalTests = filteredTests.length;
    const averageScore = totalTests > 0
        ? (filteredTests.reduce((sum, test) => sum + (test.score || 0), 0) / totalTests).toFixed(1)
        : 0;
    const passedTests = filteredTests.filter((test) => (test.score || 0) >= 75).length;

    // StatCard component từ UserDashboard
    const StatCard = ({ icon, title, value, subtitle, color }) => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: "24px",
                border: `1px solid ${COLORS.borderLight}`,
                height: "100%",
                background: COLORS.bgWhite,
                transition: "all 0.25s ease",
                "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0px 18px 40px rgba(0,0,0,0.06)",
                    borderColor: color,
                },
            }}
        >
            <Box display="flex" alignItems="center">
                <Box
                    sx={{
                        p: 2,
                        borderRadius: "16px",
                        bgcolor: `${color}15`,
                        color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2.5,
                    }}
                >
                    {React.cloneElement(icon, { fontSize: "large" })}
                </Box>
                <Box>
                    <Typography
                        variant="body2"
                        sx={{
                            color: COLORS.textSecondary,
                            fontWeight: 800,
                            letterSpacing: "0.6px",
                        }}
                    >
                        {title}
                    </Typography>

                    <Typography variant="h4" fontWeight={900} sx={{ color: COLORS.textPrimary, my: 0.4 }}>
                        {value}
                    </Typography>

                    <Typography variant="caption" sx={{ color: "#8A94A6", fontWeight: 600 }}>
                        {subtitle}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );

    if (loading) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress thickness={5} size={60} sx={{ color: COLORS.primaryBlue }} />
                <Typography sx={{ mt: 2, color: "#8A94A6", fontWeight: 700 }}>
                    Đang tải dữ liệu bài kiểm tra...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: "16px", fontWeight: 700 }}>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <Box sx={{ width: "100%", p: { xs: 2, md: 4 }, bgcolor: COLORS.bgLight, minHeight: "100vh" }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 900,
                        color: COLORS.textPrimary,
                        mb: 1,
                    }}
                >
                    Đánh giá học tập
                </Typography>
                <Typography variant="h6" sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>
                    Xem lại các bài kiểm tra và kết quả học tập của bạn
                </Typography>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<AssignmentIcon />}
                        title="TỔNG SỐ BÀI TEST"
                        value={totalTests}
                        subtitle="Đã hoàn thành"
                        color={COLORS.primaryBlue}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<SchoolIcon />}
                        title="ĐIỂM TRUNG BÌNH"
                        value={averageScore}
                        subtitle="Trung bình các bài test"
                        color={COLORS.success}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<CheckIcon />}
                        title="BÀI ĐẠT YÊU CẦU"
                        value={`${passedTests}/${totalTests}`}
                        subtitle="Điểm ≥ 75"
                        color={COLORS.success}
                    />
                </Grid>

                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<TrendingIcon />}
                        title="XẾP HẠNG"
                        value="#15"
                        subtitle="Trong tổng 150 học viên"
                        color={COLORS.secondaryOrange}
                    />
                </Grid>
            </Grid>

            {/* Filter Section */}
            <Paper sx={{ p: 3, borderRadius: "24px", mb: 3, border: `1px solid ${COLORS.borderLight}` }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, fontSize: 18 }}>
                        Bộ lọc tìm kiếm
                    </Typography>
                    <Button
                        variant={showFilters ? "contained" : "outlined"}
                        startIcon={<FilterList />}
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{
                            borderRadius: "12px",
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        {showFilters ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}
                    </Button>
                </Box>

                <TextField
                    fullWidth
                    placeholder="Tìm kiếm theo tên bài test..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        mb: showFilters ? 2 : 0,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: "12px",
                        },
                    }}
                />

                <Collapse in={showFilters}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Module</InputLabel>
                                <Select
                                    value={selectedModule}
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                    label="Module"
                                    sx={{ borderRadius: "12px" }}
                                >
                                    {modules.map((module) => (
                                        <MenuItem key={module} value={module}>
                                            {module}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Lớp học</InputLabel>
                                <Select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    label="Lớp học"
                                    sx={{ borderRadius: "12px" }}
                                >
                                    {classes.map((cls) => (
                                        <MenuItem key={cls} value={cls}>
                                            {cls}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Từ ngày"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Đến ngày"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={clearFilters}
                            sx={{
                                borderRadius: "12px",
                                textTransform: "none",
                                fontWeight: 700,
                            }}
                        >
                            Xóa bộ lọc
                        </Button>
                    </Box>
                </Collapse>
            </Paper>

            {/* Results Table */}
            <Paper sx={{ borderRadius: "24px", overflow: "hidden", border: `1px solid ${COLORS.borderLight}` }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: COLORS.bgLight }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 900 }}>Tên bài test</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Module</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Lớp học</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Ngày làm</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Điểm</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography sx={{ color: "#707EAE", fontWeight: 600 }}>
                                            Không tìm thấy bài test nào phù hợp với bộ lọc
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTests
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((test) => (
                                        <React.Fragment key={test.id}>
                                            <TableRow hover>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
                                                        {test.name || "Bài kiểm tra"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={test.module || "N/A"}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: "rgba(11, 94, 215, 0.1)",
                                                            color: COLORS.primaryBlue,
                                                            fontWeight: 700,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{test.class || "N/A"}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <CalendarToday sx={{ fontSize: 16, color: "#707EAE" }} />
                                                        <Typography sx={{ fontSize: 14 }}>
                                                            {test.date ? new Date(test.date).toLocaleDateString("vi-VN") : "N/A"}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Typography
                                                            sx={{
                                                                fontWeight: 900,
                                                                fontSize: 18,
                                                                color: getScoreColor(test.score || 0),
                                                            }}
                                                        >
                                                            {test.score || 0}
                                                        </Typography>
                                                        <Typography sx={{ color: "#707EAE" }}>
                                                            /{test.totalScore || 100}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={getScoreLabel(test.score || 0)}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: getScoreColor(test.score || 0) + "20",
                                                            color: getScoreColor(test.score || 0),
                                                            fontWeight: 700,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleExpandRow(test.id)}
                                                            sx={{ color: COLORS.primaryBlue }}
                                                        >
                                                            {expandedRow === test.id ? (
                                                                <ExpandLess />
                                                            ) : (
                                                                <ExpandMore />
                                                            )}
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetail(test)}
                                                            sx={{ color: COLORS.secondaryOrange }}
                                                        >
                                                            <Visibility />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    sx={{ py: 0, borderBottom: expandedRow === test.id ? 1 : 0 }}
                                                >
                                                    <Collapse in={expandedRow === test.id} timeout="auto">
                                                        <Box sx={{ py: 2, px: 2, bgcolor: COLORS.bgLight }}>
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12} md={3}>
                                                                    <Stack spacing={0.5}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700,
                                                                                color: "#707EAE",
                                                                            }}
                                                                        >
                                                                            Thời gian làm bài
                                                                        </Typography>
                                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                                            <Timer sx={{ fontSize: 18 }} />
                                                                            <Typography sx={{ fontWeight: 700 }}>
                                                                                {test.duration || 0} phút
                                                                            </Typography>
                                                                        </Stack>
                                                                    </Stack>
                                                                </Grid>
                                                                <Grid item xs={12} md={3}>
                                                                    <Stack spacing={0.5}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700,
                                                                                color: "#707EAE",
                                                                            }}
                                                                        >
                                                                            Số câu hỏi
                                                                        </Typography>
                                                                        <Typography sx={{ fontWeight: 700 }}>
                                                                            {test.questions || 0} câu
                                                                        </Typography>
                                                                    </Stack>
                                                                </Grid>
                                                                <Grid item xs={12} md={3}>
                                                                    <Stack spacing={0.5}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700,
                                                                                color: "#707EAE",
                                                                            }}
                                                                        >
                                                                            Câu trả lời đúng
                                                                        </Typography>
                                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                                            <CheckCircle
                                                                                sx={{ fontSize: 18, color: COLORS.success }}
                                                                            />
                                                                            <Typography sx={{ fontWeight: 700 }}>
                                                                                {test.correctAnswers || 0}/{test.questions || 0}
                                                                            </Typography>
                                                                        </Stack>
                                                                    </Stack>
                                                                </Grid>
                                                                <Grid item xs={12} md={3}>
                                                                    <Stack spacing={0.5}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontSize: 12,
                                                                                fontWeight: 700,
                                                                                color: "#707EAE",
                                                                            }}
                                                                        >
                                                                            Tỷ lệ đúng
                                                                        </Typography>
                                                                        <Typography sx={{ fontWeight: 700 }}>
                                                                            {test.questions > 0
                                                                                ? ((test.correctAnswers / test.questions) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </Typography>
                                                                    </Stack>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))
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
                    labelRowsPerPage="Số hàng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                />
            </Paper>

            {/* Detail Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={handleCloseDetail}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: "16px",
                    },
                }}
            >
                <DialogTitle>
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary }}>
                        Chi tiết bài test
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {selectedTest && (
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 2 }}>
                                {selectedTest.name || "Bài kiểm tra"}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Module
                                    </Typography>
                                    <Chip label={selectedTest.module || "N/A"} sx={{ fontWeight: 700 }} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Lớp học
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700 }}>{selectedTest.class || "N/A"}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Ngày làm bài
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700 }}>
                                        {selectedTest.date ? new Date(selectedTest.date).toLocaleDateString("vi-VN") : "N/A"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Thời gian
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700 }}>
                                        {selectedTest.duration || 0} phút
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Điểm số
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: 24,
                                            color: getScoreColor(selectedTest.score || 0),
                                        }}
                                    >
                                        {selectedTest.score || 0}/{selectedTest.totalScore || 100}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography sx={{ color: "#707EAE", fontWeight: 700, mb: 0.5 }}>
                                        Kết quả
                                    </Typography>
                                    <Chip
                                        label={getScoreLabel(selectedTest.score || 0)}
                                        sx={{
                                            bgcolor: getScoreColor(selectedTest.score || 0) + "20",
                                            color: getScoreColor(selectedTest.score || 0),
                                            fontWeight: 700,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        Bạn đã trả lời đúng {selectedTest.correctAnswers || 0}/{selectedTest.questions || 0} câu hỏi
                                        ({selectedTest.questions > 0
                                        ? ((selectedTest.correctAnswers / selectedTest.questions) * 100).toFixed(1)
                                        : 0}%)
                                    </Alert>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseDetail}
                        variant="contained"
                        sx={{
                            borderRadius: "12px",
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}