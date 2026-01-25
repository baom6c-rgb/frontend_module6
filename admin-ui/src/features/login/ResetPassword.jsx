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
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang cập nhật mật khẩu" />

            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Đặt lại mật khẩu
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
                        />

                        <Button variant="contained" size="large" onClick={submit} disabled={loading}>
                            Cập nhật mật khẩu
                        </Button>

                        <Button variant="text" onClick={() => navigate("/login")} disabled={loading}>
                            Quay lại đăng nhập
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
