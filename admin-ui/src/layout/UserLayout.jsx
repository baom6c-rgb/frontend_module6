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
    Button, // Thêm Button từ MUI
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    DashboardRounded,
    PersonRounded,
    LogoutRounded,
    SchoolRounded,
    MenuRounded,
} from "@mui/icons-material";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";

// ✅ thêm API giống UserProfile
import { getMyProfileApi } from "../api/userApi";

const drawerWidth = 280;
const drawerCollapsedWidth = 84;

const COLORS = {
    primaryBlue: "#2E2D84",
    secondaryOrange: "#FF8C00",
    bgWhite: "#FFFFFF",
    bgLight: "#F4F7FE",
    textPrimary: "#1B2559",
    textSecondary: "#1A1A1A",
    borderLight: "#E0E5F2",
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

    // ✅ WAITING flag
    const statusUpper = String(userData?.status || userData?.userStatus || "").toUpperCase();
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

    // ✅ Profile state
    const [profile, setProfile] = React.useState(null);

    const syncUserDataAvatar = React.useCallback((avatarUrl) => {
        if (!avatarUrl) return;
        const u = safeParse("userData", {});
        localStorage.setItem(
            "userData",
            JSON.stringify({
                ...(u || {}),
                avatarUrl,
            })
        );
    }, []);

    React.useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                if (isWaiting) {
                    if (alive) setProfile(null);
                    return;
                }
                const res = await getMyProfileApi();
                if (!alive) return;
                const p = res?.data || null;
                setProfile(p);
                if (p?.avatarUrl) syncUserDataAvatar(p.avatarUrl);
            } catch {
                // ignore
            }
        };
        load();
        return () => {
            alive = false;
        };
    }, [isWaiting, syncUserDataAvatar]);

    const avatarUrl =
        profile?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

    const menuItems = [
        { text: "Trang chủ", icon: <DashboardRounded />, path: "/users/dashboard" },
        { text: "Đánh giá học tập", icon: <SchoolRounded />, path: "/users/review" },
        { text: "Luyện tập (AI Quiz)", icon: <QuizRoundedIcon />, path: "/users/practice" },
    ];

    const handleLogout = () => {
        closeMenu();
        dispatch(logout());
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");
        localStorage.removeItem("register_email");
        localStorage.removeItem("pendingApproval");
        localStorage.removeItem("onboardingCreated");
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
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                            <Typography
                                variant="overline"
                                sx={{
                                    fontWeight: 900,
                                    color: "#666666",
                                    fontSize: "0.7rem",
                                    letterSpacing: "0.8px",
                                }}
                            >
                                MENU
                            </Typography>
                        )}
                    </Box>
                )}

                <List>
                    {menuItems.map((item) => {
                        const isActive =
                            location.pathname === item.path ||
                            location.pathname.startsWith(item.path + "/");
                        const disabled = isWaiting;

                        const button = (
                            <ListItemButton
                                disabled={disabled}
                                onClick={() => handleNav(item.path)}
                                sx={{
                                    position: "relative",
                                    borderRadius: "12px",
                                    py: 1.5,
                                    justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start",
                                    bgcolor: isActive ? COLORS.primaryBlue : "transparent",
                                    color: isActive ? "#fff" : COLORS.textSecondary,
                                    transition: "0.25s",
                                    "&:hover": {
                                        bgcolor: isActive ? COLORS.primaryBlue : "rgba(46, 45, 132, 0.08)",
                                    },
                                    ...(isActive && {
                                        "&::before": {
                                            content: '""',
                                            position: "absolute",
                                            left: 0,
                                            top: "20%",
                                            height: "60%",
                                            width: 4,
                                            bgcolor: COLORS.secondaryOrange,
                                            borderRadius: 4,
                                        },
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
                                        primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
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
            </Box>

            {/* Đẩy nội dung bên dưới xuống đáy giống AdminLayout */}
            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ px: sidebarCollapsed && !isMobile ? 1 : 2, pb: 2 }}>
                <Divider sx={{ borderColor: "rgba(0,0,0,0.1)", mb: 1.5 }} />

                {sidebarCollapsed && !isMobile ? (
                    <Tooltip title="Đăng xuất" placement="right" arrow>
                        <IconButton
                            onClick={handleLogout}
                            sx={{
                                width: "100%",
                                borderRadius: "14px",
                                color: COLORS.danger,
                                bgcolor: "rgba(238,93,80,0.08)",
                                "&:hover": { bgcolor: "rgba(238,93,80,0.14)" },
                            }}
                        >
                            <LogoutRounded />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Button
                        fullWidth
                        onClick={handleLogout}
                        startIcon={<LogoutRounded />}
                        sx={{
                            borderRadius: "12px",
                            py: 1.2,
                            fontWeight: 900,
                            textTransform: "none",
                            color: COLORS.danger,
                            bgcolor: "rgba(238,93,80,0.08)",
                            "&:hover": { bgcolor: "rgba(238,93,80,0.14)" },
                            justifyContent: "center",
                            px: 2
                        }}
                    >
                        Đăng xuất
                    </Button>
                )}
            </Box>
        </Box>
    );

    const statusLabel = isWaiting ? "WAITING" : "ACTIVE";

    return (
        <Box sx={{ display: "flex", bgcolor: COLORS.bgLight, minHeight: "100vh" }}>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    bgcolor: COLORS.primaryBlue,
                    color: "#FFFFFF",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton onClick={toggleSidebar} sx={{ color: "#FFFFFF" }}>
                            <MenuRounded />
                        </IconButton>
                        <Box component="img" src="/images/logo_codegym_ai.png" sx={{ height: 32 }} />
                    </Box>

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
                                border: "1px solid rgba(255,255,255,0.2)",
                                bgcolor: "rgba(255,255,255,0.1)",
                                cursor: "pointer",
                            }}
                        >
                            <Avatar src={avatarUrl || undefined} sx={{ width: 36, height: 36 }}>
                                {avatarChar}
                            </Avatar>
                            {!isMobile && (
                                <Box sx={{ lineHeight: 1.1 }}>
                                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: 14 }}>
                                        {profile?.fullName || displayName}
                                    </Typography>
                                    <Chip size="small" label={statusLabel} sx={{ height: 20, color: "#fff", bgcolor: "rgba(255,255,255,0.2)" }} />
                                </Box>
                            )}
                        </Box>

                        <Menu
                            anchorEl={anchorEl}
                            open={menuOpen}
                            onClose={closeMenu}
                            PaperProps={{ sx: { mt: 1.2, borderRadius: "14px", minWidth: 220 } }}
                        >
                            <Box sx={{ px: 2, py: 1.6, borderBottom: `1px solid ${COLORS.borderLight}` }}>
                                <Typography sx={{ fontWeight: 950 }}>{profile?.fullName || displayName}</Typography>
                            </Box>
                            <MenuItem disabled={isWaiting} onClick={() => { closeMenu(); handleNav("/users/profile"); }}>
                                <ListItemIcon><PersonRounded fontSize="small" /></ListItemIcon>
                                <Typography sx={{ fontWeight: 800 }}>Hồ sơ cá nhân</Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                                <ListItemIcon><LogoutRounded fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
                                <Typography sx={{ fontWeight: 900 }}>Đăng xuất</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={isMobile ? mobileOpen : true}
                onClose={isMobile ? closeMobileDrawer : undefined}
                sx={{
                    width: effectiveDrawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: effectiveDrawerWidth,
                        boxSizing: "border-box",
                        bgcolor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRight: "1px solid rgba(0,0,0,0.08)",
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, minWidth: 0, bgcolor: COLORS.bgLight }}>
                <Toolbar />
                <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}