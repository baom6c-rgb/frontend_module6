// src/features/practice/components/page/PracticeIdleCreatePanel.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AutoAwesomeRounded, InfoRounded } from "@mui/icons-material";

const COLORS = {
    primary: "#2E2D84",
    primaryDeep: "#1E1D6F",

    orange: "#EC5E32",
    orangeDeep: "#D5522B",

    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
};

const toPositiveIntOrNull = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export default function PracticeIdleCreatePanel({
                                                    questionCount,
                                                    durationMinutes,
                                                    minutesPerQuestion,
                                                    loading = false,
                                                    materialPresent = false,
                                                    onGenerate,
                                                }) {
    const qc = useMemo(() => toPositiveIntOrNull(questionCount), [questionCount]);

    const dur = useMemo(() => {
        const n = Number(durationMinutes);
        if (Number.isFinite(n) && n > 0) return Math.max(1, Math.ceil(n));
        return null;
    }, [durationMinutes]);

    const canGenerate = materialPresent && !loading;

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
                        <AutoAwesomeRounded sx={{ color: "#fff", fontSize: 22 }} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                            Sẵn sàng tạo đề
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.86)", mt: 0.3 }}>
                            Số câu hỏi được cấu hình bởi Admin. Bạn chỉ cần gửi học liệu và bấm tạo đề.
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
                {/* Info box */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 16,
                        border: `1px solid ${COLORS.border}`,
                        background: `linear-gradient(135deg, ${alpha(COLORS.primary, 0.06)} 0%, ${alpha(COLORS.orange, 0.06)} 100%)`,
                        p: 2,
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "flex-start", sm: "center" }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: alpha(COLORS.orange, 0.12),
                                border: `1px solid ${alpha(COLORS.orange, 0.22)}`,
                                flex: "0 0 auto",
                            }}
                        >
                            <InfoRounded sx={{ color: COLORS.orange, fontSize: 20 }} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: COLORS.textPrimary }}>
                                Cấu hình bài luyện tập
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, mt: 0.35 }}>
                                Số câu: <b>{qc != null ? qc : "Theo cấu hình Admin"}</b> · Thời gian:{" "}
                                <b>{dur != null ? `${dur} phút` : "Theo hệ thống"}</b>
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, mt: 0.6 }}>
                                (Nếu chưa hiện số câu, bấm “Tạo đề ngay” để hệ thống lấy đúng cấu hình từ server.)
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.25}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => onGenerate?.()}
                        disabled={!canGenerate}
                        startIcon={<AutoAwesomeRounded />}
                        sx={{
                            borderRadius: 3,
                            fontWeight: 900,
                            bgcolor: COLORS.orange,
                            "&:hover": { bgcolor: COLORS.orangeDeep },
                            py: 1.1,
                        }}
                    >
                        Tạo đề ngay
                    </Button>

                    {!materialPresent && (
                        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, textAlign: "center" }}>
                            Hãy upload/paste học liệu trước khi tạo đề.
                        </Typography>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
