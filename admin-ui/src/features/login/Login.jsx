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

            const payload = JSON.parse(atob(idToken.split(".")[1]));
            console.log("Google payload =", payload);
            console.log("aud =", payload.aud);
            console.log("iss =", payload.iss);
            console.log("exp =", payload.exp);
            console.log("now =", Math.floor(Date.now() / 1000));

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
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                // Ảnh nền từ thư mục public/images
                backgroundImage: 'url(/images/background_login.jpg)',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                // Overlay tối nhẹ để làm nổi bật form
                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(3px)",
                    zIndex: 0,
                },
            }}
        >
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang đăng nhập" />

            <Card
                sx={{
                    maxWidth: 420,
                    width: "90%",
                    mx: "auto",
                    position: "relative",
                    zIndex: 1,
                    backdropFilter: "blur(16px)",
                    backgroundColor: "rgba(255, 255, 255, 0.75)",
                    boxShadow: "0 12px 48px 0 rgba(46, 45, 132, 0.4)",
                    borderRadius: "20px",
                    border: "2px solid rgba(46, 45, 132, 0.2)",
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    {/* Logo từ public/images */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: 2,
                        }}
                    >
                        <Box
                            component="img"
                            src="/images/codegym_login.png"
                            alt="Logo"
                            sx={{
                                width: 70,
                                height: 70,
                                borderRadius: "50%",
                                objectFit: "cover",
                                filter: "drop-shadow(0 4px 12px rgba(46, 45, 132, 0.25))",
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h4"
                        textAlign="center"
                        mb={0.5}
                        sx={{
                            fontWeight: 700,
                            color: "#2E2D84",
                            letterSpacing: "-0.5px",
                            fontSize: "28px",
                        }}
                    >
                        Đăng nhập
                    </Typography>

                    <Typography
                        variant="body2"
                        textAlign="center"
                        mb={3}
                        sx={{
                            color: "text.secondary",
                            fontSize: "14px",
                        }}
                    >
                        Hệ thống đào tạo Lập trình
                    </Typography>

                    {registered && (
                        <Alert
                            severity="success"
                            sx={{
                                mb: 2.5,
                                borderRadius: 2,
                                border: "1px solid #4caf50",
                                fontSize: "14px",
                            }}
                        >
                            Đăng ký thành công, vui lòng đăng nhập
                        </Alert>
                    )}

                    <Stack spacing={2.5}>
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
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.5,
                                    backgroundColor: "#f8f8fc",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: "#f0f0fa",
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: "#fff",
                                        "& fieldset": {
                                            borderColor: "#2E2D84",
                                            borderWidth: "2px",
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "#2E2D84",
                                },
                            }}
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
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.5,
                                    backgroundColor: "#f8f8fc",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: "#f0f0fa",
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: "#fff",
                                        "& fieldset": {
                                            borderColor: "#2E2D84",
                                            borderWidth: "2px",
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "#2E2D84",
                                },
                            }}
                        />

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                            disabled={loading}
                            sx={{
                                borderRadius: 2.5,
                                py: 1.5,
                                textTransform: "none",
                                fontSize: 16,
                                fontWeight: 600,
                                background: "linear-gradient(135deg, #2E2D84 0%, #EC5E32 100%)",
                                boxShadow: "0 6px 20px rgba(46, 45, 132, 0.35)",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    background: "linear-gradient(135deg, #242370 0%, #d34d28 100%)",
                                    boxShadow: "0 8px 28px rgba(46, 45, 132, 0.45)",
                                    transform: "translateY(-2px)",
                                },
                                "&:active": {
                                    transform: "translateY(0px)",
                                },
                                "&.Mui-disabled": {
                                    background: "linear-gradient(135deg, #a5a4c8 0%, #e0b0a0 100%)",
                                },
                            }}
                        >
                            Đăng nhập
                        </Button>

                        <Divider
                            sx={{
                                my: 1,
                                "&::before, &::after": {
                                    borderColor: "rgba(46, 45, 132, 0.2)",
                                },
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "text.secondary",
                                    fontWeight: 500,
                                    fontSize: "13px",
                                    px: 1,
                                }}
                            >
                                HOẶC
                            </Typography>
                        </Divider>

                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <GoogleLogin
                                onSuccess={onGoogleSuccess}
                                onError={() => showToast("Đăng nhập Google thất bại", "error")}
                                useOneTap={false}
                                scope="openid email profile"
                                disabled={loading}
                            />
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "14px" }}>
                                Chưa có tài khoản?
                            </Typography>
                            <Typography
                                variant="body2"
                                onClick={() => navigate("/register")}
                                sx={{
                                    color: "#2E2D84",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    textDecoration: "none",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        textDecoration: "underline",
                                        color: "#1f1c5e",
                                    },
                                }}
                            >
                                Đăng ký ngay
                            </Typography>
                        </Stack>

                        <Typography
                            variant="body2"
                            onClick={() => navigate("/forgot-password")}
                            sx={{
                                textAlign: "center",
                                color: "#2E2D84",
                                cursor: "pointer",
                                fontWeight: 500,
                                fontSize: "14px",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    textDecoration: "underline",
                                    color: "#1f1c5e",
                                },
                            }}
                        >
                            Quên mật khẩu?
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}