import React, { useEffect, useMemo, useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Autocomplete,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";
import { registerApi } from "../../api/authApi";

import PasswordField from "../../components/form/PasswordField";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

export default function Register() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [form, setForm] = useState({
        email: "",
        password: "",
        fullName: "",
        classId: null,
        moduleId: null,
    });

    const [touched, setTouched] = useState({
        email: false,
        password: false,
        classId: false,
        moduleId: false,
    });

    const [loading, setLoading] = useState(false);

    /* =====================
       Load options
    ===================== */
    useEffect(() => {
        Promise.all([getAllClassesApi(), getAllModulesApi()])
            .then(([cRes, mRes]) => {
                setClasses(cRes?.data || []);
                setModules(mRes?.data || []);
            })
            .catch(() => {
                setClasses([]);
                setModules([]);
            });
    }, []);

    /* =====================
       Validators
    ===================== */
    const validateEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password) =>
        (password || "").length >= 6;

    const errors = useMemo(() => {
        const e = {};

        if (touched.email && !validateEmail(form.email)) {
            e.email = "Email không đúng định dạng";
        }
        if (touched.password && !validatePassword(form.password)) {
            e.password = "Mật khẩu tối thiểu 6 ký tự";
        }
        if (touched.classId && !form.classId) {
            e.classId = "Vui lòng chọn lớp";
        }
        if (touched.moduleId && !form.moduleId) {
            e.moduleId = "Vui lòng chọn module";
        }

        return e;
    }, [form, touched]);

    const selectedClass = useMemo(
        () => classes.find((c) => c.id === form.classId) || null,
        [classes, form.classId]
    );

    const selectedModule = useMemo(
        () => modules.find((m) => m.id === form.moduleId) || null,
        [modules, form.moduleId]
    );

    const markAllTouched = () => {
        setTouched({
            email: true,
            password: true,
            classId: true,
            moduleId: true,
        });
    };

    /* =====================
       Submit
    ===================== */
    const submit = async () => {
        markAllTouched();

        if (
            !validateEmail(form.email) ||
            !validatePassword(form.password) ||
            !form.classId ||
            !form.moduleId
        ) {
            showToast("Vui lòng kiểm tra lại thông tin đăng ký", "warning");
            return;
        }

        const payload = {
            ...form,
            // ✅ nếu chưa nhập tên → lấy từ email
            fullName:
                form.fullName?.trim() ||
                form.email.split("@")[0],
        };

        try {
            setLoading(true);
            await registerApi(payload);

            showToast("Đăng ký thành công! Vui lòng đăng nhập", "success");
            navigate("/login", { state: { registered: true } });
        } catch (e) {
            const msg =
                typeof e?.response?.data === "string"
                    ? e.response.data
                    : e?.response?.data?.message ||
                    "Đăng ký thất bại, vui lòng thử lại";

            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            {/* Global loading */}
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang đăng ký" />

            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Đăng ký tài khoản
                    </Typography>

                    <Stack spacing={2}>
                        {/* Email */}
                        <TextField
                            label="Email"
                            value={form.email}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, email: e.target.value }));
                                if (!touched.email)
                                    setTouched((p) => ({ ...p, email: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, email: true }))
                            }
                            error={!!errors.email}
                            helperText={errors.email}
                            autoComplete="email"
                            disabled={loading}
                        />

                        {/* Password */}
                        <PasswordField
                            label="Mật khẩu"
                            value={form.password}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, password: e.target.value }));
                                if (!touched.password)
                                    setTouched((p) => ({ ...p, password: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, password: true }))
                            }
                            error={!!errors.password}
                            helperText={errors.password}
                            autoComplete="new-password"
                            disabled={loading}
                        />

                        {/* Full name */}
                        <TextField
                            label="Họ và tên"
                            value={form.fullName}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, fullName: e.target.value }))
                            }
                            helperText="Có thể bỏ trống (sẽ lấy từ email)"
                            autoComplete="name"
                            disabled={loading}
                        />

                        {/* Class */}
                        <Autocomplete
                            options={classes}
                            value={selectedClass}
                            getOptionLabel={(o) => o?.className || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, classId: v?.id || null }));
                                setTouched((p) => ({ ...p, classId: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, classId: true }))
                            }
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Class"
                                    error={!!errors.classId}
                                    helperText={errors.classId}
                                />
                            )}
                        />

                        {/* Module */}
                        <Autocomplete
                            options={modules}
                            value={selectedModule}
                            getOptionLabel={(o) => o?.moduleName || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, moduleId: v?.id || null }));
                                setTouched((p) => ({ ...p, moduleId: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, moduleId: true }))
                            }
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Module"
                                    error={!!errors.moduleId}
                                    helperText={errors.moduleId}
                                />
                            )}
                        />

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                            disabled={loading}
                        >
                            Đăng ký
                        </Button>

                        <Button
                            variant="text"
                            onClick={() => navigate("/login")}
                            disabled={loading}
                        >
                            Đã có tài khoản? Đăng nhập
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
