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
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang gửi email" />

            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Quên mật khẩu
                    </Typography>

                    <Stack spacing={2}>
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
                        />

                        <Button variant="contained" size="large" onClick={submit} disabled={loading}>
                            Gửi link đặt lại mật khẩu
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
