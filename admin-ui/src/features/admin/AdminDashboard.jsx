import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    Fade,
    CircularProgress,
    Divider,
    Chip,
    Stack,
    IconButton,
    Button,
} from "@mui/material";
import {
    PeopleAltRounded,
    HowToRegRounded,
    BlockRounded,
    PendingActionsRounded,
    RefreshRounded,
    ScheduleRounded,
    TrendingUpRounded,
    TrendingDownRounded,
} from "@mui/icons-material";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { adminUserApi } from "../../api/adminUserApi";

/** ===== Theme (SYNC user: Xanh + Cam + Trắng) ===== */
const COLORS = {
    primaryBlue: "#0B5ED7",
    primaryBlueHover: "#084298",
    accentOrange: "#FF8C00",
    accentOrangeHover: "#E67600",
    bg: "#F6F8FC",
    white: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    border: "#E5EAF2",
    success: "#16A34A",
    danger: "#DC2626",
};

/** ===== Small helpers ===== */
const fmt = (n) => (n ?? 0).toLocaleString();

/** ===== UI: Header container ===== */
const PageShell = ({ children }) => (
    <Box
        sx={{
            width: "100%",
            mx: "auto",
            px: { xs: 2, md: 6 },
            pb: 4,
        }}
    >
        {children}
    </Box>
);

/** ===== UI: Card shell (consistent) ===== */
const CardShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "18px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
            ...sx,
        }}
    >
        {children}
    </Paper>
);

/** ===== KPI Card ===== */
const StatCard = ({ title, value, icon, tone = "blue", hint }) => {
    const toneCfg = useMemo(() => {
        if (tone === "orange")
            return { c: COLORS.accentOrange, bg: `${COLORS.accentOrange}14` };
        if (tone === "green") return { c: COLORS.success, bg: `${COLORS.success}14` };
        if (tone === "red") return { c: COLORS.danger, bg: `${COLORS.danger}14` };
        return { c: COLORS.primaryBlue, bg: `${COLORS.primaryBlue}12` };
    }, [tone]);

    return (
        <CardShell sx={{ p: 2.75 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography sx={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: 800 }}>
                        {title}
                    </Typography>

                    <Typography sx={{ mt: 0.5, color: COLORS.textPrimary, fontSize: 34, fontWeight: 950 }}>
                        {fmt(value)}
                    </Typography>

                    {hint ? (
                        <Chip
                            size="small"
                            label={hint}
                            sx={{
                                mt: 1,
                                height: 26,
                                borderRadius: "999px",
                                fontWeight: 900,
                                bgcolor: toneCfg.bg,
                                color: toneCfg.c,
                                border: `1px solid ${COLORS.border}`,
                            }}
                        />
                    ) : null}
                </Box>

                <Box
                    sx={{
                        width: 100,
                        height: 50,
                        borderRadius: "16px",
                        bgcolor: toneCfg.bg,
                        border: `1px solid ${COLORS.border}`,
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                    }}
                >
                    {React.cloneElement(icon, { sx: { fontSize: 28, color: toneCfg.c } })}
                </Box>
            </Stack>
        </CardShell>
    );
};

/** ===== Chart Header (same style) ===== */
const ChartHeader = ({ title, subtitle, badge }) => (
    <Box sx={{ px: 2.75, py: 2.25, bgcolor: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.bg} 100%)` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 16 }}>
                    {title}
                </Typography>
                <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 700, fontSize: 13 }}>
                    {subtitle}
                </Typography>
            </Box>
            {badge ? (
                <Chip
                    size="small"
                    icon={<ScheduleRounded sx={{ fontSize: 16, color: COLORS.textSecondary }} />}
                    label={badge}
                    sx={{
                        borderRadius: "999px",
                        bgcolor: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.textSecondary,
                        fontWeight: 900,
                    }}
                />
            ) : null}
        </Stack>
    </Box>
);

/** ===== Charts ===== */
const BarChartCard = ({ title, subtitle, data, badge }) => (
    <CardShell sx={{ height: "100%" }}>
        <ChartHeader title={title} subtitle={subtitle} badge={badge} />
        <Divider sx={{ borderColor: COLORS.border }} />

        <Box sx={{ p: 2.5 }}>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke={COLORS.textSecondary}
                        axisLine={false}
                        tickLine={false}
                        style={{ fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis
                        stroke={COLORS.textSecondary}
                        axisLine={false}
                        tickLine={false}
                        style={{ fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: COLORS.white,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 12,
                            boxShadow: "0px 18px 30px rgba(15, 23, 42, 0.12)",
                            fontWeight: 800,
                        }}
                    />
                    <Bar
                        dataKey="value"
                        fill={COLORS.primaryBlue}
                        radius={[10, 10, 0, 0]}
                        maxBarSize={46}
                    />
                </BarChart>
            </ResponsiveContainer>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.75 }}>
                <ScheduleRounded sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                <Typography sx={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: 700 }}>
                    Updated just now
                </Typography>
            </Box>
        </Box>
    </CardShell>
);

const LineChartCard = ({ title, subtitle, data, variant = "blue", badge }) => {
    const stroke = variant === "orange" ? COLORS.accentOrange : COLORS.primaryBlue;

    return (
        <CardShell sx={{ height: "100%" }}>
            <ChartHeader title={title} subtitle={subtitle} badge={badge} />
            <Divider sx={{ borderColor: COLORS.border }} />

            <Box sx={{ p: 2.5 }}>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data}>
                        <defs>
                            <linearGradient id={`area-${variant}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
                                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke={COLORS.textSecondary}
                            axisLine={false}
                            tickLine={false}
                            style={{ fontSize: 12, fontWeight: 700 }}
                        />
                        <YAxis
                            stroke={COLORS.textSecondary}
                            axisLine={false}
                            tickLine={false}
                            style={{ fontSize: 12, fontWeight: 700 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: COLORS.white,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: 12,
                                boxShadow: "0px 18px 30px rgba(15, 23, 42, 0.12)",
                                fontWeight: 800,
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={stroke}
                            strokeWidth={3}
                            dot={{ r: 5, fill: stroke, stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 7 }}
                            fill={`url(#area-${variant})`}
                        />
                    </LineChart>
                </ResponsiveContainer>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.75 }}>
                    <ScheduleRounded sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                    <Typography sx={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: 700 }}>
                        Updated just now
                    </Typography>
                </Box>
            </Box>
        </CardShell>
    );
};

const AdminDashboard = () => {
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, blocked: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStatistics(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStatistics = async (isRefresh) => {
        if (isRefresh) setRefreshing(true);
        setLoading(!isRefresh);

        try {
            const [pendingRes, activeRes, blockedRes] = await Promise.all([
                adminUserApi.getPendingApprovals(),
                adminUserApi.getActiveStudents(),
                adminUserApi.getBlockedStudents(),
            ]);

            const pending = pendingRes.data?.length ?? 0;
            const active = activeRes.data?.length ?? 0;
            const blocked = blockedRes.data?.length ?? 0;

            setStats({
                total: pending + active + blocked,
                active,
                pending,
                blocked,
            });
        } catch (e) {
            // giữ console error như m đang làm
            console.error("Error fetching statistics:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /** Demo chart data (giữ của m, chỉnh label cho rõ) */
    const weeklyData = [
        { name: "Mon", value: 45 },
        { name: "Tue", value: 32 },
        { name: "Wed", value: 38 },
        { name: "Thu", value: 48 },
        { name: "Fri", value: 55 },
        { name: "Sat", value: 42 },
        { name: "Sun", value: 50 },
    ];

    const monthlySalesData = [
        { name: "Apr", value: 100 },
        { name: "May", value: 150 },
        { name: "Jun", value: 280 },
        { name: "Jul", value: 400 },
        { name: "Aug", value: 520 },
        { name: "Sep", value: 380 },
        { name: "Oct", value: 450 },
        { name: "Nov", value: 500 },
        { name: "Dec", value: 600 },
    ];

    const completedTasksData = [
        { name: "Apr", value: 200 },
        { name: "May", value: 230 },
        { name: "Jun", value: 280 },
        { name: "Jul", value: 350 },
        { name: "Aug", value: 450 },
        { name: "Sep", value: 380 },
        { name: "Oct", value: 420 },
        { name: "Nov", value: 480 },
        { name: "Dec", value: 550 },
    ];

    if (loading) {
        return (
            <Box sx={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <CircularProgress sx={{ color: COLORS.primaryBlue }} />
            </Box>
        );
    }

    return (
        <Fade in timeout={600}>
            <Box sx={{ background: COLORS.bg, minHeight: "calc(100vh - 120px)" }}>
                <PageShell>
                    {/* ===== Header ===== */}
                    <Box
                        sx={{
                            mb: 3,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: { xs: 24, md: 30 } }}>
                                Admin Dashboard
                            </Typography>
                            <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 700 }}>
                                Tổng quan hệ thống học viên
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1}>
                            <Button
                                onClick={() => fetchStatistics(true)}
                                startIcon={<RefreshRounded />}
                                disabled={refreshing}
                                variant="contained"
                                sx={{
                                    borderRadius: "14px",
                                    bgcolor: COLORS.primaryBlue,
                                    fontWeight: 900,
                                    textTransform: "none",
                                    boxShadow: "none",
                                    "&:hover": { bgcolor: COLORS.primaryBlueHover, boxShadow: "none" },
                                }}
                            >
                                {refreshing ? "Đang làm mới..." : "Làm mới"}
                            </Button>
                        </Stack>
                    </Box>

                    {/* ===== KPI row ===== */}
                    <Grid container spacing={3} sx={{ mb:5 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Tổng số học viên"    
                                value={stats.total}
                                icon={<PeopleAltRounded />}
                                tone="blue"
                                hint="ALL"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Chờ phê duyệt"
                                value={stats.pending}
                                icon={<PendingActionsRounded />}
                                tone="orange"
                                hint="WAITING"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Đang hoạt động"
                                value={stats.active}
                                icon={<HowToRegRounded />}
                                tone="green"
                                hint="ACTIVE"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Đã khóa"
                                value={stats.blocked}
                                icon={<BlockRounded />}
                                tone="red"
                                hint="BLOCKED"
                            />
                        </Grid>
                    </Grid>

                    {/* ===== Highlight panel (nice + đúng màu cam) ===== */}
                    <CardShell sx={{ mb: 3.5 }}>
                        <Box
                            sx={{
                                p: 2.5,
                                background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.accentOrange} 100%)`,
                            }}
                        >
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: COLORS.white, fontWeight: 950, fontSize: 16 }}>
                                        Quick Insights
                                    </Typography>
                                    <Typography sx={{ mt: 0.4, color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: 13 }}>
                                        Pending cao? Ưu tiên xử lý phê duyệt để giảm bottleneck onboarding.
                                    </Typography>
                                </Box>

                                <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                                    <Chip
                                        icon={<TrendingUpRounded sx={{ color: COLORS.white }} />}
                                        label={`Active: ${fmt(stats.active)}`}
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.18)",
                                            color: COLORS.white,
                                            fontWeight: 900,
                                            border: "1px solid rgba(255,255,255,0.25)",
                                        }}
                                    />
                                    <Chip
                                        icon={<TrendingDownRounded sx={{ color: COLORS.white }} />}
                                        label={`Blocked: ${fmt(stats.blocked)}`}
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.18)",
                                            color: COLORS.white,
                                            fontWeight: 900,
                                            border: "1px solid rgba(255,255,255,0.25)",
                                        }}
                                    />
                                </Stack>
                            </Stack>
                        </Box>
                    </CardShell>

                    {/* ===== Charts row ===== */}
                    <Grid container spacing={12}>
                        <Grid item xs={12} md={12}>
                            <BarChartCard
                                title="Website Views"
                                subtitle="Theo tuần (demo data)"
                                data={weeklyData}
                                badge="This week"
                            />
                        </Grid>

                        <Grid item xs={12} md={12}>
                            <LineChartCard
                                title="Daily Sales"
                                subtitle="Trend theo tháng (blue)"
                                data={monthlySalesData}
                                variant="blue"
                                badge="Monthly"
                            />
                        </Grid>

                        <Grid item xs={12} md={12}>
                            <LineChartCard
                                title="Completed Tasks"
                                subtitle="Trend theo tháng (orange)"
                                data={completedTasksData}
                                variant="orange"
                                badge="Monthly"
                            />
                        </Grid>
                    </Grid>
                </PageShell>
            </Box>
        </Fade>
    );
};

export default AdminDashboard;
