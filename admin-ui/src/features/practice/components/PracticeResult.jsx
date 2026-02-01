// src/features/practice/components/PracticeResult.jsx
import React, { useMemo } from "react";
import { Box, Button, Paper, Typography, Divider, Chip, Stack } from "@mui/material";

export default function PracticeResult({
                                           result,
                                           numberOfQuestions,
                                           onRetry,
                                           onNewMaterial,
                                           onViewReview,
                                       }) {
    const earned = useMemo(() => Number(result?.earnedPoints ?? 0), [result]);
    const totalPoints = useMemo(() => Number(result?.totalPoints ?? 0), [result]);

    // ✅ BE score là source-of-truth (0..100). Fallback earned/total nếu thiếu score.
    const percent = useMemo(() => {
        const p = Number(result?.score);
        if (Number.isFinite(p)) return Math.max(0, Math.min(100, p));

        if (totalPoints > 0) {
            const x = (earned / totalPoints) * 100;
            return Math.max(0, Math.min(100, x));
        }

        return 0;
    }, [earned, totalPoints, result]);

    const percentText = useMemo(() => `${percent.toFixed(1)}%`, [percent]);

    const score10 = useMemo(() => {
        const s = (percent / 100) * 10;
        return Math.max(0, Math.min(10, s));
    }, [percent]);

    const score10Text = useMemo(() => `${score10.toFixed(2)}/10`, [score10]);

    const passed = useMemo(() => percent >= 50, [percent]);

    const statusLabel = useMemo(() => {
        const s = String(result?.status ?? "").toUpperCase();
        if (s === "PASSED") return "Passed";
        if (s === "FAILED") return "Failed";
        return passed ? "Passed" : "Failed";
    }, [result, passed]);

    const statusColor = useMemo(
        () => (statusLabel === "Passed" ? "#1B5E20" : "#B00020"),
        [statusLabel]
    );

    const feedback = useMemo(() => String(result?.feedback ?? "").trim(), [result]);
    const aiFeedback = useMemo(() => String(result?.aiFeedback ?? "").trim(), [result]);

    const totalQuestions = numberOfQuestions ?? 0;

    return (
        <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#1B2559" }}>
                Kết quả luyện tập
            </Typography>

            <Paper
                elevation={0}
                sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #E3E8EF",
                    background: "#F7F9FC",
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Chip
                        label={`Status: ${statusLabel}`}
                        sx={{
                            fontWeight: 900,
                            bgcolor: statusLabel === "Passed" ? "rgba(27,94,32,0.12)" : "rgba(176,0,32,0.12)",
                            color: statusColor,
                        }}
                    />
                    <Chip label={percentText} sx={{ fontWeight: 900 }} />
                    {totalQuestions > 0 ? <Chip label={`Số câu: ${totalQuestions}`} sx={{ fontWeight: 900 }} /> : null}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "grid", gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Điểm (thang 10):{" "}
                        <Box component="span" sx={{ color: "#0B5ED7" }}>
                            {score10Text}
                        </Box>
                    </Typography>

                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Tổng điểm:{" "}
                        <Box component="span" sx={{ color: "#2B3674" }}>
                            {earned}/{totalPoints > 0 ? totalPoints : "?"}
                        </Box>{" "}
                        <Box component="span" sx={{ color: "#6a26f1", fontWeight: 800 }}>
                            ({percentText})
                        </Box>
                    </Typography>

                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Status:{" "}
                        <Box component="span" sx={{ color: statusColor }}>
                            {statusLabel}
                        </Box>
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Nhận xét hệ thống</Typography>
                <Typography sx={{ mt: 1, color: "#252525", fontWeight: 600, whiteSpace: "pre-wrap" }}>
                    {feedback || "Chưa có nhận xét."}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                    Nhận xét AI (giải thích sai + gợi ý đọc lại)
                </Typography>

                <Typography sx={{ mt: 1, color: "#474646", fontWeight: 650, whiteSpace: "pre-wrap" }}>
                    {aiFeedback ||
                        "Chưa có AI feedback. (Có thể AI bị quota/timeout). Bấm “Xem lại đáp án” để xem feedback chi tiết từng câu."}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                    <Button variant="contained" onClick={onRetry} sx={{ fontWeight: 900 }}>
                        Làm lại
                    </Button>

                    <Button variant="outlined" onClick={onNewMaterial} sx={{ fontWeight: 800 }}>
                        Upload học liệu khác
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={onViewReview}
                        sx={{ fontWeight: 900, borderColor: "#0B5ED7", color: "#0B5ED7" }}
                    >
                        Xem lại đáp án
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
