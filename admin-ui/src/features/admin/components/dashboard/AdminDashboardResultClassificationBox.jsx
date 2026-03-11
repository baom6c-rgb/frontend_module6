// src/features/admin/components/dashboard/AdminDashboardResultClassificationBox.jsx
import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { DASHBOARD_COLORS as COLORS, safeNumber } from "./dashboard.helpers";

/** Utils */
const fmtInt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");
const pct0 = (ratio) => `${Math.round(safeNumber(ratio, 0) * 100)}%`;

const OverviewBoxShell = ({ title, subtitle, children }) => (
    <Paper
        elevation={0}
        sx={{
            background: "#fff",
            borderRadius: { xs: "16px", md: "20px" },
            boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            width: "100%",
            border: "1px solid #f0f0f0",
            px: { xs: "16px", sm: "20px", md: "24px" },
            py: { xs: "14px", sm: "16px" },
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
        }}
    >
        <Box sx={{ mb: { xs: "6px", md: "8px" }, flexShrink: 0 }}>
            <Typography
                sx={{
                    fontSize: { xs: "18px", sm: "20px", md: "22px" },
                    fontWeight: 700,
                    color: "#1a1a1a",
                    mb: "4px",
                }}
            >
                {title}
            </Typography>

            {subtitle ? (
                <Typography
                    sx={{
                        fontSize: { xs: "12px", sm: "13px", md: "14px" },
                        color: "#64748b",
                        fontWeight: 500,
                    }}
                >
                    {subtitle}
                </Typography>
            ) : null}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
            {children}
        </Box>
    </Paper>
);

const LegendRow = ({ color, label, value }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: { xs: 8, md: 10 }, height: { xs: 8, md: 10 }, borderRadius: "999px", bgcolor: color }} />
            <Typography
                sx={{
                    fontSize: { xs: "12px", sm: "13px", md: "14px" },
                    fontWeight: 600,
                    color: "#1a1a1a",
                }}
            >
                {label}
            </Typography>
        </Stack>

        <Typography
            sx={{
                fontSize: { xs: "12px", sm: "13px", md: "14px" },
                fontWeight: 700,
                color: "#1a1a1a",
            }}
        >
            {fmtInt(value)}
        </Typography>
    </Stack>
);

const ResultDonut = ({ total, pass, fail, passRate, failRate, other }) => {
    const safeTotal = Math.max(1, safeNumber(total, 0));
    const safePass = Math.max(0, safeNumber(pass, 0));
    const safeFail = Math.max(0, safeNumber(fail, 0));
    const safeOther = Math.max(0, safeNumber(other, 0));

    const passDeg = (safePass / safeTotal) * 360;
    const otherDeg = (safeOther / safeTotal) * 360;

    const ringBg = `conic-gradient(
    ${COLORS.success} 0deg ${passDeg}deg,
    ${COLORS.amber} ${passDeg}deg ${passDeg + otherDeg}deg,
    ${COLORS.danger} ${passDeg + otherDeg}deg 360deg
  )`;

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 2.25 }}
            alignItems="center"
            sx={{ width: "100%" }}
        >
            {/* Donut */}
            <Box
                sx={{
                    width: { xs: 130, sm: 140, md: 160 },
                    height: { xs: 130, sm: 140, md: 160 },
                    borderRadius: "999px",
                    background: ringBg,
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0px 18px 35px rgba(15, 23, 42, 0.12)",
                    flexShrink: 0,
                }}
            >
                <Box
                    sx={{
                        width: { xs: 90, sm: 98, md: 110 },
                        height: { xs: 90, sm: 98, md: 110 },
                        borderRadius: "999px",
                        bgcolor: "#fff",
                        border: "1px solid #f0f0f0",
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        px: 1,
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            color: "#1a1a1a",
                            fontSize: { xs: 28, sm: 30, md: 34 },
                            lineHeight: 1,
                        }}
                    >
                        {fmtInt(total)}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 0.3,
                            color: "#64748b",
                            fontWeight: 500,
                            fontSize: { xs: 10, md: 11 },
                        }}
                    >
                        Tổng số bài
                    </Typography>
                </Box>
            </Box>

            {/* Legend box */}
            <Box
                sx={{
                    width: "100%",
                    flex: 1,
                    borderRadius: { xs: "14px", md: "16px" },
                    bgcolor: "#fafafa",
                    border: "1px solid #f0f0f0",
                    p: { xs: "14px", md: "16px" },
                    minWidth: 0,
                }}
            >
                <Stack spacing={{ xs: 1, md: 1.2 }}>
                    <LegendRow color={COLORS.success} label="Đạt" value={safePass} />
                    <LegendRow color={COLORS.danger} label="Trượt" value={safeFail} />
                </Stack>

                <Box sx={{ mt: { xs: 1.25, md: 1.5 } }}>
                    <Chip
                        size="small"
                        label={`Tỉ lệ đạt: ${pct0(passRate)} • Tỉ lệ trượt: ${pct0(failRate)}`}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: "#fff",
                            border: "1px solid #f0f0f0",
                            fontWeight: 700,
                            color: "#64748b",
                            fontSize: { xs: "11px", sm: "12px" },
                        }}
                    />
                </Box>
            </Box>
        </Stack>
    );
};

export default function AdminDashboardResultClassificationBox({ overview, metrics }) {
    const totalAttempts = metrics?.totalAttempts ?? safeNumber(overview?.totalAttempts, 0);

    const passRate = metrics?.passRate ?? safeNumber(overview?.passRate, 0);
    const failRate = metrics?.failRate ?? safeNumber(overview?.failRate, 0);

    const passCount =
        metrics?.passCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(passRate, 0));
    const failCount =
        metrics?.failCount ?? Math.round(safeNumber(totalAttempts, 0) * safeNumber(failRate, 0));

    const otherCount =
        metrics?.otherCount ?? Math.max(0, safeNumber(totalAttempts, 0) - passCount - failCount);

    return (
        <OverviewBoxShell title="Biểu đồ thống kê kết quả học tập" subtitle="Thống kê số bài Đạt và số bài Trượt">
            <ResultDonut
                total={totalAttempts}
                pass={passCount}
                fail={failCount}
                other={otherCount}
                passRate={passRate}
                failRate={failRate}
            />
        </OverviewBoxShell>
    );
}