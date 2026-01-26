import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Stack,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Typography,
    Autocomplete,
    IconButton,
    InputAdornment,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import AppModal from "../../components/common/AppModal";
import { createAdminUserApi } from "../../api/adminUserApi";
import { useToast } from "../../components/common/AppToast";

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

const isValidEmail = (email) => {
    const s = String(email || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
};

export default function AdminCreateUserModal({
                                                 open,
                                                 onClose,
                                                 // options + loader (để không thiếu dropdown khi tách file)
                                                 fetchOptions,
                                                 optionsLoading,
                                                 roleOptions: roleOptionsProp,
                                                 classOptions: classOptionsProp,
                                                 moduleOptions: moduleOptionsProp,

                                                 // callback để parent prepend row + refresh (nếu muốn)
                                                 onCreated,
                                             }) {
    const { showToast } = useToast();

    const roleOptions = useMemo(
        () => normalizeRoleOptions(roleOptionsProp || []),
        [roleOptionsProp]
    );
    const classOptions = useMemo(
        () => mapClassOptions(classOptionsProp || []),
        [classOptionsProp]
    );
    const moduleOptions = useMemo(
        () => mapModuleOptions(moduleOptionsProp || []),
        [moduleOptionsProp]
    );

    const [saving, setSaving] = useState(false);
    const [formErr, setFormErr] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        classId: "",
        moduleId: "",
        roleName: "STUDENT",
    });

    // ✅ realtime field errors
    const [errors, setErrors] = useState({
        fullName: "",
        email: "",
        password: "",
        roleName: "",
        classId: "",
        moduleId: "",
    });

    // ✅ show/hide password
    const [showPassword, setShowPassword] = useState(false);

    const isAdminRole = useMemo(
        () => String(form.roleName || "").toUpperCase() === "ADMIN",
        [form.roleName]
    );

    useEffect(() => {
        if (!open) return;

        // đảm bảo options có để dropdown không rỗng + fix lệch label
        (async () => {
            try {
                if (typeof fetchOptions === "function") {
                    await fetchOptions();
                }
            } catch {
                // parent đã handle error
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        // Role ADMIN: ẩn hoàn toàn class/module => clear luôn
        if (isAdminRole) {
            setForm((prev) => ({ ...prev, classId: "", moduleId: "" }));
            setErrors((prev) => ({ ...prev, classId: "", moduleId: "" }));
        }
    }, [isAdminRole]);

    const validateField = (key, nextForm = form) => {
        const v = nextForm[key];

        switch (key) {
            case "fullName":
                return String(v || "").trim() ? "" : "Vui lòng nhập Họ tên.";
            case "email": {
                const s = String(v || "").trim();
                if (!s) return "Vui lòng nhập Email.";
                if (!isValidEmail(s)) return "Email không hợp lệ.";
                return "";
            }
            case "password": {
                const s = String(v || "");
                if (!s) return "Vui lòng nhập Mật khẩu.";
                if (s.length < 6) return "Mật khẩu tối thiểu 6 ký tự.";
                return "";
            }
            case "roleName":
                return String(v || "").trim() ? "" : "Vui lòng chọn Vai trò.";
            case "classId":
                if (String(nextForm.roleName || "").toUpperCase() === "ADMIN") return "";
                return v ? "" : "Vui lòng chọn Lớp.";
            case "moduleId":
                if (String(nextForm.roleName || "").toUpperCase() === "ADMIN") return "";
                return v ? "" : "Vui lòng chọn Module.";
            default:
                return "";
        }
    };

    const setField = (key, value) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value };

            setErrors((prevErr) => ({
                ...prevErr,
                [key]: validateField(key, next),
                ...(key === "roleName"
                    ? {
                        classId: validateField("classId", next),
                        moduleId: validateField("moduleId", next),
                    }
                    : {}),
            }));

            return next;
        });
    };

    const onChange = (key) => (e) => {
        setField(key, e.target.value);
    };

    const resetForm = () => {
        setFormErr("");
        setErrors({
            fullName: "",
            email: "",
            password: "",
            roleName: "",
            classId: "",
            moduleId: "",
        });
        setShowPassword(false);
        setForm({
            fullName: "",
            email: "",
            password: "",
            classId: "",
            moduleId: "",
            roleName: roleOptions?.[0]?.name || "STUDENT",
        });
    };

    const handleClose = () => {
        if (saving) return;
        setFormErr("");
        onClose?.();
    };

    const selectedClass = useMemo(() => {
        return classOptions.find((c) => String(c.id) === String(form.classId)) || null;
    }, [classOptions, form.classId]);

    const selectedModule = useMemo(() => {
        return moduleOptions.find((m) => String(m.id) === String(form.moduleId)) || null;
    }, [moduleOptions, form.moduleId]);

    const isFormValid = useMemo(() => {
        const keys = ["fullName", "email", "password", "roleName"];
        if (!isAdminRole) keys.push("classId", "moduleId");
        return keys.every((k) => !validateField(k, form));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, isAdminRole]);

    const handleSubmit = async () => {
        if (saving) return;

        setFormErr("");

        const nextErrs = {
            fullName: validateField("fullName"),
            email: validateField("email"),
            password: validateField("password"),
            roleName: validateField("roleName"),
            classId: validateField("classId"),
            moduleId: validateField("moduleId"),
        };
        setErrors(nextErrs);

        const hasErr = Object.values(nextErrs).some(Boolean);
        if (hasErr) {
            setFormErr("Vui lòng kiểm tra lại thông tin.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                password: form.password,
                roleName: form.roleName,
                ...(isAdminRole
                    ? {}
                    : {
                        classId: Number(form.classId),
                        moduleId: Number(form.moduleId),
                    }),
            };

            const res = await createAdminUserApi(payload);

            showToast("Tạo người dùng thành công", "success");

            // báo cho parent để prepend row (user mới lên đầu)
            onCreated?.(res?.data);

            resetForm();
            onClose?.();
        } catch (e) {
            const msg = toErrorText(e, "Tạo người dùng thất bại.");
            setFormErr(msg);
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            open={open}
            title="Thêm người dùng"
            primaryText={saving ? "Đang tạo..." : "Tạo mới"}
            secondaryText="Hủy"
            onClose={handleClose}
            // ✅ FIX SUBMIT: AppModal dùng onSubmit, không phải onPrimary
            onSubmit={isFormValid ? handleSubmit : undefined}
            loading={saving}
            maxWidth={560}
        >
            <Stack spacing={2}>
                {formErr ? <Alert severity="error">{formErr}</Alert> : null}

                <TextField
                    label="Họ tên"
                    value={form.fullName}
                    onChange={onChange("fullName")}
                    onBlur={() =>
                        setErrors((p) => ({ ...p, fullName: validateField("fullName") }))
                    }
                    disabled={saving}
                    fullWidth
                    error={!!errors.fullName}
                    helperText={errors.fullName || " "}
                />

                <TextField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={onChange("email")}
                    onBlur={() => setErrors((p) => ({ ...p, email: validateField("email") }))}
                    disabled={saving}
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email || " "}
                />

                {/* ✅ Password eye ngay tại đây (không dùng PasswordField) */}
                <TextField
                    label="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={onChange("password")}
                    onBlur={() =>
                        setErrors((p) => ({ ...p, password: validateField("password") }))
                    }
                    disabled={saving}
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password || " "}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    edge="end"
                                    onClick={() => setShowPassword((v) => !v)}
                                    disabled={saving}
                                    aria-label="toggle password visibility"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                {optionsLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Đang tải dữ liệu...</Typography>
                    </Box>
                ) : (
                    <>
                        <TextField
                            label="Vai trò"
                            select
                            value={form.roleName}
                            onChange={onChange("roleName")}
                            disabled={saving}
                            fullWidth
                            error={!!errors.roleName}
                            helperText={errors.roleName || " "}
                            InputLabelProps={{ shrink: true }}
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

                        {/* ✅ STUDENT: Autocomplete searchable / ✅ ADMIN: ẩn */}
                        {!isAdminRole ? (
                            <>
                                <Autocomplete
                                    options={classOptions}
                                    value={selectedClass}
                                    onChange={(_, opt) =>
                                        setField("classId", opt?.id ? String(opt.id) : "")
                                    }
                                    getOptionLabel={(o) => o?.name || ""}
                                    isOptionEqualToValue={(a, b) =>
                                        String(a.id) === String(b.id)
                                    }
                                    disabled={saving}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Lớp"
                                            error={!!errors.classId}
                                            helperText={errors.classId || " "}
                                        />
                                    )}
                                />

                                <Autocomplete
                                    options={moduleOptions}
                                    value={selectedModule}
                                    onChange={(_, opt) =>
                                        setField("moduleId", opt?.id ? String(opt.id) : "")
                                    }
                                    getOptionLabel={(o) => o?.name || ""}
                                    isOptionEqualToValue={(a, b) =>
                                        String(a.id) === String(b.id)
                                    }
                                    disabled={saving}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Module"
                                            error={!!errors.moduleId}
                                            helperText={errors.moduleId || " "}
                                        />
                                    )}
                                />
                            </>
                        ) : (
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                ADMIN không cần chọn Lớp/Module.
                            </Typography>
                        )}
                    </>
                )}
            </Stack>
        </AppModal>
    );
}
