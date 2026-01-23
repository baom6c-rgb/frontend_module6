import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    Stack,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Divider,
    InputAdornment,
    IconButton,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

import { getAdminUsersApi, createAdminUserApi, getRoleOptionsApi } from "../../api/adminUserApi.js";
import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";

/** ---------------- helpers ---------------- */
const statusChip = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "ACTIVE") return <Chip label="ACTIVE" color="success" size="small" />;
    if (s === "BLOCKED") return <Chip label="BLOCKED" color="error" size="small" />;
    if (s === "PENDING" || s === "WAITING_APPROVAL") return <Chip label={s} color="warning" size="small" />;
    if (s === "REJECTED") return <Chip label="REJECTED" color="default" size="small" />;
    return <Chip label={s || "UNKNOWN"} size="small" />;
};

const normalizeUserRow = (u) => ({
    id: u.id ?? u.userId ?? u.email,
    fullName: u.fullName ?? "",
    email: u.email ?? "",
    registerMethod: u.registerMethod ?? "",
    loginProvider: u.loginProvider ?? "",
    status: u.status ?? "",
    role: u.role ?? u.roleName ?? "",
    className: u.className ?? u.class?.name ?? u.class?.className ?? "",
    moduleName: u.moduleName ?? u.module?.name ?? u.module?.moduleName ?? "",
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

/** ---------------- component ---------------- */
export default function AdminUserList() {
    const theme = useTheme();
    const downLg = useMediaQuery(theme.breakpoints.down("lg")); // <1200
    const downMd = useMediaQuery(theme.breakpoints.down("md")); // <900

    // table
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    // toolbar filters
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [refreshing, setRefreshing] = useState(false);

    // dialog
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErr, setFormErr] = useState("");
    const [formOk, setFormOk] = useState("");

    // options
    const [roleOptions, setRoleOptions] = useState([]);
    const [classOptions, setClassOptions] = useState([]);
    const [moduleOptions, setModuleOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    // form
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        classId: "",
        moduleId: "",
        roleName: "STUDENT",
    });

    const onChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    // ✅ Responsive columns: ẩn bớt cột khi màn hình nhỏ để khỏi scroll ngang
    const columns = useMemo(() => {
        const base = [
            { field: "fullName", headerName: "Full Name", flex: 1.1, minWidth: 170 },
            { field: "email", headerName: "Email", flex: 1.3, minWidth: 210 },
            { field: "className", headerName: "Class", flex: 0.6, minWidth: 110 },
            { field: "moduleName", headerName: "Module", flex: 1.0, minWidth: 170 },
            { field: "registerMethod", headerName: "Register Method", flex: 0.7, minWidth: 150 },
            { field: "loginProvider", headerName: "Login Provider", flex: 0.7, minWidth: 140 },
            {
                field: "status",
                headerName: "Status",
                flex: 0.55,
                minWidth: 120,
                renderCell: (params) => statusChip(params.value),
                sortable: false,
            },
            { field: "role", headerName: "Role", flex: 0.55, minWidth: 110 },
        ];

        // <1200: ẩn Register/Login Provider (ít quan trọng)
        const hideOnLg = new Set(["registerMethod", "loginProvider"]);
        // <900: ẩn thêm Module để luôn fit
        const hideOnMd = new Set(["moduleName"]);

        return base.map((c) => ({
            ...c,
            hide: (downLg && hideOnLg.has(c.field)) || (downMd && hideOnMd.has(c.field)),
        }));
    }, [downLg, downMd]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setErrMsg("");

            const res = await getAdminUsersApi();
            const list = normalizeList(res);
            setRows(list.map(normalizeUserRow));
        } catch (err) {
            setErrMsg(err?.response?.data?.message || err?.response?.data || "Load users failed.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const fetchOptions = async () => {
        try {
            setOptionsLoading(true);
            setFormErr("");

            const [rolesRes, classesRes, modulesRes] = await Promise.all([
                getRoleOptionsApi(),
                getAllClassesApi(),
                getAllModulesApi(),
            ]);

            const roles = normalizeRoleOptions(normalizeList(rolesRes));
            const classes = mapClassOptions(normalizeList(classesRes));
            const modules = mapModuleOptions(normalizeList(modulesRes));

            setRoleOptions(roles);
            setClassOptions(classes);
            setModuleOptions(modules);

            if (roles.length && !roles.some((r) => r.name === form.roleName)) {
                setForm((prev) => ({ ...prev, roleName: roles[0].name }));
            }
        } catch (err) {
            setFormErr(err?.response?.data?.message || err?.response?.data || "Load dropdown options failed.");
            setRoleOptions([]);
        } finally {
            setOptionsLoading(false);
        }
    };

    const openDialog = async () => {
        setFormErr("");
        setFormOk("");
        setOpen(true);
        await fetchOptions();
    };

    const closeDialog = () => {
        if (saving) return;
        setOpen(false);
    };

    const submitCreate = async () => {
        if (saving) return;

        setFormErr("");
        setFormOk("");

        const fullName = form.fullName.trim();
        const email = form.email.trim();
        const password = form.password;

        if (!fullName) return setFormErr("Full name is required.");
        if (!email) return setFormErr("Email is required.");
        if (!password || password.length < 6) return setFormErr("Password must be at least 6 characters.");
        if (!form.classId) return setFormErr("Class is required.");
        if (!form.moduleId) return setFormErr("Module is required.");
        if (!form.roleName) return setFormErr("Role is required.");

        try {
            setSaving(true);

            const payload = {
                fullName,
                email,
                password,
                classId: Number(form.classId),
                moduleId: Number(form.moduleId),
                roleName: form.roleName,
            };

            await createAdminUserApi(payload);

            setFormOk("Created user successfully.");

            setForm({
                fullName: "",
                email: "",
                password: "",
                classId: "",
                moduleId: "",
                roleName: roleOptions?.[0]?.name || "STUDENT",
            });

            await fetchUsers();
            setTimeout(() => setOpen(false), 250);
        } catch (err) {
            setFormErr(err?.response?.data?.message || err?.response?.data || "Create user failed.");
        } finally {
            setSaving(false);
        }
    };

    const filteredRows = useMemo(() => {
        const keyword = q.trim().toLowerCase();
        return rows.filter((r) => {
            const okStatus = statusFilter === "ALL" ? true : (r.status || "").toUpperCase() === statusFilter;
            const okQ =
                !keyword ||
                (r.fullName || "").toLowerCase().includes(keyword) ||
                (r.email || "").toLowerCase().includes(keyword) ||
                (r.className || "").toLowerCase().includes(keyword) ||
                (r.moduleName || "").toLowerCase().includes(keyword) ||
                (r.role || "").toLowerCase().includes(keyword);

            return okStatus && okQ;
        });
    }, [rows, q, statusFilter]);

    const stats = useMemo(() => {
        const total = rows.length;
        const active = rows.filter((r) => (r.status || "").toUpperCase() === "ACTIVE").length;
        const blocked = rows.filter((r) => (r.status || "").toUpperCase() === "BLOCKED").length;
        const pending = rows.filter((r) => ["PENDING", "WAITING_APPROVAL"].includes((r.status || "").toUpperCase())).length;
        return { total, active, pending, blocked };
    }, [rows]);

    return (
        <Box
            sx={{
                p: 0,
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
            }}
        >
            {/* HEADER */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    justifyContent="space-between"
                    sx={{ width: "100%", minWidth: 0 }}
                >
                    <Box sx={{ minWidth: 260 }}>
                        <Typography variant="h5" fontWeight={800}>
                            Users
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap" sx={{ minWidth: 0 }}>
                        <Chip label={`Total: ${stats.total}`} />
                        <Chip label={`Active: ${stats.active}`} color="success" />
                        <Chip label={`Pending: ${stats.pending}`} color="warning" />
                        <Chip label={`Blocked: ${stats.blocked}`} color="error" />

                        <Button
                            variant="contained"
                            startIcon={<PersonAddAlt1Icon />}
                            onClick={openDialog}
                            sx={{ whiteSpace: "nowrap" }}
                        >
                            THÊM USER
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {errMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errMsg}
                </Alert>
            )}

            {/* TOOLBAR */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderRadius: 2,
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ minWidth: 0 }}>
                    <TextField
                        size="small"
                        placeholder="Search name / email / class / module / role..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        sx={{ width: { xs: "100%", md: 420 }, minWidth: 0 }}
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
                        label="Status"
                        select
                        SelectProps={{ native: true }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ width: { xs: "100%", md: 220 } }}
                    >
                        <option value="ALL">ALL</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="WAITING_APPROVAL">WAITING_APPROVAL</option>
                    </TextField>

                    <Box sx={{ flex: 1 }} />

                    <Tooltip title="Refresh">
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
              >
                <RefreshIcon />
              </IconButton>
            </span>
                    </Tooltip>
                </Stack>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    height: "calc(100vh - 300px)",
                    minHeight: 420,
                    borderRadius: 2,
                    overflow: "hidden",
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <DataGrid
                    rows={filteredRows}
                    columns={columns}
                    loading={loading}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50]}
                    getRowId={(r) => r.id}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    }}
                    disableColumnMenu
                    sx={{
                        border: 0,
                        "& .MuiDataGrid-columnHeaders": { bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" },
                        "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
                    }}
                />
            </Paper>

            {/* ADD USER DIALOG */}
            <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Thêm User</DialogTitle>
                <Divider />

                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        {formErr && <Alert severity="error">{formErr}</Alert>}
                        {formOk && <Alert severity="success">{formOk}</Alert>}

                        <TextField label="Full Name" value={form.fullName} onChange={onChange("fullName")} disabled={saving} fullWidth />
                        <TextField label="Email" type="email" value={form.email} onChange={onChange("email")} disabled={saving} fullWidth />
                        <TextField
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={onChange("password")}
                            disabled={saving}
                            fullWidth
                            helperText="Tối thiểu 6 ký tự"
                        />

                        {optionsLoading ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CircularProgress size={18} />
                                <Typography variant="body2">Loading options...</Typography>
                            </Stack>
                        ) : (
                            <>
                                <TextField
                                    label="Role"
                                    select
                                    SelectProps={{ native: true }}
                                    value={form.roleName}
                                    onChange={onChange("roleName")}
                                    disabled={saving}
                                    fullWidth
                                >
                                    {roleOptions.length === 0 ? (
                                        <>
                                            <option value="STUDENT">STUDENT</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </>
                                    ) : (
                                        roleOptions.map((r) => (
                                            <option key={r.id} value={r.name}>
                                                {r.name}
                                            </option>
                                        ))
                                    )}
                                </TextField>

                                <TextField
                                    label="Class"
                                    select
                                    SelectProps={{ native: true }}
                                    value={form.classId}
                                    onChange={onChange("classId")}
                                    disabled={saving}
                                    fullWidth
                                >
                                    {classOptions.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </TextField>

                                <TextField
                                    label="Module"
                                    select
                                    SelectProps={{ native: true }}
                                    value={form.moduleId}
                                    onChange={onChange("moduleId")}
                                    disabled={saving}
                                    fullWidth
                                >
                                    {moduleOptions.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </TextField>
                            </>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeDialog} disabled={saving}>
                        Hủy
                    </Button>
                    <Button variant="contained" onClick={submitCreate} disabled={saving || optionsLoading}>
                        {saving ? "Đang tạo..." : "Tạo User"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
