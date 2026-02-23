// src/features/practice/components/TopicSelectDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Divider,
    TextField,
    InputAdornment,
    Stack,
    Paper,
    Chip,
    Button,
    Radio,
    CircularProgress,
    alpha,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function TopicSelectDialog({
                                              open,
                                              topics = [],
                                              loading = false,
                                              onClose,
                                              onConfirm, // (topicId) => void
                                          }) {
    const [selectedId, setSelectedId] = useState("");
    const [q, setQ] = useState("");

    useEffect(() => {
        if (!open) {
            setSelectedId("");
            setQ("");
        }
    }, [open]);

    const normalizedTopics = useMemo(() => {
        return Array.isArray(topics) ? topics : [];
    }, [topics]);

    const filteredTopics = useMemo(() => {
        const keyword = q.trim().toLowerCase();
        if (!keyword) return normalizedTopics;

        return normalizedTopics.filter((t) => {
            const title = String(t?.title || "").toLowerCase();
            const summary = String(t?.summary || "").toLowerCase();
            const keys = Array.isArray(t?.keywords)
                ? t.keywords.join(" ").toLowerCase()
                : "";
            return title.includes(keyword) || summary.includes(keyword) || keys.includes(keyword);
        });
    }, [normalizedTopics, q]);

    const selected = useMemo(() => {
        return normalizedTopics.find((t) => t?.id === selectedId) || null;
    }, [normalizedTopics, selectedId]);

    const handleClose = () => {
        if (loading) return;
        onClose?.();
    };

    const handleConfirm = () => {
        if (!selectedId || loading) return;
        onConfirm?.(selectedId);
    };

    const TopicCard = ({ t }) => {
        const isSelected = t?.id === selectedId;

        return (
            <Paper
                variant="outlined"
                onClick={() => setSelectedId(t?.id)}
                sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 3,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
                    background: isSelected
                        ? `linear-gradient(180deg, ${alpha(
                            theme.palette.primary.main,
                            0.08
                        )} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`
                        : theme.palette.background.paper,
                    boxShadow: isSelected
                        ? "0 14px 30px rgba(0,0,0,0.10)"
                        : "0 0 0 rgba(0,0,0,0)",
                    "&:hover": {
                        boxShadow: "0 14px 28px rgba(0,0,0,0.08)",
                        transform: "translateY(-1px)",
                        borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.18),
                    },
                    display: "flex",
                    gap: 1.25,
                    alignItems: "flex-start",
                    position: "relative",
                    overflow: "hidden",
                })}
            >
                {/* Accent bar */}
                <Box
                    sx={(theme) => ({
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        backgroundColor: isSelected ? theme.palette.primary.main : "transparent",
                    })}
                />

                <Box sx={{ pt: 0.25 }}>
                    <Radio
                        checked={isSelected}
                        value={t?.id}
                        onChange={() => setSelectedId(t?.id)}
                    />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 900,
                                lineHeight: 1.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                            }}
                            title={t?.title || ""}
                        >
                            {t?.title || "Chủ đề"}
                        </Typography>

                        {isSelected ? (
                            <Chip
                                size="small"
                                icon={<CheckCircleRoundedIcon />}
                                label="Đã chọn"
                                sx={(theme) => ({
                                    fontWeight: 800,
                                    borderRadius: 999,
                                    bgcolor: alpha(theme.palette.success.main, 0.14),
                                    color: theme.palette.success.dark,
                                })}
                            />
                        ) : null}
                    </Stack>

                    {t?.summary ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                mb: 1,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                            title={t.summary}
                        >
                            {t.summary}
                        </Typography>
                    ) : null}

                    {Array.isArray(t?.keywords) && t.keywords.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {t.keywords.slice(0, 10).map((k) => (
                                <Chip
                                    key={k}
                                    size="small"
                                    label={k}
                                    sx={(theme) => ({
                                        borderRadius: 999,
                                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                                    })}
                                />
                            ))}
                        </Stack>
                    ) : null}
                </Box>
            </Paper>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            disableEscapeKeyDown={loading}
            PaperProps={{
                sx: (theme) => ({
                    borderRadius: 4,
                    overflow: "hidden",
                    boxShadow: "0 22px 60px rgba(0,0,0,0.20)",
                    border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                }),
            }}
        >
            {/* Header */}
            <Box
                sx={(theme) => ({
                    px: 2.5,
                    py: 2,
                    position: "relative",
                    background: `linear-gradient(135deg, ${alpha(
                        theme.palette.primary.main,
                        0.12
                    )} 0%, ${alpha(theme.palette.background.paper, 1)} 60%)`,
                })}
            >
                <Stack spacing={0.75} sx={{ pr: 6 }}>
                    <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
                        Chọn phần bạn muốn làm
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <InfoOutlinedIcon fontSize="small" style={{ marginTop: 2, opacity: 0.8 }} />
                        <Typography variant="body2" color="text.secondary">
                            Học liệu có nhiều phần. Chọn <b>1</b> phần để Fly AI tạo đề tập trung đúng nội dung.
                        </Typography>
                    </Stack>
                </Stack>

                <IconButton
                    onClick={handleClose}
                    disabled={loading}
                    sx={(theme) => ({
                        position: "absolute",
                        top: 10,
                        right: 10,
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                        "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.08) },
                    })}
                >
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            <Divider />

            {/* Body */}
            <Box sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm theo tiêu đề / tóm tắt / từ khóa…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        disabled={loading}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Chip
                        size="small"
                        label={`${filteredTopics.length}/${normalizedTopics.length}`}
                        sx={(theme) => ({
                            borderRadius: 999,
                            bgcolor: alpha(theme.palette.text.primary, 0.06),
                            fontWeight: 800,
                        })}
                    />
                </Stack>

                <Box sx={{ mt: 1.75 }} />

                <Box
                    sx={(theme) => ({
                        maxHeight: 380,
                        overflow: "auto",
                        pr: 0.5,
                        borderRadius: 3,
                        "&::-webkit-scrollbar": { width: 10 },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: 999,
                            background: alpha(theme.palette.text.primary, 0.12),
                            border: `3px solid ${theme.palette.background.paper}`,
                        },
                    })}
                >
                    <Stack spacing={1.25}>
                        {filteredTopics.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={(theme) => ({
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: alpha(theme.palette.warning.main, 0.06),
                                    borderColor: alpha(theme.palette.warning.main, 0.25),
                                })}
                            >
                                <Typography sx={{ fontWeight: 900 }}>Không có kết quả</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Thử từ khóa khác hoặc xóa ô tìm kiếm.
                                </Typography>
                            </Paper>
                        ) : (
                            filteredTopics.map((t) => <TopicCard key={t?.id} t={t} />)
                        )}
                    </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="caption" color="text.secondary">
                        Đang chọn:{" "}
                        <b>{selected?.title || (selectedId ? selectedId : "Chưa chọn")}</b>
                    </Typography>

                    {loading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography variant="caption" color="text.secondary">
                                Đang tạo đề…
                            </Typography>
                        </Stack>
                    ) : null}
                </Stack>
            </Box>

            <Divider />

            {/* Footer */}
            <Box sx={{ px: 2.5, py: 1.75 }}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        sx={{ borderRadius: 999, px: 2.2 }}
                    >
                        Hủy
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={!selectedId || loading}
                        sx={{
                            borderRadius: 999,
                            px: 2.4,
                            fontWeight: 900,
                            boxShadow: "0 12px 22px rgba(0,0,0,0.14)",
                            textTransform: "none",
                        }}
                    >
                        Tạo đề theo phần đã chọn
                    </Button>
                </Stack>
            </Box>
        </Dialog>
    );
}