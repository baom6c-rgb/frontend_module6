import React from 'react';
import { Outlet } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, Avatar, IconButton, Menu, MenuItem,
    Divider, ListItemIcon
} from '@mui/material';
import {
    Dashboard, PeopleAltRounded, HowToRegRounded, BlockRounded,
    Logout, Person
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

// Navigation Item Component
const NavItem = ({ active, icon, text, onClick }) => (
    <Box sx={{ px: 2, mb: 1 }}>
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderRadius: '12px',
                bgcolor: active ? '#1976d2' : 'transparent',
                color: active ? '#FFFFFF' : '#A3AED0',
                transition: '0.3s',
                cursor: 'pointer',
                '&:hover': { bgcolor: active ? '#1976d2' : 'rgba(255, 255, 255, 0.05)' }
            }}
        >
            <Box sx={{ mr: 2, display: 'flex' }}>{icon}</Box>
            <Typography sx={{ fontWeight: 600 }}>{text}</Typography>
        </Box>
    </Box>
);

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    // Xác định route hiện tại
    const currentPath = location.pathname;

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleLogout = () => {
        handleClose();
        window.location.href = '/login';
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: '#F4F7FE', minHeight: '100vh' }}>
            {/* AppBar */}
            <AppBar position="fixed" sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                bgcolor: '#FFFFFF',
                color: '#2B3674',
                boxShadow: 'none',
                borderBottom: '1px solid #E0E5F2'
            }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h5" sx={{
                        fontWeight: 900,
                        letterSpacing: '1px',
                        background: 'linear-gradient(45deg, #1B2559 30%, #4318FF 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        textTransform: 'uppercase',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}>
                        <Box component="span" sx={{
                            bgcolor: '#4318FF',
                            color: '#fff',
                            px: 1,
                            borderRadius: '8px',
                            WebkitTextFillColor: '#fff',
                            mr: 0.5
                        }}>
                            AI
                        </Box>
                        LEARNING
                    </Typography>

                    <Box>
                        <IconButton onClick={handleClick} sx={{ p: 0.5, border: '1px solid #E0E5F2' }}>
                            <Avatar sx={{ bgcolor: '#1976d2', width: 35, height: 35 }}>A</Avatar>
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            PaperProps={{
                                sx: { mt: 1.5, borderRadius: '12px', minWidth: '180px', boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }
                            }}
                        >
                            <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                                <Typography sx={{ fontWeight: 600 }}>Hồ sơ Admin</Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                                <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                                <Typography sx={{ fontWeight: 600 }}>Đăng xuất</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer variant="permanent" sx={{
                width: drawerWidth,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    bgcolor: '#0B1437',
                    color: '#FFFFFF',
                    border: 'none'
                }
            }}>
                <Toolbar />
                <Box sx={{ mt: 4 }}>
                    <Typography variant="overline" sx={{ px: 4, fontWeight: 800, color: '#4B5584', fontSize: '0.7rem' }}>
                        QUẢN LÝ HỆ THỐNG
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <NavItem
                            active={currentPath === '/admin' || currentPath === '/admin/'}
                            icon={<Dashboard />}
                            text="Dashboard"
                            onClick={() => navigate('/admin')}
                        />
                        <NavItem
                            active={currentPath.includes('/admin/students')}
                            icon={<PeopleAltRounded />}
                            text="Danh sách học viên"
                            onClick={() => navigate('/admin/students')}
                        />
                        <NavItem
                            active={currentPath.includes('/admin/blocked')}
                            icon={<BlockRounded />}
                            text="Học viên bị khóa"
                            onClick={() => navigate('/admin/blocked')}
                        />
                        <NavItem
                            active={currentPath.includes('/admin/approval')}
                            icon={<HowToRegRounded />}
                            text="Phê duyệt học viên"
                            onClick={() => navigate('/admin/approval')}
                        />
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content - Render child routes */}
            <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;