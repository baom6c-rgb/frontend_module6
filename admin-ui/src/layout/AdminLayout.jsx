import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

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
    Tooltip,
    useMediaQuery,
    Chip,
    Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
    Dashboard,
    PeopleAltRounded,
    SchoolRounded,
    HowToRegRounded,
    BlockRounded,
    Logout as LogoutIcon,
    Person,
    MenuRounded,
    ChevronLeftRounded,
    SettingsRounded,
} from "@mui/icons-material";

import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { usePendingApprovals } from "../features/admin/hooks/usePendingApprovals";
import { logout } from "../features/auth/authSlice";

// ✅ thêm API giống UserProfile (sửa path nếu cần)
import { getMyProfileApi } from "../api/userApi";

// ✅ AppConfirm
import AppConfirm from "../components/common/AppConfirm";

const drawerWidth = 280;
const drawerCollapsedWidth = 84;

// ── AdminFooter ──────────────────────────────────────────────
const AdminFooter = () => (
    <Box
        component="footer"
        sx={{
            mt: "auto",
            py: 1.5,
            px: { xs: 2, md: 3, lg: 4 },
            borderTop: "1px solid #E0E5F2",
            bgcolor: "#F4F7FE",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
        }}
    >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#A3AED0" }}>
            © {new Date().getFullYear()} Hệ thống quản trị nội bộ
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#A3AED0" }}>
            Chỉ dành cho quản trị viên
        </Typography>
    </Box>
);

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

const syncUserDataAvatar = (avatarUrl) => {
    if (!avatarUrl) return;
    const u = safeParse("userData", {});
    localStorage.setItem(
        "userData",
        JSON.stringify({
            ...(u || {}),
            avatarUrl,
        })
    );
};

// Navigation Item Component (support collapsed mode)
const NavItem = ({ active, icon, text, onClick, collapsed }) => {
    const content = (
        <Box
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                p: 1.5,
                borderRadius: "12px",
                bgcolor: active ? "#2E2D84" : "transparent",
                color: active ? "#FFFFFF" : "#1A1A1A",
                transition: "0.25s",
                cursor: "pointer",
                "&:hover": { bgcolor: active ? "#2E2D84" : "rgba(46, 45, 132, 0.08)" },
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
                        bgcolor: "#FF8C00",
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

const AdminLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // ===== drawer state =====
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    // ✅ confirm state
    const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);

    const toggleSidebar = () => {
        if (isMobile) setMobileOpen((v) => !v);
        else setSidebarCollapsed((v) => !v);
    };
    const closeMobileDrawer = () => setMobileOpen(false);

    // ===== user profile =====
    const userData = safeParse("userData", {});
    const fullName = userData?.fullName || userData?.email || "Admin";

    // ✅ Profile state
    const [profile, setProfile] = React.useState(null);

    React.useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
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
    }, []);

    // ✅ ưu tiên profile.avatarUrl giống UserProfile
    const avatarUrl =
        profile?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

    const avatarChar = String(fullName).trim().charAt(0).toUpperCase();

    // ===== admin role check =====
    const { roles = [] } = useSelector((state) => state.auth || {});
    const normalizedRoles = (roles || []).map((r) => String(r || "").replace("ROLE_", ""));
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

    // ===== avatar menu =====
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    // ✅ tách logic logout (GIỮ NGUYÊN NỘI DUNG)
    const doLogout = () => {
        handleClose();

        // ✅ clear Practice persisted state (v2)
        localStorage.removeItem("practice_active_session_v2");
        localStorage.removeItem("practice_result_v2");

        dispatch(logout());

        localStorage.removeItem("pendingApproval");
        localStorage.removeItem("onboardingCreated");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("userData");

        navigate("/login", { replace: true });
    };

    // ✅ đổi handleLogout -> mở confirm (không đổi JSX nút)
    const handleLogout = () => {
        handleClose();
        setLogoutConfirmOpen(true);
    };

    // ✅ chặn bfcache
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

    const currentPath = location.pathname;

    const effectiveDrawerWidth = isMobile
        ? drawerWidth
        : sidebarCollapsed
            ? drawerCollapsedWidth
            : drawerWidth;

    const handleNav = (path) => {
        navigate(path);
        if (isMobile) closeMobileDrawer();
    };

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
                                QUẢN LÝ HỆ THỐNG
                            </Typography>
                        )}
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    <NavItem
                        collapsed={!isMobile && sidebarCollapsed}
                        active={currentPath === "/admin" || currentPath === "/admin/"}
                        icon={<Dashboard />}
                        text="Trang chủ"
                        onClick={() => handleNav("/admin")}
                    />
                    <NavItem
                        collapsed={!isMobile && sidebarCollapsed}
                        active={currentPath.includes("/admin/users")}
                        icon={<PeopleAltRounded />}
                        text="Danh sách người dùng"
                        onClick={() => handleNav("/admin/users")}
                    />
                    <NavItem
                        collapsed={!isMobile && sidebarCollapsed}
                        active={currentPath.includes("/admin/review")}
                        icon={<SchoolRounded />}
                        text="Đánh giá học tập"
                        onClick={() => handleNav("/admin/review")}
                    />
                    <NavItem
                        collapsed={!isMobile && sidebarCollapsed}
                        active={currentPath.includes("/admin/settings")}
                        icon={<SettingsRounded />}
                        text="Cài đặt hệ thống"
                        onClick={() => handleNav("/admin/settings")}
                    />
                </Box>
            </Box>

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
                                color: "#EE5D50",
                                bgcolor: "rgba(238,93,80,0.08)",
                                "&:hover": { bgcolor: "rgba(238,93,80,0.14)" },
                            }}
                        >
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Button
                        fullWidth
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                        sx={{
                            borderRadius: "12px",
                            py: 1.2,
                            fontWeight: 900,
                            textTransform: "none",
                            color: "#EE5D50",
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

    return (
        <Box sx={{ display: "flex", bgcolor: "#F4F7FE", minHeight: "100vh", width: "100%" }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (t) => t.zIndex.drawer + 1,
                    bgcolor: "#2E2D84",
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
                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.1)",
                                }
                            }}
                            aria-label="toggle sidebar"
                        >
                            <MenuRounded />
                        </IconButton>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                            <Link to="/admin" style={{ display: 'flex', textDecoration: 'none' }}>
                                <Box
                                    component="img"
                                    src="/images/logo_codegym_ai.png"
                                    alt="CodeGym Logo"
                                    sx={{
                                        height: 32,
                                        width: "auto",
                                        flex: "0 0 auto",
                                    }}
                                />
                            </Link>
                        </Box>
                    </Box>
                    {/* RIGHT */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {/* 🔔 Notification Bell */}
                        {isAdmin && (
                            <>
                                <Tooltip title="Yêu cầu chờ duyệt" arrow>
                                    <IconButton
                                        onClick={openNotif}
                                        sx={{
                                            p: 0.9,
                                            border: "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "12px",
                                            color: "#FFFFFF",
                                            "&:hover": {
                                                bgcolor: "rgba(255,255,255,0.1)",
                                            }
                                        }}
                                        aria-label="notifications"
                                    >
                                        <Badge badgeContent={pendingCount} color="error" max={99}>
                                            <NotificationsRoundedIcon />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>

                                <Menu
                                    anchorEl={notifAnchorEl}
                                    open={notifOpen}
                                    onClose={closeNotif}
                                    PaperProps={{
                                        sx: {
                                            mt: 1.5,
                                            borderRadius: "14px",
                                            width: 380,
                                            boxShadow: "0px 14px 40px rgba(0,0,0,0.12)",
                                            overflow: "hidden",
                                            border: "1px solid #EEF2F8",
                                        },
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 1.6, borderBottom: "1px solid #E0E5F2" }}>
                                        <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                            Chờ phê duyệt ({pendingCount})
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#707EAE" }}>
                                            Nhấp vào 1 user để mở trang phê duyệt
                                        </Typography>
                                    </Box>

                                    {pendingCount === 0 ? (
                                        <Box sx={{ px: 2, py: 2 }}>
                                            <Typography sx={{ color: "#707EAE", fontWeight: 700 }}>
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
                                                        handleNav(`/admin/users?status=WAITING_APPROVAL&id=${u.id}`);
                                                    }}
                                                    sx={{ px: 2, py: 1.4, "&:hover": { bgcolor: "#F4F7FE" } }}
                                                >
                                                    <ListItemText
                                                        primary={
                                                            <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                                                                {u.fullName}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography sx={{ color: "#707EAE", fontWeight: 700 }}>
                                                                {u.email}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                    )}

                                    <Box sx={{ px: 2, py: 1.6, borderTop: "1px solid #E0E5F2" }}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={() => {
                                                closeNotif();
                                                handleNav("/admin/users?status=WAITING_APPROVAL");
                                            }}
                                            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 900, py: 1.1 }}
                                        >
                                            Xem trang phê duyệt
                                        </Button>
                                    </Box>
                                </Menu>
                            </>
                        )}

                        {/* User chip */}
                        <Box
                            onClick={handleClick}
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
                                sx={{ width: 36, height: 36, bgcolor: "#FF8C00", fontWeight: 900 }}
                            >
                                {avatarChar}
                            </Avatar>

                            {!isMobile && (
                                <Box sx={{ lineHeight: 1.1 }}>
                                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: 14 }}>
                                        {fullName}
                                    </Typography>
                                    <Stack direction="row" spacing={0.8} alignItems="center">
                                        <Chip
                                            size="small"
                                            label="ADMIN"
                                            sx={{
                                                height: 20,
                                                fontWeight: 900,
                                                bgcolor: "rgba(255,0,0,0.73)",
                                                color: "#f8eded",
                                            }}
                                        />
                                    </Stack>
                                </Box>
                            )}
                        </Box>

                        {/* Dropdown */}
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
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
                                <Typography sx={{ fontWeight: 950, color: "#1B2559" }}>{fullName}</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#707EAE" }}>
                                    Quản trị hệ thống
                                </Typography>
                            </Box>

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

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: "100%",
                    minWidth: 0,
                    bgcolor: "#F4F7FE",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ px: { xs: 2, md: 3, lg: 4 }, py: 3, flexGrow: 1 }}>
                    <Toolbar />
                    <Outlet />
                </Box>
                <AdminFooter />
            </Box>

            {/* ✅ AppConfirm: đặt cuối JSX */}
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
};

export default AdminLayout;