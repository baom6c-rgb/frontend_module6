// src/features/admin/components/dashboard/StudentQuickDrawer.jsx
import React, { useMemo, useState } from "react";
import {
    Drawer,
    Box,
    Stack,
    Typography,
    Divider,
    IconButton,
    Avatar,
    LinearProgress,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CloseRounded } from "@mui/icons-material";

import {
    DASHBOARD_COLORS as COLORS,
    safeNumber,
    fmtInt,
    mapRiskLevel,
    toneToChipStyle,
} from "./dashboard.helpers";

import AdminDashboardAiInsightPanel from "./AdminDashboardAiInsightPanel";

const getInitials = (nameOrEmail) => {
    const s = String(nameOrEmail || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const avatarBgByTone = (tone) => {
    if (tone === "danger") return "#dc2626";
    if (tone === "warning") return "#d97706";
    if (tone === "safe") return "#16a34a";
    return "#2E2D84";
};

const Placeholder = ({ children }) => (
    <Typography sx={{ color: COLORS.textSecondary, fontWeight: 800 }}>{children}</Typography>
);

export default function StudentQuickDrawer({ open, onClose, student, filters }) {
    const theme = useTheme();
    const downSm = useMediaQuery(theme.breakpoints.down("sm"));

    // cache AI theo từng userId để đổi qua lại học viên không bị gọi lại
    const [aiCache, setAiCache] = useState({});

    const studentKey = useMemo(() => String(student?.userId ?? ""), [student?.userId]);
    const cached = studentKey ? aiCache[studentKey] : null;

    const summary = useMemo(() => {
        if (!student) return null;

        const attemptsCount = safeNumber(student?.attemptsCount, safeNumber(student?.attempts, 0));
        const avgScore = safeNumber(student?.avgScore, 0);

        // BE đã có failRate (0..1). passRate có thể null.
        const failRate = safeNumber(student?.failRate, 0);
        const passRate = safeNumber(student?.passRate, Math.max(0, Math.min(1, 1 - failRate)));

        // ✅ FE-only counts (ước lượng theo rate)
        const failedCount = attemptsCount > 0 ? Math.round(attemptsCount * failRate) : 0;
        const passedCount = Math.max(0, attemptsCount - failedCount);

        const { label, tone } = mapRiskLevel(student?.riskLevel);
        const chip = toneToChipStyle(tone, COLORS);

        return { attemptsCount, avgScore, passRate, failRate, passedCount, failedCount, label, chip, tone };
    }, [student]);

    const kpiCardBaseSx = {
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        textAlign: "center",
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: "100%", sm: 650 },
                    bgcolor: COLORS.white,
                    borderLeft: `1px solid ${COLORS.border}`,
                },
            }}
        >
            {/* Header (gradient) */}
            <Box
                sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1.75, sm: 2.25 },
                    color: "#fff",
                    background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 100%)`,
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 950, fontSize: 16, lineHeight: 1.15 }}>
                            Chi tiết học viên
                        </Typography>
                        <Typography sx={{ opacity: 0.85, fontWeight: 700, fontSize: 12, mt: 0.4 }}>
                            Tổng quan nhanh + AI feedback để ra quyết định
                        </Typography>
                    </Box>

                    <IconButton
                        onClick={onClose}
                        sx={{
                            border: "1px solid rgba(255,255,255,.25)",
                            bgcolor: "rgba(255,255,255,.08)",
                            color: "#fff",
                            "&:hover": { bgcolor: "rgba(255,255,255,.14)" },
                        }}
                    >
                        <CloseRounded />
                    </IconButton>
                </Stack>
            </Box>

            {/* Body */}
            <Box sx={{ p: { xs: 2, sm: 2.5 }, overflowY: "auto" }}>
                {!student ? (
                    <Placeholder>Chọn 1 học viên trong bảng để xem chi tiết.</Placeholder>
                ) : (
                    <Stack spacing={2}>
                        {/* Student identity */}
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                                sx={{
                                    width: 56,
                                    height: 56,
                                    fontWeight: 950,
                                    bgcolor: avatarBgByTone(summary?.tone),
                                }}
                            >
                                {getInitials(student?.fullName || student?.email)}
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: 16, lineHeight: 1.2 }}>
                                    {student.fullName || "(Chưa có tên)"}
                                </Typography>
                                <Typography sx={{ color: COLORS.textSecondary, fontWeight: 750, mt: 0.3 }} noWrap>
                                    {student.email || "-"}
                                </Typography>
                            </Box>
                        </Stack>

                        {/* KPI grid 2 cột, thêm 2 ô ĐẠT/TRƯỢT ngay dưới */}
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
                            {/* Tổng bài làm */}
                            <Box
                                sx={{
                                    ...kpiCardBaseSx,
                                    bgcolor: COLORS.bg,
                                }}
                            >
                                <Typography sx={{ fontWeight: 950, fontSize: 22, color: COLORS.textPrimary }}>
                                    {fmtInt(summary?.attemptsCount ?? 0)}
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                    BÀI LÀM
                                </Typography>
                            </Box>

                            {/* Điểm TB */}
                            <Box
                                sx={{
                                    ...kpiCardBaseSx,
                                    bgcolor: COLORS.bg,
                                }}
                            >
                                <Typography sx={{ fontWeight: 950, fontSize: 22, color: COLORS.textPrimary }}>
                                    {(summary?.avgScore ?? 0).toFixed(1)}
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                    ĐIỂM TB
                                </Typography>
                            </Box>

                            {/* ✅ Số bài đạt (xanh) */}
                            <Box
                                sx={{
                                    ...kpiCardBaseSx,
                                    bgcolor: COLORS.bg,
                                }}
                            >
                                <Typography sx={{ fontWeight: 950, fontSize: 22, color: COLORS.success }}>
                                    {fmtInt(summary?.passedCount ?? 0)}
                                </Typography>
                                <Typography sx={{ fontWeight: 900, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                    ĐÃ ĐẠT
                                </Typography>
                            </Box>

                            {/* ✅ Số bài trượt (đỏ) */}
                            <Box
                                sx={{
                                    ...kpiCardBaseSx,
                                    bgcolor: COLORS.bg,
                                }}
                            >
                                <Typography sx={{ fontWeight: 950, fontSize: 22, color: COLORS.danger }}>
                                    {fmtInt(summary?.failedCount ?? 0)}
                                </Typography>
                                <Typography sx={{ fontWeight: 900, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                    ĐÃ TRƯỢT
                                </Typography>
                            </Box>

                            {/* Tiến độ */}
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: COLORS.bg,
                                    border: `1px solid ${COLORS.border}`,
                                }}
                            >
                                <Stack spacing={0.8}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                        <Typography sx={{ fontWeight: 900, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                            TIẾN ĐỘ
                                        </Typography>
                                        <Typography sx={{ fontWeight: 950, fontSize: 12, color: COLORS.textPrimary }}>
                                            {Math.round((summary?.passRate ?? 0) * 100)}%
                                        </Typography>
                                    </Stack>

                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.max(0, Math.min(100, Math.round((summary?.passRate ?? 0) * 100)))}
                                        sx={{
                                            height: 8,
                                            borderRadius: 999,
                                            bgcolor: `${COLORS.border}80`,
                                            "& .MuiLinearProgress-bar": {
                                                borderRadius: 999,
                                                bgcolor: summary?.chip?.c ?? COLORS.navy,
                                            },
                                        }}
                                    />
                                </Stack>
                            </Box>

                            {/* Mức độ */}
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: summary?.chip?.bg ?? COLORS.bg,
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: "center",
                                }}
                            >
                                <Typography sx={{ fontWeight: 950, fontSize: 14, color: summary?.chip?.c ?? COLORS.textPrimary }}>
                                    {summary?.label ?? "-"}
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.4 }}>
                                    MỨC ĐỘ
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderColor: COLORS.border }} />

                        {/* AI Feedback */}
                        <AdminDashboardAiInsightPanel
                            student={student}
                            filters={filters}
                            cached={cached}
                            onCache={(next) => {
                                if (!studentKey) return;
                                setAiCache((prev) => ({ ...prev, [studentKey]: next }));
                            }}
                            dense={downSm}
                        />
                    </Stack>
                )}
            </Box>
        </Drawer>
    );
}
