import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    Badge,
} from "@mui/material";

import {
    PeopleAltRounded,
    Logout as LogoutIcon,
    Person,
    DashboardRounded,
} from "@mui/icons-material";

import { logout } from "../features/auth/authSlice";
import { usePendingApprovals } from "../features/admin/hooks/usePendingApprovals";

const drawerWidth = 280;

// Navigation Item Component
const NavItem = ({ active, icon, text, onClick }) => (
    <Box sx={{ px: 2, mb: 1 }}>
        <Box
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                borderRadius: "12px",
                bgcolor: active ? "#1976d2" : "transparent",
                color: active ? "#FFFFFF" : "#A3AED0",
                transition: "0.3s",
                cursor: "pointer",
                "&:hover": { bgcolor: active ? "#1976d2" : "rgba(255, 255, 255, 0.05)" },
            }}
        >
            <Box sx={{ mr: 2, display: "flex" }}>{icon}</Box>
            <Typography sx={{ fontWeight: 600 }}>{text}</Typography>
        </Box>
    </Box>
);

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // ===== avatar menu =====
    const [anchorEl, setAnchorEl] = React.useState(null);
    const menuOpen = Boolean(anchorEl);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    // ===== bell menu =====
    const [bellAnchorEl, setBellAnchorEl] = React.useState(null);
    const bellOpen = Boolean(bellAnchorEl);

    const handleBellClick = (event) => setBellAnchorEl(event.currentTarget);
    const handleBellClose = () => setBellAnchorEl(null);

    const handleLogout = () => {
        handleClose();

        // 1) clear redux + localStorage auth (accessToken/userRoles/userData)
        dispatch(logout());

        // 2) clear flag flow (để waiting-approval không lách)
        localStorage.removeItem("pendingApproval");
        localStorage.removeItem("onboardingCreated");
        localStorage.removeItem("refreshToken");

        // 3) replace để back không quay lại entry cũ
        navigate("/login", { replace: true });
    };

    // ✅ chặn trường hợp browser restore trang từ bfcache (logout rồi bấm Back vẫn thấy UI cũ)
    React.useEffect(() => {
        const onPageShow = (e) => {
            if (e.persisted) {
                const token = localStorage.getItem("accessToken");
                if (!token) window.location.replace("/login");
            }
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    // ===== admin role check =====
    const { roles = [] } = useSelector((state) => state.auth || {});
    const normalizedRoles = (roles || []).map((r) => String(r || "").replace("ROLE_", ""));
    const isAdmin = normalizedRoles.includes("ADMIN");

    // ✅ pending approvals: chỉ enable khi ADMIN + có token
    const token = localStorage.getItem("accessToken");
    const pendingEnabled = Boolean(isAdmin && token);

    const { count: pendingCount } = usePendingApprovals({
        enabled: pendingEnabled,
        intervalMs: 3000,
    });

    const goPendingApprovals = React.useCallback(() => {
        navigate("/admin/users?status=WAITING_APPROVAL");
    }, [navigate]);

    const handleGoPending = () => {
        handleBellClose();
        goPendingApprovals();
    };

    const currentPath = location.pathname;

    return (
        <Box sx={{ display: "flex", bgcolor: "#F4F7FE", minHeight: "100vh", width: "100%" }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: "#FFFFFF",
                    color: "#2B3674",
                    boxShadow: "none",
                    borderBottom: "1px solid #E0E5F2",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 900,
                            letterSpacing: "1px",
                            background: "linear-gradient(45deg, #1B2559 30%, #4318FF 90%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            textTransform: "uppercase",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                bgcolor: "#4318FF",
                                color: "#fff",
                                px: 1,
                                borderRadius: "8px",
                                WebkitTextFillColor: "#fff",
                                mr: 0.5,
                            }}
                        >
                            AI
                        </Box>
                        LEARNING
                    </Typography>

                    {/* Right actions */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {/* ✅ CHUÔNG: mở popup menu */}
                        {pendingEnabled && (
                            <>
                                <IconButton
                                    onClick={handleBellClick}
                                    sx={{
                                        border: "1px solid #E0E5F2",
                                        borderRadius: "12px",
                                        p: 0.8,
                                        transition: "all 180ms ease",
                                        "&:hover": { bgcolor: "rgba(67, 24, 255, 0.08)" },
                                    }}
                                >
                                    <Badge
                                        badgeContent={pendingCount}
                                        color="error"
                                        overlap="circular"
                                        invisible={!pendingCount || pendingCount <= 0}
                                    >
                                        <NotificationsRoundedIcon />
                                    </Badge>
                                </IconButton>

                                <Menu
                                    anchorEl={bellAnchorEl}
                                    open={bellOpen}
                                    onClose={handleBellClose}
                                    PaperProps={{
                                        sx: {
                                            mt: 1.2,
                                            borderRadius: "12px",
                                            minWidth: 280,
                                            boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
                                            overflow: "hidden",
                                        },
                                    }}
                                >
                                    <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                                        <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                            Chờ duyệt
                                        </Typography>

                                        <Typography sx={{ mt: 0.5, fontWeight: 700, color: "#6C757D", fontSize: 13 }}>
                                            {pendingCount > 0
                                                ? `Có ${pendingCount} tài khoản đang chờ duyệt`
                                                : "Không có tài khoản chờ duyệt"}
                                        </Typography>
                                    </Box>

                                    <Divider />

                                    <MenuItem onClick={handleGoPending} sx={{ py: 1.5 }}>
                                        <Typography sx={{ fontWeight: 800 }}>
                                            Xem danh sách chờ duyệt
                                        </Typography>
                                    </MenuItem>
                                </Menu>
                            </>
                        )}

                        {/* Avatar + Account Menu */}
                        <IconButton
                            onClick={handleClick}
                            sx={{ p: 0.5, border: "1px solid #E0E5F2" }}
                        >
                            <Avatar sx={{ bgcolor: "#1976d2", width: 35, height: 35 }}>A</Avatar>
                        </IconButton>

                        <Menu
                            anchorEl={anchorEl}
                            open={menuOpen}
                            onClose={handleClose}
                            PaperProps={{
                                sx: {
                                    mt: 1.5,
                                    borderRadius: "12px",
                                    minWidth: "180px",
                                    boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
                                },
                            }}
                        >
                            <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <Person fontSize="small" />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 600 }}>Hồ sơ Admin</Typography>
                            </MenuItem>

                            <Divider />

                            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: "error.main" }}>
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 600 }}>Đăng xuất</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: "border-box",
                        bgcolor: "#0B1437",
                        color: "#FFFFFF",
                        border: "none",
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ mt: 4 }}>
                    <Typography
                        variant="overline"
                        sx={{ px: 4, fontWeight: 800, color: "#4B5584", fontSize: "0.7rem" }}
                    >
                        QUẢN LÝ HỆ THỐNG
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                        {/* Dashboard */}
                        <NavItem
                            active={currentPath === "/admin" || currentPath.startsWith("/admin/dashboard")}
                            icon={<DashboardRounded />}
                            text="Dashboard"
                            onClick={() => navigate("/admin")}
                        />

                        {/* Danh sách người dùng */}
                        <NavItem
                            active={currentPath.startsWith("/admin/users")}
                            icon={<PeopleAltRounded />}
                            text="Danh sách người dùng"
                            onClick={() => navigate("/admin/users")}
                        />
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: "100%",
                    minWidth: 0,
                    bgcolor: "#F4F7FE",
                    px: { xs: 2, md: 3, lg: 4 },
                    py: 3,
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;
