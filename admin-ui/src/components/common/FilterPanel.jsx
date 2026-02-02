import React, { useMemo } from "react";
import {
    Box,
    Button,
    Collapse,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { Search, FilterList, RestartAltRounded } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";

// =====================================================
// 1) HEIGHT + COMMON STYLE (đặt đầu file, trước export)
// =====================================================

// --- SỬA ĐOẠN NÀY ---
const FIELD_HEIGHT = "45px"; // giảm chiều cao input (mặc định 56px)

const commonInputSx = {
    width: "100%",
    "& .MuiOutlinedInput-root": {
        height: FIELD_HEIGHT,
        borderRadius: "8px",
        backgroundColor: "#fff",
        paddingRight: "8px",
    },

    // ✅ căn lại label theo chiều cao mới
    "& .MuiInputLabel-root": {
        transform: "translate(14px, 11px) scale(1)",
        "&.Mui-focused, &.MuiFormLabel-filled": {
            transform: "translate(14px, -9px) scale(0.75)",
            backgroundColor: "#fff",
            padding: "0 4px",
        },
    },

    // ✅ căn text input giữa theo chiều cao 45px
    "& .MuiOutlinedInput-input": {
        paddingTop: 0,
        paddingBottom: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
    },

    // ✅ căn text select giữa
    "& .MuiSelect-select": {
        paddingTop: 0,
        paddingBottom: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
    },
};

export default function FilterPanel({
                                        title,
                                        search,
                                        showFilters,
                                        onToggleFilters,
                                        onReset,
                                        resetTooltip = "Đặt lại bộ lọc",
                                        fields,
                                    }) {
    const moduleField = fields?.module;
    const classField = fields?.class;
    const statusField = fields?.status;
    const startDateField = fields?.startDate;
    const endDateField = fields?.endDate;

    const hasAnyFilterField =
        !!moduleField?.enabled ||
        !!classField?.enabled ||
        !!statusField?.enabled ||
        !!startDateField?.enabled ||
        !!endDateField?.enabled;

    const filterBtnSx = useMemo(
        () => ({
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 900,
            height: FIELD_HEIGHT,
            whiteSpace: "nowrap",
            minWidth: 150,
        }),
        []
    );

    const resetIconSx = useMemo(
        () => ({
            borderRadius: "10px",
            height: FIELD_HEIGHT,
            width: FIELD_HEIGHT,
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
        }),
        []
    );

    // =====================================================
    // 2) renderAutocomplete: ép full width + minWidth
    // =====================================================
    // --- SỬA ĐOẠN NÀY ---
    const renderAutocomplete = (field, placeholder) => {
        if (!field || !field.enabled) return null;

        const opts = field.options || [];
        const selected =
            opts.find((o) => String(o.value) === String(field.value)) || null;

        return (
            <Autocomplete
                options={opts}
                value={selected}
                onChange={(e, newValue) =>
                    field.onChange?.(newValue?.value ?? opts?.[0]?.value ?? "")
                }
                loading={field.loading}
                getOptionLabel={(option) => option?.label || ""}
                isOptionEqualToValue={(option, value) =>
                    String(option?.value) === String(value?.value)
                }
                disableClearable
                autoHighlight
                // ✅ THÊM: minWidth để không bị mất chữ khi co
                sx={{
                    width: "100%",
                    minWidth: "220px",
                    ...commonInputSx,
                    // Autocomplete cần ép lại root để input đúng height
                    "& .MuiOutlinedInput-root": {
                        height: FIELD_HEIGHT,
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        paddingRight: "8px",
                        paddingTop: 0,
                        paddingBottom: 0,
                    },
                    "& .MuiAutocomplete-input": {
                        padding: "0 !important",
                    },
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        fullWidth
                        label={field.label}
                        placeholder={placeholder}
                        sx={commonInputSx}
                    />
                )}
            />
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.75,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            {title ? (
                <Typography sx={{ fontWeight: 900, mb: 1 }}>
                    {title}
                </Typography>
            ) : null}

            {/* Header: Search + Bộ lọc + Reset icon */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems="center"
                sx={{ width: "100%" }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder={search?.placeholder || "Tìm kiếm..."}
                    value={search?.value ?? ""}
                    onChange={(e) => search?.onChange?.(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        flex: 1,
                        ...commonInputSx,
                    }}
                />

                {hasAnyFilterField ? (
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{
                            width: { xs: "100%", sm: "auto" },
                        }}
                    >
                        <Tooltip title={showFilters ? "Ẩn bộ lọc" : "Mở bộ lọc"}>
                            <Button
                                variant={showFilters ? "contained" : "outlined"}
                                startIcon={<FilterList />}
                                onClick={onToggleFilters}
                                sx={{
                                    ...filterBtnSx,
                                    width: { xs: "100%", sm: "auto" },
                                }}
                            >
                                Bộ lọc
                            </Button>
                        </Tooltip>

                        <Tooltip title={resetTooltip}>
                            <IconButton
                                onClick={onReset}
                                sx={resetIconSx}
                                aria-label="reset-filter"
                            >
                                <RestartAltRounded />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                ) : null}
            </Stack>

            {/* Filter Panel */}
            {hasAnyFilterField ? (
                <Collapse in={showFilters} sx={{ mt: 1.5 }}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: "background.paper",
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        {/* =====================================================
                           3) Grid: giữ form gốc 3 ô 1 hàng (md={4})
                           -> ô sẽ "dài ngang" vì bên trong đã width 100%
                           ===================================================== */}
                        <Grid container spacing={2} alignItems="stretch">
                            {moduleField?.enabled ? (
                                <Grid item xs={12} md={4}>
                                    {renderAutocomplete(moduleField, "Chọn module...")}
                                </Grid>
                            ) : null}

                            {classField?.enabled ? (
                                <Grid item xs={12} md={4}>
                                    {renderAutocomplete(classField, "Chọn lớp...")}
                                </Grid>
                            ) : null}

                            {statusField?.enabled ? (
                                <Grid item xs={12} md={4}>
                                    <FormControl
                                        fullWidth
                                        sx={{ ...commonInputSx, minWidth: "200px" }}
                                    >
                                        <InputLabel>
                                            {statusField.label || "Trạng thái"}
                                        </InputLabel>
                                        <Select
                                            value={statusField.value}
                                            label={statusField.label || "Trạng thái"}
                                            onChange={(e) =>
                                                statusField.onChange?.(e.target.value)
                                            }
                                            sx={{
                                                height: FIELD_HEIGHT,
                                                borderRadius: "8px",
                                            }}
                                        >
                                            {(statusField.options || []).map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            ) : null}

                            {startDateField?.enabled ? (
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label={startDateField.label || "Từ ngày"}
                                        value={startDateField.value}
                                        onChange={(e) =>
                                            startDateField.onChange?.(e.target.value)
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{
                                            placeholder: "dd/mm/yyyy"
                                        }}
                                        sx={{
                                            ...commonInputSx,
                                            "& .MuiInputLabel-root": {
                                                transform: "translate(14px, -9px) scale(0.75)",
                                                backgroundColor: "#fff",
                                                padding: "0 4px",
                                            },
                                        }}
                                    />
                                </Grid>
                            ) : null}

                            {endDateField?.enabled ? (
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label={endDateField.label || "Đến ngày"}
                                        value={endDateField.value}
                                        onChange={(e) =>
                                            endDateField.onChange?.(e.target.value)
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{
                                            placeholder: "dd/mm/yyyy"
                                        }}
                                        sx={{
                                            ...commonInputSx,
                                            "& .MuiInputLabel-root": {
                                                transform: "translate(14px, -9px) scale(0.75)",
                                                backgroundColor: "#fff",
                                                padding: "0 4px",
                                            },
                                        }}
                                    />
                                </Grid>
                            ) : null}
                        </Grid>
                    </Box>
                </Collapse>
            ) : null}
        </Paper>
    );
}