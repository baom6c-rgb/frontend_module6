// src/features/admin/components/dashboard/AdminDashboardKpiCards.jsx
import React, { useMemo } from "react";
import { Box, Chip, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import {
    TrendingUpRounded,
    PeopleAltRounded,
    HowToRegRounded,
    BlockRounded,
} from "@mui/icons-material";

import { DASHBOARD_COLORS as COLORS, safeNumber } from "./dashboard.helpers";

/** ===== Utils ===== */
const fmtInt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");
const pct0 = (ratio) => `${Math.round(safeNumber(ratio, 0) * 100)}%`;

const tone = (t) => {
    if (t === "green") return { c: COLORS.success, bg: `${COLORS.success}14` };
    if (t === "red") return { c: COLORS.danger, bg: `${COLORS.danger}14` };
    if (t === "orange") return { c: COLORS.accentOrange, bg: `${COLORS.accentOrange}14` };
    if (t === "amber") return { c: COLORS.amber, bg: `${COLORS.amber}14` };
    // navy/neutral
    return { c: COLORS.primaryBlue, bg: `${COLORS.primaryBlue}12` };
};

/** ===== Shared shells ===== */
const SectionShell = ({ title, subtitle, children }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "20px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
        }}
    >
        <Box sx={{ px: 2.75, py: 2.25 }}>
            <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 18 }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 750, fontSize: 13 }}>
                    {subtitle}
                </Typography>
            ) : null}
        </Box>
        <Divider sx={{ borderColor: COLORS.border }} />
        <Box sx={{ p: 2.75 }}>{children}</Box>
    </Paper>
);

const BoxShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            height: "100%",
            borderRadius: "18px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.05)",
            overflow: "hidden",
            ...sx,
        }}
    >
        {children}
    </Paper>
);

/** ===== KPI card (compact) ===== */
const KpiCard = ({ title, value, icon, toneKey, hint }) => {
    const cfg = useMemo(() => tone(toneKey), [toneKey]);

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: "18px",
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.white,
                boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.05)",
                p: 2.25,
                height: "100%",
            }}
        >
            <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: 900 }}>
                        {title}
                    </Typography>

                    <Typography sx={{ mt: 0.5, color: COLORS.textPrimary, fontSize: 34, fontWeight: 950 }}>
                        {fmtInt(value)}
                    </Typography>

                    {hint ? (
                        <Chip
                            size="small"
                            label={hint}
                            sx={{
                                mt: 1,
                                height: 26,
                                borderRadius: "999px",
                                fontWeight: 900,
                                bgcolor: cfg.bg,
                                color: cfg.c,
                                border: `1px solid ${COLORS.border}`,
                            }}
                        />
                    ) : null}
                </Box>

                <Box
                    sx={{
                        width: 86,
                        height: 46,
                        borderRadius: "16px",
                        bgcolor: cfg.bg,
                        border: `1px solid ${COLORS.border}`,
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                    }}
                >
                    {React.cloneElement(icon, { sx: { fontSize: 26, color: cfg.c } })}
                </Box>
            </Stack>
        </Paper>
    );
};

/** ===== Donut + Legend (attempt-based) ===== */
const ResultDonut = ({ total, pass, fail, passRate, failRate }) => {
    const safeTotal = Math.max(1, safeNumber(total, 0));
    const safePass = Math.max(0, safeNumber(pass, 0));
    const safeFail = Math.max(0, safeNumber(fail, 0));
    const other = Math.max(0, safeTotal - safePass - safeFail);

    const passDeg = (safePass / safeTotal) * 360;
    const otherDeg = (other / safeTotal) * 360;

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
                }}
            >
                <Box
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: "999px",
                        bgcolor: COLORS.white,
                        border: `1px solid ${COLORS.border}`,
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        px: 1,
                    }}
                >
                    <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 34, lineHeight: 1 }}>
                        {fmtInt(total)}
                    </Typography>
                    <Typography sx={{ mt: 0.3, color: COLORS.textSecondary, fontWeight: 850, fontSize: 12 }}>
                        Tổng số bài làm
                    </Typography>
                </Box>
            </Box>

            {/* Legend box bo tròn đẹp */}
            <Box
                sx={{
                    width: "100%",
                    flex: 1,
                    borderRadius: "16px",
                    bgcolor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    p: 1.75,
                }}
            >
                <Stack spacing={1.2}>
                    <LegendRow color={COLORS.success} label="Số bài Đạt" value={safePass} />
                    <LegendRow color={COLORS.danger} label="Số bài Trượt" value={safeFail} />
                </Stack>

                <Box sx={{ mt: 1.5 }}>
                    <Chip
                        size="small"
                        label={`Tỉ lệ đạt: ${pct0(passRate)} • Tỉ lệ trượt: ${pct0(failRate)}`}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: COLORS.white,
                            border: `1px solid ${COLORS.border}`,
                            fontWeight: 900,
                            color: COLORS.textSecondary,
                        }}
                    />
                </Box>
            </Box>
        </Stack>
    );
};

const LegendRow = ({ color, label, value }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "999px", bgcolor: color }} />
            <Typography sx={{ fontWeight: 850, color: COLORS.textPrimary, fontSize: 13 }}>
                {label}
            </Typography>
        </Stack>
        <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 14 }}>
            {fmtInt(value)}
        </Typography>
    </Stack>
);

/** ===== Main ===== */
export default function AdminDashboardKpiCards({ overview }) {
    // Attempt-based numbers (bám filter)
    const totalAttempts = safeNumber(overview?.totalAttempts, 0);
    const totalStudents = safeNumber(overview?.totalStudents, 0);

    const passRate = safeNumber(overview?.passRate, 0);
    const failRate = safeNumber(overview?.failRate, 0);

    // counts from rates (không đổi logic hiện có)
    const passCount = Math.round(totalAttempts * passRate);
    const failCount = Math.round(totalAttempts * failRate);

    return (
        <SectionShell
            title="Hoạt động học tập"
            subtitle="Tổng quan về học viên và kết quả học tập"
        >
            {/* 1 row / 2 boxes */}
            <Grid container spacing={3} alignItems="stretch">
                {/* Box A (left) - KPI cards 2x2 */}
                <Grid item xs={12} md={7}>
                    <BoxShell sx={{ p: 2.25 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <KpiCard
                                    title="Tổng số bài làm"
                                    value={totalAttempts}
                                    icon={<TrendingUpRounded />}
                                    toneKey="blue"
                                    hint="Total Exams"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <KpiCard
                                    title="Số học viên hoạt động"
                                    value={totalStudents}
                                    icon={<PeopleAltRounded />}
                                    toneKey="orange"
                                    hint="Students Activities"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <KpiCard
                                    title="Số bài Đạt"
                                    value={passCount}
                                    icon={<HowToRegRounded />}
                                    toneKey="green"
                                    hint={pct0(passRate)}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <KpiCard
                                    title="Số bài Trượt"
                                    value={failCount}
                                    icon={<BlockRounded />}
                                    toneKey="red"
                                    hint={pct0(failRate)}
                                />
                            </Grid>
                        </Grid>
                    </BoxShell>
                </Grid>

                {/* Box B (right) - Result donut + legend */}
                <Grid item xs={12} md={5}>
                    <BoxShell sx={{ p: 2.25 }}>
                        <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 16 }}>
                            🎯 Tỷ lệ kết quả làm bài của học viên
                        </Typography>
                        <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 750, fontSize: 13 }}>
                            Phân loại theo kết quả làm bài (Đạt / Trượt)
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <ResultDonut
                                total={totalAttempts}
                                pass={passCount}
                                fail={failCount}
                                passRate={passRate}
                                failRate={failRate}
                            />
                        </Box>
                    </BoxShell>
                </Grid>
            </Grid>
        </SectionShell>
    );
}
