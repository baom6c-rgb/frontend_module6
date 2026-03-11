import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Button,
    Divider,
    Chip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// ✅ chỉnh path đúng theo project của mày
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

const statusUI = {
    success: {
        title: "✅ Phê duyệt thành công",
        subtitle: "Tài khoản học viên đã được kích hoạt.",
        note: "Bạn có thể đóng trang này hoặc quay về đăng nhập.",
        icon: <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56 }} />,
        severity: "success",
        chipColor: "success",
    },
    "already-approved": {
        title: "⚠️ Đã phê duyệt trước đó",
        subtitle: "Tài khoản này đã ở trạng thái ACTIVE.",
        note: "Nếu bạn bấm lại link email, trạng thái này là bình thường.",
        icon: <InfoRoundedIcon color="info" sx={{ fontSize: 56 }} />,
        severity: "info",
        chipColor: "info",
    },
    error: {
        title: "❌ Link không hợp lệ / hết hạn",
        subtitle: "Không thể xác thực token phê duyệt.",
        note: "Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên.",
        icon: <ErrorRoundedIcon color="error" sx={{ fontSize: 56 }} />,
        severity: "error",
        chipColor: "error",
    },
    rejected: {
        title: "❌ Tài khoản đã bị từ chối",
        subtitle: "Yêu cầu đăng ký của bạn không được phê duyệt.",
        note: "Vui lòng liên hệ quản trị viên để biết thêm chi tiết hoặc đăng ký lại bằng email khác.",
        icon: <ErrorRoundedIcon color="error" sx={{ fontSize: 56 }} />,
        severity: "error",
        chipColor: "error",
    },
};

export default function ApprovalResult() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const statusRaw = params.get("status") || "error";
    const status = useMemo(
        () => (statusUI[statusRaw] ? statusRaw : "error"),
        [statusRaw]
    );

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // loading “giả lập” để UX mượt (vì redirect từ mail sang FE thường hơi trễ)
        setLoading(true);
        const t = setTimeout(() => setLoading(false), 650);
        return () => clearTimeout(t);
    }, [status]);

    useEffect(() => {
        const cfg = statusUI[status];
        showToast(cfg.title.replace(/^[✅⚠️❌]\s?/, ""), cfg.severity);
    }, [status, showToast]);

    const cfg = statusUI[status];

    const handleCloseTab = () => {
        // đa số browser chỉ cho close tab nếu tab được mở từ script
        window.close();
    };

    return (
        <>
            <GlobalLoading open={loading} message="Đang tải kết quả phê duyệt..." />

            <Box
                sx={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    px: 2,
                    py: 6,
                    bgcolor: "background.default",
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        width: "100%",
                        maxWidth: 780,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                    }}
                >
                    {/* Header */}
                    <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3 } }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            {cfg.icon}

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2 }}>
                                    {cfg.title}
                                </Typography>
                                <Typography color="text.secondary" sx={{ mt: 0.6 }}>
                                    AI Learning Platform
                                </Typography>
                            </Box>

                            <Chip
                                label={`status: ${status}`}
                                color={cfg.chipColor}
                                variant="outlined"
                                sx={{ fontWeight: 800 }}
                            />
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Body */}
                    <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 3, sm: 4 } }}>
                        <Stack spacing={1.2}>
                            <Typography variant="h6" fontWeight={850}>
                                {cfg.subtitle}
                            </Typography>

                            <Typography color="text.secondary">{cfg.note}</Typography>

                            <Paper
                                variant="outlined"
                                sx={{
                                    mt: 1.5,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: "background.paper",
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.5 }}>
                                    Gợi ý
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    - Admin có thể đóng tab ngay sau khi thấy thông báo này. <br />
                                    - Học viên có thể đăng nhập sau khi được kích hoạt.
                                </Typography>
                            </Paper>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<LoginRoundedIcon />}
                                    onClick={() => navigate("/login")}
                                    sx={{ flex: 1, py: 1.2, fontWeight: 900 }}
                                >
                                    Về trang đăng nhập
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<CloseRoundedIcon />}
                                    onClick={handleCloseTab}
                                    sx={{ flex: 1, py: 1.2, fontWeight: 900 }}
                                >
                                    Đóng tab
                                </Button>
                            </Stack>

                            <Typography variant="caption" color="text.secondary">
                                * Nếu “Đóng tab” không hoạt động do trình duyệt chặn, bạn chỉ cần đóng tab thủ công.
                            </Typography>
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        </>
    );
}
