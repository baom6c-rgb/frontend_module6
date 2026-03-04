// src/features/users/UserReview.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Box,
    Paper,
    Typography,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Divider,
    Alert,
    CircularProgress,
    Container,
    Button,
    Chip,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import { Visibility, TrendingUpRounded } from "@mui/icons-material";

import { getMyExamAttemptsApi } from "../../api/examApi";
import { getDashboardStatsApi } from "../../api/dashboardApi";
import { practiceApi } from "../../api/practiceApi";
import { assignedExamApi } from "../../api/assignedExamApi";

import FilterPanel from "../../components/common/FilterPanel.jsx";
import AppPagination from "../../components/common/AppPagination.jsx";
import PracticeReviewDialog from "../practice/components/PracticeReviewDialog.jsx";
import { useLocation } from "react-router-dom";

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

const formatDateTimeSplit = (dateStr) => {
    if (!dateStr) return { date: "—", time: "—" };
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    const time = d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return { date, time };
};

// ✅ Resolve assignmentId by calling assigned-exams list and matching attemptId/title
async function resolveAssignmentIdFromAssignedList(selectedTest) {
    const attemptId = selectedTest?.id ?? null;

    const data = await assignedExamApi.studentList();
    const list = Array.isArray(data) ? data : data?.items || data?.content || [];

    const mapped = list.map((a) => {
        const assignmentId = a.assignmentId ?? a.id ?? null;
        const rowAttemptId =
            a.attemptId ?? a.examAttemptId ?? a.latestAttemptId ?? a.attempt?.id ?? null;
        const title = a.examTitle ?? a.title ?? a.exam?.title ?? "";
        return { assignmentId, attemptId: rowAttemptId, title };
    });

    // ✅ 1) match attemptId
    if (attemptId) {
        const hit = mapped.find(
            (x) =>
                x.assignmentId &&
                x.attemptId &&
                String(x.attemptId) === String(attemptId)
        );
        if (hit?.assignmentId) return hit.assignmentId;
    }

    // ✅ 2) fallback match title (soft match)
    const name = String(selectedTest?.name || "").trim().toLowerCase();
    if (name) {
        const hit2 = mapped.find((x) => {
            const t = String(x.title || "").trim().toLowerCase();
            return x.assignmentId && t && (t === name || t.includes(name) || name.includes(t));
        });
        if (hit2?.assignmentId) return hit2.assignmentId;
    }

    return null;
}

function normalizeAttempt(raw) {
    const id = raw?.id ?? raw?.attemptId ?? raw?.examAttemptId ?? null;

    // ✅ assignmentId for admin-assigned review (if BE ever returns it)
    const assignmentId =
        raw?.assignmentId ??
        raw?.assignedExamAssignmentId ??
        raw?.assignedExamId ??
        raw?.examAssignmentId ??
        raw?.assignment?.id ??
        raw?.assignedExam?.assignmentId ??
        raw?.assignedExam?.id ??
        raw?.examAssignment?.id ??
        null;

    const submitTime =
        raw?.submitTime ?? raw?.date ?? raw?.submittedAt ?? raw?.endTime ?? null;
    const startTime = raw?.startTime ?? raw?.startedAt ?? null;

    const type = String(raw?.type || raw?.examType || "").toUpperCase();

    const name =
        raw?.examTitle ??
        raw?.title ??
        raw?.name ??
        raw?.examName ??
        (type.includes("PRACTICE") ? "Bài thi PRACTICE" : "Bài test");

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
        totalQuestions > 0
            ? Number(((correctAnswers / totalQuestions) * 100).toFixed(1))
            : 0;

    return {
        _raw: raw,
        id, // attemptId (practice review)
        assignmentId, // assignmentId (assigned review)
        type,
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

// review payload -> PracticeReviewDialog shape
const adaptToPracticeReview = (rawReview, selectedTest) => {
    const arr = Array.isArray(rawReview)
        ? rawReview
        : rawReview?.items || rawReview?.data?.items || [];
    const items = (arr || []).map((it) => {
        const qType = String(it?.questionType || "MCQ").toUpperCase();
        const isMcq = qType === "MCQ";

        let options = it?.options ?? it?.optionsMap ?? null;
        if (!options && typeof it?.optionsJson === "string") {
            try {
                options = JSON.parse(it.optionsJson);
            } catch {
                options = null;
            }
        }

        const selectedAnswer = it?.selectedAnswer ?? null;
        const correctAnswer = it?.correctAnswer ?? null;

        const yourAnswer = it?.yourAnswer ?? it?.textAnswer ?? "";
        const sampleAnswer = it?.sampleAnswer ?? it?.expectedAnswer ?? "";

        const isCorrect =
            typeof it?.isCorrect === "boolean"
                ? it.isCorrect
                : isMcq
                    ? String(selectedAnswer || "") === String(correctAnswer || "")
                    : safeNum(it?.score, 0) > 0;

        return {
            questionId: it?.questionId ?? it?.id ?? null,
            questionType: qType,
            content:
                it?.content ??
                it?.questionContent ??
                it?.questionText ??
                "(Không có nội dung câu hỏi)",
            options: options || {},
            selectedAnswer,
            correctAnswer,
            yourAnswer,
            sampleAnswer,
            score: safeNum(it?.score, 0),
            maxScore: safeNum(it?.maxScore, 0),
            feedback: it?.feedback ?? it?.explanation ?? "",
            isCorrect,
        };
    });

    const totalQuestions = safeNum(
        rawReview?.totalQuestions ?? rawReview?.data?.totalQuestions,
        items.length
    );

    const correctCount = Number.isFinite(rawReview?.correctCount)
        ? rawReview.correctCount
        : Number.isFinite(rawReview?.data?.correctCount)
            ? rawReview.data.correctCount
            : items.filter((x) => x.isCorrect).length;

    const score = safeNum(
        rawReview?.score ?? rawReview?.data?.score,
        safeNum(selectedTest?.scorePct, 0)
    );

    return {
        score,
        correctCount,
        totalQuestions,
        items,
        aiFeedback: String(rawReview?.aiFeedback ?? rawReview?.data?.aiFeedback ?? "").trim(),
    };
};

export default function UserReview() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const location = useLocation();

    const [testsRaw, setTestsRaw] = useState([]);
    const tests = useMemo(() => testsRaw.map(normalizeAttempt), [testsRaw]);

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const [selectedTest, setSelectedTest] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Review state
    const [openReview, setOpenReview] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState(null);

    // Filters
    const [searchText, setSearchText] = useState("");
    const [selectedModule, setSelectedModule] = useState(ALL);
    const [selectedClass, setSelectedClass] = useState(ALL);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedResult, setSelectedResult] = useState(ALL);
    const [showFilters, setShowFilters] = useState(false);

    const [modules, setModules] = useState([ALL]);
    const [classes, setClasses] = useState([ALL]);

    // ✅ Auto set filter from Dashboard
    useEffect(() => {
        if (location.state?.filterResult) {
            setSelectedResult(location.state.filterResult);
            setShowFilters(true);
        }
    }, [location.state]);

    useEffect(() => {
        let alive = true;

        const fetchAll = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem("accessToken");
                if (!token || token === "null") throw new Error("No valid token. Please login.");

                const [attemptsRes] = await Promise.allSettled([
                    getMyExamAttemptsApi(),
                    getDashboardStatsApi(),
                ]);

                if (!alive) return;

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

        if (selectedResult !== ALL) {
            filtered = filtered.filter((t) => {
                const scorePercent = t.totalScore ? (Number(t.scorePct) / Number(t.totalScore)) * 100 : 0;
                const isPassed = scorePercent >= 80;
                return selectedResult === "Đạt" ? isPassed : !isPassed;
            });
        }

        return filtered;
    }, [tests, searchText, selectedModule, selectedClass, startDate, endDate, selectedResult]);

    useEffect(() => setPaginationModel((prev) => ({ ...prev, page: 0 })), [
        searchText,
        selectedModule,
        selectedClass,
        startDate,
        endDate,
        selectedResult,
    ]);

    const getScoreColor = (scorePct) =>
        scorePct >= 80 ? COLORS.success : scorePct >= 50 ? COLORS.warning : COLORS.danger;

    const handleViewDetail = (test) => {
        setSelectedTest(test);
        setDetailDialogOpen(true);

        setOpenReview(false);
        setReviewData(null);
        setReviewError(null);
        setReviewLoading(false);
    };

    // ✅ PRACTICE-first, fallback to ASSIGNED by assignmentId (direct or resolved from assigned list)
    const handleOpenReview = async () => {
        if (!selectedTest) return;

        if (reviewData && (reviewData?.items?.length ?? 0) > 0) {
            setOpenReview(true);
            return;
        }

        const attemptId = selectedTest?.id ?? null;

        try {
            setReviewLoading(true);
            setReviewError(null);

            // 1) TRY PRACTICE
            if (attemptId) {
                try {
                    const raw = await practiceApi.review(attemptId);
                    const adapted = adaptToPracticeReview(raw, selectedTest);
                    setReviewData(adapted);
                    setOpenReview(true);
                    return;
                } catch (e1) {
                    const status = e1?.response?.status;
                    const shouldFallback = status === 400 || status === 404;
                    if (!shouldFallback) throw e1;
                }
            }

            // 2) TRY ASSIGNED
            let assignmentId =
                selectedTest?.assignmentId ??
                selectedTest?._raw?.assignmentId ??
                selectedTest?._raw?.assignedExamAssignmentId ??
                selectedTest?._raw?.assignedExamId ??
                selectedTest?._raw?.examAssignmentId ??
                selectedTest?._raw?.assignment?.id ??
                selectedTest?._raw?.assignedExam?.assignmentId ??
                selectedTest?._raw?.assignedExam?.id ??
                selectedTest?._raw?.examAssignment?.id ??
                null;

            if (!assignmentId) {
                assignmentId = await resolveAssignmentIdFromAssignedList(selectedTest);
            }

            if (!assignmentId) {
                setReviewError("Không tìm thấy assignmentId của bài admin gán để tải review.");
                return;
            }

            const raw2 = await assignedExamApi.studentGetReview(assignmentId);
            const adapted2 = adaptToPracticeReview(raw2, selectedTest);
            setReviewData(adapted2);
            setOpenReview(true);
        } catch (e) {
            console.error("Load review error:", e);
            setReviewError(e?.response?.data?.message || e?.message || "Không tải được chi tiết bài làm.");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleCloseDetail = () => {
        setDetailDialogOpen(false);
        setSelectedTest(null);

        setOpenReview(false);
        setReviewData(null);
        setReviewError(null);
        setReviewLoading(false);
    };

    const handleResetFilters = () => {
        setSearchText("");
        setSelectedModule(ALL);
        setSelectedClass(ALL);
        setStartDate("");
        setEndDate("");
        setSelectedResult(ALL);
    };

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
            { field: "name", headerName: "Tên bài thi", flex: 1.5, minWidth: 200, renderCell: (p) => p.value },
            { field: "module", headerName: "Module", flex: 1, minWidth: 150, headerAlign: "center", align: "center" },
            { field: "className", headerName: "Lớp học", flex: 1, minWidth: 150, headerAlign: "center", align: "center" },
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
                    const isPassed = scorePercent >= 80;

                    return (
                        <span style={{ color: isPassed ? COLORS.success : COLORS.danger }}>
                            {isPassed ? "Đạt" : "Trượt"}
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
                        sx={{ bgcolor: COLORS.primaryBlue + "10", "&:hover": { bgcolor: COLORS.primaryBlue + "20" } }}
                    >
                        <Visibility sx={{ color: COLORS.primaryBlue }} />
                    </IconButton>
                ),
            },
        ];
    }, [paginationModel.page, paginationModel.pageSize]);

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    bgcolor: COLORS.bgLight,
                }}
            >
                <Stack spacing={2} alignItems="center">
                    <CircularProgress size={60} />
                    <Typography sx={{ fontWeight: 700 }}>Đang tải dữ liệu...</Typography>
                </Stack>
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    bgcolor: COLORS.bgLight,
                    p: 3,
                }}
            >
                <Paper sx={{ p: 4, maxWidth: 600, textAlign: "center", borderRadius: "16px" }}>
                    <Typography sx={{ fontSize: 48, mb: 2 }}>⚠️</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, mb: 2, color: COLORS.danger }}>
                        Đã xảy ra lỗi
                    </Typography>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button
                            variant="contained"
                            onClick={() => window.location.reload()}
                            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
                        >
                            Tải lại trang
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => (window.location.href = "/login")}
                            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
                        >
                            Đăng nhập lại
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: COLORS.bgLight, minHeight: "100vh", py: { xs: 2, sm: 3, md: 4 } }}>
            <Container maxWidth="xl">
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                    spacing={{ xs: 1.5, sm: 0 }}
                    sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}
                >
                    <Typography
                        variant={isMobile ? "h2" : "h1"}
                        sx={{ fontWeight: 800, color: COLORS.textPrimary, fontSize: { xs: 20, sm: 28, md: 28 } }}
                    >
                        Kết quả học tập & Bài thi
                    </Typography>

                    <Chip
                        icon={<TrendingUpRounded />}
                        label={`Tổng: ${filteredTests.length} kết quả`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, borderRadius: "8px" }}
                    />
                </Stack>

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
                        startDate: { enabled: true, label: "Từ ngày", value: startDate, onChange: setStartDate },
                        endDate: { enabled: true, label: "Đến ngày", value: endDate, onChange: setEndDate },
                        result: {
                            enabled: true,
                            label: "Kết quả",
                            value: selectedResult,
                            options: [
                                { value: ALL, label: "Tất cả" },
                                { value: "Đạt", label: "Đạt" },
                                { value: "Trượt", label: "Trượt" },
                            ],
                            onChange: setSelectedResult,
                            loading: false,
                        },
                    }}
                />

                <Box sx={{ my: { xs: 2, sm: 2.5, md: 3 } }} />

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: { xs: 400, sm: 420 },
                    }}
                >
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <DataGrid
                            rows={filteredTests}
                            columns={columns}
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
                            px: { xs: 1, sm: 1.5 },
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
                            onPageChange={(nextPage) =>
                                setPaginationModel((p) => ({ ...p, page: nextPage - 1 }))
                            }
                            onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                            pageSizeOptions={[10, 25, 50]}
                            loading={loading}
                        />
                    </Box>
                </Paper>

                <Dialog
                    open={detailDialogOpen}
                    onClose={handleCloseDetail}
                    maxWidth="md"
                    fullWidth
                    fullScreen={isMobile}
                    PaperProps={{ sx: { borderRadius: isMobile ? 0 : "16px" } }}
                >
                    <DialogTitle>
                        <Typography sx={{ fontWeight: 900, fontSize: { xs: 18, sm: 20 } }}>
                            Chi tiết bài thi
                        </Typography>
                    </DialogTitle>

                    <DialogContent>
                        {selectedTest && (
                            <Box>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: { xs: 16, sm: 18, md: 20 },
                                        mb: 2,
                                        textAlign: "center",
                                    }}
                                >
                                    {selectedTest.name}
                                </Typography>

                                <Box sx={{ overflowX: "auto" }}>
                                    <Table sx={{ width: "100%", borderCollapse: "collapse", mt: 1, minWidth: { xs: 600, sm: "auto" } }}>
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: "#f4f6fc" }}>
                                                {["Module", "Lớp học", "Ngày làm bài", "Thời gian", "Điểm số", "Kết quả"].map((label) => (
                                                    <TableCell
                                                        key={label}
                                                        sx={{
                                                            textAlign: "center",
                                                            color: "#2E2D84",
                                                            fontWeight: 700,
                                                            fontSize: { xs: 12, sm: 14, md: 15 },
                                                            borderBottom: "2px solid #e8eaf6",
                                                            py: 1,
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {label}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none", fontSize: { xs: 12, sm: 14 } }}>
                                                    {selectedTest.module}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none", fontSize: { xs: 12, sm: 14 } }}>
                                                    {selectedTest.className}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none", whiteSpace: "nowrap" }}>
                                                    <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 14 } }}>
                                                        {formatDateTime(selectedTest.submitTime || selectedTest.startTime).split(" ")[1]}
                                                    </Typography>
                                                    <Typography sx={{ color: "text.secondary", fontSize: { xs: 11, sm: 12, md: 13 } }}>
                                                        {formatDateTime(selectedTest.submitTime || selectedTest.startTime).split(" ")[0]}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none", fontSize: { xs: 12, sm: 14 } }}>
                                                    {selectedTest.durationMinutes} phút
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none" }}>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 900,
                                                            color: getScoreColor(selectedTest.scorePct),
                                                            fontSize: { xs: 13, sm: 14, md: 15 },
                                                        }}
                                                    >
                                                        {selectedTest.scorePct}/{selectedTest.totalScore}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center", py: 1.5, borderBottom: "none" }}>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            color: selectedTest.scorePct >= 80 ? "#4caf50" : "#f44336",
                                                            backgroundColor: selectedTest.scorePct >= 80 ? "#4caf5013" : "#f4433613",
                                                            px: 1.5,
                                                            py: 0.4,
                                                            borderRadius: 1,
                                                            fontWeight: 700,
                                                            fontSize: { xs: 12, sm: 13, md: 14 },
                                                        }}
                                                    >
                                                        {selectedTest.scorePct >= 80 ? "Đạt" : "Trượt"}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                <Button
                                    variant="contained"
                                    onClick={handleOpenReview}
                                    disabled={reviewLoading}
                                    fullWidth={isMobile}
                                    sx={{
                                        borderRadius: "12px",
                                        textTransform: "none",
                                        fontWeight: 900,
                                        px: 2.2,
                                        fontSize: { xs: 14, sm: 15 },
                                    }}
                                >
                                    {reviewLoading ? "Đang tải..." : "Xem lại đáp án"}
                                </Button>

                                {reviewError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {reviewError}
                                    </Alert>
                                )}

                                {reviewLoading && (
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                        <CircularProgress size={18} />
                                        <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "text.secondary", fontWeight: 700 }}>
                                            Đang tải dữ liệu xem lại...
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </DialogContent>

                    <DialogActions
                        sx={{
                            p: 2,
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1,
                            flexDirection: { xs: "column", sm: "row" },
                        }}
                    >
                        <Button
                            onClick={handleCloseDetail}
                            variant="outlined"
                            fullWidth={isMobile}
                            sx={{
                                borderRadius: "20px",
                                textTransform: "none",
                                fontWeight: 800,
                                fontSize: { xs: 14, sm: 15 },
                                color: COLORS.textPrimary,
                                "&:hover": {
                                    borderColor: "#2e2d84",
                                    bgcolor: "#F3F6FB",
                                },
                            }}
                        >
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>

                <PracticeReviewDialog
                    open={openReview}
                    onClose={() => setOpenReview(false)}
                    review={reviewData}
                />
            </Container>
        </Box>
    );
}