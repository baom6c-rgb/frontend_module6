// src/features/practice/components/PracticeReviewDialog.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Divider,
    Chip,
    Stack,
    Button,
    Paper,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export default function PracticeReviewDialog({ open, onClose, review }) {
    const [onlyWrong, setOnlyWrong] = useState(false);

    const items = review?.items || [];

    // ✅ giữ số câu gốc trước khi lọc
    const itemsWithNo = useMemo(() => {
        return items.map((it, index) => ({
            ...it,
            _no: index + 1,
        }));
    }, [items]);

    const filtered = useMemo(() => {
        if (!onlyWrong) return itemsWithNo;
        return itemsWithNo.filter((x) => x?.isCorrect === false);
    }, [itemsWithNo, onlyWrong]);

    const aiFeedback = useMemo(() => String(review?.aiFeedback ?? "").trim(), [review]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 900, color: "#1B2559" }}>
                Xem lại đáp án
                <IconButton onClick={onClose} sx={{ position: "absolute", right: 10, top: 10 }}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: "#F7F9FC" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
                    <Chip label={`Score: ${review?.score ?? 0}/100`} sx={{ fontWeight: 900 }} />
                    <Chip
                        label={`Đúng: ${review?.correctCount ?? 0}/${review?.totalQuestions ?? 0}`}
                        sx={{ fontWeight: 900 }}
                    />

                    <Box sx={{ flex: 1 }} />

                    <Button
                        variant={onlyWrong ? "contained" : "outlined"}
                        onClick={() => setOnlyWrong((v) => !v)}
                        sx={{ fontWeight: 900 }}
                    >
                        {onlyWrong ? "Đang lọc câu sai" : "Chỉ xem câu sai"}
                    </Button>
                </Stack>

                {filtered.length === 0 ? (
                    <Typography sx={{ color: onlyWrong ? "#1B5E20" : "#ff0202", fontWeight: 800 }}>
                        {onlyWrong ? "Không có câu sai 🎉" : "Không có dữ liệu để hiển thị."}
                    </Typography>
                ) : (
                    filtered.map((q, idx) => {
                        const type = q?.questionType || "MCQ";

                        return (
                            <Box
                                key={q.questionId || `${q._no}_${idx}`}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    border: "1px solid #E3E8EF",
                                    bgcolor: "#fff",
                                    mb: 2,
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                        Câu {q._no}: {q.content}
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

                                    <Chip
                                        size="small"
                                        label={q.isCorrect ? "ĐÚNG" : "SAI"}
                                        sx={{
                                            fontWeight: 900,
                                            bgcolor: q.isCorrect ? "rgba(27,94,32,0.12)" : "rgba(176,0,32,0.12)",
                                            color: q.isCorrect ? "#1B5E20" : "#B00020",
                                        }}
                                    />

                                    {Number.isFinite(q?.score) && Number.isFinite(q?.maxScore) ? (
                                        <Chip size="small" label={`Điểm: ${q.score}/${q.maxScore}`} sx={{ fontWeight: 900 }} />
                                    ) : null}
                                </Stack>

                                <Divider sx={{ my: 1.5 }} />

                                {/* ===== MCQ ===== */}
                                {type === "MCQ" ? (
                                    <>
                                        {["A", "B", "C", "D"].map((k) => {
                                            const text = q.options?.[k] || "";
                                            const isCorrect = q.correctAnswer === k;
                                            const isSelected = q.selectedAnswer === k;
                                            const isWrongSelected = isSelected && !isCorrect;

                                            return (
                                                <Box
                                                    key={k}
                                                    sx={{
                                                        p: 1.2,
                                                        borderRadius: 2,
                                                        border: "2px solid",
                                                        borderColor: isCorrect ? "#1B5E20" : isWrongSelected ? "#B00020" : "#E3E8EF",
                                                        bgcolor: isCorrect
                                                            ? "rgba(27,94,32,0.08)"
                                                            : isWrongSelected
                                                                ? "rgba(176,0,32,0.06)"
                                                                : "#fff",
                                                        mb: 1,
                                                        display: "flex",
                                                        gap: 1,
                                                        alignItems: "flex-start",
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 900, width: 26 }}>{k}.</Typography>
                                                    <Typography sx={{ fontWeight: 700, color: "#1B2559" }}>
                                                        {text || "(trống)"}
                                                    </Typography>

                                                    <Box sx={{ flex: 1 }} />

                                                    {isCorrect && <Chip size="small" label="Đáp án đúng" sx={{ fontWeight: 900 }} />}
                                                    {isSelected && <Chip size="small" label="Bạn chọn" sx={{ fontWeight: 900 }} />}
                                                </Box>
                                            );
                                        })}
                                    </>
                                ) : (
                                    /* ===== ESSAY ===== */
                                    <Box sx={{ display: "grid", gap: 1.25 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Câu trả lời của bạn</Typography>
                                            <Typography sx={{ mt: 0.5, color: "#000000", fontWeight: 700, whiteSpace: "pre-wrap" }}>
                                                {q.yourAnswer || "(chưa trả lời)"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Gợi ý đáp án (sample)</Typography>
                                            <Typography sx={{ mt: 0.5, color: "#716f6f", fontWeight: 700, whiteSpace: "pre-wrap" }}>
                                                {q.sampleAnswer || "(không có)"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* feedback chung per-question */}
                                {q.feedback ? (
                                    <Box sx={{ mt: 1.5 }}>
                                        <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                                            Giải thích / Gợi ý học lại
                                        </Typography>
                                        <Typography sx={{ mt: 0.5, color: "#716f6f", fontWeight: 700, whiteSpace: "pre-wrap" }}>
                                            {q.feedback}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </Box>
                        );
                    })
                )}
            </DialogContent>
        </Dialog>
    );
}
