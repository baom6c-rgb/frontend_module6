// src/features/practice/components/PracticeConfigPanel.jsx
import React, { useMemo } from "react";
import {
    Box,
    Button,
    Paper,
    TextField,
    Typography,
    MenuItem,
} from "@mui/material";

const DURATION_OPTIONS = [15, 30, 60];

export default function PracticeConfigPanel({
                                                materialId,
                                                questionCount,
                                                durationMinutes,
                                                onChangeQuestionCount,
                                                onChangeDuration,
                                                onBack,
                                                onPreview,
                                                onStart,
                                                loading = false,
                                            }) {
    const validCount = useMemo(() => {
        const n = Number(questionCount);
        return Number.isFinite(n) && n >= 1 && n <= 30;
    }, [questionCount]);

    const validDuration = useMemo(() => {
        const d = Number(durationMinutes);
        return DURATION_OPTIONS.includes(d);
    }, [durationMinutes]);

    const canAct = !!materialId && validCount && validDuration && !loading;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid #E3E8EF",
                bgcolor: "#fff",
            }}
        >
            <Typography sx={{ fontWeight: 800, color: "#1B2559", mb: 1 }}>
                2) Cấu hình đề
            </Typography>

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
            >
                <TextField
                    label="Số câu hỏi (1–30)"
                    type="number"
                    value={questionCount}
                    onChange={(e) => onChangeQuestionCount(parseInt(e.target.value || "0", 10))}
                    inputProps={{ min: 1, max: 30 }}
                    disabled={loading}
                />

                {/* ✅ Dropdown thời gian: 15 / 30 / 60 */}
                <TextField
                    select
                    label="Thời gian"
                    value={validDuration ? Number(durationMinutes) : 15}
                    onChange={(e) => onChangeDuration(Number(e.target.value))}
                    disabled={loading}
                >
                    {DURATION_OPTIONS.map((m) => (
                        <MenuItem key={m} value={m}>
                            {m} phút
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
                <Button
                    onClick={onBack}
                    variant="outlined"
                    disabled={loading}
                    sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
                >
                    Quay lại
                </Button>

                <Button
                    onClick={onPreview}
                    disabled={!canAct}
                    variant="outlined"
                    sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 2,
                        borderColor: "#EC5E32",
                        color: "#EC5E32",
                        "&:hover": { borderColor: "#EC5E32" },
                    }}
                >
                    {loading ? "Đang xử lý..." : "Xem trước đề"}
                </Button>

                <Button
                    onClick={onStart}
                    disabled={!canAct}
                    variant="contained"
                    sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 2,
                        bgcolor: "#EC5E32",
                        "&:hover": { bgcolor: "#d84f28" },
                    }}
                >
                    {loading ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
                </Button>
            </Box>

            {!materialId && (
                <Typography sx={{ mt: 1, color: "#6C757D", fontWeight: 600 }}>
                    Hãy upload học liệu để cấu hình và sinh đề.
                </Typography>
            )}

            {materialId && !validCount && (
                <Typography sx={{ mt: 1, color: "#dc3545", fontWeight: 700 }}>
                    Số câu hỏi phải từ 1 đến 30.
                </Typography>
            )}
        </Paper>
    );
}
