import {
    TextField,
    Button,
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Alert,
    Divider
} from "@mui/material";
import { useDispatch } from "react-redux";

import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {googleLoginThunk, loginThunk} from "../auth/authThunk.js";

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const registered = location.state?.registered;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // ======================
    // HELPER: Navigate based on role
    // ======================
    const navigateByRole = (roles) => {
        if (!roles || roles.length === 0) {
            navigate("/users/dashboard");
            return;
        }

        // Normalize roles (remove "ROLE_" prefix if exists)
        const normalizedRoles = roles.map(r =>
            typeof r === 'string' ? r.replace("ROLE_", "") : r
        );

        // Check if user is ADMIN
        if (normalizedRoles.includes("ADMIN")) {
            navigate("/admin");
            return;
        }

        // Default to user dashboard
        navigate("/users/dashboard");
    };

    // ======================
    // NORMAL LOGIN
    // ======================
    const submit = async () => {
        if (loading) return;

        try {
            setLoading(true);

            const res = await dispatch(
                loginThunk({ email, password })
            ).unwrap();

            if (res.status === "CREATED") {
                navigate("/complete-profile");
                return;
            }

            if (res.status === "WAITING_APPROVAL") {
                navigate("/waiting");
                return;
            }

            if (res.status === "ACTIVE") {
                // ✅ LƯU TOKEN + INFO (QUAN TRỌNG)
                localStorage.setItem("token", res.token);
                localStorage.setItem("roles", JSON.stringify(res.roles || []));
                localStorage.setItem("email", res.email || "");
                localStorage.setItem("status", res.status || "");

                navigateByRole(res.roles);
                return;
            }


        } catch (err) {
            alert(
                typeof err === "string"
                    ? err
                    : err?.message || "Đăng nhập thất bại"
            );
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
            if (!idToken) {
                throw new Error("Google token not found");
            }

            const res = await dispatch(
                googleLoginThunk(idToken)
            ).unwrap();

            if (res.status === "CREATED") {
                localStorage.removeItem("token"); // ✅ đúng key
                localStorage.setItem("register_email", res.email);
                navigate("/complete-profile");
                return;
            }

            if (res.status === "WAITING_APPROVAL") {
                navigate("/waiting");
                return;
            }

            if (res.status === "ACTIVE") {
                // ✅ LƯU TOKEN + INFO
                localStorage.setItem("token", res.token);
                localStorage.setItem("roles", JSON.stringify(res.roles || []));
                localStorage.setItem("email", res.email || "");
                localStorage.setItem("status", res.status || "");

                navigateByRole(res.roles);
                return;
            }


        } catch (err) {
            alert("Google login thất bại");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />

                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                            disabled={loading}
                        >
                            {loading ? "Đang đăng nhập..." : "Login"}
                        </Button>

                        <Divider>HOẶC</Divider>

                        <GoogleLogin
                            onSuccess={onGoogleSuccess}
                            onError={() => alert("Google Login Failed")}
                        />

                        <Button
                            variant="text"
                            onClick={() => navigate("/register")}
                            disabled={loading}
                        >
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