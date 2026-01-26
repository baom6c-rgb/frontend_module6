import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    Stack,
    Alert,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    useMediaQuery,
    MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

import {
    adminUserApi,
    getAdminUsersApi,
    getRoleOptionsApi,
} from "../../api/adminUserApi.js";

import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";

import { useToast } from "../../components/common/AppToast";
import AppPagination from "../../components/common/AppPagination";
import AppConfirm from "../../components/common/AppConfirm";
import GlobalLoading from "../../components/common/GlobalLoading";

import EditUserModal from "./EditUserModal";
import AdminCreateUserModal from "./AdminCreateUserModal";
import { useLocation } from "react-router-dom";

/** ---------------- helpers ---------------- */
const statusChip = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "ACTIVE") return <Chip label="Đang hoạt động" color="success" size="small" />;
    if (s === "BLOCKED") return <Chip label="Bị khóa" color="error" size="small" />;
    if (s === "PENDING" || s === "WAITING_APPROVAL")
        return <Chip label="Chờ duyệt" color="warning" size="small" />;
    if (s === "REJECTED") return <Chip label="Từ chối" color="default" size="small" />;
    // CREATED vẫn có thể tồn tại trong data, nhưng dropdown đã bỏ
    if (s === "CREATED") return <Chip label="Mới tạo" color="default" size="small" />;
    return <Chip label={s || "UNKNOWN"} size="small" />;
};

const normalizeUserRow = (u) => ({
    id: u?.id ?? u?.userId ?? u?.email,
    fullName: u?.fullName ?? "",
    email: u?.email ?? "",
    status: u?.status ?? "",
    role: u?.role ?? u?.roleName ?? "",
    className: u?.className ?? u?.class?.name ?? u?.class?.className ?? "",
    moduleName: u?.moduleName ?? u?.module?.name ?? u?.module?.moduleName ?? "",
    // internal: for "new row on top"
    __newTs: u?.__newTs ?? 0,
});

// Handle common backend shapes: res.data | res.data.data | res.data.content | res.data.result
const normalizeList = (res) => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.result)) return data.result;
    return [];
};

const normalizeRoleOptions = (arr) =>
    (arr || [])
        .map((r) => ({
            id: r.id ?? r.roleId ?? r.value ?? r.code ?? r.name ?? r.roleName,
            name: r.name ?? r.roleName ?? r.label ?? r.code ?? r.value ?? "",
        }))
        .filter((x) => x.name);

const mapClassOptions = (arr) =>
    (arr || []).map((c) => ({
        id: c.id,
        name: c.name ?? c.className ?? c.class_name ?? "",
    }));

const mapModuleOptions = (arr) =>
    (arr || []).map((m) => ({
        id: m.id,
        name: m.name ?? m.moduleName ?? m.module_name ?? "",
    }));

const toErrorText = (err, fallback = "Request failed.") => {
    const data = err?.response?.data;

    if (!data) return fallback;
    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;

    const obj = data?.errors && typeof data.errors === "object" ? data.errors : data;
    if (obj && typeof obj === "object") {
        return Object.entries(obj)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" | ");
    }

    return fallback;
};

const statusPriority = (s) => {
    const x = String(s || "").toUpperCase();
    if (x === "ACTIVE") return 0;
    if (x === "WAITING_APPROVAL" || x === "PENDING") return 1;
    if (x === "REJECTED" || x === "CREATED") return 2;
    if (x === "BLOCKED") return 3;
    return 99;
};

const actionBtnSx = (tone = "default") => {
    const toneMap = {
        primary: { color: "primary.main", hoverBg: "primary.main" },
        success: { color: "success.main", hoverBg: "success.main" },
        warning: { color: "#EC5E32", hoverBg: "#EC5E32" },
        error: { color: "error.main", hoverBg: "error.main" },
        default: { color: "text.secondary", hoverBg: "action.active" },
    };
    const t = toneMap[tone] || toneMap.default;

    return {
        borderRadius: "10px",
        transition: "all 160ms ease",
        color: t.color,
        "&:hover": {
            bgcolor: `${t.hoverBg}14`,
            transform: "translateY(-1px)",
        },
        "&:active": { transform: "translateY(0px)" },
    };
};

/** ---------------- component ---------------- */
export default function AdminUserList() {
    const location = useLocation();
    const theme = useTheme();
    const downMd = useMediaQuery(theme.breakpoints.down("md"));
    const { showToast } = useToast();

    // data
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    // ✅ GlobalLoading for actions (Block/Unblock/Approve/Reject)
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState("");

    // filters
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [refreshing, setRefreshing] = useState(false);

    // pagination (client-side)
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    // options (for create/edit)
    const [roleOptions, setRoleOptions] = useState([]);
    const [classOptions, setClassOptions] = useState([]);
    const [moduleOptions, setModuleOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    // create modal
    const [createOpen, setCreateOpen] = useState(false);

    // edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // confirm
    const [confirm, setConfirm] = useState({
        open: false,
        title: "Xác nhận",
        message: "",
        onConfirm: null,
    });

    // ✅ wrap confirm to include GlobalLoading
    const openConfirm = ({ title = "Xác nhận", message, loadingMessage, onConfirm }) => {
        setConfirm({
            open: true,
            title,
            message,
            onConfirm: async () => {
                try {
                    if (loadingMessage) {
                        setActionMessage(loadingMessage);
                        setActionLoading(true);
                    }
                    await onConfirm?.();
                } finally {
                    if (loadingMessage) {
                        setActionLoading(false);
                        setActionMessage("");
                    }
                }
            },
        });
    };

    const closeConfirm = () =>
        setConfirm({ open: false, title: "Xác nhận", message: "", onConfirm: null });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setErrMsg("");
            const res = await getAdminUsersApi();
            const list = normalizeList(res);
            setRows(list.map(normalizeUserRow));
        } catch (err) {
            setErrMsg(toErrorText(err, "Load users failed."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ✅ auto filter khi click chuông pending approvals
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const status = sp.get("status");

        if (status === "WAITING_APPROVAL") {
            setStatusFilter("WAITING_APPROVAL");
            fetchUsers(); // reload list
        }
    }, [location.search, fetchUsers]);

    const fetchOptions = useCallback(async () => {
        try {
            setOptionsLoading(true);

            const [rolesRes, classesRes, modulesRes] = await Promise.all([
                getRoleOptionsApi(),
                getAllClassesApi(),
                getAllModulesApi(),
            ]);

            setRoleOptions(normalizeRoleOptions(normalizeList(rolesRes)));
            setClassOptions(mapClassOptions(normalizeList(classesRes)));
            setModuleOptions(mapModuleOptions(normalizeList(modulesRes)));
        } catch (err) {
            showToast(toErrorText(err, "Load dropdown options failed."), "error");
            setRoleOptions([]);
            setClassOptions([]);
            setModuleOptions([]);
        } finally {
            setOptionsLoading(false);
        }
    }, [showToast]);

    const openEdit = async (id) => {
        if (!roleOptions.length || !classOptions.length || !moduleOptions.length) {
            await fetchOptions();
        }
        setEditingId(id);
        setEditOpen(true);
    };

    const stats = useMemo(() => {
        const total = rows.length;
        const active = rows.filter((r) => String(r.status || "").toUpperCase() === "ACTIVE").length;
        const blocked = rows.filter((r) => String(r.status || "").toUpperCase() === "BLOCKED").length;
        const pending = rows.filter((r) =>
            ["PENDING", "WAITING_APPROVAL"].includes(String(r.status || "").toUpperCase())
        ).length;
        return { total, active, pending, blocked };
    }, [rows]);

    const filteredRows = useMemo(() => {
        const keyword = q.trim().toLowerCase();

        return rows.filter((r) => {
            const okStatus =
                statusFilter === "ALL"
                    ? true
                    : String(r.status || "").toUpperCase() === statusFilter;

            const okQ =
                !keyword ||
                String(r.fullName || "").toLowerCase().includes(keyword) ||
                String(r.email || "").toLowerCase().includes(keyword) ||
                String(r.className || "").toLowerCase().includes(keyword) ||
                String(r.moduleName || "").toLowerCase().includes(keyword) ||
                String(r.role || "").toLowerCase().includes(keyword);

            return okStatus && okQ;
        });
    }, [rows, q, statusFilter]);

    const sortedRows = useMemo(() => {
        const arr = [...filteredRows];
        arr.sort((a, b) => {
            const pa = statusPriority(a.status);
            const pb = statusPriority(b.status);
            if (pa !== pb) return pa - pb;

            // ✅ new rows first (within same status)
            const na = Number(a.__newTs || 0);
            const nb = Number(b.__newTs || 0);
            if (na !== nb) return nb - na;

            return String(a.fullName || "").localeCompare(String(b.fullName || ""));
        });
        return arr;
    }, [filteredRows]);

    /** ===== actions (with confirm) ===== */
    const approveUser = (id) =>
        openConfirm({
            message: "Bạn có chắc muốn phê duyệt tài khoản này không?",
            loadingMessage: "Đang phê duyệt tài khoản...",
            onConfirm: async () => {
                await adminUserApi.approvePendingUser(id);
                showToast("Phê duyệt thành công", "success");
                await fetchUsers();
            },
        });

    const rejectUser = (id) =>
        openConfirm({
            message: "Bạn có chắc muốn từ chối tài khoản này không?",
            loadingMessage: "Đang từ chối tài khoản...",
            onConfirm: async () => {
                await adminUserApi.rejectPendingUser(id);
                showToast("Từ chối thành công", "success");
                await fetchUsers();
            },
        });

    const blockUser = (id) =>
        openConfirm({
            message: "Bạn có chắc muốn khóa tài khoản này không?",
            loadingMessage: "Đang khóa tài khoản...",
            onConfirm: async () => {
                await adminUserApi.blockStudent(id);
                showToast("Khóa tài khoản thành công", "success");
                await fetchUsers();
            },
        });

    const unblockUser = (id) =>
        openConfirm({
            message: "Bạn có chắc muốn khôi phục tài khoản này không?",
            loadingMessage: "Đang khôi phục tài khoản...",
            onConfirm: async () => {
                await adminUserApi.unblockStudent(id);
                showToast("Khôi phục tài khoản thành công", "success");
                await fetchUsers();
            },
        });

    /** ===== columns ===== */
    const columns = useMemo(() => {
        const pageOffset = paginationModel.page * paginationModel.pageSize;

        return [
            {
                field: "stt",
                headerName: "STT",
                width: 80,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                    const idx = params.api.getRowIndexRelativeToVisibleRows(params.id);
                    return pageOffset + idx + 1;
                },
            },
            { field: "fullName", headerName: "Họ tên", flex: 1.1, minWidth: 170 },
            { field: "email", headerName: "Email", flex: 1.3, minWidth: 220 },
            { field: "className", headerName: "Lớp", flex: 0.65, minWidth: 120 },
            {
                field: "moduleName",
                headerName: "Module",
                flex: 1.0,
                minWidth: 170,
                hide: downMd,
            },
            {
                field: "status",
                headerName: "Trạng thái",
                flex: 0.65,
                minWidth: 160,
                renderCell: (params) => statusChip(params.value),
                sortable: false,
            },
            { field: "role", headerName: "Vai trò", flex: 0.6, minWidth: 120 },
            {
                field: "actions",
                headerName: "Hành động",
                width: 200,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                    const row = params.row;
                    const status = String(row.status || "").toUpperCase();
                    const role = String(row.role || "").toUpperCase();
                    const isAdmin = role === "ADMIN";

                    const isPending = status === "WAITING_APPROVAL" || status === "PENDING";
                    const isActive = status === "ACTIVE";
                    const isBlocked = status === "BLOCKED";

                    return (
                        <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Chỉnh sửa">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => openEdit(row.id)}
                                        sx={actionBtnSx("primary")}
                                    >
                                        <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            {isPending && (
                                <>
                                    <Tooltip title="Phê duyệt">
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => approveUser(row.id)}
                                                sx={actionBtnSx("success")}
                                            >
                                                <CheckCircleRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Từ chối">
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => rejectUser(row.id)}
                                                sx={actionBtnSx("error")}
                                            >
                                                <CancelRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )}

                            {isActive && (
                                <Tooltip title={isAdmin ? "Không thể khóa ADMIN" : "Khóa tài khoản"}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={isAdmin}
                                            onClick={() => blockUser(row.id)}
                                            sx={actionBtnSx("error")}
                                        >
                                            <BlockRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}

                            {isBlocked && (
                                <Tooltip title={isAdmin ? "Không thể khôi phục ADMIN" : "Khôi phục"}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={isAdmin}
                                            onClick={() => unblockUser(row.id)}
                                            sx={actionBtnSx("warning")}
                                        >
                                            <LockOpenRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </Stack>
                    );
                },
            },
        ];
    }, [downMd, paginationModel, roleOptions, classOptions, moduleOptions]);

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: "calc(100vh - 140px)",
            }}
        >
            <GlobalLoading open={actionLoading} message={actionMessage || "Đang xử lý..."} />

            {/* ===== Header ===== */}
            <Box
                sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                }}
            >
                <Typography sx={{ fontSize: 22, fontWeight: 900, color: "text.primary" }}>
                    Danh sách người dùng
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<PersonAddAlt1Icon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ borderRadius: "12px", fontWeight: 900, textTransform: "none" }}
                >
                    Thêm mới
                </Button>
            </Box>

            {errMsg ? (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                    {errMsg}
                </Alert>
            ) : null}

            {/* ===== Filter/Search ===== */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm tên / email / lớp / module / vai trò"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        sx={{ flex: 1, minWidth: 0 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        size="small"
                        label="Trạng thái"
                        select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ width: 240 }}
                        SelectProps={{
                            MenuProps: {
                                PaperProps: { sx: { borderRadius: 2, mt: 0.5 } },
                            },
                        }}
                    >
                        <MenuItem value="ALL">Tất cả</MenuItem>

                        <MenuItem
                            value="ACTIVE"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    bgcolor: "success.main",
                                    color: "#fff",
                                },
                                "&:hover": { bgcolor: "success.main", color: "#fff" },
                            }}
                        >
                            Đang hoạt động
                        </MenuItem>

                        <MenuItem
                            value="WAITING_APPROVAL"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    bgcolor: "#EC5E32",
                                    color: "#fff",
                                },
                                "&:hover": { bgcolor: "#EC5E32", color: "#fff" },
                            }}
                        >
                            Chờ duyệt
                        </MenuItem>

                        <MenuItem
                            value="BLOCKED"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    bgcolor: "error.main",
                                    color: "#fff",
                                },
                                "&:hover": { bgcolor: "error.main", color: "#fff" },
                            }}
                        >
                            Bị khóa
                        </MenuItem>

                        <MenuItem value="REJECTED">Từ chối</MenuItem>
                    </TextField>

                    <Tooltip title="Làm mới">
                        <span>
                            <IconButton
                                onClick={async () => {
                                    try {
                                        setRefreshing(true);
                                        await fetchUsers();
                                    } finally {
                                        setRefreshing(false);
                                    }
                                }}
                                disabled={loading || refreshing}
                                sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px" }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Paper>

            {/* ===== Table + Footer ===== */}
            <Paper
                elevation={0}
                sx={{
                    flex: 1,
                    minHeight: 420,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    <DataGrid
                        rows={sortedRows}
                        columns={columns}
                        loading={loading}
                        disableRowSelectionOnClick
                        getRowId={(r) => r.id}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50]}
                        disableColumnMenu
                        hideFooter
                        sx={{
                            border: 0,
                            height: "100%",
                            "& .MuiDataGrid-columnHeaders": {
                                bgcolor: "background.paper",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            },
                            "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
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
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={`Tổng: ${stats.total}`} />
                        <Chip label={`Đang hoạt động: ${stats.active}`} color="success" />
                        <Chip label={`Chờ duyệt: ${stats.pending}`} color="warning" />
                        <Chip label={`Bị khóa: ${stats.blocked}`} color="error" />
                    </Stack>

                    <AppPagination
                        page={paginationModel.page + 1}
                        pageSize={paginationModel.pageSize}
                        total={sortedRows.length}
                        onPageChange={(nextPage1) => setPaginationModel((p) => ({ ...p, page: nextPage1 - 1 }))}
                        onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                    />
                </Box>
            </Paper>

            <AppConfirm
                open={confirm.open}
                title={confirm.title}
                message={confirm.message}
                onClose={closeConfirm}
                onConfirm={confirm.onConfirm}
            />

            <AdminCreateUserModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                fetchOptions={fetchOptions}
                optionsLoading={optionsLoading}
                roleOptions={roleOptions}
                classOptions={classOptions}
                moduleOptions={moduleOptions}
                onCreated={(created, formData) => {
                    const newRow = normalizeUserRow({
                        ...(created || {}),
                        role: formData?.roleName || created?.roleName || "",
                        __newTs: Date.now(),
                    });

                    setRows((prev) => [newRow, ...prev]);
                    setPaginationModel((p) => ({ ...p, page: 0 }));
                }}
            />

            <EditUserModal
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setEditingId(null);
                }}
                userId={editingId}
                roleOptions={roleOptions}
                classOptions={classOptions}
                moduleOptions={moduleOptions}
                onUpdated={async () => {
                    showToast("Cập nhật người dùng thành công", "success");
                    await fetchUsers();
                    setEditOpen(false);
                    setEditingId(null);
                }}
            />
        </Box>
    );
}
