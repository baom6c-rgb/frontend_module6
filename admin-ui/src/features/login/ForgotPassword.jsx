import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
} from "@mui/material";

import { forgotPasswordApi } from "../../api/authApi.js";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const error = useMemo(() => {
        if (!touched) return "";
        const v = email.trim();
        if (!v) return "Vui lòng nhập email.";
        if (!validateEmail(v)) return "Email không đúng định dạng.";
        return "";
    }, [email, touched]);

    const submit = async () => {
        if (loading) return;
        setTouched(true);

        const value = email.trim();
        if (!value) {
            showToast("Vui lòng nhập email.", "warning");
            return;
        }
        if (!validateEmail(value)) {
            showToast("Email không đúng định dạng.", "warning");
            return;
        }

        try {
            setLoading(true);
            const res = await forgotPasswordApi(value);

            const msg =
                (typeof res?.data === "string" && res.data) ||
                "Link đặt lại mật khẩu đã được gửi vào email của bạn.";

            showToast(msg, "success");
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                "Không thể gửi yêu cầu. Vui lòng thử lại.";

            showToast(String(msg), "error");
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
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang gửi email" />

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
                        Quên mật khẩu
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
                        Nhập email để nhận link đặt lại mật khẩu
                    </Typography>

                    <Stack spacing={2.5}>
                        <TextField
                            label="Email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (!touched) setTouched(true);
                            }}
                            onBlur={() => setTouched(true)}
                            error={!!error}
                            helperText={error}
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
                            Gửi link đặt lại mật khẩu
                        </Button>

                        <Typography
                            variant="body2"
                            onClick={() => navigate("/login")}
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
                            Quay lại đăng nhập
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}