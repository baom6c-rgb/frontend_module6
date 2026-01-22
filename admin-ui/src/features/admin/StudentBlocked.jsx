import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Avatar, Chip, CircularProgress, Fade, IconButton, Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import api from '../../api/axiosConfig.js';

const TableStyle = {
    header: { fontWeight: 800, fontSize: '0.95rem', color: '#1B2559', py: 2, bgcolor: '#F4F7FE' },
    cell: { fontWeight: 600, color: '#2B3674', fontSize: '0.95rem', py: 2 }
};

const StudentBlocked = () => {
    const [blockedStudents, setBlockedStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBlocked = () => {
        setLoading(true);
        api.get('/admin')
            .then(res => {
                // Lọc danh sách học viên có trạng thái LOCKED
                const locked = res.data.filter(u => u.status === 'LOCKED');
                setBlockedStudents(locked);
            })
            .catch(err => console.error("Lỗi khi tải danh sách bị khóa:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchBlocked();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn học viên này?")) {
            try {
                await api.delete(`/admin/${id}`);
                fetchBlocked(); // Tải lại danh sách sau khi xóa
            } catch (error) {
                console.error("Lỗi khi xóa học viên:", error);
                alert("Không thể xóa học viên này.");
            }
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Fade in timeout={800}>
            <Box>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#1B2559' }}>
                    Học viên bị khóa
                </Typography>

                <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0px 20px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TableStyle.header}>Họ tên</TableCell>
                                <TableCell sx={TableStyle.header}>Email</TableCell>
                                <TableCell sx={TableStyle.header}>Lớp</TableCell>
                                <TableCell sx={TableStyle.header}>Module</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Trạng thái</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {blockedStudents.length > 0 ? (
                                blockedStudents.map((s) => (
                                    <TableRow key={s.id} hover>
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#EE5D50', width: 35, height: 35 }}>
                                                    {s.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.email}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.className?.name || 'N/A'}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.learningModule?.name || 'N/A'}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label="LOCKED"
                                                sx={{ bgcolor: '#FEEFEE', color: '#EE5D50', fontWeight: 800, borderRadius: '8px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                <Tooltip title="Xem thông tin">
                                                    <IconButton size="small" sx={{ color: '#4318FF', bgcolor: '#F4F7FE' }}>
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa vĩnh viễn">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#EE5D50', bgcolor: '#FEEFEE' }}
                                                        onClick={() => handleDelete(s.id)}
                                                    >
                                                        <DeleteForeverIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#A3AED0' }}>
                                        Hiện không có học viên nào bị khóa.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Fade>
    );
};

export default StudentBlocked;