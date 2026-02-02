import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
} from "@mui/material";

import { resetPasswordApi } from "../../api/authApi.js";
import PasswordField from "../../components/form/PasswordField";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();

    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    const [form, setForm] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const [touched, setTouched] = useState({
        newPassword: false,
        confirmPassword: false,
    });

    const [loading, setLoading] = useState(false);

    const validatePassword = (pw) => (pw || "").length >= 6;

    const submit = async () => {
        if (loading) return;

        setTouched({ newPassword: true, confirmPassword: true });

        if (!token) {
            showToast("Link không hợp lệ hoặc thiếu token.", "error");
            return;
        }

        if (!validatePassword(form.newPassword)) {
            showToast("Mật khẩu mới phải tối thiểu 6 ký tự.", "warning");
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            showToast("Xác nhận mật khẩu không khớp.", "warning");
            return;
        }

        try {
            setLoading(true);
            await resetPasswordApi({ token, newPassword: form.newPassword });

            showToast("Mật khẩu đã được cập nhật thành công.", "success");
            navigate("/login", { replace: true });
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                "Không thể đặt lại mật khẩu. Token có thể đã hết hạn.";

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
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang cập nhật mật khẩu" />

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
                <CardContent sx={{ p: 3.5 }}>
                    {/* Logo */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: 2,
                        }}
                    >
                        <img
                            src="/images/codegym_login.png"
                            alt="Logo"
                            style={{
                                height: "60px",
                                objectFit: "contain",
                                borderRadius: "50%",
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h4"
                        textAlign="center"
                        sx={{
                            mb: 1,
                            fontWeight: 700,
                            color: "#2E2D84",
                        }}
                    >
                        Đặt lại mật khẩu
                    </Typography>

                    <Typography
                        variant="body2"
                        textAlign="center"
                        color="text.secondary"
                        sx={{ mb: 3, fontSize: "13px" }}
                    >
                        Nhập mật khẩu mới để khôi phục tài khoản
                    </Typography>

                    <Stack spacing={2}>
                        <PasswordField
                            label="Mật khẩu mới"
                            value={form.newPassword}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, newPassword: e.target.value }));
                                if (!touched.newPassword) setTouched((p) => ({ ...p, newPassword: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                            error={touched.newPassword && !validatePassword(form.newPassword)}
                            helperText={
                                touched.newPassword && !validatePassword(form.newPassword)
                                    ? "Mật khẩu tối thiểu 6 ký tự"
                                    : ""
                            }
                            disabled={loading}
                            autoComplete="new-password"
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
                            label="Xác nhận mật khẩu"
                            value={form.confirmPassword}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, confirmPassword: e.target.value }));
                                if (!touched.confirmPassword)
                                    setTouched((p) => ({ ...p, confirmPassword: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                            error={
                                touched.confirmPassword &&
                                form.confirmPassword.length > 0 &&
                                form.newPassword !== form.confirmPassword
                            }
                            helperText={
                                touched.confirmPassword &&
                                form.confirmPassword.length > 0 &&
                                form.newPassword !== form.confirmPassword
                                    ? "Xác nhận mật khẩu không khớp"
                                    : ""
                            }
                            disabled={loading}
                            autoComplete="new-password"
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
                                py: 1.3,
                                textTransform: "none",
                                fontSize: 15,
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
                            Cập nhật mật khẩu
                        </Button>

                        <Typography
                            variant="body2"
                            onClick={() => navigate("/login")}
                            sx={{
                                textAlign: "center",
                                color: "#2E2D84",
                                cursor: "pointer",
                                fontWeight: 500,
                                fontSize: "13px",
                                mt: 0.5,
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