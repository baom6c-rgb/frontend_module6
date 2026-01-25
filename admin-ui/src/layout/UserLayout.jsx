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

const UserLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // ===== user info for avatar =====
    const userDataStr = localStorage.getItem("userData");
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const displayName = userData?.fullName || userData?.email || "User";
    const avatarChar = (displayName || "U").trim().charAt(0).toUpperCase();

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

        // ✅ clear storage đúng key hệ thống
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");
        localStorage.removeItem("register_email");

        navigate("/login", { replace: true });
    };

    return (
        <Box sx={{ display: "flex", bgcolor: "#F4F7FE", minHeight: "100vh" }}>
            {/* Header */}
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SchoolRounded sx={{ color: "#4318FF", fontSize: 30 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2559" }}>
                            AI - LEARNING
                        </Typography>
                    </Box>

                    {/* ✅ Avatar menu */}
                    <IconButton onClick={openMenu} sx={{ p: 0.5, border: "1px solid #E0E5F2" }}>
                        <Avatar sx={{ bgcolor: "#4318FF", width: 38, height: 38 }}>{avatarChar}</Avatar>
                    </IconButton>

                    <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                navigate("/users/profile");
                            }}
                        >
                            <ListItemIcon>
                                <PersonRounded fontSize="small" />
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
                        borderRight: "1px solid #E0E5F2",
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ mt: 4, px: 2 }}>
                    <List>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            borderRadius: "12px",
                                            bgcolor: isActive ? "#4318FF" : "transparent",
                                            color: isActive ? "#fff" : "#A3AED0",
                                            "&:hover": { bgcolor: isActive ? "#4318FF" : "#F4F7FE" },
                                        }}
                                    >
                                        <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
                                        <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 700 }} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    {/* Logout shortcut */}
                    <ListItemButton onClick={handleLogout} sx={{ borderRadius: "12px", color: "#EE5D50" }}>
                        <ListItemIcon sx={{ color: "inherit" }}>
                            <LogoutRounded />
                        </ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 700 }} />
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default UserLayout;