// src/features/practice/components/page/PracticeReadyStartPanel.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    CheckCircleRounded,
    PlayArrowRounded,
    RestartAltRounded,
} from "@mui/icons-material";

const COLORS = {
    primary: "#2E2D84",
    primaryDeep: "#1E1D6F",

    orange: "#EC5E32",
    orangeDeep: "#D5522B",

    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    success: "#10B981",
};

const toPositiveIntOrNull = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

const toPositiveNumberOrNull = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export default function PracticeReadyStartPanel({
                                                    questionCount,
                                                    durationMinutes,

                                                    // ✅ Flow mới: READY tin server -> prop này giữ để không phá nơi gọi cũ
                                                    // nhưng không dùng để tính toán nữa
                                                    minutesPerQuestion,

                                                    loading = false,

                                                    onStart,
                                                    onReset,
                                                }) {
    // ✅ READY chỉ vào khi generate xong (server trả về count + duration)
    const safeCount = useMemo(() => toPositiveIntOrNull(questionCount) ?? 0, [questionCount]);

    const uiDuration = useMemo(() => {
        const d = toPositiveNumberOrNull(durationMinutes);
        if (d == null) return null;
        return Math.max(1, Math.ceil(d));
    }, [durationMinutes]);

    const canStart = useMemo(() => !loading && safeCount > 0 && uiDuration != null, [loading, safeCount, uiDuration]);

    const showWarning = useMemo(
        () => !loading && (safeCount <= 0 || uiDuration == null),
        [loading, safeCount, uiDuration]
    );

    const handleStart = () => {
        if (!canStart) return;
        onStart?.();
    };

    const handleReset = () => {
        if (loading) return;
        onReset?.();
    };

    return (
        <Box sx={{ width: "100%" }}>
            {/* Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDeep} 100%)`,
                    borderRadius: "18px 18px 0 0",
                    px: 3,
                    py: 2.25,
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: -40,
                        right: -40,
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.10)",
                    },
                }}
            >
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.14)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
                            flex: "0 0 auto",
                        }}
                    >
                        <CheckCircleRounded sx={{ color: "#fff", fontSize: 22 }} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                            Đã tạo xong đề thi
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.86)", mt: 0.3 }}>
                            Đề thi đã sẵn sàng. Chúc bạn làm bài thật tốt nhé !
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Body */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: "0 0 18px 18px",
                    border: `1px solid ${COLORS.border}`,
                    borderTop: "none",
                    p: 3,
                    bgcolor: "#fff",
                }}
            >
                {/* Info */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 16,
                        border: `1px solid ${COLORS.border}`,
                        background: `linear-gradient(135deg, ${alpha(COLORS.primary, 0.06)} 0%, ${alpha(COLORS.orange, 0.06)} 100%)`,
                        p: 2,
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: alpha(COLORS.success, 0.12),
                                border: `1px solid ${alpha(COLORS.success, 0.22)}`,
                                flex: "0 0 auto",
                            }}
                        >
                            <CheckCircleRounded sx={{ color: COLORS.success, fontSize: 20 }} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: COLORS.textPrimary }}>
                                Đề đã sẵn sàng
                            </Typography>

                            <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, mt: 0.35 }}>
                                Số câu: <b>{safeCount > 0 ? safeCount : "—"}</b> · Thời gian:{" "}
                                <b>{uiDuration != null ? `${uiDuration} phút` : "—"}</b>
                            </Typography>

                            {showWarning && (
                                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 0.6 }}>
                                    Thiếu dữ liệu đề từ server (số câu / thời gian). Hãy bấm “Đổi học liệu” và tạo đề lại.
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </Paper>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.25}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStart}
                        disabled={!canStart}
                        startIcon={<PlayArrowRounded />}
                        sx={{
                            borderRadius: 3,
                            fontWeight: 900,
                            bgcolor: COLORS.orange,
                            "&:hover": { bgcolor: COLORS.orangeDeep },
                            py: 1.1,
                        }}
                    >
                        Bắt đầu làm bài
                    </Button>

                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleReset}
                        disabled={loading}
                        startIcon={<RestartAltRounded />}
                        sx={{
                            borderRadius: 3,
                            fontWeight: 900,
                            py: 1.05,
                        }}
                    >
                        Đổi học liệu
                    </Button>

                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, textAlign: "center", mt: 0.5 }}>
                        * Khi bắt đầu làm bài, câu hỏi sẽ hiển thị và bắt đầu tính thời gian.
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
