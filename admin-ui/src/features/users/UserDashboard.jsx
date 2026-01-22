import React from 'react';
import {
    Box, Grid, Typography, Paper, Button, LinearProgress,
    Card, CardContent, CardMedia, Avatar, Chip, Fade
} from '@mui/material';
import {
    MenuBook, QueryBuilder, EmojiEvents, NotificationsActive,
    PlayCircleFilledWhite, TrendingUp
} from '@mui/icons-material';

// Component con cho các thẻ thống kê nhanh
const MiniStatCard = ({ title, value, icon, color }) => (
    <Paper sx={{ p: 2, borderRadius: '15px', display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff' }}>
        <Box sx={{ bgcolor: `${color}15`, p: 1.5, borderRadius: '10px', display: 'flex', color: color }}>
            {icon}
        </Box>
        <Box>
            <Typography variant="caption" sx={{ color: '#A3AED0', fontWeight: 600 }}>{title}</Typography>
            <Typography variant="h6" sx={{ color: '#1B2559', fontWeight: 800 }}>{value}</Typography>
        </Box>
    </Paper>
);

const UserDashboard = () => {
    return (
        <Fade in={true} timeout={800}>
            <Box>
                {/* Chào mừng */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1B2559' }}>
                        Bảng điều khiển học viên 🎓
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A3AED0', fontWeight: 500 }}>
                        Chào mừng trở lại! Hôm nay bạn có 2 bài học mới cần hoàn thành.
                    </Typography>
                </Box>

                {/* Thống kê nhanh */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <MiniStatCard title="Khóa học đã tham gia" value="04" icon={<MenuBook />} color="#4318FF" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <MiniStatCard title="Giờ học tuần này" value="12.5h" icon={<QueryBuilder />} color="#05CD99" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <MiniStatCard title="Chứng chỉ đạt được" value="02" icon={<EmojiEvents />} color="#FFB547" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <MiniStatCard title="Điểm rèn luyện" value="95/100" icon={<TrendingUp />} color="#EE5D50" />
                    </Grid>
                </Grid>

                <Grid container spacing={3}>
                    {/* Cột trái: Khóa học đang học */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, borderRadius: '20px', mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1B2559' }}>Đánh giá học tập</Typography>
                                <Button size="small" sx={{ fontWeight: 700 }}>Xem tất cả</Button>
                            </Box>

                            <Grid container spacing={2}>
                                {[1, 2].map((item) => (
                                    <Grid item xs={12} key={item}>
                                        <Card sx={{ display: 'flex', borderRadius: '15px', boxShadow: 'none', border: '1px solid #F4F7FE' }}>
                                            <CardMedia
                                                component="img"
                                                sx={{ width: 140, display: { xs: 'none', sm: 'block' } }}
                                                image={`https://img.freepik.com/free-vector/online-tutorials-concept_52683-37453.jpg`}
                                            />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2B3674' }}>
                                                    {item === 1 ? "Kiến thức cần cải thiện" : "Nhận xét kỹ năng học viên"}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 2 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={item === 1 ? 75 : 30}
                                                        sx={{ flexGrow: 1, height: 8, borderRadius: 5, bgcolor: '#E9EDF7' }}
                                                    />
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{item === 1 ? "75%" : "30%"}</Typography>
                                                </Box>
                                                <Button variant="contained" size="small" startIcon={<PlayCircleFilledWhite />} sx={{ alignSelf: 'flex-start', borderRadius: '10px', bgcolor: '#4318FF' }}>
                                                    Xem ngay
                                                </Button>
                                            </Box>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Cột phải: Thông báo & Sự kiện */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: '20px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <NotificationsActive sx={{ color: '#FFB547' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1B2559' }}>Thông báo mới</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {[
                                    { text: "Lịch thi cuối khóa ReactJS đã được cập nhật.", time: "2 giờ trước" },
                                    { text: "Bạn đã hoàn thành bài trắc nghiệm chương 5.", time: "Hôm qua" },
                                    { text: "Giảng viên vừa phản hồi bài tập về nhà của bạn.", time: "2 ngày trước" }
                                ].map((noti, index) => (
                                    <Box key={index} sx={{ display: 'flex', gap: 2 }}>
                                        <Avatar sx={{ width: 8, height: 8, bgcolor: '#4318FF', mt: 1 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2B3674' }}>{noti.text}</Typography>
                                            <Typography variant="caption" sx={{ color: '#A3AED0' }}>{noti.time}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Fade>
    );
};

export default UserDashboard;