import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    Avatar,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Menu,
    MenuItem,
} from "@mui/material";
import {
    DashboardRounded,
    PersonRounded,
    LogoutRounded,
    SchoolRounded,
    MenuBookRounded,
} from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";

const drawerWidth = 280;

// ===== Color tokens: Orange + Deep Blue + White =====
const COLORS = {
    primaryBlue: "#0B5ED7",
    secondaryOrange: "#FF8C00",
    bgWhite: "#FFFFFF",
    bgLight: "#F7F9FC",
    textPrimary: "#1B2559",
    textSecondary: "#000000",
    borderLight: "#E3E8EF",
    danger: "#EE5D50",
};

export default function UserLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // ===== user info for avatar =====
    const userDataStr = localStorage.getItem("userData");
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const displayName = userData?.fullName || userData?.email || "User";
    const avatarChar = (displayName || "U").trim().charAt(0).toUpperCase();

    // ✅ WAITING flag (chặn sidebar navigate)
    const statusUpper = String(userData?.status || "").toUpperCase();
    const isWaiting =
        localStorage.getItem("pendingApproval") === "1" ||
        statusUpper === "WAITING_APPROVAL" ||
        statusUpper === "PENDING";

    // ===== avatar menu =====
    const [anchorEl, setAnchorEl] = React.useState(null);
    const menuOpen = Boolean(anchorEl);
    const openMenu = (e) => setAnchorEl(e.currentTarget);
    const closeMenu = () => setAnchorEl(null);

    const menuItems = [
        { text: "Dashboard", icon: <DashboardRounded />, path: "/users/dashboard" },
        { text: "Hồ sơ cá nhân", icon: <PersonRounded />, path: "/users/profile" },
        { text: "Học tập cùng AI", icon: <MenuBookRounded />, path: "/users/study" },
        { text: "Đánh giá học tập", icon: <SchoolRounded />, path: "/users/review" },
        { text: "Tài liệu học", icon: <MenuBookRounded />, path: "/users/materials/upload" },
    ];

    const handleLogout = () => {
        closeMenu();
        dispatch(logout());

        // (giữ nguyên như code của mày — dù hơi trùng, nhưng ok)
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");
        localStorage.removeItem("register_email");

        navigate("/login", { replace: true });
    };

    // ✅ chặn navigate khi WAITING
    const handleNav = (path) => {
        // Cho phép ở lại waiting page, chặn mọi path khác
        if (isWaiting && path !== "/users/waiting-approval") {
            navigate("/users/waiting-approval", { replace: true });
            return;
        }
        navigate(path);
    };

    return (
        <Box sx={{ display: "flex", bgcolor: COLORS.bgLight, minHeight: "100vh" }}>
            {/* Header */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: COLORS.bgWhite,
                    color: COLORS.textPrimary,
                    boxShadow: "none",
                    borderBottom: `1px solid ${COLORS.borderLight}`,
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SchoolRounded sx={{ color: COLORS.primaryBlue, fontSize: 30 }} />
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 900, color: COLORS.primaryBlue, letterSpacing: 0.5 }}
                        >
                            AI - LEARNING
                        </Typography>
                    </Box>

                    {/* Avatar menu */}
                    <IconButton
                        onClick={openMenu}
                        sx={{
                            p: 0.5,
                            border: `1px solid ${COLORS.borderLight}`,
                            borderRadius: "14px",
                            bgcolor: COLORS.bgWhite,
                        }}
                    >
                        <Avatar sx={{ bgcolor: COLORS.primaryBlue, width: 38, height: 38 }}>
                            {avatarChar}
                        </Avatar>
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={menuOpen}
                        onClose={closeMenu}
                        PaperProps={{
                            sx: {
                                mt: 1,
                                borderRadius: "14px",
                                border: `1px solid ${COLORS.borderLight}`,
                                overflow: "hidden",
                            },
                        }}
                    >
                        <MenuItem
                            disabled={isWaiting} // ✅ waiting thì không cho vào profile từ menu
                            onClick={() => {
                                closeMenu();
                                handleNav("/users/profile");
                            }}
                        >
                            <ListItemIcon>
                                <PersonRounded fontSize="small" sx={{ color: COLORS.primaryBlue }} />
                            </ListItemIcon>
                            Hồ sơ
                        </MenuItem>

                        <Divider />

                        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                            <ListItemIcon sx={{ color: "error.main" }}>
                                <LogoutRounded fontSize="small" />
                            </ListItemIcon>
                            Đăng xuất
                        </MenuItem>
                    </Menu>
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
                        borderRight: `1px solid ${COLORS.borderLight}`,
                        bgcolor: COLORS.bgWhite,
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ mt: 3, px: 2 }}>
                    <List>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;

                            // ✅ waiting thì disable toàn bộ sidebar item (trừ khi mày muốn cho click vào waiting)
                            const disabled = isWaiting;

                            return (
                                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        disabled={disabled}
                                        onClick={() => handleNav(item.path)}
                                        sx={{
                                            position: "relative",
                                            borderRadius: "14px",
                                            py: 1.2,
                                            bgcolor: isActive ? COLORS.primaryBlue : "transparent",
                                            color: isActive ? "#fff" : COLORS.textSecondary,
                                            overflow: "hidden",
                                            "&:hover": {
                                                bgcolor: isActive ? COLORS.primaryBlue : COLORS.bgLight,
                                            },
                                            ...(isActive && {
                                                "&::before": {
                                                    content: '""',
                                                    position: "absolute",
                                                    left: 0,
                                                    top: "20%",
                                                    height: "60%",
                                                    width: 5,
                                                    bgcolor: COLORS.secondaryOrange,
                                                    borderRadius: 3,
                                                },
                                            }),
                                            ...(disabled && {
                                                opacity: 0.55,
                                                cursor: "not-allowed",
                                            }),
                                        }}
                                    >
                                        <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{ fontWeight: 800 }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    {/* Logout shortcut */}
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            borderRadius: "14px",
                            color: COLORS.danger,
                            "&:hover": { bgcolor: COLORS.bgLight },
                        }}
                    >
                        <ListItemIcon sx={{ color: "inherit" }}>
                            <LogoutRounded />
                        </ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 800 }} />
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    bgcolor: COLORS.bgLight,
                }}
            >
                <Toolbar />

                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "1600px",
                        mx: "auto",
                        px: { xs: 2, md: 3 },
                        py: { xs: 2, md: 3 },
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
