import React, { useMemo, useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Alert,
    Divider,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import { googleLoginThunk, loginThunk } from "../auth/authThunk.js";
import PasswordField from "../../components/form/PasswordField";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const registered = location.state?.registered;

    const [form, setForm] = useState({ email: "", password: "" });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [loading, setLoading] = useState(false);

    // ======================
    // Validators
    // ======================
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (password) => (password || "").length >= 6;

    const errors = useMemo(() => {
        const e = {};
        if (touched.email && !validateEmail(form.email)) e.email = "Email không đúng định dạng";
        if (touched.password && !validatePassword(form.password)) e.password = "Mật khẩu tối thiểu 6 ký tự";
        return e;
    }, [form.email, form.password, touched]);

    // ======================
    // Navigate by role
    // ======================
    const navigateByRole = (roles) => {
        const normalized = (roles || []).map((r) => (typeof r === "string" ? r.replace("ROLE_", "") : r));
        if (normalized.includes("ADMIN")) return navigate("/admin", { replace: true });
        return navigate("/users/dashboard", { replace: true });
    };

    // ======================
    // Save auth to localStorage
    // ======================
    const persistAuth = (res) => {
        if (!res) return;

        const token = res?.token || res?.accessToken || res?.jwt;
        if (token) localStorage.setItem("accessToken", token);

        localStorage.setItem("userRoles", JSON.stringify(res.roles || []));
        localStorage.setItem("userData", JSON.stringify(res));
    };

    // ======================
    // Handle login result
    // ======================
    const handlePostLogin = (res) => {
        if (!res) return;

        if (res.status === "CREATED") {
            localStorage.removeItem("pendingApproval"); // ✅ tránh dính flag cũ
            localStorage.setItem("register_email", res.email || "");
            // vẫn lưu userData/roles nếu cần
            localStorage.setItem("userRoles", JSON.stringify(res.roles || []));
            localStorage.setItem("userData", JSON.stringify(res));
            navigate("/complete-profile", { replace: true });
            return;
        }

        if (res.status === "WAITING_APPROVAL") {
            // ✅ quan trọng để ProtectedRoute nhận diện WAITING ngay cả khi không có token
            localStorage.setItem("pendingApproval", "1");

            const token = res?.token || res?.accessToken || res?.jwt;
            if (token) localStorage.setItem("accessToken", token);

            localStorage.setItem("userRoles", JSON.stringify(res.roles || []));
            localStorage.setItem("userData", JSON.stringify(res));
            navigate("/users/waiting-approval", { replace: true });
            return;
        }

        if (res.status === "ACTIVE") {
            localStorage.removeItem("pendingApproval");
            persistAuth(res);
            navigateByRole(res.roles);
            return;
        }

        // fallback
        persistAuth(res);
        navigate("/users/dashboard", { replace: true });
    };

    // ======================
    // NORMAL LOGIN
    // ======================
    const submit = async () => {
        if (loading) return;

        setTouched({ email: true, password: true });
        if (!validateEmail(form.email) || !validatePassword(form.password)) {
            showToast("Vui lòng kiểm tra lại Email/Mật khẩu", "warning");
            return;
        }

        try {
            setLoading(true);
            const res = await dispatch(loginThunk({ email: form.email, password: form.password })).unwrap();

            handlePostLogin(res);
            showToast("Đăng nhập thành công", "success");
        } catch (err) {
            const msg = typeof err === "string" ? err : err?.message || "Đăng nhập thất bại";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ======================
    // GOOGLE LOGIN
    // ======================
    const onGoogleSuccess = async (credentialResponse) => {
        if (loading) return;

        try {
            setLoading(true);

            const idToken = credentialResponse?.credential;
            if (!idToken) throw new Error("Google token not found");

            const raw = await dispatch(googleLoginThunk(idToken)).unwrap();

            // ✅ không mutate raw (tránh object frozen)
            const res = {
                ...raw,
                fullName:
                    (raw?.fullName && String(raw.fullName).trim()) ||
                    (raw?.email ? raw.email.split("@")[0] : ""),
            };

            handlePostLogin(res);
            showToast("Đăng nhập Google thành công", "success");
        } catch (err) {
            const msg = typeof err === "string" ? err : err?.message || "Google login thất bại";
            showToast(msg, "error");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang đăng nhập" />

            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Đăng nhập
                    </Typography>

                    {registered && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Đăng ký thành công, vui lòng đăng nhập
                        </Alert>
                    )}

                    <Stack spacing={2}>
                        <TextField
                            label="Email"
                            value={form.email}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, email: e.target.value }));
                                if (!touched.email) setTouched((p) => ({ ...p, email: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                            error={!!errors.email}
                            helperText={errors.email}
                            disabled={loading}
                            autoComplete="email"
                        />

                        <PasswordField
                            label="Mật khẩu"
                            value={form.password}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, password: e.target.value }));
                                if (!touched.password) setTouched((p) => ({ ...p, password: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                            error={!!errors.password}
                            helperText={errors.password}
                            disabled={loading}
                            autoComplete="current-password"
                        />

                        <Button variant="contained" size="large" onClick={submit} disabled={loading}>
                            Login
                        </Button>

                        <Divider>HOẶC</Divider>

                        <GoogleLogin
                            onSuccess={onGoogleSuccess}
                            onError={() => showToast("Google Login Failed", "error")}
                            useOneTap={false}
                            scope="openid email profile"
                            disabled={loading}
                        />

                        <Button variant="text" onClick={() => navigate("/register")} disabled={loading}>
                            Chưa có tài khoản? Đăng ký
                        </Button>

                        <Button
                            variant="text"
                            onClick={() => navigate("/forgot-password")}
                            disabled={loading}
                            sx={{ mt: -1 }}
                        >
                            Quên mật khẩu?
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
