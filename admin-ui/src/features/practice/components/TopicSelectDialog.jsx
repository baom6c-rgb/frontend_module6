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
    Button,
    Checkbox,
    CircularProgress,
    Chip,
    Tooltip,
    Fade,
    alpha,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import SelectAllRoundedIcon from "@mui/icons-material/SelectAllRounded";
import DeselectRoundedIcon from "@mui/icons-material/DeselectRounded";

/* ─────────────────────────────────────────────
   TopicCard
───────────────────────────────────────────── */
const TopicCard = memo(function TopicCard({ t, selectedIds, onToggle, compact }) {
    const theme = useTheme();
    const id = t?.id ?? "";
    const isSelected = selectedIds.includes(id);

    return (
        <Paper
            variant="outlined"
            onClick={() => onToggle?.(id)}
            elevation={0}
            sx={{
                p: compact ? 1.5 : 2,
                borderRadius: 2.5,
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s, transform 0.15s",
                borderWidth: 1.5,
                borderStyle: "solid",
                borderColor: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.09)",
                background: isSelected
                    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.06)
                    : theme.palette.background.paper,
                boxShadow: isSelected
                    ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`
                    : "none",
                "&:hover": {
                    borderColor: isSelected ? theme.palette.primary.main : theme.palette.primary.light,
                    boxShadow: isSelected
                        ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`
                        : `0 2px 12px ${alpha(theme.palette.common.black, 0.08)}`,
                    transform: "translateY(-1px)",
                },
                display: "flex",
                gap: 1.5,
                alignItems: "flex-start",
                userSelect: "none",
            }}
        >
            {/* Checkbox */}
            <Checkbox
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle?.(id)}
                size="small"
                icon={
                    <Box sx={{
                        width: 20, height: 20, borderRadius: 1,
                        border: `2px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.20)"}`,
                        bgcolor: "transparent",
                    }} />
                }
                checkedIcon={
                    <CheckCircleRoundedIcon
                        sx={{ fontSize: 22, color: theme.palette.primary.main }}
                    />
                }
                sx={{ p: 0, mt: 0.15, flexShrink: 0 }}
            />

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: compact ? 14 : 15,
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: isSelected ? "primary.main" : "text.primary",
                        transition: "color 0.15s",
                    }}
                    title={t?.title || ""}
                >
                    {t?.title || "Chủ đề"}
                </Typography>

                {t?.summary ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mt: 0.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            fontSize: compact ? 12.5 : 13,
                            lineHeight: 1.5,
                        }}
                        title={t.summary}
                    >
                        {t.summary}
                    </Typography>
                ) : null}
            </Box>
        </Paper>
    );
});

/* ─────────────────────────────────────────────
   EmptyState
───────────────────────────────────────────── */
function EmptyState({ hasQuery }) {
    return (
        <Box
            sx={{
                py: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                color: "text.disabled",
            }}
        >
            <LayersRoundedIcon sx={{ fontSize: 44, opacity: 0.4 }} />
            <Typography variant="body2" align="center" color="text.secondary">
                {hasQuery ? "Không tìm thấy phần nào phù hợp." : "Chưa có chủ đề nào."}
            </Typography>
        </Box>
    );
}

/* ─────────────────────────────────────────────
   Main Dialog
───────────────────────────────────────────── */
export default function TopicSelectDialog({
                                              open,
                                              topics = [],
                                              loading = false,
                                              onClose,
                                              onConfirm,
                                          }) {
    const theme = useTheme();
    const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
    const compact = useMediaQuery(theme.breakpoints.down("md"));

    const [selectedIds, setSelectedIds] = useState([]);
    const [q, setQ] = useState("");

    const normalizedTopics = useMemo(() => (Array.isArray(topics) ? topics : []), [topics]);

    /* Reset state khi đóng */
    useEffect(() => {
        if (!open) {
            setSelectedIds([]);
            setQ("");
        }
    }, [open]);

    /* Lọc id còn tồn tại khi topics reload */
    useEffect(() => {
        if (!open) return;
        setSelectedIds((prev) => prev.filter((id) => normalizedTopics.some((t) => t?.id === id)));
    }, [open, normalizedTopics]);

    const filteredTopics = useMemo(() => {
        const keyword = q.trim().toLowerCase();
        if (!keyword) return normalizedTopics;
        return normalizedTopics.filter((t) => {
            const title = String(t?.title || "").toLowerCase();
            const summary = String(t?.summary || "").toLowerCase();
            return title.includes(keyword) || summary.includes(keyword);
        });
    }, [normalizedTopics, q]);

    const toggleSelect = (id) => {
        if (!id) return;
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const allFilteredIds = filteredTopics.map((t) => t?.id).filter(Boolean);
        const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
        } else {
            setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
        }
    };

    const handleConfirm = () => {
        if (loading || !selectedIds.length) return;
        onConfirm?.(selectedIds);
    };

    const allFilteredSelected =
        filteredTopics.length > 0 &&
        filteredTopics.every((t) => selectedIds.includes(t?.id));

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="sm"
            fullScreen={isSmDown}
            TransitionComponent={Fade}
            transitionDuration={200}
            PaperProps={{
                elevation: 8,
                sx: {
                    borderRadius: isSmDown ? 0 : 3,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    // Chiều cao tối đa – cuộn nội dung bên trong
                    maxHeight: isSmDown ? "100dvh" : "85vh",
                    height: isSmDown ? "100dvh" : "auto",
                    m: isSmDown ? 0 : 2,
                },
            }}
        >
            {/* ── HEADER ── */}
            <Box
                sx={{
                    px: { xs: 2, sm: 3 },
                    pt: { xs: 2, sm: 2.5 },
                    pb: 2,
                    background:
                        theme.palette.mode === "dark"
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.25)} 0%, ${alpha(theme.palette.background.paper, 0)} 70%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.18)} 0%, ${alpha(theme.palette.background.paper, 0)} 70%)`,
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <AutoAwesomeRoundedIcon
                                fontSize="small"
                                sx={{ color: "primary.main", opacity: 0.85 }}
                            />
                            <Typography
                                variant={compact ? "subtitle1" : "h6"}
                                sx={{ fontWeight: 800, lineHeight: 1.3 }}
                            >
                                Chọn phần bạn muốn làm
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                            Chọn <b>một hoặc nhiều phần</b> để Fly AI tạo đề tổng hợp cho bạn.
                        </Typography>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={onClose}
                        disabled={loading}
                        sx={{
                            mt: -0.5,
                            color: "text.secondary",
                            "&:hover": { bgcolor: alpha(theme.palette.text.secondary, 0.08) },
                        }}
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            <Divider />

            {/* ── BODY ── */}
            <Box
                sx={{
                    px: { xs: 2, sm: 3 },
                    pt: 2,
                    pb: 1,
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                    // Custom scrollbar
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: alpha(theme.palette.text.primary, 0.12),
                        borderRadius: 8,
                    },
                }}
            >
                {/* Search + Select-all */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    mb={2}
                >
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm theo tiêu đề hoặc mô tả..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        disabled={loading}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2, fontSize: 14 },
                        }}
                    />

                    {normalizedTopics.length > 1 && (
                        <Tooltip
                            title={allFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                            placement="top"
                        >
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handleSelectAll}
                                disabled={loading || filteredTopics.length === 0}
                                startIcon={
                                    allFilteredSelected ? (
                                        <DeselectRoundedIcon fontSize="small" />
                                    ) : (
                                        <SelectAllRoundedIcon fontSize="small" />
                                    )
                                }
                                sx={{
                                    whiteSpace: "nowrap",
                                    borderRadius: 2,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    px: 1.5,
                                }}
                            >
                                {allFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                            </Button>
                        </Tooltip>
                    )}
                </Stack>

                {/* Topic list */}
                {filteredTopics.length === 0 ? (
                    <EmptyState hasQuery={!!q.trim()} />
                ) : (
                    <Stack spacing={1.25}>
                        {filteredTopics.map((t) => (
                            <TopicCard
                                key={t?.id}
                                t={t}
                                selectedIds={selectedIds}
                                onToggle={toggleSelect}
                                compact={compact}
                            />
                        ))}
                    </Stack>
                )}

                <Box sx={{ height: 12 }} />
            </Box>

            <Divider />

            {/* ── FOOTER ── */}
            <Box
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.75, sm: 2 },
                    bgcolor:
                        theme.palette.mode === "dark"
                            ? alpha(theme.palette.background.default, 0.6)
                            : alpha(theme.palette.grey[50], 0.8),
                    flexShrink: 0,
                }}
            >
                <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                >
                    {/* Selection badge */}
                    <Box>
                        {selectedIds.length > 0 ? (
                            <Chip
                                label={`Đã chọn ${selectedIds.length} phần`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: 12.5 }}
                            />
                        ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 12.5 }}>
                                Chưa chọn phần nào
                            </Typography>
                        )}
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} justifyContent={{ xs: "stretch", sm: "flex-end" }}>
                        <Button
                            onClick={onClose}
                            disabled={loading}
                            sx={{
                                flex: { xs: 1, sm: "none" },
                                borderRadius: 2,
                                fontWeight: 600,
                            }}
                        >
                            Hủy
                        </Button>

                        <Button
                            variant="contained"
                            disableElevation
                            disabled={!selectedIds.length || loading}
                            onClick={handleConfirm}
                            startIcon={
                                loading ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <AutoAwesomeRoundedIcon fontSize="small" />
                                )
                            }
                            sx={{
                                flex: { xs: 1, sm: "none" },
                                fontWeight: 700,
                                borderRadius: 2,
                                px: { xs: 2, sm: 2.5 },
                                background: !selectedIds.length || loading
                                    ? undefined
                                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: !selectedIds.length || loading ? "none" : `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                                "&:hover": {
                                    boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.4)}`,
                                },
                                transition: "box-shadow 0.2s",
                            }}
                        >
                            {loading ? "Đang tạo đề..." : "Tạo đề ngay"}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Dialog>
    );
}