import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
    Timer as TimerIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingIcon,
    School as SchoolIcon,
    Lightbulb as LightbulbIcon,
    AutoGraph as ProgressIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { getDashboardStatsApi } from "../../api/dashboardApi";

// ===== Color tokens: Orange + Deep Blue + White =====
const COLORS = {
    primaryBlue: "#0B5ED7",
    secondaryOrange: "#FF8C00",
    bgWhite: "#FFFFFF",
    bgLight: "#F7F9FC",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    borderLight: "#E3E8EF",
};

const UserDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await getDashboardStatsApi();
                setStats(response.data);
                setError(null);
            } catch (err) {
                console.error("Dashboard Error:", err);
                setError("Không thể tải dữ liệu thống kê. Vui lòng kiểm tra lại kết nối Server.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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

    if (loading)
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress thickness={5} size={60} sx={{ color: COLORS.primaryBlue }} />
                <Typography sx={{ mt: 2, color: "#8A94A6", fontWeight: 700 }}>
                    Đang tải dữ liệu học tập...
                </Typography>
            </Box>
        );

    if (error)
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: "16px", fontWeight: 700 }}>
                    {error}
                </Alert>
            </Container>
        );

    return (
        <Fade in timeout={800}>
            <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: COLORS.bgLight, minHeight: "100vh" }}>
                {/* Header */}
                <Box
                    sx={{
                        mb: 5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Box display="flex" alignItems="center">
                        <Avatar
                            src={user?.avatarUrl}
                            sx={{
                                width: 70,
                                height: 70,
                                border: "4px solid #fff",
                                boxShadow: "0px 10px 20px rgba(0,0,0,0.10)",
                                bgcolor: COLORS.primaryBlue,
                                mr: 3,
                                fontSize: "1.8rem",
                                fontWeight: 900,
                            }}
                        >
                            {user?.fullName?.charAt(0).toUpperCase()}
                        </Avatar>

                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5 }}>
                                {stats?.greeting || "Chào mừng bạn!"}
                            </Typography>
                            <Typography variant="h6" sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>
                                Hôm nay bạn muốn học gì nào? 📚
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Stats */}
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<AssignmentIcon />}
                            title="HOÀN THÀNH"
                            value={stats?.completedLessons || 0}
                            subtitle="Bài kiểm tra đã nộp"
                            color={COLORS.primaryBlue}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<TimerIcon />}
                            title="THỜI GIAN"
                            value={`${stats?.onlineTime || 0}h`}
                            subtitle="Tổng thời lượng học"
                            color={COLORS.secondaryOrange}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<SchoolIcon />}
                            title="ĐIỂM SỐ"
                            value={stats?.averageScore || 0}
                            subtitle="Trung bình các bài thi"
                            color={COLORS.primaryBlue}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<TrendingIcon />}
                            title="XẾP HẠNG"
                            value={`#${stats?.rank || 0}`}
                            subtitle={`Trong tổng ${stats?.totalStudents || 0} học viên`}
                            color={COLORS.secondaryOrange}
                        />
                    </Grid>
                </Grid>

                {/* Suggestion + Summary */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Paper
                            sx={{
                                p: 4,
                                borderRadius: "24px",
                                border: `1px solid ${COLORS.borderLight}`,
                                background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.secondaryOrange} 100%)`,
                                color: "#fff",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            <Box sx={{ position: "relative", zIndex: 1 }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <LightbulbIcon sx={{ color: "#fff", mr: 1, fontSize: "2rem", opacity: 0.95 }} />
                                    <Typography variant="h5" fontWeight={900}>
                                        Gợi ý lộ trình
                                    </Typography>
                                </Box>

                                <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: "1.1rem", opacity: 0.95 }}>
                                    {stats?.suggestion ||
                                        "Hãy làm bài kiểm tra để AI phân tích lộ trình phù hợp nhất cho bạn."}
                                </Typography>
                            </Box>

                            <ProgressIcon
                                sx={{
                                    position: "absolute",
                                    right: -20,
                                    bottom: -20,
                                    fontSize: "150px",
                                    opacity: 0.12,
                                    color: "#fff",
                                }}
                            />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper
                            sx={{
                                p: 4,
                                borderRadius: "24px",
                                border: `1px solid ${COLORS.borderLight}`,
                                height: "100%",
                                bgcolor: COLORS.bgWhite,
                            }}
                        >
                            <Typography variant="h6" fontWeight={900} sx={{ color: COLORS.textPrimary, mb: 3 }}>
                                Tóm tắt mục tiêu
                            </Typography>

                            <Box sx={{ borderLeft: `4px solid ${COLORS.primaryBlue}`, pl: 2, mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>
                                    Điểm số hiện tại
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                    {stats?.averageScore}/10.0
                                </Typography>
                            </Box>

                            <Box sx={{ borderLeft: `4px solid ${COLORS.secondaryOrange}`, pl: 2 }}>
                                <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>
                                    Mục tiêu tiếp theo
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                    Top 10 Học viên
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Fade>
    );
};

export default UserDashboard;
