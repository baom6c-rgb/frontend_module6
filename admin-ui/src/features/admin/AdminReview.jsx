import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Paper,
    Typography,
    Grid,
    Stack,
    CircularProgress,
    Chip,
    Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Search, FilterList, TrendingUpRounded } from "@mui/icons-material";

import axiosClient from "../../api/axiosConfig.js";
import { getAllModulesApi } from "../../api/moduleApi.js";
import { getAllClassesApi } from "../../api/classApi.js";
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
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

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

    const formatDateTimeSplit = (dateStr) => {
        if (!dateStr) return { date: "—", time: "—" };
        const d = new Date(dateStr);
        const date = d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const time = d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', hour12: false });
        return { date, time };
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
        setPaginationModel((p) => ({ ...p, page: 0 }));
    }, [searchText, selectedModule, selectedClass, selectedStatus, startDate, endDate]);

    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule(ALL);
        setSelectedClass(ALL);
        setSelectedStatus(ALL);
        setStartDate("");
        setEndDate("");
    };

    // ================= DataGrid Columns =================
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
                field: "studentName",
                headerName: "Tên học viên",
                flex: 1.0,
                minWidth: 140,
                renderCell: (params) => params.row.studentName || "N/A",
            },
            {
                field: "studentEmail",
                headerName: "Email",
                flex: 1.2,
                minWidth: 180,
            },
            {
                field: "examName",
                headerName: "Tên bài thi",
                flex: 1.3,
                minWidth: 170,
                renderCell: (params) => getExamTitle(params.row),
            },
            {
                field: "class",
                headerName: "Lớp",
                flex: 0.65,
                minWidth: 100,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => getClassLabel(params.row),
            },
            {
                field: "module",
                headerName: "Module",
                flex: 0.8,
                minWidth: 110,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => getModuleLabel(params.row),
            },
            {
                field: "date",
                headerName: "Thời gian",
                flex: 0.75,
                minWidth: 100,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const { date, time } = formatDateTimeSplit(params.row.date);
                    return (
                        <Box sx={{ textAlign: "center" }}>
                            <div>{date}</div>
                            <div>{time}</div>
                        </Box>
                    );
                },
            },
            {
                field: "score",
                headerName: "Kết quả",
                flex: 0.8,
                minWidth: 100,
                headerAlign: "center",
                renderCell: (params) => {
                    const scorePercent = params.row.totalScore
                        ? (Number(params.row.score) / Number(params.row.totalScore)) * 100
                        : 0;
                    const isPassed = scorePercent >= 80;

                    return (
                        <Box
                            component="span"
                            sx={{
                                color: isPassed ? COLORS.success : COLORS.danger,
                                backgroundColor: isPassed ? `${COLORS.success}13` : `${COLORS.danger}13`,
                                px: 1,
                                py: 0.3,
                                borderRadius: 0.5,
                                display: 'inline-block',
                            }}
                        >
                            {params.row.score}/{params.row.totalScore} ({scorePercent.toFixed(0)}%)
                        </Box>
                    );
                },
            },
        ];
    }, [paginationModel.page, paginationModel.pageSize, getExamTitle, getModuleLabel, getClassLabel, getScoreColor, getCorrectAnswersLabel]);

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

            {/* Filters */}
            <FilterPanel
                search={{
                    placeholder: "Tìm kiếm theo tên bài thi, module, lớp...",
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
                    status: {
                        enabled: true,
                        label: "Trạng thái",
                        value: selectedStatus,
                        options: [
                            { value: ALL, label: "Tất cả" },
                            { value: "Đạt", label: "Đạt (≥ 50%)" },
                            { value: "Chưa đạt", label: "Chưa đạt (< 50%)" },
                        ],
                        onChange: setSelectedStatus,
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
                Hiển thị {filteredAttempts.length} kết quả
                {filteredAttempts.length !== attempts.length && ` (từ ${attempts.length} bài thi)`}
            </Typography>

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
                        rows={filteredAttempts}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                        getRowId={(r) => r.id ?? `${r.studentEmail}-${Math.random()}`}
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
                        total={filteredAttempts.length}
                        onPageChange={(nextPage) => setPaginationModel((p) => ({ ...p, page: nextPage - 1 }))}
                        onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                        pageSizeOptions={[10, 25, 50]}
                        loading={loading}
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default AdminReview;