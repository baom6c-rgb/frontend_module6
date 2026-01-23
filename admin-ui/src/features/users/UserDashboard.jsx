import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Typography, Paper, Fade,
    CircularProgress, Alert, Avatar, Container, useTheme
} from '@mui/material';
import {
    Timer as TimerIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingIcon,
    School as SchoolIcon,
    Lightbulb as LightbulbIcon,
    AutoGraph as ProgressIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { getDashboardStatsApi } from '../../api/dashboardApi';

const UserDashboard = () => {
    const theme = useTheme();
    const { user } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                // Gọi API lấy dữ liệu (Token được gắn tự động bởi Axios Interceptor)
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

    // Component hiển thị thẻ thống kê (Stat Card)
    const StatCard = ({ icon, title, value, subtitle, color }) => (
        <Paper elevation={0} sx={{
            p: 3,
            borderRadius: '24px',
            border: '1px solid #E0E5F2',
            height: '100%',
            background: '#fff',
            transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
            '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0px 20px 40px rgba(0,0,0,0.06)',
                borderColor: color
            }
        }}>
            <Box display="flex" alignItems="center">
                <Box sx={{
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: `${color}15`, // Độ trong suốt 15%
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2.5
                }}>
                    {React.cloneElement(icon, { fontSize: 'large' })}
                </Box>
                <Box>
                    <Typography variant="body2" color="textSecondary" fontWeight="700" sx={{ letterSpacing: '0.5px' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ color: '#1B2559', my: 0.5 }}>
                        {value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#A3AED0', fontWeight: '500' }}>
                        {subtitle}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );

    if (loading) return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80vh">
            <CircularProgress thickness={5} size={60} sx={{ color: '#4318FF' }} />
            <Typography sx={{ mt: 2, color: '#A3AED0', fontWeight: '600' }}>Đang tải dữ liệu học tập...</Typography>
        </Box>
    );

    if (error) return (
        <Container maxWidth="md" sx={{ mt: 10 }}>
            <Alert severity="error" variant="filled" sx={{ borderRadius: '15px' }}>{error}</Alert>
        </Container>
    );

    return (
        <Fade in={true} timeout={800}>
            <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#F4F7FE', minHeight: '100vh' }}>

                {/* Header Section: Lời chào và Thông tin cá nhân */}
                <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box display="flex" alignItems="center">
                        <Avatar
                            src={user?.avatarUrl}
                            sx={{
                                width: 70, height: 70,
                                border: '4px solid #fff',
                                boxShadow: '0px 10px 20px rgba(0,0,0,0.1)',
                                bgcolor: '#4318FF',
                                mr: 3,
                                fontSize: '1.8rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {user?.fullName?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1B2559', mb: 0.5 }}>
                                {stats?.greeting || "Chào mừng bạn!"}
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#707EAE', fontWeight: '500' }}>
                                Hôm nay bạn muốn học gì nào? 📚
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Grid các chỉ số thống kê */}
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<AssignmentIcon />}
                            title="HOÀN THÀNH"
                            value={stats?.completedLessons || 0}
                            subtitle="Bài kiểm tra đã nộp"
                            color="#4318FF"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<TimerIcon />}
                            title="THỜI GIAN"
                            value={`${stats?.onlineTime || 0}h`}
                            subtitle="Tổng thời lượng học"
                            color="#6AD2FF"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<SchoolIcon />}
                            title="ĐIỂM SỐ"
                            value={stats?.averageScore || 0}
                            subtitle="Trung bình các bài thi"
                            color="#05CD99"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={3}>
                        <StatCard
                            icon={<TrendingIcon />}
                            title="XẾP HẠNG"
                            value={`#${stats?.rank || 0}`}
                            subtitle={`Trong tổng ${stats?.totalStudents || 0} học viên`}
                            color="#FFB547"
                        />
                    </Grid>
                </Grid>

                {/* Gợi ý học tập & Phân tích thông minh */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{
                            p: 4,
                            borderRadius: '24px',
                            border: '1px solid #E0E5F2',
                            background: 'linear-gradient(135deg, #4318FF 0%, #707EAE 100%)',
                            color: '#fff',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <LightbulbIcon sx={{ color: '#FFB547', mr: 1, fontSize: '2rem' }} />
                                    <Typography variant="h5" fontWeight="800">Gợi ý lộ trình</Typography>
                                </Box>
                                <Typography variant="body1" sx={{ lineHeight: 1.8, fontSize: '1.2rem', opacity: 0.95 }}>
                                    {stats?.suggestion || "Hãy làm bài kiểm tra để AI phân tích lộ trình phù hợp nhất cho bạn."}
                                </Typography>
                            </Box>
                            {/* Icon nền trang trí */}
                            <ProgressIcon sx={{
                                position: 'absolute', right: -20, bottom: -20,
                                fontSize: '150px', opacity: 0.1, color: '#fff'
                            }} />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #E0E5F2', height: '100%' }}>
                            <Typography variant="h6" fontWeight="700" color="#1B2559" mb={3}>Tóm tắt mục tiêu</Typography>
                            <Box sx={{ borderLeft: '4px solid #05CD99', pl: 2, mb: 3 }}>
                                <Typography variant="subtitle2" color="textSecondary">Điểm số hiện tại</Typography>
                                <Typography variant="h5" fontWeight="700">{stats?.averageScore}/10.0</Typography>
                            </Box>
                            <Box sx={{ borderLeft: '4px solid #4318FF', pl: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">Mục tiêu tiếp theo</Typography>
                                <Typography variant="h5" fontWeight="700">Top 10 Học viên</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Fade>
    );
};

export default UserDashboard;