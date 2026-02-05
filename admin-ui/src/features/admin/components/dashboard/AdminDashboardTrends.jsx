// src/features/admin/components/dashboard/AdminDashboardTrends.jsx
import React, { useMemo } from "react";
import { Grid, Paper, Box, Divider, Stack, Typography } from "@mui/material";
import { ScheduleRounded } from "@mui/icons-material";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { DASHBOARD_COLORS as COLORS, safeNumber } from "./dashboard.helpers";

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

const ChartHeader = ({ title, subtitle }) => (
    <Box sx={{ px: 2.75, py: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 16 }}>
                    {title}
                </Typography>
                <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 700, fontSize: 13 }}>
                    {subtitle}
                </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
                <ScheduleRounded sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                <Typography sx={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: 800 }}>
                    Theo khoảng lọc
                </Typography>
            </Stack>
        </Stack>
    </Box>
);

export default function AdminDashboardTrends({ timeSeries = [] }) {
    const attemptsData = useMemo(
        () =>
            (timeSeries || []).map((x) => ({
                name: x?.date || "",
                attempts: safeNumber(x?.attempts, 0),
                failRate: safeNumber(x?.failRate, 0),
            })),
        [timeSeries]
    );

    const passRateData = useMemo(
        () =>
            (timeSeries || []).map((x) => ({
                name: x?.date || "",
                passRate: Math.max(0, 1 - safeNumber(x?.failRate, 0)),
            })),
        [timeSeries]
    );

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <CardShell sx={{ height: "100%" }}>
                    <ChartHeader
                        title="Số lần làm bài tính theo ngày"
                        subtitle="Cường độ học tập và làm bài tăng/giảm theo thời gian"
                    />
                    <Divider sx={{ borderColor: COLORS.border }} />
                    <Box sx={{ p: 2.5 }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={attemptsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                                <XAxis dataKey="name" stroke={COLORS.textSecondary} axisLine={false} tickLine={false} />
                                <YAxis stroke={COLORS.textSecondary} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (name === "attempts") return [value, "Tổng bài làm"];
                                        return [value, name];
                                    }}
                                    contentStyle={{
                                        backgroundColor: COLORS.white,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: 12,
                                        boxShadow: "0px 18px 30px rgba(15, 23, 42, 0.12)",
                                        fontWeight: 800,
                                    }}
                                />
                                <Bar dataKey="attempts" fill={COLORS.primaryBlue} radius={[10, 10, 0, 0]} maxBarSize={46} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </CardShell>
            </Grid>

            <Grid item xs={12} md={6}>
                <CardShell sx={{ height: "100%" }}>
                    <ChartHeader
                        title="Tỷ lệ bài Đạt theo ngày"
                        subtitle="Tỷ lệ bài Đạt trên tổng số bài làm của học viên"
                    />
                    <Divider sx={{ borderColor: COLORS.border }} />
                    <Box sx={{ p: 2.5 }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={passRateData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                                <XAxis dataKey="name" stroke={COLORS.textSecondary} axisLine={false} tickLine={false} />
                                <YAxis
                                    stroke={COLORS.textSecondary}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                                    domain={[0, 1]}
                                />
                                <Tooltip
                                    formatter={(v) => [`${Math.round(safeNumber(v, 0) * 100)}%`, "Tỉ lệ đạt"]}
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
                                    dataKey="passRate"
                                    stroke={COLORS.accentOrange}
                                    strokeWidth={3}
                                    dot={{ r: 5, fill: COLORS.accentOrange, stroke: "#fff", strokeWidth: 2 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </CardShell>
            </Grid>
        </Grid>
    );
}
