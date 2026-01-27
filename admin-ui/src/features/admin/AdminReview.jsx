import React, { useState, useEffect } from "react";
import {
    Box, Paper, Typography, TextField, Grid, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TablePagination, CircularProgress, Avatar, Chip,
    InputAdornment, MenuItem, FormControl, Select, InputLabel,
    Button, Collapse, Alert
} from "@mui/material";
import {
    Search,
    FilterList,
    SchoolRounded,
    LayersRounded,
    AssignmentTurnedInRounded,
    TrendingUpRounded
} from "@mui/icons-material";
import axios from "axios";

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

const AdminReview = () => {
    const [attempts, setAttempts] = useState([]);
    const [filteredAttempts, setFilteredAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states - giống UserReview
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState("Tất cả");
    const [selectedClass, setSelectedClass] = useState("Tất cả");
    const [selectedStatus, setSelectedStatus] = useState("Tất cả");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Dynamic filter options
    const [modules, setModules] = useState(["Tất cả"]);
    const [classes, setClasses] = useState(["Tất cả"]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // 🔥 FETCH DATA - Sử dụng accessToken
    useEffect(() => {
        let alive = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log("===========================================");
                console.log("🚀 AdminReview: Starting data fetch");
                console.log("===========================================");

                // ✅ Sử dụng accessToken thay vì token
                const token = localStorage.getItem("accessToken");
                console.log("🔐 Token check:");
                console.log("   Has token:", !!token);
                console.log("   Token preview:", token ? token.substring(0, 50) + "..." : "NO TOKEN");

                if (!token || token === "null") {
                    throw new Error("No valid token. Please login.");
                }

                console.log("📡 Fetching all exam attempts...");

                const res = await axios.get("http://localhost:8080/api/exam-attempts/admin/all-attempts", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!alive) return;

                console.log("📥 Response received:", res.data);
                console.log("✅ Loaded", res.data.length, "exam attempts");

                if (res.data.length > 0) {
                    console.log("📝 First record:", res.data[0]);
                }

                setAttempts(res.data);
                setFilteredAttempts(res.data);

                // Extract unique modules & classes
                const uniqueModules = ["Tất cả", ...new Set(res.data.map(a => a.module).filter(Boolean))];
                const uniqueClasses = ["Tất cả", ...new Set(res.data.map(a => a.className).filter(Boolean))];
                setModules(uniqueModules);
                setClasses(uniqueClasses);

                console.log("===========================================");
                console.log("✅ AdminReview: Data fetch completed");
                console.log("===========================================");

            } catch (err) {
                console.error("===========================================");
                console.error("❌ AdminReview: Data fetch FAILED");
                console.error("Error:", err);
                console.error("===========================================");

                if (!alive) return;

                if (err.response?.status === 401) {
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = "/login";
                    }, 2000);
                } else if (err.response?.status === 403) {
                    setError("Access denied. Admin privileges required.");
                } else {
                    setError(err.message || "Failed to load data");
                }
            } finally {
                if (alive) {
                    setLoading(false);
                }
            }
        };

        loadData();
        return () => { alive = false; };
    }, []);

    // 🔥 APPLY FILTERS - Logic giống UserReview
    useEffect(() => {
        let filtered = [...attempts];

        // 1. Search by student name, email, or exam name
        if (searchText.trim()) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(a =>
                (a.studentName || "").toLowerCase().includes(search) ||
                (a.studentEmail || "").toLowerCase().includes(search) ||
                (a.name || "").toLowerCase().includes(search)
            );
        }

        // 2. Filter by Module
        if (selectedModule !== "Tất cả") {
            filtered = filtered.filter(a => a.module === selectedModule);
        }

        // 3. Filter by Class
        if (selectedClass !== "Tất cả") {
            filtered = filtered.filter(a => a.className === selectedClass);
        }

        // 4. Filter by Status (Pass/Fail)
        if (selectedStatus === "Đạt") {
            filtered = filtered.filter(a => (a.score / a.totalScore) >= 0.5);
        } else if (selectedStatus === "Chưa đạt") {
            filtered = filtered.filter(a => (a.score / a.totalScore) < 0.5);
        }

        // 5. Filter by Start Date
        if (startDate) {
            filtered = filtered.filter(a => new Date(a.date) >= new Date(startDate));
        }

        // 6. Filter by End Date
        if (endDate) {
            filtered = filtered.filter(a => new Date(a.date) <= new Date(endDate));
        }

        setFilteredAttempts(filtered);
        setPage(0); // Reset to first page when filters change
    }, [attempts, searchText, selectedModule, selectedClass, selectedStatus, startDate, endDate]);

    // Handlers
    const handleChangePage = (e, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };
    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule("Tất cả");
        setSelectedClass("Tất cả");
        setSelectedStatus("Tất cả");
        setStartDate("");
        setEndDate("");
    };

    // Utilities
    const getScoreColor = (score, totalScore) => {
        const percentage = (score / totalScore) * 100;
        if (percentage >= 80) return COLORS.success;
        if (percentage >= 50) return COLORS.warning;
        return COLORS.danger;
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("vi-VN");
    };

    // Loading state
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress size={60} />
                    <Typography sx={{ color: COLORS.textSecondary }}>Đang tải dữ liệu...</Typography>
                </Stack>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Lỗi tải dữ liệu</Typography>
                    <Typography>{error}</Typography>
                    <Button variant="outlined" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
                        Tải lại trang
                    </Button>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: COLORS.bgLight, minHeight: "100vh", p: 3 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
                    Đánh giá học tập hệ thống
                </Typography>
                <Chip
                    icon={<TrendingUpRounded />}
                    label={`Tổng: ${filteredAttempts.length} kết quả`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
            </Stack>

            {/* Filter Section - Giống UserReview */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}` }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm theo tên học viên, email, bài thi..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: COLORS.primaryBlue }} />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                        <Button
                            variant={showFilters ? "contained" : "outlined"}
                            startIcon={<FilterList />}
                            onClick={() => setShowFilters(!showFilters)}
                            sx={{
                                borderRadius: "12px",
                                textTransform: "none",
                                fontWeight: 700,
                                minWidth: 150
                            }}
                        >
                            Bộ lọc
                        </Button>
                    </Stack>

                    {/* Collapsible Filters */}
                    <Collapse in={showFilters}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={2.4}>
                                <FormControl fullWidth>
                                    <InputLabel>Module</InputLabel>
                                    <Select
                                        value={selectedModule}
                                        label="Module"
                                        onChange={(e) => setSelectedModule(e.target.value)}
                                        sx={{ borderRadius: "12px" }}
                                    >
                                        {modules.map((m) => (
                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={2.4}>
                                <FormControl fullWidth>
                                    <InputLabel>Lớp học</InputLabel>
                                    <Select
                                        value={selectedClass}
                                        label="Lớp học"
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        sx={{ borderRadius: "12px" }}
                                    >
                                        {classes.map((c) => (
                                            <MenuItem key={c} value={c}>{c}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={2.4}>
                                <FormControl fullWidth>
                                    <InputLabel>Trạng thái</InputLabel>
                                    <Select
                                        value={selectedStatus}
                                        label="Trạng thái"
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        sx={{ borderRadius: "12px" }}
                                    >
                                        <MenuItem value="Tất cả">Tất cả</MenuItem>
                                        <MenuItem value="Đạt">Đạt (≥ 50%)</MenuItem>
                                        <MenuItem value="Chưa đạt">Chưa đạt (&lt; 50%)</MenuItem>
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

                            <Grid item xs={12} md={0.8}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={handleResetFilters}
                                    sx={{
                                        borderRadius: "12px",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        height: "56px"
                                    }}
                                >
                                    Xóa
                                </Button>
                            </Grid>
                        </Grid>
                    </Collapse>
                </Stack>
            </Paper>

            {/* Result Count */}
            <Typography sx={{ mb: 2, color: COLORS.textSecondary, fontWeight: 700 }}>
                Hiển thị {filteredAttempts.length} kết quả
                {filteredAttempts.length !== attempts.length && ` (từ ${attempts.length} bài thi)`}
            </Typography>

            {/* Table */}
            <TableContainer
                component={Paper}
                sx={{
                    borderRadius: "16px",
                    border: `1px solid ${COLORS.borderLight}`,
                    overflow: 'hidden'
                }}
            >
                <Table>
                    <TableHead sx={{ bgcolor: COLORS.bgLight }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>HỌC VIÊN</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>THÔNG TIN BÀI THI</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>THỜI GIAN</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, color: "#707EAE" }}>KẾT QUẢ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAttempts.length > 0 ? (
                            filteredAttempts
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row, index) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        bgcolor: COLORS.primaryBlue,
                                                        width: 40,
                                                        height: 40,
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {row.studentName?.charAt(0) || "?"}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
                                                        {row.studentName || "N/A"}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                                                        {row.studentEmail || "N/A"}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
                                                {row.name || "N/A"}
                                            </Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={row.module || "N/A"}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        bgcolor: COLORS.primaryBlue + '15',
                                                        color: COLORS.primaryBlue,
                                                        fontWeight: 700
                                                    }}
                                                />
                                                <Chip
                                                    label={row.className || "N/A"}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        bgcolor: COLORS.bgLight,
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ color: COLORS.textSecondary, fontWeight: 500 }}>
                                            {formatDateTime(row.date)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: getScoreColor(row.score, row.totalScore)
                                                    }}
                                                >
                                                    {row.score} / {row.totalScore}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                                                    {row.correctAnswers} câu đúng
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography sx={{ color: COLORS.textSecondary }}>
                                        Không tìm thấy kết quả phù hợp với bộ lọc
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={filteredAttempts.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Hiển thị:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            </TableContainer>
        </Box>
    );
};

export default AdminReview;