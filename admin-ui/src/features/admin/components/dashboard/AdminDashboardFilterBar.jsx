// src/features/admin/components/dashboard/AdminDashboardFilterBar.jsx
import React, { useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Collapse,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { FilterList, RestartAltRounded } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";

/**
 * ✅ QUY TẮC: không chỉnh business logic.
 * Giữ nguyên:
 * - debounce auto apply
 * - preset logic 7d/30d/custom
 * - custom mới xổ date range
 * - flow patch() -> onChange + onAutoApply
 *
 * Chỉ đổi UI:
 * - Nút đóng/mở bộ lọc đồng bộ style FilterPanel
 * - Class/Module thành combobox search (Autocomplete)
 */
export default function AdminDashboardFilterBar({
                                                    classes = [],
                                                    modules = [],
                                                    filters,
                                                    loading = false,
                                                    onChange,
                                                    onReset,
                                                    onAutoApply,
                                                }) {
    // ===== LOGIC (GIỮ NGUYÊN) =====
    const timerRef = useRef(null);

    // UI-only: toggle panel
    const [open, setOpen] = useState(true);

    const presetOptions = useMemo(
        () => [
            { value: "7d", label: "7 ngày gần nhất" },
            { value: "30d", label: "30 ngày gần nhất" },
            { value: "custom", label: "Tùy chọn" },
        ],
        []
    );

    const classOptions = useMemo(() => {
        const base = [{ value: "", label: "Tất cả lớp" }];
        const mapped = classes.map((c) => ({ value: String(c.id), label: c.name }));
        return [...base, ...mapped];
    }, [classes]);

    const moduleOptions = useMemo(() => {
        const base = [{ value: "", label: "Tất cả module" }];
        const mapped = modules.map((m) => ({ value: String(m.id), label: m.name }));
        return [...base, ...mapped];
    }, [modules]);

    const applyNext = (next) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onAutoApply?.(next), 120);
    };

    const patch = (p) => {
        const next = { ...filters, ...p };
        onChange?.(next);
        applyNext(next);
    };

    const onPresetChange = (preset) => {
        if (preset === "custom") {
            patch({ preset: "custom" });
            return;
        }

        const now = new Date();
        const to = new Date(now);
        const from = new Date(now);
        from.setDate(from.getDate() - (preset === "30d" ? 29 : 6));

        const toDate = to.toISOString().slice(0, 10);
        const fromDate = from.toISOString().slice(0, 10);

        patch({ preset, fromDate, toDate });
    };

    // ===== UI ONLY =====
    const FIELD_HEIGHT = "45px"; // đồng bộ vibe FilterPanel

    const glassSx = {
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(227,232,239,0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
    };

    const inputSx = {
        width: "100%",
        "& .MuiOutlinedInput-root": {
            height: FIELD_HEIGHT,
            borderRadius: "10px",
            background: "rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            paddingRight: "8px",
        },
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(227,232,239,0.50)",
        },
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(46,45,132,0.55)",
        },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2E2D84",
            borderWidth: 2,
        },
        "& .MuiInputLabel-root": {
            fontWeight: 850,
            color: "rgba(27,37,89,0.80)",
        },
        "& .MuiOutlinedInput-input": {
            paddingTop: 0,
            paddingBottom: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            fontWeight: 850,
            color: "#1B2559",
        },
        "& .MuiSelect-select": {
            paddingTop: 0,
            paddingBottom: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            fontWeight: 850,
            color: "#1B2559",
        },
    };

    const dateLabelSx = {
        ...inputSx,
        "& .MuiInputLabel-root": {
            transform: "translate(14px, -9px) scale(0.75)",
            backgroundColor: "rgba(255,255,255,0.14)",
            padding: "0 6px",
            borderRadius: 999,
            fontWeight: 850,
            color: "rgba(27,37,89,0.80)",
        },
    };

    // ✅ Nút đóng/mở đồng bộ FilterPanel
    const filterBtnSx = {
        borderRadius: "10px",
        textTransform: "none",
        fontWeight: 900,
        height: FIELD_HEIGHT,
        whiteSpace: "nowrap",
        minWidth: 150,
    };

    const resetIconSx = {
        borderRadius: "10px",
        height: FIELD_HEIGHT,
        width: FIELD_HEIGHT,
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover" },
    };

    // ✅ Autocomplete renderer (UI-only) - vẫn patch() như cũ
    const renderAutocomplete = (fieldLabel, options, currentValue, onValueChange) => {
        const selected = options.find((o) => String(o.value) === String(currentValue)) || options[0] || null;

        return (
            <Autocomplete
                options={options}
                value={selected}
                onChange={(e, newValue) => onValueChange?.(newValue?.value ?? options?.[0]?.value ?? "")}
                loading={loading}
                getOptionLabel={(option) => option?.label || ""}
                isOptionEqualToValue={(option, value) => String(option?.value) === String(value?.value)}
                disableClearable
                autoHighlight
                sx={{
                    width: "100%",
                    ...inputSx,
                    "& .MuiOutlinedInput-root": {
                        height: FIELD_HEIGHT,
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.14)",
                        paddingRight: "8px",
                        paddingTop: 0,
                        paddingBottom: 0,
                    },
                    "& .MuiAutocomplete-input": {
                        padding: "0 !important",
                    },
                }}
                renderInput={(params) => (
                    <TextField {...params} fullWidth label={fieldLabel} sx={inputSx} />
                )}
            />
        );
    };

    return (
        <Box sx={glassSx}>
            {/* ===== TITLE + ACTIONS ===== */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: { xs: 24, md: 30 },
                            fontWeight: 950,
                            lineHeight: 1.12,
                            color: "#1B2559",
                            letterSpacing: 0.2,
                        }}
                    >
                        Admin Dashboard
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.45,
                            fontSize: { xs: 13.5, md: 14.5 },
                            fontWeight: 850,
                            color: "rgba(108,117,125,0.95)",
                        }}
                    >
                        Tổng quan hệ thống học viên
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    {/* ✅ Toggle giống FilterPanel */}
                    <Tooltip title={open ? "Ẩn bộ lọc" : "Mở bộ lọc"}>
                        <Button
                            variant={open ? "contained" : "outlined"}
                            startIcon={<FilterList />}
                            onClick={() => setOpen((v) => !v)}
                            disabled={loading}
                            sx={{
                                ...filterBtnSx,
                                width: { xs: "100%", sm: "auto" },
                            }}
                        >
                            Bộ lọc
                        </Button>
                    </Tooltip>

                    <Tooltip title="Đặt lại bộ lọc">
                        <IconButton onClick={onReset} disabled={loading} sx={resetIconSx} aria-label="reset-filter">
                            <RestartAltRounded />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* ===== FILTERS ===== */}
            <Collapse in={open} sx={{ mt: 2 }}>
                {/* Row chính: 3 cột đều nhau, full width */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                        gap: 2,
                        width: "100%",
                    }}
                >
                    {/* Khoảng thời gian: giữ select như cũ */}
                    <TextField
                        select
                        fullWidth
                        label="Khoảng thời gian"
                        value={filters.preset ?? "7d"}
                        onChange={(e) => onPresetChange(e.target.value)}
                        disabled={loading}
                        sx={inputSx}
                    >
                        {presetOptions.map((p) => (
                            <MenuItem key={p.value} value={p.value}>
                                {p.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* ✅ Lớp: Autocomplete searchable */}
                    {renderAutocomplete("Lớp", classOptions, filters.classId ?? "", (v) => patch({ classId: v }))}

                    {/* ✅ Module: Autocomplete searchable */}
                    {renderAutocomplete("Module", moduleOptions, filters.moduleId ?? "", (v) => patch({ moduleId: v }))}
                </Box>

                {/* Date range: logic giữ nguyên preset === custom */}
                <Collapse in={filters.preset === "custom"} sx={{ mt: 2 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                            gap: 2,
                            width: "100%",
                        }}
                    >
                        <TextField
                            fullWidth
                            type="date"
                            label="Từ ngày"
                            value={filters.fromDate ?? ""}
                            onChange={(e) => patch({ fromDate: e.target.value })}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={dateLabelSx}
                        />

                        <TextField
                            fullWidth
                            type="date"
                            label="Đến ngày"
                            value={filters.toDate ?? ""}
                            onChange={(e) => patch({ toDate: e.target.value })}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            sx={dateLabelSx}
                        />
                    </Box>
                </Collapse>
            </Collapse>
        </Box>
    );
}
