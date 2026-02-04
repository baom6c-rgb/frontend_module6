import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    Avatar,
    ListItemIcon,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    useMediaQuery,
    Chip,
    Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    DashboardRounded,
    PersonRounded,
    Logout as LogoutIcon,
    SchoolRounded,
    MenuRounded,
    LogoutRounded
} from "@mui/icons-material";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";

import { getMyProfileApi } from "../api/userApi";
import AppConfirm from "../components/common/AppConfirm";

// ─── Constants ────────────────────────────────────────────
const drawerWidth = 280;
const drawerCollapsedWidth = 84;

const COLORS = {
    primaryBlue: "#2E2D84",
    secondaryOrange: "#FF8C00",
    bgLight: "#F4F7FE",
    textPrimary: "#1B2559",
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

// ─── NavItem (giống AdminLayout) ──────────────────────────
const NavItem = ({ active, disabled, icon, text, onClick, collapsed }) => {
    const content = (
        <Box
            onClick={disabled ? undefined : onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                p: 1.5,
                borderRadius: "12px",
                bgcolor: active ? COLORS.primaryBlue : "transparent",
                color: active ? "#FFFFFF" : "#1A1A1A",
                transition: "0.25s",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                "&:hover": {
                    bgcolor: disabled
                        ? "transparent"
                        : active
                            ? COLORS.primaryBlue
                            : "rgba(46, 45, 132, 0.08)",
                },
                position: "relative",
                overflow: "hidden",
                ...(active && {
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
            <Box
                sx={{
                    minWidth: collapsed ? "auto" : 40,
                    mr: collapsed ? 0 : 1,
                    display: "flex",
                    justifyContent: "center",
                    color: "inherit",
                }}
            >
                {icon}
            </Box>

            {collapsed ? null : (
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                    {text}
                </Typography>
            )}
        </Box>
    );

    return collapsed ? (
        <Tooltip title={text} placement="right" arrow>
            <Box sx={{ mb: 1 }}>{content}</Box>
        </Tooltip>
    ) : (
        <Box sx={{ mb: 1 }}>{content}</Box>
    );
};

// ─── UserLayout ────────────────────────────────────────────
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

    // ===== WAITING flag =====
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

    // ===== confirm state =====
    const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);

    const toggleSidebar = () => {
        if (isMobile) setMobileOpen((v) => !v);
        else setSidebarCollapsed((v) => !v);
    };
    const closeMobileDrawer = () => setMobileOpen(false);

    // ===== Profile =====
    const [profile, setProfile] = React.useState(null);

    const syncUserDataAvatar = React.useCallback((avatarUrl) => {
        if (!avatarUrl) return;
        const u = safeParse("userData", {});
        localStorage.setItem(
            "userData",
            JSON.stringify({ ...(u || {}), avatarUrl })
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
        return () => { alive = false; };
    }, [isWaiting, syncUserDataAvatar]);

    const avatarUrl =
        profile?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

    // ===== Menu items =====
    const menuItems = [
        { text: "Trang chủ",           icon: <DashboardRounded />,  path: "/users/dashboard" },
        { text: "Đánh giá học tập",    icon: <SchoolRounded />,     path: "/users/review" },
        { text: "Luyện tập (AI Quiz)", icon: <QuizRoundedIcon />,   path: "/users/practice" },
    ];

    // ===== AUTO HIDE SIDEBAR khi vào /users/practice =====
    const isPracticeRoute = React.useMemo(() => {
        const p = String(location.pathname || "");
        return p === "/users/practice" || p.startsWith("/users/practice/");
    }, [location.pathname]);

    const didAutoHideRef = React.useRef(false);

    React.useEffect(() => {
        if (!isPracticeRoute) {
            didAutoHideRef.current = false;
            return;
        }
        if (didAutoHideRef.current) return;

        if (isMobile) setMobileOpen(false);
        else setSidebarCollapsed(true);

        didAutoHideRef.current = true;
    }, [isPracticeRoute, isMobile]);

    // ===== Logout =====
    const doLogout = () => {
        closeMenu();
        // ✅ clear Practice persisted state (v2)
        localStorage.removeItem("practice_active_session_v2");
        localStorage.removeItem("practice_result_v2");

        dispatch(logout());
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");
        localStorage.removeItem("register_email");
        localStorage.removeItem("pendingApproval");
        localStorage.removeItem("onboardingCreated");
        navigate("/login", { replace: true });
    };

    const handleLogout = () => {
        closeMenu();
        setLogoutConfirmOpen(true);
    };

    // ===== Navigation =====
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

    const currentPath = location.pathname;
    const statusLabel = isWaiting ? "WAITING" : "ACTIVE";

    // ─── Drawer Content ──────────────────────────────────
    const drawerContent = (
        <>
            <Toolbar />

            <Box sx={{ mt: 3 }}>
                {!isMobile && (
                    <Box
                        sx={{
                            px: sidebarCollapsed ? 1 : 2,
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: sidebarCollapsed ? "center" : "space-between",
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
                                MENU HỌC TẬP
                            </Typography>
                        )}
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    {menuItems.map((item) => {
                        const isActive =
                            currentPath === item.path ||
                            currentPath.startsWith(item.path + "/");

                        return (
                            <NavItem
                                key={item.text}
                                collapsed={!isMobile && sidebarCollapsed}
                                active={isActive}
                                disabled={isWaiting}
                                icon={item.icon}
                                text={item.text}
                                onClick={() => handleNav(item.path)}
                            />
                        );
                    })}
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Logout button */}
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
                        }}
                    >
                        Đăng xuất
                    </Button>
                )}
            </Box>
        </>
    );

    // ─── Render ──────────────────────────────────────────
    return (
        <Box sx={{ display: "flex", bgcolor: COLORS.bgLight, minHeight: "100vh", width: "100%" }}>

            {/* ── AppBar ── */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    bgcolor: COLORS.primaryBlue,
                    color: "#FFFFFF",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                    borderBottom: "none",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between", gap: 1 }}>
                    {/* LEFT */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <IconButton
                            onClick={toggleSidebar}
                            sx={{
                                p: 0.9,
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "12px",
                                color: "#FFFFFF",
                                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                            }}
                            aria-label="toggle sidebar"
                        >
                            <MenuRounded />
                        </IconButton>

                        <Box
                            component="img"
                            src="/images/logo_codegym_ai.png"
                            alt="CodeGym Logo"
                            sx={{ height: 32, width: "auto", flex: "0 0 auto" }}
                        />
                    </Box>

                    {/* RIGHT */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {/* User chip */}
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
                                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                            }}
                        >
                            <Avatar
                                src={avatarUrl || undefined}
                                imgProps={{ referrerPolicy: "no-referrer" }}
                                sx={{ width: 36, height: 36, bgcolor: COLORS.secondaryOrange, fontWeight: 900 }}
                            >
                                {avatarChar}
                            </Avatar>

                            {!isMobile && (
                                <Box sx={{ lineHeight: 1.1 }}>
                                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: 14 }}>
                                        {profile?.fullName || displayName}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={statusLabel}
                                        sx={{
                                            height: 20,
                                            fontWeight: 900,
                                            bgcolor: "rgba(255,255,255,0.2)",
                                            color: "#FFFFFF",
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>

                        {/* Dropdown Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={menuOpen}
                            onClose={closeMenu}
                            PaperProps={{
                                sx: {
                                    mt: 1.5,
                                    borderRadius: "14px",
                                    minWidth: 220,
                                    boxShadow: "0px 14px 40px rgba(0,0,0,0.12)",
                                    border: "1px solid #EEF2F8",
                                    overflow: "hidden",
                                },
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.6, borderBottom: "1px solid #E0E5F2" }}>
                                <Typography sx={{ fontWeight: 950, color: "#1B2559" }}>
                                    {profile?.fullName || displayName}
                                </Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#707EAE" }}>
                                    Học viên
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
                                    <PersonRounded fontSize="small" />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 900 }}>Hồ sơ cá nhân</Typography>
                            </MenuItem>

                            <Divider />

                            <MenuItem onClick={handleLogout} sx={{ py: 1.4, color: "error.main" }}>
                                <ListItemIcon sx={{ color: "error.main" }}>
                                    <LogoutIcon fontSize="small" />
                                </ListItemIcon>
                                <Typography sx={{ fontWeight: 900 }}>Đăng xuất</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* ── Sidebar ── */}
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
                        bgcolor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        color: "#1A1A1A",
                        borderRight: "1px solid rgba(0,0,0,0.08)",
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

            {/* ── Main Content ── */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: "100%",
                    minWidth: 0,
                    bgcolor: COLORS.bgLight,
                    px: { xs: 2, md: 3, lg: 4 },
                    py: 3,
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>

            {/* ── Logout Confirm ── */}
            <AppConfirm
                open={logoutConfirmOpen}
                title="Đăng xuất"
                message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?"
                confirmText="Đăng xuất"
                cancelText="Hủy"
                onClose={() => setLogoutConfirmOpen(false)}
                onConfirm={async () => {
                    setLogoutConfirmOpen(false);
                    doLogout();
                }}
            />
        </Box>
    );
}