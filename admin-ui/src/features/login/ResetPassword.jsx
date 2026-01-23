import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { resetPasswordApi } from "../../api/authApi.js";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [okMsg, setOkMsg] = useState("");
    const [errMsg, setErrMsg] = useState("");

    const submit = async () => {
        if (loading) return;
        setOkMsg("");
        setErrMsg("");

        if (!token) {
            setErrMsg("Link không hợp lệ hoặc thiếu token.");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setErrMsg("Mật khẩu mới phải tối thiểu 6 ký tự.");
            return;
        }
        if (newPassword !== confirm) {
            setErrMsg("Xác nhận mật khẩu không khớp.");
            return;
        }

        try {
            setLoading(true);
            const res = await resetPasswordApi({ token, newPassword });
            setOkMsg(res?.data || "Mật khẩu đã được cập nhật thành công.");
            setTimeout(() => navigate("/login"), 900);
        } catch (err) {
            setErrMsg(
                err?.response?.data?.message ||
                err?.response?.data ||
                "Không thể đặt lại mật khẩu. Token có thể đã hết hạn."
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
                        Đặt lại mật khẩu
                    </Typography>

                    <Stack spacing={2}>
                        {okMsg && <Alert severity="success">{okMsg}</Alert>}
                        {errMsg && <Alert severity="error">{errMsg}</Alert>}

                        <TextField
                            label="Mật khẩu mới"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                        />

                        <TextField
                            label="Xác nhận mật khẩu"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            disabled={loading}
                        />

                        <Button variant="contained" size="large" onClick={submit} disabled={loading}>
                            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
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
