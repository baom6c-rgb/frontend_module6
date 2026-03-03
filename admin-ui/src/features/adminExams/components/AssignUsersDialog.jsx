// src/features/adminExams/components/AssignUsersDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { adminUserApi } from "../../../api/adminUserApi";

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
            { field: "className", headerName: "Lớp", width: 150 },
            { field: "moduleName", headerName: "Module", width: 160 },
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

                    <Paper variant="outlined" sx={{ height: 420, borderRadius: 2, overflow: "hidden" }}>
                        <DataGrid
                            rows={filteredRows}
                            columns={columns}
                            loading={loading}
                            disableRowSelectionOnClick
                            hideFooterSelectedRowCount
                            pageSizeOptions={[10, 20, 50]}
                            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                        />
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
