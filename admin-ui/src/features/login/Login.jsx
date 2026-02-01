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

const normalizeStatus = (s) => String(s || "").trim().toUpperCase();

const normalizeRoles = (roles) =>
    (roles || [])
        .filter(Boolean)
        .map((r) => (typeof r === "string" ? r.replace("ROLE_", "") : String(r).replace("ROLE_", "")));

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
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    const validatePassword = (password) => String(password || "").length >= 6;

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
        const normalized = normalizeRoles(roles);
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

        localStorage.setItem("userRoles", JSON.stringify(res?.roles || []));
        localStorage.setItem("userData", JSON.stringify(res));
    };

    // ======================
    // Handle login result (core)
    // ======================
    const handlePostLogin = (rawRes) => {
        if (!rawRes) return;

        // always persist first (avoid redirect loop / ProtectedRoute missing data)
        persistAuth(rawRes);

        const status = normalizeStatus(rawRes?.status || rawRes?.userStatus);
        const email = rawRes?.email || "";

        if (status === "CREATED") {
            // Google new user -> onboarding
            localStorage.removeItem("pendingApproval");
            localStorage.setItem("register_email", email);
            localStorage.setItem("onboardingCreated", "1");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("userRoles");
            navigate("/complete-profile", { replace: true });
            return;
        }

        if (status === "WAITING_APPROVAL") {
            // important: mark waiting so route gate works even if roles empty
            localStorage.setItem("pendingApproval", "1");
            localStorage.removeItem("onboardingCreated");
            localStorage.removeItem("register_email"); // optional, because already onboarded
            navigate("/users/waiting-approval", { replace: true });
            return;
        }

        if (status === "ACTIVE") {
            localStorage.removeItem("pendingApproval");
            localStorage.removeItem("onboardingCreated");
            localStorage.removeItem("register_email");
            navigateByRole(rawRes?.roles || []);
            return;
        }

        // fallback
        navigate("/users/dashboard", { replace: true });
    };

    const extractLoginErrMsg = (err) => {
        const status = err?.response?.status;
        const data = err?.response?.data;

        // BE trả string / message
        if (typeof data === "string" && data.trim()) return data;
        if (data?.message) return data.message;

        // Map theo status cho UX rõ ràng
        switch (status) {
            case 400:
                return "Thông tin đăng nhập không hợp lệ";
            case 401:
                return "Email hoặc mật khẩu không đúng";
            case 403:
                return "Tài khoản chưa được phê duyệt hoặc đã bị khóa";
            case 404:
                return "Tài khoản không tồn tại";
            case 500:
                return "Hệ thống đang gặp sự cố, vui lòng thử lại sau";
            default:
                break;
        }

        if (err?.message) return err.message;
        return "Đăng nhập không thành công";
    };


    // ======================
    // NORMAL LOGIN
    // ======================
    const submit = async () => {
        if (loading) return;

        setTouched({ email: true, password: true });

        const email = String(form.email || "").trim();
        const password = String(form.password || "");

        if (!validateEmail(email) || !validatePassword(password)) {
            showToast("Vui lòng kiểm tra lại Email/Mật khẩu", "warning");
            return;
        }

        try {
            setLoading(true);
            const res = await dispatch(loginThunk({ email, password })).unwrap();
            handlePostLogin(res);
            showToast("Đăng nhập thành công", "success");
        } catch (err) {
            showToast(extractLoginErrMsg(err), "error");
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

            // do NOT mutate raw
            const res = {
                ...raw,
                fullName:
                    (raw?.fullName && String(raw.fullName).trim()) ||
                    (raw?.email ? raw.email.split("@")[0] : ""),
            };

            handlePostLogin(res);
            showToast("Đăng nhập Google thành công", "success");
        } catch (err) {
            showToast(extractLoginErrMsg(err), "error");
            // eslint-disable-next-line no-console
            console.error("Google login failed:", err);
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
                                const v = e.target.value;
                                setForm((p) => ({ ...p, email: v }));
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
                                const v = e.target.value;
                                setForm((p) => ({ ...p, password: v }));
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
                            onError={() => showToast("Đăng nhập Google thất bại", "error")}
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
