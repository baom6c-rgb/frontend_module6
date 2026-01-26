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
    Tooltip,
    useMediaQuery,
    Chip,
    Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    DashboardRounded,
    PersonRounded,
    LogoutRounded,
    SchoolRounded,
    MenuBookRounded,
    MenuRounded,
    ChevronLeftRounded,
} from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";

// ✅ thêm API giống UserProfile
import { getMyProfileApi } from "../api/userApi"; // <-- nếu path của m khác thì sửa đúng

const drawerWidth = 280;
const drawerCollapsedWidth = 84;

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

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

export default function UserLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    // ===== local userData =====
    const userData = safeParse("userData", null);
    const displayName = userData?.fullName || userData?.email || "User";
    const avatarChar = String(displayName || "U").trim().charAt(0).toUpperCase();

    // ✅ WAITING flag (giữ nguyên)
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

    // ===== sidebar state =====
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const toggleSidebar = () => {
        if (isMobile) setMobileOpen((v) => !v);
        else setSidebarCollapsed((v) => !v);
    };
    const closeMobileDrawer = () => setMobileOpen(false);

    // ✅ NEW: lấy profile từ API giống UserProfile
    const [profile, setProfile] = React.useState(null);

    const syncUserDataAvatar = (avatarUrl) => {
        if (!avatarUrl) return;
        const u = safeParse("userData", {});
        localStorage.setItem(
            "userData",
            JSON.stringify({
                ...(u || {}),
                avatarUrl, // ✅ key thống nhất
            })
        );
    };

    React.useEffect(() => {
        let alive = true;

        const load = async () => {
            try {
                const res = await getMyProfileApi();
                if (!alive) return;

                const p = res.data;
                setProfile(p);

                // ✅ sync avatar về localStorage để các nơi khác dùng
                if (p?.avatarUrl) syncUserDataAvatar(p.avatarUrl);
            } catch {
                // ignore: nếu fail thì fallback localStorage
            }
        };

        load();
        return () => {
            alive = false;
        };
    }, []);

    // ✅ avatar giống UserProfile:
    // ưu tiên profile.avatarUrl -> fallback localStorage userData
    const avatarUrl =
        profile?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

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

        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");
        localStorage.removeItem("register_email");

        navigate("/login", { replace: true });
    };

    const handleNav = (path) => {
        if (isWaiting && path !== "/users/waiting-approval") {
            navigate("/users/waiting-approval", { replace: true });
            return;
        }
        navigate(path);
        if (isMobile) closeMobileDrawer();
    };

    const effectiveDrawerWidth = isMobile
        ? drawerWidth
        : sidebarCollapsed
            ? drawerCollapsedWidth
            : drawerWidth;

    const drawerContent = (
        <>
            <Toolbar />
            <Box sx={{ mt: 2, px: sidebarCollapsed && !isMobile ? 1 : 2 }}>
                {!isMobile && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: sidebarCollapsed ? "center" : "space-between",
                            mb: 2,
                            px: sidebarCollapsed ? 0 : 0.5,
                        }}
                    >
                        {sidebarCollapsed ? null : (
                            <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary }}>
                                MENU
                            </Typography>
                        )}
                    </Box>
                )}

                <List>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const disabled = isWaiting;

                        const button = (
                            <ListItemButton
                                disabled={disabled}
                                onClick={() => handleNav(item.path)}
                                sx={{
                                    position: "relative",
                                    borderRadius: "14px",
                                    py: 1.2,
                                    justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start",
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
                                <ListItemIcon
                                    sx={{
                                        color: "inherit",
                                        minWidth: sidebarCollapsed && !isMobile ? "auto" : 40,
                                        mr: sidebarCollapsed && !isMobile ? 0 : 1,
                                        justifyContent: "center",
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>

                                {sidebarCollapsed && !isMobile ? null : (
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{ fontWeight: 850 }}
                                    />
                                )}
                            </ListItemButton>
                        );

                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                {sidebarCollapsed && !isMobile ? (
                                    <Tooltip title={item.text} placement="right" arrow>
                                        <Box sx={{ width: "100%" }}>{button}</Box>
                                    </Tooltip>
                                ) : (
                                    button
                                )}
                            </ListItem>
                        );
                    })}
                </List>

                <Divider sx={{ my: 2 }} />

                {sidebarCollapsed && !isMobile ? (
                    <Tooltip title="Đăng xuất" placement="right" arrow>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                borderRadius: "14px",
                                color: COLORS.danger,
                                justifyContent: "center",
                                "&:hover": { bgcolor: COLORS.bgLight },
                            }}
                        >
                            <ListItemIcon sx={{ color: "inherit", minWidth: "auto" }}>
                                <LogoutRounded />
                            </ListItemIcon>
                        </ListItemButton>
                    </Tooltip>
                ) : (
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
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 850 }} />
                    </ListItemButton>
                )}
            </Box>
        </>
    );

    const statusLabel = isWaiting ? "WAITING" : "ACTIVE";

    return (
        <Box sx={{ display: "flex", bgcolor: COLORS.bgLight, minHeight: "100vh" }}>
            {/* Header */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    bgcolor: COLORS.bgWhite,
                    color: COLORS.textPrimary,
                    boxShadow: "none",
                    borderBottom: `1px solid ${COLORS.borderLight}`,
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between", gap: 1 }}>
                    {/* LEFT */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <IconButton
                            onClick={toggleSidebar}
                            sx={{
                                p: 0.9,
                                border: `1px solid ${COLORS.borderLight}`,
                                borderRadius: "14px",
                                bgcolor: COLORS.bgWhite,
                            }}
                            aria-label="toggle sidebar"
                        >
                            <MenuRounded />
                        </IconButton>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "14px",
                                    bgcolor: COLORS.primaryBlue,
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#fff",
                                    fontWeight: 950,
                                    flex: "0 0 auto",
                                }}
                            >
                                AI
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 950,
                                        color: COLORS.textPrimary,
                                        lineHeight: 1.05,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    AI LEARNING
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 750,
                                        color: "#707EAE",
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Student Portal
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* RIGHT: user chip */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                            onClick={openMenu}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                px: 1.1,
                                py: 0.6,
                                borderRadius: "14px",
                                border: `1px solid ${COLORS.borderLight}`,
                                bgcolor: COLORS.bgWhite,
                                cursor: "pointer",
                                "&:hover": { bgcolor: COLORS.bgLight },
                            }}
                        >
                            <Avatar
                                src={avatarUrl || undefined}
                                imgProps={{ referrerPolicy: "no-referrer" }}
                                sx={{
                                    bgcolor: COLORS.primaryBlue,
                                    width: 38,
                                    height: 38,
                                    fontWeight: 950,
                                }}
                            >
                                {avatarChar}
                            </Avatar>

                            {!isMobile && (
                                <Box sx={{ lineHeight: 1.1 }}>
                                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, fontSize: 14 }}>
                                        {profile?.fullName || displayName}
                                    </Typography>

                                    <Stack direction="row" spacing={0.8} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={statusLabel}
                                            sx={{
                                                height: 20,
                                                fontWeight: 900,
                                                bgcolor: isWaiting ? "rgba(255,140,0,0.12)" : "rgba(11,94,215,0.10)",
                                                color: isWaiting ? COLORS.secondaryOrange : COLORS.primaryBlue,
                                            }}
                                        />
                                    </Stack>
                                </Box>
                            )}
                        </Box>

                        <Menu
                            anchorEl={anchorEl}
                            open={menuOpen}
                            onClose={closeMenu}
                            PaperProps={{
                                sx: {
                                    mt: 1.2,
                                    borderRadius: "14px",
                                    border: `1px solid ${COLORS.borderLight}`,
                                    overflow: "hidden",
                                    minWidth: 220,
                                    boxShadow: "0px 14px 40px rgba(0,0,0,0.10)",
                                },
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.6, borderBottom: `1px solid ${COLORS.borderLight}` }}>
                                <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary }}>
                                    {profile?.fullName || displayName}
                                </Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 750, color: "#707EAE" }}>
                                    {isWaiting ? "Chờ phê duyệt" : "Tài khoản đang hoạt động"}
                                </Typography>
                            </Box>

                            <MenuItem
                                disabled={isWaiting}
                                onClick={() => {
                                    closeMenu();
                                    handleNav("/users/profile");
                                }}
                                sx={{ py: 1.4 }}
                            >
                                <ListItemIcon>
                                    <PersonRounded fontSize="small" sx={{ color: COLORS.primaryBlue }} />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 850 }}>Hồ sơ</Typography>
                            </MenuItem>

                            <Divider />

                            <MenuItem onClick={handleLogout} sx={{ py: 1.4, color: "error.main" }}>
                                <ListItemIcon sx={{ color: "error.main" }}>
                                    <LogoutRounded fontSize="small" />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 950 }}>Đăng xuất</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={isMobile ? mobileOpen : true}
                onClose={isMobile ? closeMobileDrawer : undefined}
                ModalProps={isMobile ? { keepMounted: true } : undefined}
                sx={{
                    width: effectiveDrawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: effectiveDrawerWidth,
                        boxSizing: "border-box",
                        borderRight: `1px solid ${COLORS.borderLight}`,
                        bgcolor: COLORS.bgWhite,
                        overflowX: "hidden",
                        transition: theme.transitions.create("width", {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.shortest,
                        }),
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, minWidth: 0, bgcolor: COLORS.bgLight }}>
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
