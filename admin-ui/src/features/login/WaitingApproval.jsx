import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Typography, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/AppToast";
import { getUserStatusByEmailApi } from "../../api/userApi";
import { useDispatch } from "react-redux";
import { setAuth } from "../auth/authSlice"; // ✅ sửa path đúng theo project của mày

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

export default function WaitingApproval() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const dispatch = useDispatch();

    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const readEmail = () => {
        const u = safeParse("userData", {});
        return u?.email || localStorage.getItem("register_email") || "";
    };

    const syncStatusFromStorage = () => {
        const u = safeParse("userData", {});
        const st = (u?.status || "").toUpperCase();
        setStatus(st);
        return st;
    };

    useEffect(() => {
        syncStatusFromStorage();
    }, []);

    const approved = useMemo(() => status === "ACTIVE", [status]);

    const handleGoHome = () => navigate("/users/dashboard");
    const handleStartLearning = () => navigate("/users/dashboard");

    const syncReduxAuthNow = (updatedUser) => {
        const token = localStorage.getItem("accessToken");
        const roles = safeParse("userRoles", []);
        dispatch(
            setAuth({
                token,
                roles,
                user: updatedUser,
            })
        );
    };

    const handleRefresh = async () => {
        const email = readEmail();
        if (!email) {
            showToast("Không tìm thấy email. Vui lòng đăng nhập lại.", "error");
            navigate("/login");
            return;
        }

        try {
            setLoading(true);

            const res = await getUserStatusByEmailApi(email);
            const newStatus = String(res?.data?.status || "").toUpperCase();

            const current = safeParse("userData", {});
            const updatedUser = { ...current, email, status: newStatus };
            localStorage.setItem("userData", JSON.stringify(updatedUser));

            setStatus(newStatus);

            if (newStatus === "ACTIVE") {
                localStorage.removeItem("pendingApproval");
                syncReduxAuthNow(updatedUser);
                showToast("Phê duyệt thành công", "success");
            } else {
                showToast("Chưa được duyệt. Vui lòng thử lại sau.", "info");
            }
        } catch (e) {
            const statusCode = e?.response?.status;
            const message =
                e?.response?.data?.message ||
                (typeof e?.response?.data === "string" ? e.response.data : "");

            // ✅ CASE: user bị reject -> đã bị DELETE khỏi DB
            if (statusCode === 404 || /not found/i.test(message)) {
                // clear auth data
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userData");
                localStorage.removeItem("userRoles");
                localStorage.removeItem("pendingApproval");
                localStorage.removeItem("register_email");

                showToast("Tài khoản đã bị từ chối", "error");

                navigate("/approval-result?status=rejected", { replace: true });
                return;
            }

            showToast("Không kiểm tra được trạng thái. Vui lòng thử lại.", "error");
        }
    };

    return (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
            <Card sx={{ width: 600, maxWidth: "100%", borderRadius: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
                        {approved ? "Phê duyệt thành công" : "Đang chờ phê duyệt"}
                    </Typography>

                    <Typography sx={{ color: "#707EAE", fontWeight: 600, mb: 3, lineHeight: 1.6 }}>
                        {approved
                            ? "Tài khoản của bạn đã được phê duyệt. Bạn có thể quay lại trang Home hoặc bắt đầu học tập ngay bây giờ."
                            : "Tài khoản của bạn đã gửi yêu cầu. Vui lòng chờ Admin phê duyệt hoặc liên hệ Admin nếu cần gấp."}
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        {approved ? (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={handleGoHome}
                                    sx={{ textTransform: "none", fontWeight: 800 }}
                                >
                                    Quay lại Home
                                </Button>

                                <Button
                                    variant="contained"
                                    onClick={handleStartLearning}
                                    sx={{ textTransform: "none", fontWeight: 800 }}
                                >
                                    Bắt đầu học tập ngay
                                </Button>

                                {/* ✅ CHỈ HIỆN KHI ĐÃ DUYỆT */}
                                <Button
                                    variant="text"
                                    onClick={() => navigate("/users/profile")}
                                    sx={{ textTransform: "none", fontWeight: 800 }}
                                >
                                    Xem hồ sơ
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleRefresh}
                                disabled={loading}
                                sx={{ textTransform: "none", fontWeight: 800 }}
                            >
                                {loading ? "Đang kiểm tra..." : "Làm mới trạng thái"}
                            </Button>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
