// src/features/admin/components/dashboard/AdminDashboardKpiCards.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, Button, Stack } from "@mui/material";
import {
    TrendingUpRounded,
    PeopleAltRounded,
    HowToRegRounded,
    BlockRounded,
} from "@mui/icons-material";

import { safeNumber } from "./dashboard.helpers";

/** Utils */
const fmtInt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");
const pct0 = (ratio) => `${Math.round(safeNumber(ratio, 0) * 100)}%`;

/** UI VARIANTS */
const VARIANTS = {
    blue: { iconBg: "#e0f2fe", accent: "#0284c7" },
    orange: { iconBg: "#fff7ed", accent: "#ea580c" },
    green: { iconBg: "#dcfce7", accent: "#16a34a" },
    red: { iconBg: "#fee2e2", accent: "#dc2626" },
};

const KpiCard = ({ variant = "blue", label, value, meta, icon }) => {
    const v = useMemo(() => VARIANTS[variant] || VARIANTS.blue, [variant]);

    return (
        <Box
            sx={{
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                borderRadius: { xs: "14px", md: "16px" },
                padding: { xs: "14px", sm: "16px", md: "20px" },
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                minWidth: 0,
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: { xs: "13px", sm: "14px", md: "15px" },
                        color: "#64748b",
                        marginBottom: { xs: "10px", md: "12px" },
                        fontWeight: 500,
                        lineHeight: 1.4,
                    }}
                >
                    {label}
                </Typography>

                <Typography
                    sx={{
                        fontSize: { xs: "28px", sm: "32px", md: "38px" },
                        fontWeight: 700,
                        color: "#1a1a1a",
                        lineHeight: 1,
                        marginBottom: { xs: "8px", md: "10px" },
                    }}
                >
                    {fmtInt(value)}
                </Typography>

                <Typography
                    sx={{
                        fontSize: { xs: "12px", sm: "13px", md: "14px" },
                        fontWeight: 600,
                        padding: "4px 0",
                        color: v.accent,
                    }}
                >
                    {meta}
                </Typography>
            </Box>

            <Box
                sx={{
                    width: { xs: 44, sm: 50, md: 60 },
                    height: { xs: 44, sm: 50, md: 60 },
                    borderRadius: { xs: "12px", md: "14px" },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: { xs: "10px", sm: "12px", md: "14px" },
                    background: v.iconBg,
                }}
            >
                {icon}
            </Box>
        </Box>
    );
};

/** Main */
export default function AdminDashboardKpiCards({ overview, metrics, onJumpAtRisk }) {
    const totalAttempts = metrics?.totalAttempts ?? safeNumber(overview?.totalAttempts, 0);
    const totalStudents = metrics?.totalStudents ?? safeNumber(overview?.totalStudents, 0);

    const passRate = metrics?.passRate ?? safeNumber(overview?.passRate, 0);
    const failRate = metrics?.failRate ?? safeNumber(overview?.failRate, 0);

    const passCount = metrics?.passCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(passRate, 0));
    const failCount = metrics?.failCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(failRate, 0));

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: { xs: "16px", md: "18px" },
                border: "1px solid #f0f0f0",
                padding: { xs: 1.5, sm: 2, md: 2.5 },
                background: "#fff",
            }}
        >
            {/* Header */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: { xs: 1.25, md: 1.5 } }}
                spacing={1}
                flexWrap={{ xs: "wrap", sm: "nowrap" }}
            >
                <Typography
                    sx={{
                        fontWeight: 950,
                        color: "#1B2559",
                        fontSize: { xs: "15px", sm: "16px" },
                    }}
                >
                    Tổng quan nhanh
                </Typography>

                {typeof onJumpAtRisk === "function" ? (
                    <Button
                        size="small"
                        variant="text"
                        onClick={onJumpAtRisk}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            fontSize: { xs: "12px", sm: "13px" },
                        }}
                    >
                        Xem học viên
                    </Button>
                ) : null}
            </Stack>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: { xs: "12px", sm: "14px", md: "16px" },
                    minWidth: 0,
                }}
            >
                <KpiCard
                    variant="blue"
                    label="Tổng số bài làm"
                    value={totalAttempts}
                    meta="Total Exams"
                    icon={<TrendingUpRounded sx={{ fontSize: { xs: 24, md: 28 }, color: VARIANTS.blue.accent }} />}
                />

                <KpiCard
                    variant="orange"
                    label="Học viên hoạt động"
                    value={totalStudents}
                    meta="Students Activities"
                    icon={<PeopleAltRounded sx={{ fontSize: { xs: 24, md: 28 }, color: VARIANTS.orange.accent }} />}
                />

                <KpiCard
                    variant="green"
                    label="Số bài Đạt"
                    value={passCount}
                    meta={pct0(passRate)}
                    icon={<HowToRegRounded sx={{ fontSize: { xs: 24, md: 28 }, color: VARIANTS.green.accent }} />}
                />

                <KpiCard
                    variant="red"
                    label="Số bài Trượt"
                    value={failCount}
                    meta={pct0(failRate)}
                    icon={<BlockRounded sx={{ fontSize: { xs: 24, md: 28 }, color: VARIANTS.red.accent }} />}
                />
            </Box>
        </Paper>
    );
}