// src/features/practice/components/chatbot/PracticeHeaderConfig.jsx
import React from "react";
import { Box, Paper, Typography, TextField, Stack } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CountdownTimer from "../../../../components/common/CountdownTimer.jsx";

export default function PracticeHeaderConfig({
                                                 questionCount,
                                                 durationMinutes,
                                                 onChangeQuestionCount,
                                                 onChangeDurationMinutes,
                                                 attemptId,
                                                 attemptStartTs,
                                                 onTimeExpired,
                                             }) {
    const safeQuestionCount = Number.isFinite(Number(questionCount)) ? Number(questionCount) : 10;
    const safeDurationMinutes = Number.isFinite(Number(durationMinutes)) ? Number(durationMinutes) : 15;

    return (
        <Paper
            elevation={0}
            sx={{
                border: "1px solid #E3E8EF",
                borderRadius: 3,
                boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
                px: 2,
                py: 1.5,
                position: "sticky",
                top: 0,
                zIndex: 10,
                bgcolor: "rgba(248,250,252,0.92)",
                backdropFilter: "blur(10px)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "nowrap",
                }}
            >
                {/* Left: Title only */}
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                    <AutoAwesomeRoundedIcon sx={{ color: "primary.main" }} />
                    <Typography
                        sx={{
                            fontWeight: 900,
                            color: "#1B2559",
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        AI Practice Assistant
                    </Typography>
                </Stack>

                {/* Right: Inputs + optional timer */}
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
                    <TextField
                        label="Số câu"
                        size="small"
                        type="number"
                        value={safeQuestionCount}
                        onChange={(e) => onChangeQuestionCount?.(e.target.value)}
                        sx={{ width: 120, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                        inputProps={{ min: 1, max: 100 }}
                    />

                    <TextField
                        label="Thời gian (phút)"
                        size="small"
                        type="number"
                        value={safeDurationMinutes}
                        onChange={(e) => onChangeDurationMinutes?.(e.target.value)}
                        sx={{ width: 170, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                        inputProps={{ min: 1, max: 180 }}
                    />

                    {attemptId && attemptStartTs ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 1 }}>
                            <AccessTimeRoundedIcon sx={{ color: "#6C757D" }} />
                            <CountdownTimer
                                // ✅ CountdownTimer.jsx của m dùng:
                                // startTimestamp (ms), durationSeconds (seconds), onExpire
                                startTimestamp={attemptStartTs}
                                durationSeconds={safeDurationMinutes * 60}
                                onExpire={onTimeExpired}
                            />
                        </Box>
                    ) : null}
                </Stack>
            </Box>
        </Paper>
    );
}
