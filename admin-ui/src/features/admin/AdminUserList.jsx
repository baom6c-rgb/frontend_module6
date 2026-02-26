import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    Stack,
    Alert,
    Button,
    IconButton,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";

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
import FilterPanel from "../../components/common/FilterPanel";

import EditUserModal from "./EditUserModal";
import AdminCreateUserModal from "./AdminCreateUserModal";
import { useLocation } from "react-router-dom";

/** ---------------- helpers ---------------- */
const statusChip = (status) => {
    const s = String(status || "").toUpperCase();

    const commonSx = {
        my: 0.25,
        px: 0.5,
        height: 26,
        "& .MuiChip-label": { px: 1, fontWeight: 700, lineHeight: 1 },
    };

    if (s === "ACTIVE") return <Chip label="Đang hoạt động" color="success" size="small" sx={commonSx} />;
    if (s === "BLOCKED") return <Chip label="Bị khóa" color="error" size="small" sx={commonSx} />;
    if (s === "PENDING" || s === "WAITING_APPROVAL")
        return <Chip label="Chờ duyệt" color="warning" size="small" sx={commonSx} />;
    if (s === "CREATED") return <Chip label="Mới tạo" color="default" size="small" sx={commonSx} />;

    return <Chip label={s || "UNKNOWN"} size="small" sx={commonSx} />;
};

const normalizeUserRow = (u) => ({
    id: u?.id ?? u?.userId ?? u?.email,
    fullName: u?.fullName ?? "",
    email: u?.email ?? "",
    status: u?.status ?? "",
    role: u?.role ?? u?.roleName ?? "",
    className: u?.className ?? u?.class?.name ?? u?.class?.className ?? "",
    moduleName: u?.moduleName ?? u?.module?.name ?? u?.module?.moduleName ?? "",
    __newTs: u?.__newTs ?? 0,
});

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
    if (x === "CREATED") return 2;
    if (x === "BLOCKED") return 3;
    return 99;
};

const isAdminRole = (role) => {
    const r = String(role || "").toUpperCase();
    return r === "ADMIN" || r.includes("ADMIN");
};

const rolePriority = (role) => (isAdminRole(role) ? 1 : 0);

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
        "&:hover": { bgcolor: `${t.hoverBg}14`, transform: "translateY(-1px)" },
        "&:active": { transform: "translateY(0px)" },
    };
};

const ALL = "ALL";

/** ---------------- component ---------------- */
export default function AdminUserList() {
    const location = useLocation();
    const theme = useTheme();
    const downMd = useMediaQuery(theme.breakpoints.down("md"));
    const { showToast } = useToast();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState("");

    // filter state
    const [searchText, setSearchText] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedModule, setSelectedModule] = useState(ALL);
    const [selectedClass, setSelectedClass] = useState(ALL);
    const [selectedStatus, setSelectedStatus] = useState(ALL);

    const [filterModules, setFilterModules] = useState([{ value: ALL, label: "Tất cả" }]);
    const [filterClasses, setFilterClasses] = useState([{ value: ALL, label: "Tất cả" }]);

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const [roleOptions, setRoleOptions] = useState([]);
    const [classOptions, setClassOptions] = useState([]);
    const [moduleOptions, setModuleOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [confirm, setConfirm] = useState({
        open: false,
        title: "Xác nhận",
        message: "",
        onConfirm: null,
    });

    // ✅ NEW: đọc id từ query (?id=123)
    const selectedId = useMemo(() => {
        const sp = new URLSearchParams(location.search);
        return sp.get("id"); // string | null
    }, [location.search]);

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

    const fetchFilterOptions = useCallback(async () => {
        try {
            const [modsRes, classesRes] = await Promise.allSettled([getAllModulesApi(), getAllClassesApi()]);

            if (modsRes.status === "fulfilled") {
                const list = normalizeList(modsRes.value);
                const opts = list
                    .map((m) => m?.name ?? m?.moduleName ?? "")
                    .filter(Boolean)
                    .map((name) => ({ value: name, label: name }));
                setFilterModules([{ value: ALL, label: "Tất cả" }, ...opts]);
            }

            if (classesRes.status === "fulfilled") {
                const list = normalizeList(classesRes.value);
                const opts = list
                    .map((c) => c?.name ?? c?.className ?? "")
                    .filter(Boolean)
                    .map((name) => ({ value: name, label: name }));
                setFilterClasses([{ value: ALL, label: "Tất cả" }, ...opts]);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchFilterOptions();
    }, [fetchUsers, fetchFilterOptions]);

    // ✅ UPDATED: parse cả status + id để reset filter/pagination
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const status = sp.get("status");
        const id = sp.get("id");

        if (status === "WAITING_APPROVAL") {
            setSelectedStatus("WAITING_APPROVAL");
            setShowFilters(true);
        }

        if (id || status === "WAITING_APPROVAL") {
            setPaginationModel((p) => ({ ...p, page: 0 }));
        }
    }, [location.search]);

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

    // ✅ UPDATED: filter thêm theo selectedId
    const filteredRows = useMemo(() => {
        const q = String(searchText || "").trim().toLowerCase();

        return rows.filter((r) => {
            const okSearch =
                !q ||
                String(r.fullName || "").toLowerCase().includes(q) ||
                String(r.email || "").toLowerCase().includes(q) ||
                String(r.className || "").toLowerCase().includes(q) ||
                String(r.moduleName || "").toLowerCase().includes(q) ||
                String(r.role || "").toLowerCase().includes(q);

            const okModule = selectedModule === ALL ? true : String(r.moduleName || "") === String(selectedModule);
            const okClass = selectedClass === ALL ? true : String(r.className || "") === String(selectedClass);

            const okStatus =
                selectedStatus === ALL
                    ? true
                    : String(r.status || "").toUpperCase() === String(selectedStatus).toUpperCase();

            // ✅ NEW: nếu có ?id=... thì chỉ show đúng user đó
            const okId = !selectedId ? true : String(r.id) === String(selectedId);

            return okSearch && okModule && okClass && okStatus && okId;
        });
    }, [rows, searchText, selectedModule, selectedClass, selectedStatus, selectedId]);

    const sortedRows = useMemo(() => {
        const arr = [...filteredRows];
        arr.sort((a, b) => {
            const ra = rolePriority(a.role);
            const rb = rolePriority(b.role);
            if (ra !== rb) return ra - rb; // ✅ ADMIN at bottom

            const pa = statusPriority(a.status);
            const pb = statusPriority(b.status);
            if (pa !== pb) return pa - pb;

            const na = Number(a.__newTs || 0);
            const nb = Number(b.__newTs || 0);
            if (na !== nb) return nb - na;

            return String(a.fullName || "").localeCompare(String(b.fullName || ""));
        });
        return arr;
    }, [filteredRows]);

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
            loadingMessage: "Đang từ chối & xóa người dùng...",
            onConfirm: async () => {
                await adminUserApi.rejectPendingUser(id);
                setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
                showToast("Đã từ chối và xóa người dùng", "success");
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

    // ✅ reset icon in header
    const resetFilters = async () => {
        setSearchText("");
        setSelectedModule(ALL);
        setSelectedClass(ALL);
        setSelectedStatus(ALL);
        setPaginationModel((p) => ({ ...p, page: 0 }));
        await fetchUsers();
    };

    const columns = useMemo(() => {
        const pageOffset = paginationModel.page * paginationModel.pageSize;

        const centerCell = (children) => (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {children}
            </Box>
        );

        const statusCellWrapper = (children) => (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", py: 0.6 }}>
                {children}
            </Box>
        );

        return [
            {
                field: "stt",
                headerName: "STT",
                width: 80,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const idx = params.api.getRowIndexRelativeToVisibleRows(params.id);
                    return centerCell(pageOffset + idx + 1);
                },
            },
            { field: "fullName", headerName: "Họ tên", flex: 1.1, minWidth: 170 },
            { field: "email", headerName: "Email", flex: 1.3, minWidth: 220 },
            {
                field: "className",
                headerName: "Lớp",
                flex: 0.65,
                minWidth: 120,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "moduleName",
                headerName: "Module",
                flex: 1.0,
                minWidth: 170,
                hide: downMd,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "status",
                headerName: "Trạng thái",
                flex: 0.7,
                minWidth: 170,
                sortable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => statusCellWrapper(statusChip(params.value)),
            },
            {
                field: "role",
                headerName: "Vai trò",
                flex: 0.6,
                minWidth: 120,
                headerAlign: "center",
                align: "center",
            },
            {
                field: "actions",
                headerName: "Hành động",
                width: 132,
                minWidth: 120,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const row = params.row;
                    const status = String(row.status || "").toUpperCase();
                    const role = String(row.role || "").toUpperCase();
                    const isAdmin = isAdminRole(role);

                    const isPending = status === "WAITING_APPROVAL" || status === "PENDING";
                    const isActive = status === "ACTIVE";
                    const isBlocked = status === "BLOCKED";

                    return centerCell(
                        <Stack
                            direction="row"
                            spacing={0.25}
                            justifyContent="center"
                            alignItems="center"
                            sx={{ width: "100%", "& .MuiIconButton-root": { p: 0.75 } }}
                        >
                            <Tooltip title="Chỉnh sửa">
                                <span>
                                    <IconButton size="small" onClick={() => openEdit(row.id)} sx={actionBtnSx("primary")}>
                                        <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            {isPending && (
                                <>
                                    <Tooltip title="Phê duyệt">
                                        <span>
                                            <IconButton size="small" onClick={() => approveUser(row.id)} sx={actionBtnSx("success")}>
                                                <CheckCircleRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Từ chối & xóa">
                                        <span>
                                            <IconButton size="small" onClick={() => rejectUser(row.id)} sx={actionBtnSx("error")}>
                                                <CancelRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )}

                            {isActive && (
                                <Tooltip title={isAdmin ? "Không thể khóa ADMIN" : "Khóa tài khoản"}>
                                    <span>
                                        <IconButton size="small" disabled={isAdmin} onClick={() => blockUser(row.id)} sx={actionBtnSx("error")}>
                                            <BlockRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}

                            {isBlocked && (
                                <Tooltip title={isAdmin ? "Không thể khôi phục ADMIN" : "Khôi phục"}>
                                    <span>
                                        <IconButton size="small" disabled={isAdmin} onClick={() => unblockUser(row.id)} sx={actionBtnSx("warning")}>
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
    }, [downMd, paginationModel]);

    const statusMenuSx = {
        [ALL]: undefined,
        ACTIVE: {
            "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "success.main", color: "#fff" },
            "&:hover": { bgcolor: "success.main", color: "#fff" },
        },
        WAITING_APPROVAL: {
            "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "#EC5E32", color: "#fff" },
            "&:hover": { bgcolor: "#EC5E32", color: "#fff" },
        },
        BLOCKED: {
            "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "error.main", color: "#fff" },
            "&:hover": { bgcolor: "error.main", color: "#fff" },
        },
    };

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

            <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
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

            <Box sx={{ mb: 1.5 }}>
                <FilterPanel
                    search={{
                        value: searchText,
                        onChange: (v) => {
                            setSearchText(v);
                            setPaginationModel((p) => ({ ...p, page: 0 }));
                        },
                        placeholder: "Tìm kiếm tên / email / lớp / module / vai trò",
                    }}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters((x) => !x)}
                    onReset={resetFilters}
                    resetTooltip="Đặt lại bộ lọc"
                    fields={{
                        module: {
                            enabled: true,
                            label: "Module",
                            value: selectedModule,
                            onChange: (v) => {
                                setSelectedModule(v);
                                setPaginationModel((p) => ({ ...p, page: 0 }));
                            },
                            options: filterModules,
                        },
                        class: {
                            enabled: true,
                            label: "Lớp học",
                            value: selectedClass,
                            onChange: (v) => {
                                setSelectedClass(v);
                                setPaginationModel((p) => ({ ...p, page: 0 }));
                            },
                            options: filterClasses,
                        },
                        status: {
                            enabled: true,
                            label: "Trạng thái",
                            value: selectedStatus,
                            onChange: (v) => {
                                setSelectedStatus(v);
                                setPaginationModel((p) => ({ ...p, page: 0 }));
                            },
                            options: [
                                { value: ALL, label: "Tất cả" },
                                { value: "ACTIVE", label: "Đang hoạt động" },
                                { value: "WAITING_APPROVAL", label: "Chờ duyệt" },
                                { value: "BLOCKED", label: "Bị khóa" },
                            ],
                            menuItemSxByValue: statusMenuSx,
                        },
                        startDate: { enabled: false },
                        endDate: { enabled: false },
                    }}
                />
            </Box>

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
                        flexDirection: { xs: "column", md: "row" },
                        alignItems: { xs: "flex-end", md: "center" },
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    {/* Stats chips: 2x2 grid trên mobile/tablet, hàng ngang trên desktop */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, auto)" },
                            gap: 0.75,
                            width: { xs: "100%", md: "auto" },
                        }}
                    >
                        <Chip label={`Tổng: ${stats.total}`} size="small" sx={{ justifyContent: "center" }} />
                        <Chip label={`Hoạt động: ${stats.active}`} color="success" size="small" sx={{ justifyContent: "center" }} />
                        <Chip label={`Chờ duyệt: ${stats.pending}`} color="warning" size="small" sx={{ justifyContent: "center" }} />
                        <Chip label={`Bị khóa: ${stats.blocked}`} color="error" size="small" sx={{ justifyContent: "center" }} />
                    </Box>

                    {/* Pagination: căn phải trên mọi thiết bị */}
                    <Box sx={{ alignSelf: "flex-end" }}>
                        <AppPagination
                            page={paginationModel.page + 1}
                            pageSize={paginationModel.pageSize}
                            total={sortedRows.length}
                            onPageChange={(nextPage1) => setPaginationModel((p) => ({ ...p, page: nextPage1 - 1 }))}
                            onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                        />
                    </Box>
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
                // Code MỚI - đã fix
                onCreated={(created, formData) => {
                    const newRow = normalizeUserRow({
                        ...(created || {}),
                        // ✅ Kiểm tra nhiều field có thể
                        role:
                            created?.role ||
                            created?.roleName ||
                            formData?.roleName ||
                            formData?.role ||
                            (created?.roles && created.roles[0]) ||
                            "",
                        // ✅ Thêm className
                        className:
                            created?.className ||
                            formData?.className ||
                            created?.class?.name ||
                            created?.class?.className ||
                            "",
                        // ✅ Thêm moduleName
                        moduleName:
                            created?.moduleName ||
                            formData?.moduleName ||
                            created?.module?.name ||
                            created?.module?.moduleName ||
                            "",
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