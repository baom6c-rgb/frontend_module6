// src/features/practice/components/chatbot/PracticeHeaderConfig.jsx
import React, { useMemo } from "react";
import { Avatar, Box, Paper, Typography, TextField } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";

export default function PracticeHeaderConfig({
                                                 questionCount,
                                                 durationMinutes,
                                                 onChangeQuestionCount,
                                                 attemptId,
                                                 hideConfig = false,
                                             }) {
    const isDoing = Boolean(attemptId);

    const qc = useMemo(() => {
        const n = Number(questionCount);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, n);
    }, [questionCount]);

    const displayMinutes = useMemo(() => {
        const n = Number(durationMinutes);
        if (Number.isFinite(n) && n >= 0) return n;
        // fallback nếu chưa có durationMinutes từ parent
        return Math.max(0, qc * 2);
    }, [durationMinutes, qc]);

    return (
        <Paper
            elevation={0}
            sx={{
                border: "1px solid #E3E8EF",
                borderRadius: 2.5,
                px: 1.25,
                py: 1,
                bgcolor: "#FFFFFF",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                    position: "relative",
                }}
            >
                {/* LEFT: icon + title (GIỮ NGUYÊN) */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Avatar
                        src="/images/AI_logo.png"
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%", // Đảm bảo ảnh bo tròn nếu cần
                        }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 900,
                            color: "#1B2559",
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Bumblefly AI
                    </Typography>
                </Box>

                {/* RIGHT: compact config */}
                {!hideConfig && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2e2d84" }}>
                            Số câu
                        </Typography>

                        <TextField
                            size="small"
                            type="number"
                            value={qc || ""}
                            onChange={(e) => onChangeQuestionCount?.(e.target.value)}
                            disabled={isDoing}
                            inputProps={{ min: 1, max: 100 }}
                            sx={{
                                width: 65,
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    height: 38,
                                    "& fieldset": { borderColor: "#E3E8EF" },
                                    "&:hover fieldset": { borderColor: "#BFC7D5" },
                                    "&.Mui-focused fieldset": { borderColor: "#2E2D84" },
                                },
                                "& .MuiInputBase-input": {
                                    textAlign: "center",
                                    fontWeight: 900,
                                    color: "#070707",
                                    fontSize: 14,
                                    py: 0,
                                },
                            }}
                        />

                        <EastRoundedIcon sx={{ color: "#A0AEC0", fontSize: 18 }} />

                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2e2d84" }}>
                            Thời gian
                        </Typography>

                        <Box
                            sx={{
                                height: 38,
                                px: 1,
                                minWidth: 66,
                                borderRadius: 2,
                                border: "1px solid #E3E8EF",
                                bgcolor: "#F7F9FC",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#020202" }}>
                                {displayMinutes} phút
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
