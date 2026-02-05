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

/**
 * ✅ FIX DỨT ĐIỂM:
 * - KHÔNG nhận classes/modules từ props nữa
 * - TỰ FETCH options giống AdminUserList
 * - Hiển thị theo className / moduleName
 * - value vẫn là id → không gãy filter logic
 */
export default function AdminDashboardFilterBar({
                                                    filters,
                                                    loading = false,
                                                    onChange,
                                                    onReset,
                                                    onAutoApply,
                                                }) {
    // ===== LOGIC (GIỮ NGUYÊN) =====
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

    // ===== OPTIONS STATE (GIỐNG ADMIN USER LIST) =====
    const [classOptions, setClassOptions] = useState([
        { value: "", label: "Tất cả lớp" },
    ]);
    const [moduleOptions, setModuleOptions] = useState([
        { value: "", label: "Tất cả module" },
    ]);

    // ===== FETCH OPTIONS =====
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const [classesRes, modulesRes] = await Promise.all([
                    getAllClassesApi(),
                    getAllModulesApi(),
                ]);

                if (!mounted) return;

                // ---- classes ----
                const classList = classesRes?.data ?? classesRes ?? [];
                const classOpts = classList
                    .map((c) => ({
                        value: String(c.id),
                        label:
                            c.className ??
                            c.name ??
                            c.class?.name ??
                            c.class?.className ??
                            "",
                    }))
                    .filter((o) => o.label);

                setClassOptions([
                    { value: "", label: "Tất cả lớp" },
                    ...classOpts,
                ]);

                // ---- modules ----
                const moduleList = modulesRes?.data ?? modulesRes ?? [];
                const moduleOpts = moduleList
                    .map((m) => ({
                        value: String(m.id),
                        label:
                            m.moduleName ??
                            m.name ??
                            m.module?.name ??
                            m.module?.moduleName ??
                            "",
                    }))
                    .filter((o) => o.label);

                setModuleOptions([
                    { value: "", label: "Tất cả module" },
                    ...moduleOpts,
                ]);
            } catch {
                // ignore – giữ default "Tất cả"
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

    // ===== UI ONLY =====
    const FIELD_HEIGHT = "45px";

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
            paddingRight: "8px",
        },
    };

    const filterBtnSx = {
        borderRadius: "10px",
        textTransform: "none",
        fontWeight: 900,
        height: FIELD_HEIGHT,
        minWidth: 150,
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
            options.find((o) => String(o.value) === String(value)) ||
            options[0] ||
            null;

        return (
            <Autocomplete
                options={options}
                value={selected}
                disableClearable
                autoHighlight
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(o, v) =>
                    String(o.value) === String(v.value)
                }
                onChange={(e, nv) =>
                    onChangeValue(nv?.value ?? "")
                }
                sx={{ width: "100%" }}
                renderInput={(params) => (
                    <TextField {...params} label={label} sx={inputSx} />
                )}
            />
        );
    };

    return (
        <Box sx={glassSx}>
            {/* HEADER */}
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                    <Typography sx={{ fontSize: 28, fontWeight: 950 }}>
                        Admin Dashboard
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        Tổng quan hệ thống học viên
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant={open ? "contained" : "outlined"}
                        startIcon={<FilterList />}
                        onClick={() => setOpen((v) => !v)}
                        disabled={loading}
                        sx={filterBtnSx}
                    >
                        Bộ lọc
                    </Button>

                    <Tooltip title="Đặt lại bộ lọc">
                        <IconButton
                            onClick={onReset}
                            disabled={loading}
                            sx={resetIconSx}
                        >
                            <RestartAltRounded />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* FILTERS */}
            <Collapse in={open} sx={{ mt: 2 }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(3, 1fr)",
                        },
                        gap: 2,
                    }}
                >
                    <TextField
                        select
                        label="Khoảng thời gian"
                        value={filters.preset ?? "7d"}
                        onChange={(e) =>
                            onPresetChange(e.target.value)
                        }
                        sx={inputSx}
                    >
                        {presetOptions.map((p) => (
                            <MenuItem key={p.value} value={p.value}>
                                {p.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {renderAutocomplete(
                        "Lớp",
                        classOptions,
                        filters.classId ?? "",
                        (v) => patch({ classId: v })
                    )}

                    {renderAutocomplete(
                        "Module",
                        moduleOptions,
                        filters.moduleId ?? "",
                        (v) => patch({ moduleId: v })
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}
