// src/features/practice/components/TopicSelectDialog.jsx
import React, { useEffect, useMemo, useState, memo } from "react";
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
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const TopicCard = memo(function TopicCard({ t, selectedId, onSelect, compact }) {
    const isSelected = t?.id === selectedId;

    return (
        <Paper
            variant="outlined"
            onClick={() => onSelect?.(t?.id)}
            sx={(theme) => ({
                p: compact ? 1.25 : 1.5,
                borderRadius: 3,
                cursor: "pointer",
                transition: "all 0.18s ease",
                borderColor: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.divider,
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
                    borderColor: isSelected
                        ? theme.palette.primary.main
                        : alpha(theme.palette.text.primary, 0.18),
                },
                display: "flex",
                gap: compact ? 1 : 1.25,
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
                    backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : "transparent",
                })}
            />

            <Box sx={{ pt: 0.25 }}>
                <Radio
                    checked={isSelected}
                    value={t?.id}
                    onClick={(e) => e.stopPropagation()} // ✅ tránh click radio trigger paper onClick 2 lần
                    onChange={() => onSelect?.(t?.id)}
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
                            fontSize: compact ? 14.5 : "inherit",
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
                            fontSize: compact ? 13 : "inherit",
                        }}
                        title={t.summary}
                    >
                        {t.summary}
                    </Typography>
                ) : null}

                {Array.isArray(t?.keywords) && t.keywords.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {t.keywords.slice(0, compact ? 8 : 10).map((k, idx) => (
                            <Chip
                                key={`${t?.id}-${k}-${idx}`} // ✅ tránh duplicate key
                                size="small"
                                label={k}
                                sx={(theme) => ({
                                    borderRadius: 999,
                                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                                    fontSize: compact ? 12 : "inherit",
                                })}
                            />
                        ))}
                    </Stack>
                ) : null}
            </Box>
        </Paper>
    );
});

export default function TopicSelectDialog({
                                              open,
                                              topics = [],
                                              loading = false,
                                              onClose,
                                              onConfirm, // (topicId) => void
                                          }) {
    const theme = useTheme();
    const isSmDown = useMediaQuery(theme.breakpoints.down("sm")); // <600px
    const isMdDown = useMediaQuery(theme.breakpoints.down("md")); // <900px
    const compact = isMdDown;

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
            return (
                title.includes(keyword) ||
                summary.includes(keyword) ||
                keys.includes(keyword)
            );
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

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth={isSmDown ? false : "sm"}
            fullScreen={isSmDown}
            disableEscapeKeyDown={loading}
            PaperProps={{
                sx: (t) => ({
                    borderRadius: isSmDown ? 0 : 4,
                    overflow: "hidden",
                    boxShadow: isSmDown ? "none" : "0 22px 60px rgba(0,0,0,0.20)",
                    border: isSmDown
                        ? "none"
                        : `1px solid ${alpha(t.palette.text.primary, 0.08)}`,

                    // ✅ Fix: footer không bị trôi/mất khi resize
                    display: "flex",
                    flexDirection: "column",
                    height: isSmDown ? "100%" : "min(720px, calc(100vh - 64px))",
                }),
            }}
        >
            {/* Header */}
            <Box
                sx={(t) => ({
                    px: isSmDown ? 2 : 2.5,
                    py: isSmDown ? 1.75 : 2,
                    position: "relative",
                    background: `linear-gradient(135deg, ${alpha(
                        t.palette.primary.main,
                        0.12
                    )} 0%, ${alpha(t.palette.background.paper, 1)} 60%)`,
                    flexShrink: 0,
                })}
            >
                <Stack spacing={0.75} sx={{ pr: 6 }}>
                    <Typography
                        variant={isSmDown ? "subtitle1" : "h6"}
                        sx={{ fontWeight: 950, lineHeight: 1.15 }}
                    >
                        Chọn phần bạn muốn làm
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <InfoOutlinedIcon
                            fontSize="small"
                            style={{ marginTop: 2, opacity: 0.8 }}
                        />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: isSmDown ? 13 : "inherit" }}
                        >
                            Học liệu có nhiều phần. Chọn <b>1</b> phần để Fly AI tạo đề
                            tập trung đúng nội dung.
                        </Typography>
                    </Stack>
                </Stack>

                <IconButton
                    aria-label="Đóng"
                    onClick={handleClose}
                    disabled={loading}
                    sx={(t) => ({
                        position: "absolute",
                        top: isSmDown ? 8 : 10,
                        right: isSmDown ? 8 : 10,
                        bgcolor: alpha(t.palette.text.primary, 0.05),
                        "&:hover": {
                            bgcolor: alpha(t.palette.text.primary, 0.08),
                        },
                    })}
                >
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            <Divider />

            {/* Body (scroll ở đây để footer luôn hiện) */}
            <Box
                sx={{
                    p: isSmDown ? 2 : 2.5,
                    flex: 1,
                    overflow: "auto",
                    minHeight: 0, // ✅ cực quan trọng với flex + overflow
                }}
            >
                <Stack
                    direction={isSmDown ? "column" : "row"}
                    spacing={1}
                    alignItems={isSmDown ? "stretch" : "center"}
                >
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
                        sx={(t) => ({
                            borderRadius: 999,
                            bgcolor: alpha(t.palette.text.primary, 0.06),
                            fontWeight: 800,
                            alignSelf: isSmDown ? "flex-start" : "center",
                        })}
                    />
                </Stack>

                <Box sx={{ mt: 1.75 }} />

                {/* List: không tự scroll nữa (để body scroll), tránh mất footer */}
                <Box
                    sx={(t) => ({
                        pr: 0.5,
                        borderRadius: 3,
                        "&::-webkit-scrollbar": { width: 10 },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: 999,
                            background: alpha(t.palette.text.primary, 0.12),
                            border: `3px solid ${t.palette.background.paper}`,
                        },
                    })}
                >
                    <Stack spacing={1.25}>
                        {filteredTopics.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={(t) => ({
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: alpha(t.palette.warning.main, 0.06),
                                    borderColor: alpha(t.palette.warning.main, 0.25),
                                })}
                            >
                                <Typography sx={{ fontWeight: 900 }}>
                                    Không có kết quả
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Thử từ khóa khác hoặc xóa ô tìm kiếm.
                                </Typography>
                            </Paper>
                        ) : (
                            filteredTopics.map((t) => (
                                <TopicCard
                                    key={t?.id}
                                    t={t}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                    compact={compact}
                                />
                            ))
                        )}
                    </Stack>
                </Box>

                <Divider sx={{ my: isSmDown ? 1.5 : 2 }} />

                <Stack
                    direction={isSmDown ? "column" : "row"}
                    spacing={isSmDown ? 1 : 1}
                    alignItems={isSmDown ? "flex-start" : "center"}
                    justifyContent="space-between"
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isSmDown ? 12.5 : "inherit" }}
                    >
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

            {/* Footer (fixed) */}
            <Box
                sx={(t) => ({
                    px: isSmDown ? 2 : 2.5,
                    py: isSmDown ? 1.5 : 1.75,
                    flexShrink: 0,
                    backgroundColor: t.palette.background.paper,
                })}
            >
                <Stack
                    direction={isSmDown ? "column" : "row"}
                    spacing={1}
                    justifyContent="flex-end"
                >
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        fullWidth={isSmDown}
                        sx={{ borderRadius: 999, px: 2.2 }}
                    >
                        Hủy
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={!selectedId || loading}
                        startIcon={loading ? <CircularProgress size={16} /> : null}
                        fullWidth={isSmDown}
                        sx={{
                            borderRadius: 999,
                            px: 2.4,
                            fontWeight: 900,
                            boxShadow: "0 12px 22px rgba(0,0,0,0.14)",
                            textTransform: "none",
                        }}
                    >
                        {loading ? "Đang tạo đề..." : "Tạo đề theo phần đã chọn"}
                    </Button>
                </Stack>
            </Box>
        </Dialog>
    );
}