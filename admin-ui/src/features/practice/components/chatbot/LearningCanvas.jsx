
// src/features/practice/components/chatbot/LearningCanvas.jsx
import React from "react";
import { Box, Paper, Typography, Stack, Button, Divider } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import QuestionCard from "../QuestionCard";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
};

function Placeholder() {
    return (
        <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, mb: 0.5 }}>
                Learning Canvas
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                Khi có bộ câu hỏi, khu vực này sẽ hiển thị preview và chế độ làm bài (quiz/short answer).
            </Typography>
        </Box>
    );
}

export default function LearningCanvas({
                                           mode,
                                           previewQuestions,
                                           onStart,
                                           startDisabled,
                                           childrenDoing,
                                           childrenResult,
                                       }) {
    const showPreview = mode === "PREVIEW";
    const showDoing = mode === "DOING";
    const showResult = mode === "RESULT";

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                bgcolor: "#fff",
                overflow: "hidden",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${COLORS.border}` }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <QuizRoundedIcon sx={{ color: COLORS.textPrimary }} />
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary }}>
                        {showPreview ? "Preview câu hỏi" : showDoing ? "Đang làm bài" : showResult ? "Kết quả" : "Canvas"}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {showPreview && (
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowRoundedIcon />}
                            onClick={onStart}
                            disabled={startDisabled}
                            sx={{
                                bgcolor: COLORS.orange,
                                "&:hover": { bgcolor: COLORS.orangeHover },
                                borderRadius: 2,
                                fontWeight: 900,
                            }}
                        >
                            Bắt đầu làm bài
                        </Button>
                    )}
                </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#fff" }}>
                {!showPreview && !showDoing && !showResult && <Placeholder />}

                {showPreview && (
                    <Box sx={{ p: 2 }}>
                        <Typography sx={{ color: COLORS.textSecondary, fontSize: 13, mb: 1.25 }}>
                            Đây là bộ câu hỏi mẫu. Khi bắt đầu, hệ thống sẽ tạo attempt và bật đồng hồ đếm ngược.
                        </Typography>
                        <Stack spacing={1.25}>
                            {(previewQuestions || []).slice(0, 20).map((q, idx) => (
                                <Box key={q.questionId || q.id || idx} sx={{ opacity: 0.98 }}>
                                    <QuestionCard
                                        question={q}
                                        index={idx}
                                        value={null}
                                    />
                                </Box>
                            ))}
                            {(previewQuestions || []).length > 20 && (
                                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                    Đang hiển thị 20 câu đầu. Khi làm bài sẽ có đầy đủ.
                                </Typography>
                            )}
                        </Stack>
                    </Box>
                )}

                {showDoing && <Box sx={{ p: 0 }}>{childrenDoing}</Box>}
                {showResult && <Box sx={{ p: 0 }}>{childrenResult}</Box>}
            </Box>
        </Paper>
    );
}
