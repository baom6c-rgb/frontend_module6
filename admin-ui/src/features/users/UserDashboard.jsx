// src/features/users/UserDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Paper,
    Fade,
    CircularProgress,
    Alert,
    Avatar,
    Container,
    Chip,
    Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Timer as TimerIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingIcon,
    School as SchoolIcon,
    Lightbulb as LightbulbIcon,
    AutoGraph as ProgressIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { getDashboardStatsApi } from "../../api/dashboardApi";
import { getMyProfileApi } from "../../api/userApi";

const COLORS = {
    primary: "#2E2D84",
    primaryDeep: "#1E1D6F",
    primaryLight: "#EEF2FF",

    orange: "#EC5E32",
    orangeDeep: "#D5522B",
    orangeLight: "#FFF1EB",

    success: "#2E7D32",
    successDeep: "#1B5E20",
    successLight: "#E8F5E9",

    error: "#D32F2F",
    errorDeep: "#C62828",
    errorLight: "#FFEBEE",

    bg: "#F7F9FC",
    white: "#FFFFFF",
    text: "#1B2559",
    subtext: "#6C757D",
    border: "#E3E8EF",
};

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

const fmtInt = (v, fallback = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(n);
};

const fmtHours = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "0h";
    const mins = Math.round(n * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const CardShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "20px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
            height: "100%",
            width: "100%",
            ...sx,
        }}
    >
        {children}
    </Paper>
);

const KpiCard = ({ icon, title, value, subtitle, tone = "primary" }) => {
    const toneColor =
        tone === "orange" ? COLORS.orange :
            tone === "success" ? COLORS.success :
                tone === "error" ? COLORS.error :
                    COLORS.primary;

    return (
        <CardShell
            sx={{
                p: 2.5,
                display: "flex",
                alignItems: "center",
                height: "100%",
                minHeight: 120,
                transition: "all 0.22s ease",
                "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 22px 55px rgba(15, 23, 42, 0.1)",
                    borderColor: alpha(toneColor, 0.5),
                },
            }}
        >
            <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                    sx={{
                        width: 52,
                        height: 52,
                        borderRadius: "14px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha(toneColor, 0.1),
                        color: toneColor,
                        flex: "0 0 auto",
                    }}
                >
                    {React.cloneElement(icon, { fontSize: "medium" })}
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: COLORS.subtext,
                            fontWeight: 900,
                            letterSpacing: "0.6px",
                            textTransform: "uppercase",
                            display: "block",
                            lineHeight: 1.2,
                            mb: 0.5,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {title}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 0.75,
                            minWidth: 0,
                            flexWrap: "nowrap",
                        }}
                    >
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 950,
                                color: COLORS.text,
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {value}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: alpha(COLORS.subtext, 0.95),
                                fontWeight: 700,
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {subtitle || " "}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </CardShell>
    );
};

export default function UserDashboard() {
    const { user } = useSelector((state) => state.auth);

    const [stats, setStats] = useState(null);
    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;

        const fetchAll = async () => {
            try {
                setLoading(true);

                const [statsRes, profileRes] = await Promise.allSettled([
                    getDashboardStatsApi(),
                    getMyProfileApi(),
                ]);

                if (!alive) return;

                if (statsRes.status === "fulfilled") {
                    setStats(statsRes.value.data);
                    setError(null);
                } else {
                    console.error("Dashboard Error:", statsRes.reason);
                    setError("Không thể tải dữ liệu thống kê. Vui lòng kiểm tra lại kết nối Server.");
                }

                if (profileRes.status === "fulfilled") {
                    const p = profileRes.value.data;
                    setProfile(p);

                    if (p?.avatarUrl) {
                        const u = safeParse("userData", {});
                        localStorage.setItem(
                            "userData",
                            JSON.stringify({ ...(u || {}), avatarUrl: p.avatarUrl })
                        );
                    }
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

    const userData = safeParse("userData", null);

    const displayName =
        profile?.fullName ||
        user?.fullName ||
        userData?.fullName ||
        profile?.email ||
        user?.email ||
        userData?.email ||
        "User";

    const avatarUrl =
        profile?.avatarUrl ||
        user?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

    const initials = useMemo(() => {
        const name = String(displayName || "U").trim();
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name ? name.charAt(0).toUpperCase() : "U";
    }, [displayName]);

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: "72vh",
                    display: "grid",
                    placeItems: "center",
                    px: 2,
                    bgcolor: COLORS.bg,
                }}
            >
                <Box sx={{ textAlign: "center" }}>
                    <CircularProgress thickness={5} size={56} sx={{ color: COLORS.primary }} />
                    <Typography sx={{ mt: 2, color: alpha(COLORS.subtext, 0.95), fontWeight: 800 }}>
                        Đang tải dữ liệu học tập...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: "16px", fontWeight: 800 }}>
                    {error}
                </Alert>
            </Container>
        );
    }

    const completed = fmtInt(stats?.completedLessons, 0);
    const onlineTimeText = fmtHours(stats?.onlineTime || 0);
    const avgScore = fmtInt(stats?.averageScore, 0);
    const rank = fmtInt(stats?.rank, 0);
    const totalStudents = fmtInt(stats?.totalStudents, 0);
    const passedLessons = fmtInt(stats?.passedLessons, 0);
    const failedLessons = fmtInt(stats?.failedLessons, 0);

    const greeting = stats?.greeting || `Chào mừng ${displayName}!`;
    const suggestion =
        stats?.suggestion || "Hãy làm bài kiểm tra để AI phân tích lộ trình phù hợp nhất cho bạn.";

    const scorePct = Math.max(0, Math.min(100, avgScore));

    return (
        <Fade in timeout={650}>
            <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", py: { xs: 2.5, md: 4 } }}>
                <Container
                    maxWidth={false}
                    disableGutters
                    sx={{
                        width: "100%",
                        px: { xs: 2, sm: 3, md: 4, lg: 5 },
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            mx: "auto",
                            maxWidth: { xs: "100%", lg: 1560, xl: 1720 },
                        }}
                    >
                        {/* ===== HEADER HERO ===== */}
                        <CardShell
                            sx={{
                                mb: 3,
                                p: { xs: 2.5, md: 3.5 },
                                background: `linear-gradient(135deg, ${COLORS.primaryDeep} 0%, ${COLORS.primary} 45%, ${COLORS.orange} 120%)`,
                                color: "#fff",
                                position: "relative",
                                minHeight: 170,
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0.00) 42%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.00) 45%)",
                                    pointerEvents: "none",
                                }}
                            />

                            <Box
                                sx={{
                                    position: "relative",
                                    zIndex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 2,
                                    flexWrap: { xs: "wrap", md: "nowrap" },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        minWidth: 0,
                                        flex: 1,
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl || undefined}
                                        imgProps={{ referrerPolicy: "no-referrer" }}
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            border: "4px solid rgba(255,255,255,0.45)",
                                            bgcolor: alpha("#000", 0.12),
                                            fontWeight: 950,
                                            fontSize: "1.6rem",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        {initials}
                                    </Avatar>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 950,
                                                lineHeight: 1.1,
                                                mb: 0.5,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {greeting}
                                        </Typography>

                                        <Typography sx={{ opacity: 0.92, fontWeight: 700, mb: 1.5 }}>
                                            Học hành là chuyện cả đời. Bắt đầu học tập chưa bao giờ là quá muộn ! 📚
                                        </Typography>

                                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                            <Chip
                                                size="small"
                                                label={`Điểm hiện tại: ${avgScore}/100`}
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label="Mục tiêu: Top 10"
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label={`Tiến độ: ${scorePct}%`}
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.25,
                                        color: alpha("#fff", 0.92),
                                        flex: "0 0 auto",
                                        minWidth: { xs: "100%", md: 240 },
                                        justifyContent: { xs: "flex-start", md: "flex-end" },
                                    }}
                                >
                                    <ProgressIcon sx={{ fontSize: 36 }} />
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1 }}>
                                            {rank ? `#${rank}` : "--"}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.9 }}>
                                            {totalStudents ? `Trên ${totalStudents} học viên` : "Bảng xếp hạng"}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardShell>

                        {/* ===== KPI GRID ===== */}
                        <Box sx={{ mb: 3 }}>
                            <CardShell sx={{ p: 2.5 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, 1fr)',
                                            md: 'repeat(3, 1fr)'
                                        },
                                        gap: 2.5,
                                    }}
                                >
                                    {/* Hàng 1 - 3 cards trên */}
                                    <KpiCard
                                        icon={<AssignmentIcon />}
                                        title="Hoàn thành"
                                        value={completed}
                                        subtitle="bài đã nộp"
                                        tone="primary"
                                    />
                                    <KpiCard
                                        icon={<SchoolIcon />}
                                        title="Điểm trung bình"
                                        value={avgScore}
                                        subtitle="/100"
                                        tone="primary"
                                    />
                                    <KpiCard
                                        icon={<TimerIcon />}
                                        title="Thời gian"
                                        value={onlineTimeText}
                                        subtitle="tổng học"
                                        tone="orange"
                                    />

                                    {/* Hàng 2 - 3 cards dưới */}
                                    <KpiCard
                                        icon={<CheckCircleIcon />}
                                        title="Số bài Đạt"
                                        value={passedLessons}
                                        subtitle="Pass"
                                        tone="success"
                                    />
                                    <KpiCard
                                        icon={<CancelIcon />}
                                        title="Số bài Trượt"
                                        value={failedLessons}
                                        subtitle="Fail"
                                        tone="error"
                                    />
                                    <KpiCard
                                        icon={<TrendingIcon />}
                                        title="Xếp hạng"
                                        value={rank ? `#${rank}` : "--"}
                                        subtitle={totalStudents ? `/${totalStudents}` : ""}
                                        tone="orange"
                                    />
                                </Box>
                            </CardShell>
                        </Box>

                        {/* ===== MAIN CONTENT ===== */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2.5,
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* LEFT: Gợi ý lộ trình */}
                            <Box sx={{ flex: { xs: '1 1 100%', md: '7' }, display: "flex", minWidth: 0 }}>
                                <CardShell>
                                    <Box
                                        sx={{
                                            p: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2,
                                            height: "100%",
                                            minWidth: 0,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: "14px",
                                                    display: "grid",
                                                    placeItems: "center",
                                                    bgcolor: alpha(COLORS.orange, 0.1),
                                                    color: COLORS.orange,
                                                    flex: "0 0 auto",
                                                }}
                                            >
                                                <LightbulbIcon />
                                            </Box>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 950, color: COLORS.text, lineHeight: 1.1 }}>
                                                    Gợi ý lộ trình
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: COLORS.subtext, fontWeight: 700 }}>
                                                    Dựa trên tiến độ và kết quả gần đây
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ borderColor: alpha(COLORS.border, 0.9) }} />

                                        <Box
                                            sx={{
                                                p: 2.25,
                                                borderRadius: "16px",
                                                border: `1px solid ${alpha(COLORS.primary, 0.18)}`,
                                                bgcolor: alpha(COLORS.primaryLight, 0.6),
                                                position: "relative",
                                                overflow: "hidden",
                                                minWidth: 0,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    background:
                                                        "radial-gradient(circle at 10% 10%, rgba(46,45,132,0.10) 0, rgba(46,45,132,0) 45%), radial-gradient(circle at 85% 30%, rgba(236,94,50,0.10) 0, rgba(236,94,50,0) 48%)",
                                                    pointerEvents: "none",
                                                }}
                                            />
                                            <Box sx={{ position: "relative", zIndex: 1 }}>
                                                <Typography
                                                    sx={{
                                                        color: COLORS.text,
                                                        fontWeight: 900,
                                                        lineHeight: 1.6,
                                                        fontSize: "1.02rem",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {suggestion}
                                                </Typography>

                                                <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                                                    <Chip
                                                        size="small"
                                                        label="Giữ nhịp mỗi ngày"
                                                        sx={{
                                                            bgcolor: alpha(COLORS.primary, 0.12),
                                                            color: COLORS.primaryDeep,
                                                            fontWeight: 900,
                                                        }}
                                                    />
                                                    <Chip
                                                        size="small"
                                                        label="Ưu tiên module yếu"
                                                        sx={{
                                                            bgcolor: alpha(COLORS.orange, 0.12),
                                                            color: COLORS.orangeDeep,
                                                            fontWeight: 900,
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardShell>
                            </Box>

                            {/* RIGHT: Tóm tắt mục tiêu */}
                            <Box sx={{ flex: { xs: '1 1 100%', md: '5' }, display: "flex", minWidth: 0 }}>
                                <CardShell>
                                    <Box
                                        sx={{
                                            p: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2.5,
                                            height: "100%",
                                            width: "100%",
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 950, color: COLORS.text, mb: 0.5 }}>
                                                Tóm tắt mục tiêu
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: COLORS.subtext, fontWeight: 700 }}>
                                                Theo dõi nhanh để tối ưu lộ trình học
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ borderColor: alpha(COLORS.border, 0.9) }} />

                                        <Box
                                            sx={{
                                                p: 2.5,
                                                borderRadius: "16px",
                                                border: `1px solid ${alpha(COLORS.primary, 0.18)}`,
                                                bgcolor: alpha(COLORS.primaryLight, 0.55),
                                                minWidth: 0,
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ color: COLORS.subtext, fontWeight: 900 }}>
                                                ĐIỂM SỐ HIỆN TẠI
                                            </Typography>

                                            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.75 }}>
                                                <Typography variant="h4" sx={{ fontWeight: 950, color: COLORS.text }}>
                                                    {avgScore}
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: COLORS.subtext }}>/100</Typography>
                                            </Box>

                                            <Box sx={{ mt: 1.5 }}>
                                                <Box
                                                    sx={{
                                                        height: 10,
                                                        borderRadius: "999px",
                                                        bgcolor: alpha(COLORS.primary, 0.12),
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            height: "100%",
                                                            width: `${scorePct}%`,
                                                            bgcolor: COLORS.primary,
                                                            borderRadius: "999px",
                                                            transition: "width 0.4s ease",
                                                        }}
                                                    />
                                                </Box>

                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        mt: 0.8,
                                                        color: COLORS.subtext,
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    Tiến độ mục tiêu: {scorePct}%
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box sx={{ flex: 1 }} />

                                        <Box
                                            sx={{
                                                p: 2.5,
                                                borderRadius: "16px",
                                                border: `1px solid ${alpha(COLORS.orange, 0.18)}`,
                                                bgcolor: alpha(COLORS.orangeLight, 0.65),
                                                minWidth: 0,
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ color: COLORS.subtext, fontWeight: 900 }}>
                                                MỤC TIÊU TIẾP THEO
                                            </Typography>

                                            <Typography variant="h6" sx={{ fontWeight: 950, color: COLORS.text, mt: 0.75 }}>
                                                Top 10 học viên
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                sx={{ color: COLORS.subtext, fontWeight: 700, mt: 0.75 }}
                                            >
                                                Ưu tiên làm bài theo module bạn yếu để cải thiện nhanh.
                                            </Typography>

                                            <Box sx={{ display: "flex", gap: 1, mt: 1.75, flexWrap: "wrap" }}>
                                                <Chip
                                                    size="small"
                                                    label={`Hoàn thành: ${completed}`}
                                                    sx={{
                                                        bgcolor: alpha(COLORS.primary, 0.1),
                                                        color: COLORS.primaryDeep,
                                                        fontWeight: 900,
                                                    }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={`Thời gian: ${onlineTimeText}`}
                                                    sx={{
                                                        bgcolor: alpha(COLORS.orange, 0.1),
                                                        color: COLORS.orangeDeep,
                                                        fontWeight: 900,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardShell>
                            </Box>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Fade>
    );
}