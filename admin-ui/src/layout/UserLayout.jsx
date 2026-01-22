import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Avatar,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, Paper
} from '@mui/material';
import {
    DashboardRounded,
    PersonRounded,
    LogoutRounded,
    SchoolRounded,
    MenuBookRounded
} from '@mui/icons-material';
import {logout} from "../features/auth/authSlice.js";
import {useDispatch} from "react-redux";

const drawerWidth = 280;

const UserLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    // Danh sách menu cho User
    const menuItems = [
        { text: 'Dashboard', icon: <DashboardRounded />, path: '/users' },
        { text: 'Hồ sơ cá nhân', icon: <PersonRounded />, path: '/users/profile' },
        { text: 'Học tập cùng AI', icon: <MenuBookRounded />, path: '/users/study' },
        { text: 'Đánh giá học tập', icon: <SchoolRounded />, path: '/users/review' },
    ];
// ⭐ Hàm xử lý đăng xuất
    const handleLogout = () => {
        // Xóa Redux state
        dispatch(logout());

        // Xóa token trong localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('register_email');

        // Chuyển về trang login
        navigate('/login', { replace: true });
    };
    return (
        <Box sx={{ display: 'flex', bgcolor: '#F4F7FE', minHeight: '100vh' }}>
            {/* Header */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: '#FFFFFF', color: '#2B3674', boxShadow: 'none',
                    borderBottom: '1px solid #E0E5F2'
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolRounded sx={{ color: '#4318FF', fontSize: 30 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1B2559' }}>
                            AI - LEARNING
                        </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#4318FF' }}>H</Avatar>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #E0E5F2' },
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
                                            borderRadius: '12px',
                                            bgcolor: isActive ? '#4318FF' : 'transparent',
                                            color: isActive ? '#fff' : '#A3AED0',
                                            '&:hover': { bgcolor: isActive ? '#4318FF' : '#F4F7FE' }
                                        }}
                                    >
                                        <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                                        <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 700 }} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    {/* ⭐ SỬA LẠI NÚT ĐĂNG XUẤT */}
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{ borderRadius: '12px', color: '#EE5D50' }}
                    >
                        <ListItemIcon sx={{ color: 'inherit' }}><LogoutRounded /></ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 700 }} />
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                {/* Nội dung trang Dashboard/Profile sẽ hiện ở đây */}
                <Outlet />
            </Box>
        </Box>
    );
};

export default UserLayout;