import React, { useMemo } from "react";
import { Box, IconButton, MenuItem, Select, Stack, Button } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

/**
 * Build page items with ellipsis:
 * Example: 1 … 5 6 7 … 20
 */
function buildPageItems(page, totalPages, siblingCount = 1) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const items = [];
    const left = Math.max(2, page - siblingCount);
    const right = Math.min(totalPages - 1, page + siblingCount);

    items.push(1);

    if (left > 2) items.push("…");

    for (let p = left; p <= right; p++) items.push(p);

    if (right < totalPages - 1) items.push("…");

    items.push(totalPages);

    return items;
}

export default function AppPagination({
                                          page,
                                          pageSize,
                                          total,

                                          onPageChange,
                                          onPageSizeChange,

                                          pageSizeOptions = [10, 20, 50, 100],
                                          showPageSize = true, // ✅ mặc định có, muốn ẩn thì truyền false
                                          loading = false,
                                      }) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));
    const safePage = Math.min(Math.max(1, page || 1), totalPages);

    const pageItems = useMemo(() => buildPageItems(safePage, totalPages, 1), [safePage, totalPages]);

    const canPrev = safePage > 1;
    const canNext = safePage < totalPages;

    const goTo = (p) => {
        const next = Math.min(Math.max(1, p), totalPages);
        if (next !== safePage) onPageChange?.(next);
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: 3,
                bgcolor: "transparent",
            }}
        >
            {/* Optional minimal pageSize select */}
            {showPageSize && (
                <Select
                    size="small"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                    disabled={loading}
                    sx={{
                        height: 34,
                        minWidth: 76,
                        borderRadius: 999,
                        bgcolor: "#fff",
                        "& .MuiSelect-select": {
                            py: 0.5,
                            fontWeight: 800,
                            color: "#1B2559",
                        },
                    }}
                >
                    {pageSizeOptions.map((opt) => (
                        <MenuItem key={opt} value={opt} sx={{ fontWeight: 700 }}>
                            {opt}
                        </MenuItem>
                    ))}
                </Select>
            )}

            {/* Prev */}
            <IconButton
                onClick={() => goTo(safePage - 1)}
                disabled={!canPrev || loading}
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    bgcolor: "#fff",
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                    transition: "all 160ms ease",
                    "&:hover": { bgcolor: "rgba(46, 45, 132, 0.06)" },
                }}
            >
                <ChevronLeftRoundedIcon fontSize="small" />
            </IconButton>

            {/* Page numbers */}
            <Stack direction="row" spacing={0.6} alignItems="center">
                {pageItems.map((it, idx) => {
                    const isEllipsis = it === "…";
                    const isActive = it === safePage;

                    if (isEllipsis) {
                        return (
                            <Box
                                key={`e-${idx}`}
                                sx={{
                                    px: 0.6,
                                    color: "#A3AED0",
                                    fontWeight: 900,
                                    userSelect: "none",
                                }}
                            >
                                …
                            </Box>
                        );
                    }

                    return (
                        <Button
                            key={it}
                            onClick={() => goTo(it)}
                            disabled={loading}
                            variant={isActive ? "contained" : "outlined"}
                            sx={{
                                minWidth: 34,
                                height: 34,
                                borderRadius: 999,
                                px: 1,
                                py: 0,
                                fontWeight: 900,
                                textTransform: "none",
                                borderColor: isActive ? "transparent" : "rgba(15, 23, 42, 0.10)",
                                color: isActive ? "#fff" : "#1B2559",
                                bgcolor: isActive ? "#2E2D84" : "#fff",
                                boxShadow: isActive ? "0 10px 20px rgba(46, 45, 132, 0.20)" : "none",
                                transition: "all 160ms ease",
                                "&:hover": {
                                    bgcolor: isActive ? "#26256F" : "rgba(46, 45, 132, 0.06)",
                                    borderColor: isActive ? "transparent" : "rgba(46, 45, 132, 0.25)",
                                },
                            }}
                        >
                            {it}
                        </Button>
                    );
                })}
            </Stack>

            {/* Next */}
            <IconButton
                onClick={() => goTo(safePage + 1)}
                disabled={!canNext || loading}
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    bgcolor: "#fff",
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                    transition: "all 160ms ease",
                    "&:hover": { bgcolor: "rgba(46, 45, 132, 0.06)" },
                }}
            >
                <ChevronRightRoundedIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}
