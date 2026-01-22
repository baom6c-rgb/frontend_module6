import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Grid, Fade, CircularProgress
} from '@mui/material';
import {
    PeopleAlt, HowToReg, Block, CheckCircle,
    TrendingUp, Schedule
} from '@mui/icons-material';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../api/axiosConfig.js';

// Statistics Card Component
const StatCard = ({ title, value, icon, color, bgColor, trend }) => (
    <Paper sx={{
        p: 3,
        borderRadius: '16px',
        boxShadow: '0px 10px 30px rgba(0,0,0,0.08)',
        background: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #F4F7FE'
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{
                bgcolor: bgColor,
                p: 1.5,
                borderRadius: '12px',
                display: 'flex'
            }}>
                {React.cloneElement(icon, { sx: { fontSize: 28, color: color } })}
            </Box>
        </Box>
        <Typography sx={{ color: '#A3AED0', fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>
            {title}
        </Typography>
        <Typography sx={{ color: '#2B3674', fontSize: '2rem', fontWeight: 800, mb: 1 }}>
            {value.toLocaleString()}
        </Typography>
        {trend && (
            <Typography sx={{ color: '#05CD99', fontSize: '0.8rem', fontWeight: 700 }}>
                {trend}
            </Typography>
        )}
    </Paper>
);

// Chart Card Component with Bar Chart
const BarChartCard = ({ title, subtitle, data, color, timeInfo }) => (
    <Paper sx={{
        p: 3,
        borderRadius: '16px',
        boxShadow: '0px 10px 30px rgba(0,0,0,0.08)',
        height: '100%',
        border: '1px solid #F4F7FE'
    }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2B3674', mb: 0.5 }}>
            {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#A3AED0', mb: 3, fontWeight: 600 }}>
            {subtitle}
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#A3AED0"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    stroke="#A3AED0"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0px 10px 30px rgba(0,0,0,0.1)',
                        fontWeight: 700
                    }}
                />
                <Bar
                    dataKey="value"
                    fill={color}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                />
            </BarChart>
        </ResponsiveContainer>
        {timeInfo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <Schedule sx={{ fontSize: 16, color: '#A3AED0' }} />
                <Typography sx={{ color: '#A3AED0', fontSize: '0.75rem', fontWeight: 600 }}>
                    {timeInfo}
                </Typography>
            </Box>
        )}
    </Paper>
);

// Line Chart Card Component
const LineChartCard = ({ title, subtitle, data, color, timeInfo }) => (
    <Paper sx={{
        p: 3,
        borderRadius: '16px',
        boxShadow: '0px 10px 30px rgba(0,0,0,0.08)',
        height: '100%',
        border: '1px solid #F4F7FE'
    }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2B3674', mb: 0.5 }}>
            {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#A3AED0', mb: 3, fontWeight: 600 }}>
            {subtitle}
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#A3AED0"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    stroke="#A3AED0"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0px 10px 30px rgba(0,0,0,0.1)',
                        fontWeight: 700
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={3}
                    dot={{ fill: color, r: 6, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                    fill={`url(#gradient-${color})`}
                />
            </LineChart>
        </ResponsiveContainer>
        {timeInfo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <Schedule sx={{ fontSize: 16, color: '#A3AED0' }} />
                <Typography sx={{ color: '#A3AED0', fontSize: '0.75rem', fontWeight: 600 }}>
                    {timeInfo}
                </Typography>
            </Box>
        )}
    </Paper>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        blocked: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin');
            const users = res.data;

            setStats({
                total: users.length,
                active: users.filter(u => u.status === 'ACTIVE').length,
                pending: users.filter(u => u.status === 'WAITING_APPROVAL').length,
                blocked: users.filter(u => u.status === 'LOCKED').length
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Weekly activity data (Bar Chart)
    const weeklyData = [
        { name: 'M', value: 45 },
        { name: 'T', value: 32 },
        { name: 'W', value: 38 },
        { name: 'T', value: 48 },
        { name: 'F', value: 55 },
        { name: 'S', value: 42 },
        { name: 'S', value: 50 }
    ];

    // Monthly sales data (Line Chart - Green)
    const monthlySalesData = [
        { name: 'Apr', value: 100 },
        { name: 'May', value: 150 },
        { name: 'Jun', value: 280 },
        { name: 'Jul', value: 400 },
        { name: 'Aug', value: 520 },
        { name: 'Sep', value: 380 },
        { name: 'Oct', value: 450 },
        { name: 'Nov', value: 500 },
        { name: 'Dec', value: 600 }
    ];

    // Completed tasks data (Line Chart - Dark)
    const completedTasksData = [
        { name: 'Apr', value: 200 },
        { name: 'May', value: 230 },
        { name: 'Jun', value: 280 },
        { name: 'Jul', value: 350 },
        { name: 'Aug', value: 450 },
        { name: 'Sep', value: 380 },
        { name: 'Oct', value: 420 },
        { name: 'Nov', value: 480 },
        { name: 'Dec', value: 550 }
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={800}>
            <Box>
                {/* Page Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#2B3674', mb: 0.5 }}>
                        Dashboard
                    </Typography>
                </Box>

                {/* Statistics Cards */}
                <Grid container spacing={4} sx={{ mb: 6 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Tổng số học viên"
                            value={0}
                            icon={<PeopleAlt />}
                            color="#2B3674"
                            bgColor="#F4F7FE"
                            trend="+55% than last week"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Học viên đợi phê duyệt"
                            value={0}
                            icon={<CheckCircle />}
                            color="#4318FF"
                            bgColor="#F4F7FE"
                            trend="+3% than last month"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Số học viên đang hoạt động"
                            value={0}
                            icon={<HowToReg />}
                            color="#05CD99"
                            bgColor="#F4F7FE"
                            trend="+1% than yesterday"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Số học viên đã khóa"
                            value={0}
                            icon={<Block />}
                            color="#EE5D50"
                            bgColor="#F4F7FE"
                            trend="Just updated"
                        />
                    </Grid>
                </Grid>

                {/* Charts Section */}
                <Grid container spacing={3}>
                    {/* Bar Chart */}
                    <Grid item xs={12} md={4}>
                        <BarChartCard
                            title="Website Views"
                            subtitle="Last Campaign Performance"
                            data={weeklyData}
                            color="#4318FF"
                            timeInfo="campaign sent 2 days ago"
                        />
                    </Grid>

                    {/* Line Chart - Green */}
                    <Grid item xs={12} md={4}>
                        <LineChartCard
                            title="Daily Sales"
                            subtitle="(+15%) increase in today sales."
                            data={monthlySalesData}
                            color="#05CD99"
                            timeInfo="updated 4 min ago"
                        />
                    </Grid>

                    {/* Line Chart - Dark */}
                    <Grid item xs={12} md={4}>
                        <LineChartCard
                            title="Completed Tasks"
                            subtitle="Last Campaign Performance"
                            data={completedTasksData}
                            color="#2B3674"
                            timeInfo="just updated"
                        />
                    </Grid>
                </Grid>
            </Box>
        </Fade>
    );
};

export default AdminDashboard;