// src/features/admin/components/dashboard/AdminDashboardKpiCards.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
    TrendingUpRounded,
    PeopleAltRounded,
    HowToRegRounded,
    BlockRounded,
} from "@mui/icons-material";

import { safeNumber } from "./dashboard.helpers";

/** ===== Utils (GIỮ LOGIC) ===== */
const fmtInt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");
const pct0 = (ratio) => `${Math.round(safeNumber(ratio, 0) * 100)}%`;

/** ===== UI VARIANTS (GIỮ NGUYÊN) ===== */
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
                borderRadius: "16px",
                padding: { xs: "18px", md: "20px" }, // ✅ gọn hơn, tránh thừa trắng
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                minWidth: 0,
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: "15px",
                        color: "#64748b",
                        marginBottom: "12px",
                        fontWeight: 500,
                        lineHeight: 1.4,
                    }}
                >
                    {label}
                </Typography>

                <Typography
                    sx={{
                        fontSize: { xs: "34px", md: "38px" },
                        fontWeight: 700,
                        color: "#1a1a1a",
                        lineHeight: 1,
                        marginBottom: "10px",
                    }}
                >
                    {fmtInt(value)}
                </Typography>

                <Typography
                    sx={{
                        fontSize: "14px",
                        fontWeight: 600,
                        padding: "4px 0",
                        color: v.accent,
                    }}
                >
                    {meta}
                </Typography>
            </Box>

            {/* Icon Badge */}
            <Box
                sx={{
                    width: { xs: 52, md: 60 },
                    height: { xs: 52, md: 60 },
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: "14px",
                    background: v.iconBg,
                }}
            >
                {React.cloneElement(icon, {
                    sx: { fontSize: { xs: 24, md: 28 }, color: v.accent },
                })}
            </Box>
        </Box>
    );
};

/** ===== Main (GIỮ LOGIC + FLOW) ===== */
export default function AdminDashboardKpiCards({ overview, metrics }) {
    // ✅ ưu tiên metrics từ parent để đồng bộ
    const totalAttempts = metrics?.totalAttempts ?? safeNumber(overview?.totalAttempts, 0);
    const totalStudents = metrics?.totalStudents ?? safeNumber(overview?.totalStudents, 0);

    const passRate = metrics?.passRate ?? safeNumber(overview?.passRate, 0);
    const failRate = metrics?.failRate ?? safeNumber(overview?.failRate, 0);

    const passCount =
        metrics?.passCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(passRate, 0));
    const failCount =
        metrics?.failCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(failRate, 0));

    return (
        <Paper
            elevation={0}
            sx={{
                background: "#fff",
                borderRadius: "20px",
                px: { xs: "20px", md: "24px" }, // ✅ bỏ px 82px gây thừa trắng
                py: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                width: "100%",
                border: "1px solid #f0f0f0",
                height: "100%", // ✅ stretch
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
            }}
        >
            {/* Header */}
            <Box sx={{ marginBottom: "18px", flexShrink: 0 }}>
                <Typography sx={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
                    Tổng quan nhanh
                </Typography>
                <Typography sx={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                    KPI bám theo bộ lọc
                </Typography>
            </Box>

            {/* KPI Grid */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: { xs: "14px", md: "16px" },
                    flex: 1,
                    minHeight: 280, // ✅ tránh box bị “lõm”
                    alignContent: "start",
                    minWidth: 0,
                }}
            >
                <KpiCard
                    variant="blue"
                    label="Tổng bài làm"
                    value={totalAttempts}
                    meta="Trong khoảng lọc"
                    icon={<TrendingUpRounded />}
                />

                <KpiCard
                    variant="orange"
                    label="Học viên hoạt động"
                    value={totalStudents}
                    meta="Unique attempted"
                    icon={<PeopleAltRounded />}
                />

                <KpiCard
                    variant="green"
                    label="Đạt"
                    value={passCount}
                    meta={pct0(passRate)}
                    icon={<HowToRegRounded />}
                />

                <KpiCard
                    variant="red"
                    label="Trượt"
                    value={failCount}
                    meta={pct0(failRate)}
                    icon={<BlockRounded />}
                />
            </Box>
        </Paper>
    );
}
