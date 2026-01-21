import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Avatar, Button, Fade
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import api from '../api/axiosConfig';

const TableStyle = {
    header: { fontWeight: 800, fontSize: '0.95rem', color: '#1B2559', py: 2, bgcolor: '#F4F7FE' },
    cell: { fontWeight: 600, color: '#2B3674', fontSize: '0.95rem', py: 2.5 }
};

const AdminApproval = () => {
    const [users, setUsers] = useState([]);

    const fetchPending = () => {
        api.get('/admin').then(res => {
            // Lọc những học viên có trạng thái chờ duyệt
            const pending = res.data.filter(u => u.status === 'WAITING_APPROVAL');
            setUsers(pending);
        });
    };

    useEffect(() => { fetchPending(); }, []);

    const handleApprove = async (user) => {
        try {
            await api.put(`/admin/${user.id}`, { ...user, status: 'ACTIVE' });
            fetchPending(); // Load lại danh sách sau khi duyệt
        } catch (error) {
            console.error("Lỗi khi duyệt:", error);
        }
    };

    return (
        <Fade in timeout={800}>
            <Box>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#1B2559' }}>
                    Phê duyệt học viên
                </Typography>

                <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0px 20px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TableStyle.header}>Họ tên</TableCell>
                                <TableCell sx={TableStyle.header}>Email</TableCell>
                                <TableCell sx={TableStyle.header}>Lớp học</TableCell>
                                <TableCell sx={TableStyle.header}>Module</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#A3AED0' }}>
                                        Không có yêu cầu phê duyệt nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        {/* Họ tên */}
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#FFA500', fontWeight: 700, width: 35, height: 35 }}>
                                                    {user.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
                                            </Box>
                                        </TableCell>

                                        {/* Email */}
                                        <TableCell sx={TableStyle.cell}>{user.email}</TableCell>

                                        {/* Lớp học */}
                                        <TableCell sx={TableStyle.cell}>
                                            {user.className?.className || user.className?.name || 'N/A'}
                                        </TableCell>

                                        {/* Module */}
                                        <TableCell sx={TableStyle.cell}>
                                            {user.learningModule?.name || 'N/A'}
                                        </TableCell>

                                        {/* Thao tác */}
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<CheckCircleRoundedIcon />}
                                                onClick={() => handleApprove(user)}
                                                sx={{ borderRadius: '10px', mr: 1, textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Duyệt
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<CancelRoundedIcon />}
                                                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Từ chối
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Fade>
    );
};

export default AdminApproval;