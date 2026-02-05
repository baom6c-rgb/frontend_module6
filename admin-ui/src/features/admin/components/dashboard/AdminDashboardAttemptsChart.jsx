// src/features/admin/components/dashboard/AdminDashboardAttemptsChart.jsx
import React, { useMemo } from "react";
import { Paper, Box, Divider, Stack, Typography } from "@mui/material";
import { ScheduleRounded } from "@mui/icons-material";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { DASHBOARD_COLORS as COLORS, safeNumber } from "./dashboard.helpers";

// Hàm format ngày tháng
const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};

const CardShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "18px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
            minWidth: 0,
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
                    Theo khoảng thời gian
                </Typography>
            </Stack>
        </Stack>
    </Box>
);

export default function AdminDashboardAttemptsChart({ timeSeries = [] }) {
    const attemptsData = useMemo(
        () =>
            (timeSeries || []).map((x) => ({
                name: x?.date || "",
                attempts: safeNumber(x?.attempts, 0),
                failRate: safeNumber(x?.failRate, 0),
            })),
        [timeSeries]
    );

    return (
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
                        <XAxis
                            dataKey="name"
                            stroke={COLORS.textSecondary}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={formatDate}
                            dy={10}
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis stroke={COLORS.textSecondary} axisLine={false} tickLine={false} />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === "attempts") return [value, "Tổng số bài làm"];
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
    );
}