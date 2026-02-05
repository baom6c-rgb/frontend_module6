// src/features/admin/components/dashboard/AdminDashboardResultClassificationBox.jsx
import React from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { DASHBOARD_COLORS as COLORS, safeNumber } from "./dashboard.helpers";

/** ===== Utils ===== */
const fmtInt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");
const pct0 = (ratio) => `${Math.round(safeNumber(ratio, 0) * 100)}%`;

const OverviewBoxShell = ({ title, subtitle, children }) => (
    <Paper
        elevation={0}
        sx={{
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            width: "100%",
            border: "1px solid #f0f0f0",
            // ✅ bỏ padding “phình ngang + thừa trắng”
            px: { xs: "20px", md: "24px" },
            py: "20px",
            height: "100%", // ✅ stretch
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
        }}
    >
        <Box sx={{ mb: "18px", flexShrink: 0 }}>
            <Typography sx={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", mb: "6px" }}>
                {title}
            </Typography>

            {subtitle ? (
                <Typography sx={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                    {subtitle}
                </Typography>
            ) : null}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 280 }}>
            {children}
        </Box>
    </Paper>
);

const LegendRow = ({ color, label, value }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "999px", bgcolor: color }} />
            <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                {label}
            </Typography>
        </Stack>

        <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.25} alignItems="center">
            {/* Donut */}
            <Box
                sx={{
                    width: 220,
                    height: 220,
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
                        width: 140,
                        height: 140,
                        borderRadius: "999px",
                        bgcolor: "#fff",
                        border: "1px solid #f0f0f0",
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        px: 1,
                    }}
                >
                    <Typography sx={{ fontWeight: 700, color: "#1a1a1a", fontSize: 34, lineHeight: 1 }}>
                        {fmtInt(total)}
                    </Typography>
                    <Typography sx={{ mt: 0.3, color: "#64748b", fontWeight: 500, fontSize: 12 }}>
                        Tổng bài làm
                    </Typography>
                </Box>
            </Box>

            {/* Legend box */}
            <Box
                sx={{
                    width: "100%",
                    flex: 1,
                    borderRadius: "16px",
                    bgcolor: "#fafafa",
                    border: "1px solid #f0f0f0",
                    p: "16px",
                    minWidth: 0,
                }}
            >
                <Stack spacing={1.2}>
                    <LegendRow color={COLORS.success} label="Đạt" value={safePass} />
                    <LegendRow color={COLORS.danger} label="Trượt" value={safeFail} />
                    <LegendRow color={COLORS.amber} label="Khác (hiếm)" value={safeOther} />
                </Stack>

                <Box sx={{ mt: 1.5 }}>
                    <Chip
                        size="small"
                        label={`Tỉ lệ đạt: ${pct0(passRate)} • Tỉ lệ trượt: ${pct0(failRate)}`}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: "#fff",
                            border: "1px solid #f0f0f0",
                            fontWeight: 700,
                            color: "#64748b",
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
        <OverviewBoxShell title="Phân loại kết quả" subtitle="Biểu đồ Donut + Legend (bám theo bộ lọc)">
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
