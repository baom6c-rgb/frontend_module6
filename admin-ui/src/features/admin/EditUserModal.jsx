import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Stack,
    TextField,
    Typography,
    CircularProgress,
    Autocomplete,
    Alert,
    MenuItem,
} from "@mui/material";

import AppModal from "../../components/common/AppModal";
import { adminUserApi } from "../../api/adminUserApi";
import { useToast } from "../../components/common/AppToast";

const toUpper = (s) => String(s || "").toUpperCase();

const toErrorText = (err, fallback = "Cập nhật thất bại.") => {
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

export default function EditUserModal({
                                          open,
                                          onClose,
                                          userId,
                                          roleOptions = [],
                                          classOptions = [],
                                          moduleOptions = [],
                                          onUpdated,
                                      }) {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErr, setFormErr] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        roleName: "STUDENT",
        classId: "",
        moduleId: "",
    });

    const isAdminRole = useMemo(() => toUpper(form.roleName) === "ADMIN", [form.roleName]);

    // ✅ reset lỗi khi mở modal / đổi userId
    useEffect(() => {
        if (!open) return;
        setFormErr("");
    }, [open, userId]);

    // ===== preload user =====
    useEffect(() => {
        if (!open || !userId) return;

        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setFormErr(""); // ✅ mở modal là sạch lỗi

                const res = await adminUserApi.getUserDetail(userId);
                const u = res?.data || {};

                if (!alive) return;

                setForm({
                    fullName: u.fullName ?? "",
                    email: u.email ?? "",
                    roleName: u.roleName ?? u.role ?? "STUDENT",
                    classId: u.classId ?? u.class?.id ?? "",
                    moduleId: u.moduleId ?? u.module?.id ?? "",
                });

                setFormErr(""); // ✅ load OK thì chắc chắn không còn lỗi cũ
            } catch (e) {
                setFormErr(toErrorText(e, "Không thể tải thông tin người dùng."));
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, userId]);

    // ===== role change → clear class/module =====
    useEffect(() => {
        if (isAdminRole) {
            setForm((p) => ({ ...p, classId: "", moduleId: "" }));
        }
    }, [isAdminRole]);

    const setField = (key, value) => {
        setForm((p) => ({ ...p, [key]: value }));
    };

    const selectedClass = useMemo(
        () => classOptions.find((c) => String(c.id) === String(form.classId)) || null,
        [classOptions, form.classId]
    );

    const selectedModule = useMemo(
        () => moduleOptions.find((m) => String(m.id) === String(form.moduleId)) || null,
        [moduleOptions, form.moduleId]
    );

    const handleClose = () => {
        if (saving) return;
        setFormErr(""); // ✅ đóng modal là sạch lỗi
        onClose?.();
    };

    const handleSubmit = async () => {
        if (!userId || saving) return;

        setFormErr("");

        if (!form.fullName.trim()) {
            setFormErr("Vui lòng nhập Họ tên.");
            return;
        }

        if (!isAdminRole && (!form.classId || !form.moduleId)) {
            setFormErr("Vui lòng chọn Lớp và Module.");
            return;
        }

        const payload = {
            fullName: form.fullName.trim(),
            roleName: form.roleName,
            ...(isAdminRole
                ? {}
                : {
                    classId: Number(form.classId),
                    moduleId: Number(form.moduleId),
                }),
        };

        try {
            setSaving(true);
            await adminUserApi.updateUser(userId, payload);
            showToast("Cập nhật người dùng thành công", "success");
            await onUpdated?.();
        } catch (e) {
            const msg = toErrorText(e, "Cập nhật thất bại.");
            setFormErr(msg);            // ✅ chỉ set khi bấm Lưu và fail
            showToast(msg, "error");    // ✅ hiện lỗi thật để biết vì sao ADMIN fail
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            open={open}
            title="Chỉnh sửa người dùng"
            primaryText={saving ? "Đang lưu..." : "Lưu"}
            secondaryText="Hủy"
            onClose={handleClose}
            onSubmit={handleSubmit}
            loading={saving}
            maxWidth={560}
        >
            {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Đang tải dữ liệu...</Typography>
                </Box>
            ) : (
                <Stack spacing={2}>
                    {formErr ? <Alert severity="error">{formErr}</Alert> : null}

                    <TextField
                        label="Họ tên"
                        value={form.fullName}
                        onChange={(e) => setField("fullName", e.target.value)}
                        disabled={saving}
                        fullWidth
                    />

                    {/* Email readonly (không disabled) */}
                    <TextField
                        label="Email"
                        value={form.email}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        onKeyDown={(e) => e.preventDefault()}
                        helperText="Email không thể chỉnh sửa"
                    />

                    <TextField
                        label="Vai trò"
                        select
                        value={form.roleName}
                        onChange={(e) => setField("roleName", e.target.value)}
                        disabled={saving}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        SelectProps={{
                            MenuProps: {
                                disablePortal: true,
                                PaperProps: { sx: { borderRadius: 2, mt: 0.5 } },
                            },
                        }}
                    >
                        {(roleOptions?.length
                                ? roleOptions
                                : [
                                    { id: "STUDENT", name: "STUDENT" },
                                    { id: "ADMIN", name: "ADMIN" },
                                ]
                        ).map((r) => (
                            <MenuItem key={r.id} value={r.name}>
                                {r.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {!isAdminRole ? (
                        <>
                            <Autocomplete
                                options={classOptions}
                                value={selectedClass}
                                onChange={(_, opt) => setField("classId", opt?.id ? String(opt.id) : "")}
                                getOptionLabel={(o) => o?.name || ""}
                                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                                disabled={saving}
                                renderInput={(params) => <TextField {...params} label="Lớp" />}
                            />

                            <Autocomplete
                                options={moduleOptions}
                                value={selectedModule}
                                onChange={(_, opt) => setField("moduleId", opt?.id ? String(opt.id) : "")}
                                getOptionLabel={(o) => o?.name || ""}
                                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                                disabled={saving}
                                renderInput={(params) => <TextField {...params} label="Module" />}
                            />
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            ADMIN không cần chọn Lớp / Module.
                        </Typography>
                    )}
                </Stack>
            )}
        </AppModal>
    );
}
