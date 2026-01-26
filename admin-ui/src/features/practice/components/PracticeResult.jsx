import React, { useMemo } from "react";
import { Box, Button, Paper, Typography, Divider } from "@mui/material";

export default function PracticeResult({
                                           result,
                                           numberOfQuestions,
                                           onRetry,
                                           onNewMaterial,
                                           onViewReview, // ✅ NEW
                                       }) {
    const scorePoint = useMemo(() => result?.score ?? 0, [result]); // 0-100
    const total = numberOfQuestions ?? 0;

    const correctCount = useMemo(() => {
        if (!total || total <= 0) return 0;
        return Math.round((scorePoint / 100) * total);
    }, [scorePoint, total]);

    const percent = useMemo(() => Math.max(0, Math.min(100, Math.round(scorePoint))), [scorePoint]);

    const level = useMemo(() => {
        if (percent >= 85) return { label: "Rất tốt", color: "#1B5E20" };
        if (percent >= 70) return { label: "Tốt", color: "#0B5ED7" };
        if (percent >= 50) return { label: "Khá", color: "#FF8C00" };
        return { label: "Cần cải thiện", color: "#B00020" };
    }, [percent]);

    const feedback = useMemo(() => result?.feedback ?? "", [result]);

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
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 22, color: "#1B2559" }}>
                        {correctCount} / {total} câu
                    </Typography>

                    <Typography sx={{ fontWeight: 900, color: level.color }}>
                        {percent}% • {level.label}
                    </Typography>
                </Box>

                <Typography sx={{ mt: 0.5, fontWeight: 700, color: "#6C757D" }}>
                    Điểm số: {scorePoint} / 100
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                    Nhận xét từ AI
                </Typography>

                <Typography sx={{ mt: 1, color: "#6C757D", fontWeight: 600, whiteSpace: "pre-wrap" }}>
                    {feedback || "Chưa có nhận xét."}
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
