import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Avatar, Chip, CircularProgress, Fade, IconButton, Tooltip
} from '@mui/material';
import { Edit, Visibility } from '@mui/icons-material'; // Thêm icon
import api from '../../api/axiosConfig.js';

const TableStyle = {
    header: { fontWeight: 800, fontSize: '0.95rem', color: '#1B2559', py: 2, bgcolor: '#F4F7FE' },
    cell: { fontWeight: 600, color: '#2B3674', fontSize: '0.95rem', py: 2 }
};

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/students')
            .then(res => setStudents(res.data))
            .catch(err => console.error("Lỗi fetch dữ liệu học viên:", err))
            .finally(() => setLoading(false));
    }, []);

    // Giữ nguyên logic getStatusChip
    const getStatusChip = (status) => {
        const config = {
            'ACTIVE': { label: 'Đang học', color: '#05CD99', bg: '#E6F9F0' },
            'WAITING_APPROVAL': { label: 'Chờ duyệt', color: '#FFA500', bg: '#FFF5E6' },
            'LOCKED': { label: 'Tạm khóa', color: '#EE5D50', bg: '#FEEFEE' }
        };
        const s = config[status] || { label: status, color: '#707EAE', bg: '#F4F7FE' };
        return <Chip label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 800, borderRadius: '8px' }} />;
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Fade in timeout={800}>
            <Box>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#1B2559' }}>
                    Danh sách học viên
                </Typography>

                <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0px 20px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TableStyle.header}>Họ tên</TableCell>
                                <TableCell sx={TableStyle.header}>Email</TableCell>
                                <TableCell sx={TableStyle.header}>Lớp học</TableCell>
                                <TableCell sx={TableStyle.header}>Module</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Trạng thái</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Hành động</TableCell> {/* Cột mới */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {students.length > 0 ? (
                                students.map((s) => (
                                    <TableRow key={s.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar src={s.avatarUrl} sx={{ bgcolor: '#1976d2', width: 35, height: 35 }}>
                                                    {s.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700, color: '#2B3674' }}>{s.fullName}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.email}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.className?.name || 'Chưa xếp lớp'}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.learningModule?.name || 'N/A'}</TableCell>
                                        <TableCell align="center" sx={TableStyle.cell}>{getStatusChip(s.status)}</TableCell>

                                        {/* Cột Hành động */}
                                        <TableCell align="center" sx={TableStyle.cell}>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton size="small" sx={{ color: '#4318FF', bgcolor: '#F4F7FE' }}>
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#4318FF', bgcolor: '#F4F7FE' }}
                                                        onClick={() => console.log("Edit student:", s.id)}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#707EAE' }}>
                                        Không có dữ liệu học viên để hiển thị.
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

export default StudentList;