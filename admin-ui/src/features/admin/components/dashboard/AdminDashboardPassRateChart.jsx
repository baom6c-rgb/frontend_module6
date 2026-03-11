// src/features/admin/components/dashboard/AdminDashboardPassRateChart.jsx
import React, { useMemo } from "react";
import { Paper, Box, Divider, Stack, Typography } from "@mui/material";
import { ScheduleRounded } from "@mui/icons-material";
import {
    ResponsiveContainer,
    LineChart,
    Line,
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

export default function AdminDashboardPassRateChart({ timeSeries = [] }) {
    const passRateData = useMemo(
        () =>
            (timeSeries || []).map((x) => ({
                name: x?.date || "",
                passRate: Math.max(0, 1 - safeNumber(x?.failRate, 0)),
            })),
        [timeSeries]
    );

    return (
        <CardShell sx={{ height: "100%" }}>
            <ChartHeader
                title="Tỷ lệ bài Đạt tính theo ngày"
                subtitle="Tỷ lệ bài Đạt trên tổng số bài làm của học viên"
            />
            <Divider sx={{ borderColor: COLORS.border }} />
            <Box sx={{ p: 2.5 }}>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={passRateData}>
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
    );
}