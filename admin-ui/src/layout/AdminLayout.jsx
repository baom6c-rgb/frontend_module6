import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

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
    List,
    ListItemButton,
    ListItemText,
    Button,
} from "@mui/material";

import {
    Dashboard,
    PeopleAltRounded,
    HowToRegRounded,
    BlockRounded,
    Logout,
    Person,
} from "@mui/icons-material";

import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
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
                bgcolor: active ? "#3949AB" : "transparent",
                color: active ? "#FFFFFF" : "#1F2937",
                transition: "0.3s",
                cursor: "pointer",
                "&:hover": {
                    bgcolor: active ? "#3949AB" : "rgba(57, 73, 171, 0.1)",
                    color: active ? "#FFFFFF" : "#1F2937"
                },
            }}
        >
            <Box sx={{ mr: 2, display: "flex", color: "inherit" }}>{icon}</Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "inherit" }}>{text}</Typography>
        </Box>
    </Box>
);

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ===== avatar menu =====
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleLogout = () => {
        handleClose();
        localStorage.removeItem("token");
        localStorage.removeItem("roles");
        localStorage.removeItem("email");
        localStorage.removeItem("status");
        window.location.href = "/login";
    };


    // ===== admin role check =====
    const { roles = [] } = useSelector((state) => state.auth || {});
    const normalizedRoles = roles.map((r) => (r || "").replace("ROLE_", ""));
    const isAdmin = normalizedRoles.includes("ADMIN");

    // ===== notifications menu =====
    const [notifAnchorEl, setNotifAnchorEl] = React.useState(null);
    const notifOpen = Boolean(notifAnchorEl);

    const openNotif = (e) => setNotifAnchorEl(e.currentTarget);
    const closeNotif = () => setNotifAnchorEl(null);

    const { items: pendingUsers, count: pendingCount } = usePendingApprovals({
        enabled: isAdmin,
        intervalMs: 30000,
    });

    // current path for sidebar active
    const currentPath = location.pathname;

    return (
        <Box sx={{ display: "flex", bgcolor: "#F4F7FE", minHeight: "100vh" }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: "#3949AB",
                    color: "#FFFFFF",
                    boxShadow: "0px 4px 12px rgba(57, 73, 171, 0.2)",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer"
                        }}
                        onClick={() => navigate("/admin")}
                    >
                        <img
                            src="/images/logo_codegym_ai.png"
                            alt="CodeGym Logo"
                            style={{ height: "40px" }}
                        />
                    </Box>

                    {/* Right actions */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {/* 🔔 Notification Bell (ADMIN only) */}
                        {isAdmin && (
                            <>
                                <IconButton
                                    onClick={openNotif}
                                    sx={{
                                        p: 0.8,
                                        border: "1px solid rgba(255, 255, 255, 0.3)",
                                        "&:hover": {
                                            bgcolor: "rgba(255, 255, 255, 0.1)"
                                        }
                                    }}
                                    aria-label="notifications"
                                >
                                    <Badge badgeContent={pendingCount} color="error" max={99}>
                                        <NotificationsRoundedIcon sx={{ color: "#FFFFFF" }} />
                                    </Badge>
                                </IconButton>

                                <Menu
                                    anchorEl={notifAnchorEl}
                                    open={notifOpen}
                                    onClose={closeNotif}
                                    PaperProps={{
                                        sx: {
                                            mt: 1.5,
                                            borderRadius: "12px",
                                            width: 360,
                                            boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
                                            overflow: "hidden",
                                        },
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #E0E5F2" }}>
                                        <Typography sx={{ fontWeight: 800, color: "#1B2559" }}>
                                            Chờ phê duyệt ({pendingCount})
                                        </Typography>
                                    </Box>

                                    {pendingCount === 0 ? (
                                        <Box sx={{ px: 2, py: 2 }}>
                                            <Typography sx={{ color: "#707EAE", fontWeight: 600 }}>
                                                Không có yêu cầu phê duyệt mới.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <List disablePadding>
                                            {pendingUsers.slice(0, 6).map((u) => (
                                                <ListItemButton
                                                    key={u.id}
                                                    onClick={() => {
                                                        closeNotif();
                                                        navigate("/admin/approval");
                                                    }}
                                                    sx={{ px: 2, py: 1.5 }}
                                                >
                                                    <ListItemText
                                                        primary={
                                                            <Typography sx={{ fontWeight: 800, color: "#1B2559" }}>
                                                                {u.fullName}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography sx={{ color: "#707EAE" }}>{u.email}</Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                    )}

                                    <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid #E0E5F2" }}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={() => {
                                                closeNotif();
                                                navigate("/admin/approval");
                                            }}
                                            sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}
                                        >
                                            Xem trang phê duyệt
                                        </Button>
                                    </Box>
                                </Menu>
                            </>
                        )}

                        {/* Avatar menu */}
                        <IconButton
                            onClick={handleClick}
                            sx={{
                                p: 0.5,
                                border: "1px solid rgba(255, 255, 255, 0.3)",
                                "&:hover": {
                                    bgcolor: "rgba(255, 255, 255, 0.1)"
                                }
                            }}
                        >
                            <Avatar sx={{ bgcolor: "#FF6B35", width: 35, height: 35 }}>A</Avatar>
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
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
                                    <Logout fontSize="small" sx={{ color: "error.main" }} />
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
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        bgcolor: "rgba(255, 255, 255, 0.85)",
                        backdropFilter: "blur(10px)",
                        color: "#1B2559",
                        border: "none",
                        boxShadow: "4px 0px 12px rgba(0, 0, 0, 0.08)"
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ mt: 4 }}>
                    <Typography
                        variant="overline"
                        sx={{
                            px: 4,
                            fontWeight: 900,
                            color: "#6B7280",
                            fontSize: "0.75rem",
                            letterSpacing: "1.2px"
                        }}
                    >
                        QUẢN LÝ HỆ THỐNG
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                        <NavItem
                            active={currentPath === "/admin" || currentPath === "/admin/"}
                            icon={<Dashboard />}
                            text="Dashboard"
                            onClick={() => navigate("/admin")}
                        />
                        <NavItem
                            active={currentPath.includes("/admin/students")}
                            icon={<PeopleAltRounded />}
                            text="Danh sách học viên"
                            onClick={() => navigate("/admin/students")}
                        />
                        <NavItem
                            active={currentPath.includes("/admin/blocked")}
                            icon={<BlockRounded />}
                            text="Học viên bị khóa"
                            onClick={() => navigate("/admin/blocked")}
                        />
                        <NavItem
                            active={currentPath.includes("/admin/approval")}
                            icon={<HowToRegRounded />}
                            text="Phê duyệt học viên"
                            onClick={() => navigate("/admin/approval")}
                        />
                        <NavItem
                            active={currentPath.includes("/admin/users")}
                            icon={<PeopleAltRounded />}
                            text="Danh sách user"
                            onClick={() => navigate("/admin/users")}
                        />
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;