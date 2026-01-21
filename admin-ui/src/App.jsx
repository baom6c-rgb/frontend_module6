import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, List,
    ListItem, ListItemButton, ListItemIcon, ListItemText, CssBaseline,
    Avatar, IconButton, Menu, MenuItem
} from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';

import AdminApproval from './pages/AdminApproval';
import StudentList from './pages/StudentList';

const drawerWidth = 280;

const NavItem = ({ to, icon, text }) => {
    const location = useLocation();
    const active = location.pathname === to;

    return (
        <ListItem disablePadding sx={{ display: 'block', px: 2, mb: 1 }}>
            <ListItemButton
                component={Link}
                to={to}
                sx={{
                    minHeight: 52,
                    borderRadius: '12px',
                    bgcolor: active ? '#1976d2' : 'transparent',
                    color: active ? '#FFFFFF' : '#A3AED0',
                    '&:hover': { bgcolor: active ? '#1976d2' : 'rgba(255, 255, 255, 0.05)' },
                    '& .MuiListItemIcon-root': { color: 'inherit' }
                }}
            >
                <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
                <ListItemText primary={text} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: '1rem' }} />
            </ListItemButton>
        </ListItem>
    );
};

function App() {
    const [anchorEl, setAnchorEl] = useState(null);

    return (
        <Router>
            <Box sx={{ display: 'flex', bgcolor: '#F4F7FE', minHeight: '100vh' }}>
                <CssBaseline />
                <AppBar position="fixed" elevation={0} sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: '#2B3674',
                    borderBottom: '1px solid #E9EDF7'
                }}>
                    <Toolbar sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1 }}>AI LEARNING PLATFORM</Typography>
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                            <Avatar sx={{ bgcolor: '#1976d2', fontWeight: 700 }}>A</Avatar>
                        </IconButton>
                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                            <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
                            <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: 'error.main' }}>Logout</MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                <Drawer variant="permanent" sx={{
                    width: drawerWidth,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        bgcolor: '#0B1437', // Màu tối Navy đậm
                        color: '#FFFFFF',
                        borderRight: 'none'
                    },
                }}>
                    <Toolbar />
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="overline" sx={{ px: 4, fontWeight: 800, color: '#4B5584', fontSize: '0.75rem' }}>MAIN MENU</Typography>
                        <List sx={{ mt: 2 }}>
                            <NavItem to="/students" icon={<PeopleAltRoundedIcon />} text="Danh sách học viên" />
                            <NavItem to="/approval" icon={<HowToRegRoundedIcon />} text="Phê duyệt học viên" />
                        </List>
                    </Box>
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
                    <Toolbar />
                    <Routes>
                        <Route path="/students" element={<StudentList />} />
                        <Route path="/approval" element={<AdminApproval />} />
                        <Route path="/" element={<StudentList />} />
                    </Routes>
                </Box>
            </Box>
        </Router>
    );
}
export default App;