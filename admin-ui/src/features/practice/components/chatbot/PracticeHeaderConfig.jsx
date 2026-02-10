// src/features/practice/components/chatbot/PracticeHeaderConfig.jsx
import React, { useMemo } from "react";
import { Avatar, Box, Paper, Typography } from "@mui/material";
import EastRoundedIcon from "@mui/icons-material/EastRounded";

export default function PracticeHeaderConfig({
                                                 questionCount,
                                                 durationMinutes,
                                                 attemptId,
                                                 hideConfig = false,
                                             }) {
    const isDoing = Boolean(attemptId);

    const qc = useMemo(() => {
        const n = Number(questionCount);
        if (!Number.isFinite(n) || n <= 0) return null;
        return n;
    }, [questionCount]);

    const displayMinutes = useMemo(() => {
        const n = Number(durationMinutes);
        if (Number.isFinite(n) && n > 0) return n;
        return null;
    }, [durationMinutes]);

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
                {/* LEFT */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Avatar
                        src="/images/AI_logo.png"
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
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

                {/* RIGHT */}
                {!hideConfig && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2e2d84" }}>
                            Số câu
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
                            title="Số câu được cấu hình bởi Admin (không thể chỉnh)"
                        >
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#020202" }}>
                                {qc != null ? qc : "—"}
                            </Typography>
                        </Box>

                        <EastRoundedIcon sx={{ color: "#A0AEC0", fontSize: 18 }} />

                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2e2d84" }}>
                            Thời gian
                        </Typography>

                        <Box
                            sx={{
                                height: 38,
                                px: 1,
                                minWidth: 86,
                                borderRadius: 2,
                                border: "1px solid #E3E8EF",
                                bgcolor: "#F7F9FC",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            title="Thời gian được tính theo cấu hình hệ thống"
                        >
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#020202" }}>
                                {displayMinutes != null ? `${displayMinutes} phút` : "—"}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
