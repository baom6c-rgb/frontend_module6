// src/features/admin/components/dashboard/AdminDashboardFilterBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { getAllClassesApi } from "../../../../api/classApi";
import { getAllModulesApi } from "../../../../api/moduleApi";

export default function AdminDashboardFilterBar({
                                                    filters,
                                                    loading = false,
                                                    onChange,
                                                    onReset,
                                                    onAutoApply,
                                                }) {
    const timerRef = useRef(null);
    const [open, setOpen] = useState(true);

    const presetOptions = useMemo(
        () => [
            { value: "7d", label: "7 ngày gần nhất" },
            { value: "30d", label: "30 ngày gần nhất" },
            { value: "custom", label: "Tùy chọn" },
        ],
        []
    );

    const [classOptions, setClassOptions] = useState([{ value: "", label: "Tất cả lớp" }]);
    const [moduleOptions, setModuleOptions] = useState([{ value: "", label: "Tất cả module" }]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const [classesRes, modulesRes] = await Promise.all([
                    getAllClassesApi(),
                    getAllModulesApi(),
                ]);

                if (!mounted) return;

                const classList = classesRes?.data ?? classesRes ?? [];
                const classOpts = classList
                    .map((c) => ({
                        value: String(c.id),
                        label: c.className ?? c.name ?? c.class?.name ?? c.class?.className ?? "",
                    }))
                    .filter((o) => o.label);

                setClassOptions([{ value: "", label: "Tất cả lớp" }, ...classOpts]);

                const moduleList = modulesRes?.data ?? modulesRes ?? [];
                const moduleOpts = moduleList
                    .map((m) => ({
                        value: String(m.id),
                        label: m.moduleName ?? m.name ?? m.module?.name ?? m.module?.moduleName ?? "",
                    }))
                    .filter((o) => o.label);

                setModuleOptions([{ value: "", label: "Tất cả module" }, ...moduleOpts]);
            } catch {
                // ignore
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

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

        patch({
            preset,
            fromDate: from.toISOString().slice(0, 10),
            toDate: to.toISOString().slice(0, 10),
        });
    };

    const FIELD_HEIGHT = { xs: "42px", sm: "45px" };
    const isCustom = (filters?.preset ?? "7d") === "custom";
    const safeDate = (s) => (s ? String(s).slice(0, 10) : "");

    const glassSx = {
        borderRadius: { xs: 2.5, sm: 3 },
        p: { xs: 1.5, sm: 2, md: 2.5 },
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
            fontWeight: 500,
            color: "rgba(27,37,89,0.80)",
            fontSize: { xs: "13px", sm: "14px" },
        },
        "& .MuiOutlinedInput-input": {
            paddingTop: 0,
            paddingBottom: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            fontWeight: 500,
            color: "#1B2559",
            fontSize: { xs: "13px", sm: "14px" },
        },
        "& .MuiSelect-select": {
            paddingTop: 0,
            paddingBottom: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            fontWeight: 500,
            color: "#1B2559",
            fontSize: { xs: "13px", sm: "14px" },
        },
    };

    const filterBtnSx = {
        borderRadius: "10px",
        textTransform: "none",
        fontWeight: 900,
        height: FIELD_HEIGHT,
        minWidth: { xs: 100, sm: 130, md: 150 },
        fontSize: { xs: "13px", sm: "14px" },
        px: { xs: 1.5, sm: 2 },
    };

    const resetIconSx = {
        borderRadius: "10px",
        height: FIELD_HEIGHT,
        width: FIELD_HEIGHT,
        border: "1px solid",
        borderColor: "divider",
    };

    const renderAutocomplete = (label, options, value, onChangeValue) => {
        const selected =
            options.find((o) => String(o.value) === String(value)) || options[0] || null;

        return (
            <Autocomplete
                options={options}
                value={selected}
                disableClearable
                autoHighlight
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
                onChange={(e, nv) => onChangeValue(nv?.value ?? "")}
                sx={{ width: "100%" }}
                renderInput={(params) => <TextField {...params} label={label} sx={inputSx} />}
            />
        );
    };

    return (
        <Box sx={glassSx}>
            {/* TITLE + ACTIONS */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "flex-start" }}
                justifyContent="space-between"
                spacing={{ xs: 1.5, sm: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: { xs: 20, sm: 24, md: 30 },
                            fontWeight: 950,
                            lineHeight: 1.12,
                            color: "#1B2559",
                            letterSpacing: 0.2,
                        }}
                    >
                        Trang chủ Hệ thống
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.45,
                            fontSize: { xs: 12.5, sm: 13.5, md: 14.5 },
                            fontWeight: 700,
                            color: "rgba(108,117,125,0.95)",
                        }}
                    >
                        Tổng quan hệ thống quản lý học viên
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button
                        variant={open ? "contained" : "outlined"}
                        startIcon={<FilterList sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                        onClick={() => setOpen((v) => !v)}
                        disabled={loading}
                        sx={filterBtnSx}
                    >
                        Bộ lọc
                    </Button>

                    <Tooltip title="Đặt lại bộ lọc">
                        <IconButton onClick={onReset} disabled={loading} sx={resetIconSx}>
                            <RestartAltRounded sx={{ fontSize: { xs: 20, sm: 22 } }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* FILTERS */}
            <Collapse in={open} sx={{ mt: 2 }}>
                {/* Row 1: 3 filters */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                        gap: { xs: 1.5, sm: 2 },
                    }}
                >
                    <TextField
                        select
                        label="Khoảng thời gian"
                        value={filters.preset ?? "7d"}
                        onChange={(e) => onPresetChange(e.target.value)}
                        sx={inputSx}
                    >
                        {presetOptions.map((p) => (
                            <MenuItem key={p.value} value={p.value}>
                                {p.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {renderAutocomplete("Lớp", classOptions, filters.classId ?? "", (v) =>
                        patch({ classId: v })
                    )}

                    {renderAutocomplete("Module", moduleOptions, filters.moduleId ?? "", (v) =>
                        patch({ moduleId: v })
                    )}
                </Box>

                {/* Row 2: Date range (only when custom) */}
                <Collapse in={isCustom} timeout={180} unmountOnExit>
                    <Box
                        sx={{
                            mt: { xs: 1.5, sm: 2 },
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                            gap: { xs: 1.5, sm: 2 },
                        }}
                    >
                        <TextField
                            type="date"
                            label="Từ ngày"
                            value={safeDate(filters.fromDate)}
                            onChange={(e) => patch({ fromDate: e.target.value })}
                            sx={inputSx}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="date"
                            label="Đến ngày"
                            value={safeDate(filters.toDate)}
                            onChange={(e) => patch({ toDate: e.target.value })}
                            sx={inputSx}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </Collapse>
            </Collapse>
        </Box>
    );
}