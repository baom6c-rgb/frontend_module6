// src/features/practice/components/chatbot/PracticeHeaderConfig.jsx
import React, { useMemo } from "react";
import { Box, Paper, Typography, TextField, Stack } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

export default function PracticeHeaderConfig({
                                                 questionCount,
                                                 durationMinutes,
                                                 onChangeQuestionCount,
                                                 attemptId,
                                             }) {
    const safeQuestionCount = useMemo(() => {
        const n = Number(questionCount);
        return Number.isFinite(n) && n > 0 ? n : 10;
    }, [questionCount]);

    const safeDurationMinutes = useMemo(() => {
        const n = Number(durationMinutes);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    }, [durationMinutes]);

    const isDoing = Boolean(attemptId);

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

                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
                    <TextField
                        label="Số câu"
                        size="small"
                        type="number"
                        value={safeQuestionCount}
                        onChange={(e) => onChangeQuestionCount?.(e.target.value)}
                        disabled={isDoing} // ✅ đang làm bài thì khóa
                        sx={{ width: 120, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                        inputProps={{ min: 1, max: 100 }}
                    />

                    <TextField
                        label="Thời gian (phút)"
                        size="small"
                        value={safeDurationMinutes}
                        disabled // ✅ luôn khoá: thời gian lấy từ BE
                        sx={{
                            width: 170,
                            "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" },
                            "& .MuiInputBase-input.Mui-disabled": {
                                WebkitTextFillColor: "#1B2559",
                                fontWeight: 800,
                            },
                        }}
                    />

                    {/* ✅ CountdownTimer đã chuyển sang Learning Canvas */}
                </Stack>
            </Box>
        </Paper>
    );
}
