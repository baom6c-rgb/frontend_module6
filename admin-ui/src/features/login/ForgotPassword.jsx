import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
    Alert,
} from "@mui/material";
import { forgotPasswordApi } from "../../api/authApi.js";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [okMsg, setOkMsg] = useState("");
    const [errMsg, setErrMsg] = useState("");

    const submit = async () => {
        if (loading) return;
        setOkMsg("");
        setErrMsg("");

        const value = email.trim();
        if (!value) {
            setErrMsg("Vui lòng nhập email.");
            return;
        }

        try {
            setLoading(true);
            const res = await forgotPasswordApi(value);
            // BE trả string message
            setOkMsg(res?.data || "Link đặt lại mật khẩu đã được gửi vào email của bạn.");
        } catch (err) {
            setErrMsg(
                err?.response?.data?.message ||
                err?.response?.data ||
                "Không thể gửi yêu cầu. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Quên mật khẩu
                    </Typography>

                    <Stack spacing={2}>
                        {okMsg && <Alert severity="success">{okMsg}</Alert>}
                        {errMsg && <Alert severity="error">{errMsg}</Alert>}

                        <TextField
                            label="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />

                        <Button variant="contained" size="large" onClick={submit} disabled={loading}>
                            {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
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
