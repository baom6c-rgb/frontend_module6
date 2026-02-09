// src/features/practice/components/page/PracticeIdleCreatePanel.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Button, Stack, Divider } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { PlayArrow } from "@mui/icons-material";

const COLORS = {
    primary: "#2E2D84",
    primaryDeep: "#1E1D6F",

    // ✅ đồng bộ accent project
    orange: "#EC5E32",
    orangeDeep: "#D5522B",

    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
};

const clampInt = (v, min = 1, max = 200) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
};

const toPositiveNumberOrNull = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export default function PracticeIdleCreatePanel({
                                                    questionCount,
                                                    durationMinutes, // fallback (không dùng làm source of truth khi có settings)
                                                    minutesPerQuestion, // ✅ lấy từ BE settings
                                                    onChangeQuestionCount,
                                                    onGenerate,
                                                    loading,
                                                    materialPresent,
                                                }) {
    const safeCount = useMemo(() => clampInt(questionCount, 1, 200), [questionCount]);

    const mpq = useMemo(() => toPositiveNumberOrNull(minutesPerQuestion), [minutesPerQuestion]);

    // ✅ Ưu tiên tính theo settings: ceil(count * mpq)
    const uiDuration = useMemo(() => {
        if (mpq != null) return Math.max(1, Math.ceil(safeCount * mpq));

        // fallback nếu chưa fetch được settings kịp
        const d = toPositiveNumberOrNull(durationMinutes);
        return d != null ? Math.max(1, Math.round(d)) : 0;
    }, [durationMinutes, mpq, safeCount]);

    const durationText = useMemo(() => {
        return uiDuration > 0 ? `${uiDuration} phút` : "—";
    }, [uiDuration]);

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
                        <PlayArrow sx={{ color: "#fff", fontSize: 22 }} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                            Sẵn sàng tạo đề
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.86)", mt: 0.3 }}>
                            Upload/paste xong, kiểm tra nhanh thông tin rồi bắt đầu.
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
                {!materialPresent ? (
                    <Box sx={{ textAlign: "center", py: 2.5 }}>
                        <Typography sx={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 700, mb: 0.8 }}>
                            📚 Bạn cần upload hoặc paste học liệu trước khi tạo đề
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic" }}>
                            Sử dụng panel bên trái để gửi học liệu
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Info row (minimal) */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 16,
                                border: `1px solid ${COLORS.border}`,
                                background: `linear-gradient(135deg, ${alpha(COLORS.primary, 0.06)} 0%, ${alpha(
                                    COLORS.orange,
                                    0.06
                                )} 100%)`,
                                px: 2,
                                py: 1.75,
                            }}
                        >
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={{ xs: 1.25, md: 1.5 }}
                                alignItems={{ xs: "stretch", md: "center" }}
                                justifyContent="space-between"
                            >
                                {/* Left: compact info */}
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ rowGap: 1 }}
                                >
                                    {/* 🧠 count */}
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: COLORS.textPrimary }}>🧠</Typography>

                                        <TextField
                                            value={safeCount}
                                            onChange={(e) => onChangeQuestionCount?.(clampInt(e.target.value, 1, 200))}
                                            type="number"
                                            inputProps={{ min: 1, max: 200 }}
                                            size="small"
                                            sx={{
                                                width: 92,
                                                "& .MuiOutlinedInput-root": {
                                                    borderRadius: 999,
                                                    bgcolor: "#fff",
                                                    "& fieldset": { borderColor: COLORS.border },
                                                    "&:hover fieldset": { borderColor: alpha(COLORS.primary, 0.55) },
                                                    "&.Mui-focused fieldset": { borderColor: COLORS.primary },
                                                },
                                                "& input": {
                                                    textAlign: "center",
                                                    fontSize: 16,
                                                    fontWeight: 900,
                                                    color: COLORS.primary,
                                                    py: 0.9,
                                                },
                                            }}
                                        />

                                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: COLORS.textSecondary }}>
                                            câu hỏi
                                        </Typography>
                                    </Stack>

                                    <Divider
                                        flexItem
                                        orientation="vertical"
                                        sx={{ borderColor: COLORS.border, display: { xs: "none", sm: "block" } }}
                                    />

                                    {/* ⏱ duration (computed from settings) */}
                                    <Stack direction="row" spacing={0.9} alignItems="center">
                                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: COLORS.textPrimary }}>⏱</Typography>
                                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: COLORS.orange }}>
                                            {durationText}
                                        </Typography>
                                    </Stack>

                                    {/* ✅ đã bỏ hoàn toàn: • ~x phút/câu */}
                                </Stack>

                                {/* CTA */}
                                <Button
                                    onClick={onGenerate}
                                    disabled={loading || !materialPresent}
                                    variant="contained"
                                    sx={{
                                        borderRadius: 999,
                                        px: 3,
                                        py: 1.25,
                                        fontSize: 15.5,
                                        fontWeight: 950,
                                        textTransform: "none",
                                        bgcolor: COLORS.orange,
                                        color: "#fff",
                                        boxShadow: `0 10px 20px ${alpha(COLORS.orange, 0.25)}`,
                                        "&:hover": { bgcolor: COLORS.orangeDeep },
                                        "&.Mui-disabled": {
                                            bgcolor: "#E3E8EF",
                                            color: "#A0AEC0",
                                            boxShadow: "none",
                                        },
                                        width: { xs: "100%", md: "auto" },
                                    }}
                                >
                                    Tạo đề ngay
                                </Button>
                            </Stack>
                        </Paper>

                        <Typography
                            sx={{
                                mt: 1.25,
                                fontSize: 12.5,
                                color: COLORS.textSecondary,
                                textAlign: "center",
                                fontStyle: "italic",
                            }}
                        >
                            Chọn số câu → hệ thống tự tính thời gian theo settings → bấm tạo đề để bắt đầu.
                        </Typography>
                    </>
                )}
            </Paper>
        </Box>
    );
}
