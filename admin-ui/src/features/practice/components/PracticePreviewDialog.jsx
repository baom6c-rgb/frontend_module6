// src/features/practice/components/PracticePreviewDialog.jsx
import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Chip,
} from "@mui/material";

export default function PracticePreviewDialog({ open, onClose, questions = [] }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    background: "linear-gradient(90deg, #2E2D84, #0B5ED7)",
                    color: "#fff",
                    fontWeight: 900,
                }}
            >
                Xem trước đề (Preview)
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: "#fff" }}>
                {questions?.length ? (
                    <Box sx={{ display: "grid", gap: 2 }}>
                        {questions.slice(0, 10).map((q, idx) => {
                            const type = q?.questionType || "MCQ";
                            return (
                                <Box key={q.id || q.questionId || idx}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                        <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                            {idx + 1}. {q.content || "Câu hỏi"}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={type === "MCQ" ? "MCQ" : "Tự luận ngắn"}
                                            sx={{
                                                fontWeight: 900,
                                                bgcolor: type === "MCQ" ? "rgba(11,94,215,0.10)" : "rgba(255,140,0,0.12)",
                                                color: type === "MCQ" ? "#0B5ED7" : "#FF8C00",
                                            }}
                                        />
                                    </Box>

                                    {type === "MCQ" ? (
                                        <Box sx={{ mt: 0.75, ml: 2, display: "grid", gap: 0.5 }}>
                                            {["A", "B", "C", "D"].map((k) => (
                                                <Typography key={k} sx={{ color: "#2B3674", fontWeight: 600 }}>
                                                    {k}. {q.options?.[k] || "—"}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{ mt: 0.75, ml: 2, color: "#6C757D", fontWeight: 700 }}>
                                            (Câu tự luận – bạn sẽ nhập câu trả lời khi làm bài)
                                        </Typography>
                                    )}

                                    <Divider sx={{ mt: 1.5 }} />
                                </Box>
                            );
                        })}

                        {questions.length > 10 && (
                            <Typography sx={{ color: "#6C757D", fontWeight: 700 }}>
                                (Đang hiển thị 10 câu đầu để xem trước)
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <Typography sx={{ color: "#6C757D", fontWeight: 700 }}>
                        Không có dữ liệu câu hỏi để preview.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
