// src/features/adminExams/components/AssignUsersDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    TextField,
    Typography,
    Box,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { adminUserApi } from "../../../api/adminUserApi";
import AppPagination from "../../../components/common/AppPagination";

const unwrap = (resOrData) => {
    const d = resOrData?.data ?? resOrData;
    return d?.data ?? d;
};

export default function AssignUsersDialog({
                                              open,
                                              onClose,
                                              initialSelectedIds = [],
                                              onConfirm,
                                          }) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelectedIds));
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    useEffect(() => {
        if (!open) return;
        setSelectedIds(new Set(initialSelectedIds || []));
    }, [open, initialSelectedIds]);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await adminUserApi.getActiveStudents();
                const data = unwrap(res);
                const list = Array.isArray(data) ? data : data?.items || data?.content || [];
                if (!alive) return;

                setRows(
                    list.map((u) => ({
                        id: u.id,
                        fullName: u.fullName || u.name || "—",
                        email: u.email || "—",
                        className: u.className || u.class?.name || "—",
                        moduleName: u.moduleName || u.module?.name || "—",
                    }))
                );
            } catch {
                if (!alive) return;
                setRows([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [open]);

    const filteredRows = useMemo(() => {
        const q = String(search || "").trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            return (
                String(r.fullName || "").toLowerCase().includes(q) ||
                String(r.email || "").toLowerCase().includes(q) ||
                String(r.className || "").toLowerCase().includes(q) ||
                String(r.moduleName || "").toLowerCase().includes(q)
            );
        });
    }, [rows, search]);

    const columns = useMemo(
        () => [
            {
                field: "pick",
                headerName: "",
                width: 54,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                    const checked = selectedIds.has(params.row.id);
                    return (
                        <Checkbox
                            checked={checked}
                            onChange={(e) => {
                                setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(params.row.id);
                                    else next.delete(params.row.id);
                                    return next;
                                });
                            }}
                        />
                    );
                },
            },
            { field: "fullName", headerName: "Họ tên", flex: 1, minWidth: 180 },
            { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
            { field: "className", headerName: "Lớp", width: 150, headerAlign: "center", align: "center" },
            { field: "moduleName", headerName: "Module", width: 160, headerAlign: "center", align: "center" },
        ],
        [selectedIds]
    );

    const handleConfirm = () => {
        const ids = Array.from(selectedIds);
        onConfirm?.(ids);
        onClose?.();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 900 }}>Gán học viên</DialogTitle>
            <DialogContent>
                <Stack spacing={1.25} sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 13, color: "#6C757D" }}>
                        Chọn 1 hoặc nhiều học viên. Sau khi gán, hệ thống sẽ gửi email thông báo.
                    </Typography>

                    <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo tên/email/lớp/module…"
                        size="small"
                    />

                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <DataGrid
                                rows={filteredRows}
                                columns={columns}
                                loading={loading}
                                disableRowSelectionOnClick
                                disableColumnMenu
                                hideFooter
                                hideFooterSelectedRowCount
                                autoHeight
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
                                sx={{
                                    border: 0,
                                    "& .MuiDataGrid-columnHeaders": {
                                        bgcolor: "background.paper",
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                    },
                                    "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
                                    "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
                                }}
                            />
                        </Box>
                        <Box
                            sx={{
                                px: 1.5,
                                py: 1,
                                borderTop: "1px solid",
                                borderColor: "divider",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Chip label={`Đã chọn: ${selectedIds.size}`} size="small" color={selectedIds.size > 0 ? "primary" : "default"} sx={{ fontWeight: 600 }} />
                            <AppPagination
                                page={paginationModel.page + 1}
                                pageSize={paginationModel.pageSize}
                                total={filteredRows.length}
                                onPageChange={(nextPage) =>
                                    setPaginationModel((p) => ({ ...p, page: nextPage - 1 }))
                                }
                                onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                                pageSizeOptions={[10, 25, 50]}
                                loading={loading}
                            />
                        </Box>
                    </Paper>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    sx={{ borderRadius: 2, fontWeight: 900, bgcolor: "#EC5E32", "&:hover": { bgcolor: "#D5522B" } }}
                >
                    Xác nhận ({selectedIds.size})
                </Button>
            </DialogActions>
        </Dialog>
    );
}