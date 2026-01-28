import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    CircularProgress,
    Avatar,
    Chip,
    InputAdornment,
    MenuItem,
    FormControl,
    Select,
    InputLabel,
    Button,
    Collapse,
    Alert,
} from "@mui/material";
import { Search, FilterList, TrendingUpRounded } from "@mui/icons-material";

import axiosClient from "../../api/axiosConfig.js";
import { getAllModulesApi } from "../../api/moduleApi.js";
import { getAllClassesApi } from "../../api/classApi.js";

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

function getAccessToken() {
    const t = localStorage.getItem("accessToken");
    return t && t !== "null" ? t : null;
}

function getRoleFromStorage() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        const u = JSON.parse(raw);
        return u?.role || u?.roles?.[0] || null;
    } catch {
        return null;
    }
}

const AdminReview = () => {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState(ALL);
    const [selectedClass, setSelectedClass] = useState(ALL);
    const [selectedStatus, setSelectedStatus] = useState(ALL);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Master data options
    const [modules, setModules] = useState([ALL]);
    const [classes, setClasses] = useState([ALL]);

    // maps: id -> name (join attempt PRACTICE if BE returns ids)
    const [moduleIdToName, setModuleIdToName] = useState({});
    const [classIdToName, setClassIdToName] = useState({});

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================= Helpers =================
    const normalizeModuleName = (m) => {
        if (!m) return null;
        if (typeof m === "string") return m;
        return m.name || m.title || m.moduleName || null;
    };

    const normalizeClassName = (c) => {
        if (!c) return null;
        if (typeof c === "string") return c;
        return c.name || c.title || c.className || null;
    };

    // Try to detect possible id fields from DTO (safe, no BE change)
    const getModuleId = (row) =>
        row.moduleId ?? row.module_id ?? row.module?.id ?? row.module?.moduleId ?? null;

    const getClassId = (row) =>
        row.classId ??
        row.class_id ??
        row.classroomId ??
        row.classroom_id ??
        row.classObj?.id ??
        null;

    const isPractice = (row) => {
        const t = (row.examType || row.type || row.mode || row.examMode || "")
            .toString()
            .toUpperCase();
        const name = (row.name || row.examName || "").toString().toUpperCase();
        return t.includes("PRACTICE") || name.includes("PRACTICE");
    };

    const getExamTitle = (row) => {
        const title = row.name || row.examName || row.examTitle || row.title || null;
        if (title) return title;

        if (isPractice(row)) {
            const mt = row.materialTitle || row.materialName || null;
            return mt ? `Bài thi PRACTICE • ${mt}` : "Bài thi PRACTICE";
        }
        return "Bài thi";
    };

    // ✅ Never show "N/A" for these chips; always show meaningfully for filtering/searching
    const getModuleLabel = (row) => {
        const direct = row.module || row.moduleName || row.moduleTitle || null;
        if (direct) return direct;

        const id = getModuleId(row);
        if (id != null && moduleIdToName[id]) return moduleIdToName[id];

        return "Chưa gắn module";
    };

    const getClassLabel = (row) => {
        const direct = row.className || row.class || row.classTitle || null;
        if (direct) return direct;

        const id = getClassId(row);
        if (id != null && classIdToName[id]) return classIdToName[id];

        return "Chưa gắn lớp";
    };

    const getScoreColor = (score, totalScore) => {
        const s = Number(score);
        const t = Number(totalScore);
        if (!t || !Number.isFinite(s) || !Number.isFinite(t)) return COLORS.textSecondary;

        const percentage = (s / t) * 100;
        if (percentage >= 80) return COLORS.success;
        if (percentage >= 50) return COLORS.warning;
        return COLORS.danger;
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("vi-VN");
    };

    // ✅ Fix PRACTICE: score exists but correctAnswers is 0/absent
    const getCorrectAnswersLabel = (row) => {
        const score = Number(row.score);
        const totalScore = Number(row.totalScore);

        const rawCorrect =
            row.correctAnswers ??
            row.correctCount ??
            row.numCorrect ??
            row.correct ??
            row.correctAnswerCount ??
            null;

        // If PRACTICE has score > 0 but correct = 0 => treat as unreliable -> estimate if possible
        const shouldIgnoreZero =
            isPractice(row) &&
            rawCorrect === 0 &&
            Number.isFinite(score) &&
            score > 0;

        if (!shouldIgnoreZero && rawCorrect !== null && rawCorrect !== undefined) {
            return `${rawCorrect} câu đúng`;
        }

        const totalQuestions =
            Number(
                row.totalQuestions ??
                row.questionCount ??
                row.totalQuestionsCount ??
                row.totalQuestion ??
                row.numQuestions
            ) || 0;

        if (
            Number.isFinite(score) &&
            Number.isFinite(totalScore) &&
            totalQuestions > 0 &&
            totalScore > 0
        ) {
            const pointsPerQuestion = totalScore / totalQuestions;
            if (pointsPerQuestion > 0) {
                const estimated = Math.round(score / pointsPerQuestion);
                const clamped = Math.max(0, Math.min(totalQuestions, estimated));
                return `${clamped} câu đúng (ước tính)`;
            }
        }

        return "—";
    };

    // ================= Fetch Data =================
    useEffect(() => {
        let alive = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = getAccessToken();
                if (!token) throw new Error("No valid token. Please login.");

                const role = getRoleFromStorage();
                const canCallAdmin = !role ? true : String(role).includes("ADMIN");
                if (!canCallAdmin) {
                    setAttempts([]);
                    setModules([ALL]);
                    setClasses([ALL]);
                    setError("Access denied. Admin privileges required.");
                    return;
                }

                const authHeaders = { Authorization: `Bearer ${token}` };

                // run in parallel
                const [attemptRes, moduleRes, classRes] = await Promise.all([
                    axiosClient.get("/exam-attempts/admin/all-attempts", { headers: authHeaders }),
                    getAllModulesApi(),
                    getAllClassesApi(),
                ]);

                if (!alive) return;

                const attemptsData = Array.isArray(attemptRes.data) ? attemptRes.data : [];
                setAttempts(attemptsData);

                // build module map + dropdown options
                const moduleListRaw = Array.isArray(moduleRes.data) ? moduleRes.data : [];
                const moduleMap = {};
                const moduleNames = [];

                moduleListRaw.forEach((m) => {
                    const id = m?.id ?? m?.moduleId ?? null;
                    const name = normalizeModuleName(m);
                    if (name) moduleNames.push(name);
                    if (id != null && name) moduleMap[id] = name;
                });

                // build class map + dropdown options
                const classListRaw = Array.isArray(classRes.data) ? classRes.data : [];
                const classMap = {};
                const classNames = [];

                classListRaw.forEach((c) => {
                    const id = c?.id ?? c?.classId ?? null;
                    const name = normalizeClassName(c);
                    if (name) classNames.push(name);
                    if (id != null && name) classMap[id] = name;
                });

                setModuleIdToName(moduleMap);
                setClassIdToName(classMap);

                // include "Chưa gắn ..." option for filtering PRACTICE missing metadata
                setModules([ALL, ...Array.from(new Set(moduleNames)), "Chưa gắn module"]);
                setClasses([ALL, ...Array.from(new Set(classNames)), "Chưa gắn lớp"]);
            } catch (err) {
                if (!alive) return;

                console.log("❌ status:", err?.response?.status);
                console.log("❌ url:", err?.config?.url);
                console.log("❌ method:", err?.config?.method);

                if (err?.response?.status === 401) {
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = "/login";
                    }, 1200);
                } else if (err?.response?.status === 403) {
                    setError("Access denied. Admin privileges required.");
                } else {
                    setError(err?.message || "Failed to load data");
                }
            } finally {
                if (alive) setLoading(false);
            }
        };

        loadData();
        return () => {
            alive = false;
        };
    }, []);

    // ================= Filter =================
    const filteredAttempts = useMemo(() => {
        let filtered = [...attempts];

        if (searchText.trim()) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(
                (a) =>
                    (a.studentName || "").toLowerCase().includes(search) ||
                    (a.studentEmail || "").toLowerCase().includes(search) ||
                    (getExamTitle(a) || "").toLowerCase().includes(search) ||
                    (getModuleLabel(a) || "").toLowerCase().includes(search) ||
                    (getClassLabel(a) || "").toLowerCase().includes(search)
            );
        }

        if (selectedModule !== ALL) {
            filtered = filtered.filter((a) => getModuleLabel(a) === selectedModule);
        }

        if (selectedClass !== ALL) {
            filtered = filtered.filter((a) => getClassLabel(a) === selectedClass);
        }

        if (selectedStatus === "Đạt") {
            filtered = filtered.filter((a) =>
                a.totalScore ? Number(a.score) / Number(a.totalScore) >= 0.5 : false
            );
        } else if (selectedStatus === "Chưa đạt") {
            filtered = filtered.filter((a) =>
                a.totalScore ? Number(a.score) / Number(a.totalScore) < 0.5 : false
            );
        }

        if (startDate) {
            filtered = filtered.filter((a) => new Date(a.date) >= new Date(startDate));
        }

        if (endDate) {
            filtered = filtered.filter((a) => new Date(a.date) <= new Date(endDate));
        }

        return filtered;
    }, [
        attempts,
        searchText,
        selectedModule,
        selectedClass,
        selectedStatus,
        startDate,
        endDate,
        moduleIdToName,
        classIdToName,
    ]);

    useEffect(() => {
        setPage(0);
    }, [searchText, selectedModule, selectedClass, selectedStatus, startDate, endDate]);

    const handleChangePage = (e, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule(ALL);
        setSelectedClass(ALL);
        setSelectedStatus(ALL);
        setStartDate("");
        setEndDate("");
    };

    // ================= UI States =================
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

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Lỗi tải dữ liệu
                    </Typography>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
                    Đánh giá học tập hệ thống
                </Typography>
                <Chip
                    icon={<TrendingUpRounded />}
                    label={`Tổng: ${filteredAttempts.length} kết quả`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                />
            </Stack>

            <Paper sx={{ p: 3, mb: 3, borderRadius: "16px", border: `1px solid ${COLORS.borderLight}` }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm theo tên học viên, email, bài thi, lớp, module..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: COLORS.primaryBlue }} />
                                    </InputAdornment>
                                ),
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
                                minWidth: 150,
                            }}
                        >
                            Bộ lọc
                        </Button>
                    </Stack>

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
                                            <MenuItem key={m} value={m}>
                                                {m}
                                            </MenuItem>
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
                                            <MenuItem key={c} value={c}>
                                                {c}
                                            </MenuItem>
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
                                        <MenuItem value={ALL}>{ALL}</MenuItem>
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
                                        height: "56px",
                                    }}
                                >
                                    Xóa
                                </Button>
                            </Grid>
                        </Grid>
                    </Collapse>
                </Stack>
            </Paper>

            <Typography sx={{ mb: 2, color: COLORS.textSecondary, fontWeight: 700 }}>
                Hiển thị {filteredAttempts.length} kết quả
                {filteredAttempts.length !== attempts.length && ` (từ ${attempts.length} bài thi)`}
            </Typography>

            <TableContainer
                component={Paper}
                sx={{ borderRadius: "16px", border: `1px solid ${COLORS.borderLight}`, overflow: "hidden" }}
            >
                <Table>
                    <TableHead sx={{ bgcolor: COLORS.bgLight }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>HỌC VIÊN</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>THÔNG TIN BÀI THI</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: "#707EAE" }}>THỜI GIAN</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, color: "#707EAE" }}>
                                KẾT QUẢ
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filteredAttempts.length > 0 ? (
                            filteredAttempts
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row, index) => (
                                    <TableRow key={row.id ?? `${row.studentEmail}-${index}`} hover>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>

                                        <TableCell>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        bgcolor: COLORS.primaryBlue,
                                                        width: 40,
                                                        height: 40,
                                                        fontWeight: 700,
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
                                                {getExamTitle(row)}
                                            </Typography>

                                            {/* ✅ 2 mục Module + Lớp (không còn N/A) */}
                                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                                                <Chip
                                                    label={`Module: ${getModuleLabel(row)}`}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.65rem",
                                                        bgcolor: COLORS.primaryBlue + "15",
                                                        color: COLORS.primaryBlue,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                                <Chip
                                                    label={`Lớp: ${getClassLabel(row)}`}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.65rem",
                                                        bgcolor: COLORS.bgLight,
                                                        fontWeight: 600,
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
                                                        color: getScoreColor(row.score, row.totalScore),
                                                    }}
                                                >
                                                    {row.score} / {row.totalScore}
                                                </Typography>

                                                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                                                    {getCorrectAnswersLabel(row)}
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
