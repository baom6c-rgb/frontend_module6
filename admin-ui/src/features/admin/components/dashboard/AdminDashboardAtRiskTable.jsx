// src/features/admin/components/dashboard/AdminDashboardAtRiskTable.jsx
import React, { useMemo } from "react";
import {
    Paper,
    Box,
    Divider,
    Stack,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Button,
} from "@mui/material";
import { WarningAmberRounded } from "@mui/icons-material";

import {
    ReportProblemRounded,
    InfoRounded,
    CheckCircleRounded,
} from "@mui/icons-material";

import {
    DASHBOARD_COLORS as COLORS,
    safeNumber,
    fmtInt,
    mapRiskLevel,
} from "./dashboard.helpers";

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

/**
 * Sort theo "nguy hiểm -> đạt"
 * - ưu tiên riskScore (desc)
 * - sau đó riskLevel (desc)
 * - sau đó avgScore (asc)
 * - sau đó passRate (asc)
 */
const riskLevelRank = (riskLevel) => {
    const k = String(riskLevel || "").trim().toUpperCase();
    if (["CRITICAL", "VERY_HIGH", "SEVERE"].includes(k)) return 5;
    if (["HIGH"].includes(k)) return 4;
    if (["MEDIUM"].includes(k)) return 3;
    if (["LOW"].includes(k)) return 2;
    if (["SAFE", "OK", "PASS"].includes(k)) return 1;
    return 0;
};

/**
 * ✅ Chuẩn hoá mức độ từ dữ liệu BE/FE:
 * - Ưu tiên riskLevel (TOT/TRUNG_BINH/YEU) nếu có
 * - Nếu không có, fallback theo tone từ helper (red/amber/green hoặc danger/warning/safe)
 */
const resolveSeverity = (riskLevel, helperTone) => {
    const lv = String(riskLevel || "").trim().toUpperCase();
    if (lv === "YEU") return "danger";
    if (lv === "TRUNG_BINH") return "warning";
    if (lv === "TOT") return "safe";

    const t = String(helperTone || "").trim().toLowerCase();
    if (t === "danger" || t === "red") return "danger";
    if (t === "warning" || t === "amber" || t === "yellow") return "warning";
    if (t === "safe" || t === "green") return "safe";
    return "safe";
};

const severityLabelVi = (sev) => {
    if (sev === "danger") return "Nguy hiểm";
    if (sev === "warning") return "Cần chú ý";
    return "Đạt";
};

const severityIcon = (sev, sx) => {
    if (sev === "danger") return <ReportProblemRounded sx={sx} />;
    if (sev === "warning") return <InfoRounded sx={sx} />;
    return <CheckCircleRounded sx={sx} />;
};

/**
 * ✅ Màu sắc đồng bộ progress + badge (ưu tiên dùng COLORS nếu có)
 */
const paletteBySeverity = (sev) => {
    const red = COLORS.red || "#dc2626";
    const amber = COLORS.amber || "#d97706";
    const green = COLORS.green || "#16a34a";

    const redBg = "#fef2f2";
    const amberBg = "#fffbeb";
    const greenBg = "#f0fdf4";

    if (sev === "danger") return { c: red, bg: redBg };
    if (sev === "warning") return { c: amber, bg: amberBg };
    return { c: green, bg: greenBg };
};

export default function AdminDashboardAtRiskTable({ students = [], onSelect }) {
    const rows = useMemo(() => {
        const arr = Array.isArray(students) ? [...students] : [];
        arr.sort((a, b) => {
            const aRiskScore = safeNumber(a?.riskScore, 0);
            const bRiskScore = safeNumber(b?.riskScore, 0);
            if (bRiskScore !== aRiskScore) return bRiskScore - aRiskScore;

            const aRank = riskLevelRank(a?.riskLevel);
            const bRank = riskLevelRank(b?.riskLevel);
            if (bRank !== aRank) return bRank - aRank;

            const aAvg = safeNumber(a?.avgScore, 0);
            const bAvg = safeNumber(b?.avgScore, 0);
            if (aAvg !== bAvg) return aAvg - bAvg;

            const aPass = safeNumber(
                a?.passRate,
                a?.failRate != null ? 1 - safeNumber(a?.failRate, 0) : 0
            );
            const bPass = safeNumber(
                b?.passRate,
                b?.failRate != null ? 1 - safeNumber(b?.failRate, 0) : 0
            );
            return aPass - bPass;
        });
        return arr;
    }, [students]);

    return (
        <CardShell>
            <Box sx={{ px: 2.75, py: 2.25 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 16 }}>
                            ⚠️ Danh sách học viên đã làm bài
                        </Typography>
                        <Typography sx={{ mt: 0.4, color: COLORS.textSecondary, fontWeight: 700, fontSize: 13 }}>
                            Sắp xếp theo mức độ rủi ro (nguy hiểm → đạt). Chỉ bấm “Xem chi tiết” để mở ngăn kéo.
                        </Typography>
                    </Box>

                    <Chip
                        icon={<WarningAmberRounded sx={{ fontSize: 18, color: COLORS.amber }} />}
                        label={`${fmtInt(rows.length)} học viên`}
                        sx={{
                            borderRadius: "999px",
                            bgcolor: `${COLORS.amber}12`,
                            border: `1px solid ${COLORS.border}`,
                            fontWeight: 900,
                            color: COLORS.textPrimary,
                        }}
                    />
                </Stack>
            </Box>

            <Divider sx={{ borderColor: COLORS.border }} />

            <Box sx={{ p: 2.5 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 60 }}
                                >
                                    STT
                                </TableCell>

                                <TableCell sx={{ fontWeight: 950, color: COLORS.textSecondary }}>
                                    Học viên
                                </TableCell>

                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 120 }}
                                >
                                    Bài làm
                                </TableCell>

                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 120 }}
                                >
                                    Điểm TB
                                </TableCell>

                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 140 }}
                                >
                                    Tiến độ
                                </TableCell>

                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 170 }}
                                >
                                    Mức độ
                                </TableCell>

                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: 950, color: COLORS.textSecondary, width: 140 }}
                                >
                                    Chi tiết
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ color: COLORS.textSecondary, fontWeight: 800 }}>
                                        Chưa có dữ liệu theo bộ lọc hiện tại.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((u, idx) => {
                                    // helper (để không đụng business logic cũ)
                                    const { tone: helperTone } = mapRiskLevel(u?.riskLevel);

                                    // ✅ severity chuẩn hoá (fix lỗi “nguy hiểm mà hiện đạt”)
                                    const sev = resolveSeverity(u?.riskLevel, helperTone);
                                    const pal = paletteBySeverity(sev);

                                    // ✅ Tiến độ = passRate (fallback = 1 - failRate)
                                    const attemptsCount = safeNumber(u?.attemptsCount, safeNumber(u?.attempts, 0));
                                    const avgScore = safeNumber(u?.avgScore, 0);

                                    const passRate = safeNumber(
                                        u?.passRate,
                                        u?.failRate != null ? 1 - safeNumber(u?.failRate, 0) : 0
                                    );

                                    const progressPct = Math.max(0, Math.min(100, Math.round(passRate * 100)));

                                    return (
                                        <TableRow
                                            key={u.userId ?? `${u.email ?? "row"}_${idx}`}
                                            hover
                                            sx={{ cursor: "default" }}
                                        >
                                            <TableCell align="center" sx={{ fontWeight: 900 }}>
                                                {idx + 1}
                                            </TableCell>

                                            <TableCell>
                                                <Stack spacing={0.2}>
                                                    <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary }}>
                                                        {u.fullName || "(Chưa có tên)"}
                                                    </Typography>
                                                    <Typography sx={{ fontWeight: 700, color: COLORS.textSecondary, fontSize: 12 }}>
                                                        {u.email || "-"}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>

                                            <TableCell align="center" sx={{ fontWeight: 900 }}>
                                                {fmtInt(attemptsCount)}
                                            </TableCell>

                                            <TableCell align="center" sx={{ fontWeight: 900 }}>
                                                {avgScore.toFixed(1)}
                                            </TableCell>

                                            {/* ✅ TIẾN ĐỘ: progress bar + % (màu theo mức độ) */}
                                            <TableCell align="center">
                                                <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                    <Box
                                                        sx={{
                                                            width: 110,
                                                            height: 9,
                                                            borderRadius: 999,
                                                            bgcolor: `${COLORS.border}90`,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                height: "100%",
                                                                width: `${progressPct}%`,
                                                                bgcolor: pal.c,
                                                                borderRadius: 999,
                                                                transition: "width .25s ease",
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 900, color: COLORS.textSecondary }}>
                                                        {progressPct}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            {/* ✅ MỨC ĐỘ: badge mới đúng mockup (icon + nền nhạt + chữ đậm) */}
                                            <TableCell align="center">
                                                <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                    <Box
                                                        sx={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 0.7,
                                                            px: 1.25,
                                                            py: 0.55,
                                                            borderRadius: 999,
                                                            bgcolor: pal.bg,
                                                            border: `1px solid ${COLORS.border}`,
                                                        }}
                                                    >
                                                        {severityIcon(sev, { fontSize: 18, color: pal.c })}
                                                        <Typography sx={{ fontWeight: 950, color: pal.c, fontSize: 13 }}>
                                                            {severityLabelVi(sev)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        borderRadius: "10px",
                                                        borderColor: COLORS.border,
                                                        color: COLORS.textPrimary,
                                                        fontWeight: 900,
                                                        textTransform: "none",
                                                        bgcolor: COLORS.white,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelect?.(u);
                                                    }}
                                                >
                                                    Xem chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </CardShell>
    );
}
