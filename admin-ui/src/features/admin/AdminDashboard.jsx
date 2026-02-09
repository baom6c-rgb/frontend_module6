// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Fade, CircularProgress, Stack, Typography } from "@mui/material";

import axiosPrivate from "../../api/axiosPrivate";
import { adminAnalyticsApi } from "../../api/adminAnalyticsApi";

import AdminDashboardFilterBar from "./components/dashboard/AdminDashboardFilterBar";

import {
    AdminDashboardKpiCards,
    AdminDashboardResultClassificationBox,
    AdminDashboardTrends,
    AdminDashboardAtRiskTable,
    AdminDashboardAiInsightPanel,
    StudentQuickDrawer,
} from "./components/dashboard";

import {
    DASHBOARD_COLORS as COLORS,
    normalizeOption,
    buildRequestBody,
    getDefaultFilters7d,
    safeNumber,
} from "./components/dashboard/dashboard.helpers";

const PageShell = ({ children }) => (
    <Box
        sx={{
            width: "100%",
            maxWidth: 1400,
            mx: "auto",
            px: { xs: 2, sm: 2.5, md: 4, lg: 6 },
            pb: { xs: 3, sm: 3.5, md: 4 },
            minWidth: 0,
            overflowX: "hidden", // ✅ Prevent horizontal scroll
        }}
    >
        {children}
    </Box>
);

/** ✅ 1 nguồn metrics để đồng bộ KPI + Donut + Trends */
const computeMetrics = (overview) => {
    const totalAttempts = Math.max(0, safeNumber(overview?.totalAttempts, 0));
    const totalStudents = Math.max(0, safeNumber(overview?.totalStudents, 0));

    const passRate = Math.max(0, safeNumber(overview?.passRate, 0));
    const failRate = Math.max(0, safeNumber(overview?.failRate, 0));

    let passCount = Math.round(totalAttempts * passRate);
    let failCount = Math.round(totalAttempts * failRate);

    // ✅ clamp để không âm / không vượt total
    passCount = Math.max(0, Math.min(passCount, totalAttempts));
    failCount = Math.max(0, Math.min(failCount, totalAttempts - passCount));

    const otherCount = Math.max(0, totalAttempts - passCount - failCount);

    const timeSeries = Array.isArray(overview?.timeSeries) ? overview.timeSeries : [];

    const attemptsByDay = timeSeries.map((x) => ({
        name: x?.date || "",
        attempts: Math.max(0, safeNumber(x?.attempts, 0)),
    }));

    const passRateByDay = timeSeries.map((x) => {
        const fr = Math.max(0, safeNumber(x?.failRate, 0));
        return {
            name: x?.date || "",
            passRate: Math.max(0, Math.min(1, 1 - fr)),
        };
    });

    return {
        totalAttempts,
        totalStudents,
        passRate,
        failRate,
        passCount,
        failCount,
        otherCount,
        attemptsByDay,
        passRateByDay,
        timeSeries,
    };
};

export default function AdminDashboard() {
    const initFilters = () => {
        const f = getDefaultFilters7d();
        return {
            preset: f.preset ?? "7d",
            classId: "",
            moduleId: "",
            keyword: "",
            fromDate: f.from?.slice(0, 10),
            toDate: f.to?.slice(0, 10),
        };
    };

    const [filters, setFilters] = useState(initFilters);

    const [overview, setOverview] = useState(null);
    const [dashLoading, setDashLoading] = useState(false);
    const [dashError, setDashError] = useState("");

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [aiInsight, setAiInsight] = useState(null);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const studentsSectionRef = useRef(null);

    useEffect(() => {
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bootstrap = async () => {
        try {
            const [clsRes, modRes] = await Promise.all([
                axiosPrivate.get("/classes"),
                axiosPrivate.get("/modules"),
            ]);

            const clsList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.data || [];
            const modList = Array.isArray(modRes.data) ? modRes.data : modRes.data?.data || [];

            setClasses(clsList.map(normalizeOption));
            setModules(modList.map(normalizeOption));
        } catch (e) {
            console.warn("bootstrap classes/modules failed:", e);
        } finally {
            fetchOverview(filters);
        }
    };

    const toApiFilters = (f) => {
        const from = f.fromDate ? `${f.fromDate}T00:00:00` : "";
        const to = f.toDate ? `${f.toDate}T23:59:59` : "";
        return {
            classId: f.classId,
            moduleId: f.moduleId,
            keyword: f.keyword,
            from,
            to,
        };
    };

    const fetchOverview = async (f) => {
        setDashError("");
        setDashLoading(true);
        try {
            const body = buildRequestBody(toApiFilters(f));
            const data = await adminAnalyticsApi.overview(body);
            setOverview(data);

            // Đổi filter => reset AI insight để tránh "AI cũ dính filter mới"
            setAiInsight(null);
            setAiError("");
        } catch (e) {
            console.error("overview error:", e);
            setDashError(
                "Không tải được thống kê. Kiểm tra quyền ADMIN và endpoint /admin/analytics/overview."
            );
        } finally {
            setDashLoading(false);
        }
    };

    const onResetAll = () => {
        const next = initFilters();
        setFilters(next);
        fetchOverview(next);
    };

    const onAutoApply = (next) => {
        setFilters(next);
        fetchOverview(next);
    };

    const onJumpStudents = () => {
        studentsSectionRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    };

    const onSelectStudent = (student) => {
        setSelectedStudent(student);
        setDrawerOpen(true);
    };

    const runAiInsights = async () => {
        setAiError("");
        setAiLoading(true);
        try {
            const body = buildRequestBody(toApiFilters(filters));
            const data = await adminAnalyticsApi.aiInsights(body);
            setAiInsight(data);
        } catch (e) {
            console.error("ai-insights error:", e);
            setAiError("Không thể phân tích AI lúc này. Thử lại sau.");
        } finally {
            setAiLoading(false);
        }
    };

    const metrics = useMemo(() => computeMetrics(overview), [overview]);

    return (
        <Fade in timeout={350}>
            <Box sx={{ background: COLORS.bg, minHeight: "calc(100vh - 120px)", width: "100%", overflowX: "hidden" }}>
                <PageShell>
                    {/* HEADER: Filter */}
                    <Box sx={{ mt: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 }, minWidth: 0 }}>
                        <AdminDashboardFilterBar
                            classes={classes}
                            modules={modules}
                            filters={filters}
                            loading={dashLoading}
                            onChange={(next) => setFilters(next)}
                            onReset={onResetAll}
                            onAutoApply={onAutoApply}
                        />

                        {dashError ? (
                            <Typography sx={{ mt: 1, color: "#dc2626", fontWeight: 900, fontSize: { xs: 13, sm: 14 } }}>
                                {dashError}
                            </Typography>
                        ) : null}
                    </Box>

                    {/* BODY: Loading (chỉ khi chưa có overview) */}
                    {!overview && dashLoading ? (
                        <Box
                            sx={{
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: "18px",
                                border: `1px solid ${COLORS.border}`,
                                bgcolor: "#fff",
                                boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
                            }}
                        >
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <CircularProgress size={18} sx={{ color: COLORS.primaryBlue }} />
                                <Typography sx={{ color: COLORS.textSecondary, fontWeight: 800, fontSize: { xs: 13, sm: 14 } }}>
                                    Đang tải thống kê...
                                </Typography>
                            </Stack>
                        </Box>
                    ) : null}

                    {/* 1) AI phân tích theo bộ lọc */}
                    <Box sx={{ mt: { xs: 1.5, md: 2 }, minWidth: 0 }}>
                        <AdminDashboardAiInsightPanel
                            overview={overview}
                            insight={aiInsight}
                            loading={aiLoading}
                            error={aiError}
                            onRun={runAiInsights}
                        />
                    </Box>

                    {/* 2) Danh sách học viên đã làm bài */}
                    <Box sx={{ mt: { xs: 2, md: 3 }, minWidth: 0 }} ref={studentsSectionRef}>
                        <Box sx={{ width: "100%", minWidth: 0, overflowX: "hidden" }}>
                            <AdminDashboardAtRiskTable
                                students={overview?.students || []}
                                onSelect={onSelectStudent}
                            />
                        </Box>
                    </Box>

                    {/* 3) KPI + Phân loại */}
                    <Box
                        sx={{
                            mt: { xs: 2, md: 3 },
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "1.12fr 0.88fr" },
                            gap: { xs: 2, md: 3 },
                            alignItems: "stretch",
                            minWidth: 0,
                        }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <AdminDashboardKpiCards
                                overview={overview}
                                metrics={metrics}
                                onJumpAtRisk={onJumpStudents}
                            />
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                            <AdminDashboardResultClassificationBox overview={overview} metrics={metrics} />
                        </Box>
                    </Box>

                    {/* 4) Trends */}
                    <Box sx={{ mt: { xs: 2, md: 3 }, minWidth: 0 }}>
                        <AdminDashboardTrends timeSeries={metrics.timeSeries} />
                    </Box>

                    <StudentQuickDrawer
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        student={selectedStudent}
                    />
                </PageShell>
            </Box>
        </Fade>
    );
}