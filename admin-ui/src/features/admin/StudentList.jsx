import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    CircularProgress,
    Fade,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import { Edit, Block } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { adminUserApi } from "../../api/adminUserApi";
import EditStudentModal from "./EditStudentModal";

const TableStyle = {
    header: {
        fontWeight: 800,
        fontSize: "0.95rem",
        color: "#1B2559",
        py: 2,
        bgcolor: "#F4F7FE",
    },
    cell: { fontWeight: 600, color: "#2B3674", fontSize: "0.95rem", py: 2 },
};

const StudentList = () => {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [blockingId, setBlockingId] = useState(null);

    // confirm dialog block
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingBlockId, setPendingBlockId] = useState(null);

    // modal edit
    const [openEdit, setOpenEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await adminUserApi.getActiveStudents();
            setStudents(res.data || []);
        } catch (e) {
            console.error("Lỗi fetch danh sách học viên:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const getStatusChip = (status) => {
        const config = {
            ACTIVE: { label: "Đang học", color: "#05CD99", bg: "#E6F9F0" },
            WAITING_APPROVAL: { label: "Chờ duyệt", color: "#FFA500", bg: "#FFF5E6" },
            BLOCKED: { label: "Bị khóa", color: "#EE5D50", bg: "#FEEFEE" },
            REJECTED: { label: "Bị từ chối", color: "#EE5D50", bg: "#FEEFEE" },
        };
        const s = config[status] || { label: status, color: "#707EAE", bg: "#F4F7FE" };
        return (
            <Chip
                label={s.label}
                sx={{ bgcolor: s.bg, color: s.color, fontWeight: 800, borderRadius: "8px" }}
            />
        );
    };

    // mở confirm
    const askBlock = (id) => {
        setPendingBlockId(id);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        if (blockingId) return;
        setConfirmOpen(false);
        setPendingBlockId(null);
    };

    const handleBlockConfirmed = async () => {
        if (!pendingBlockId) return;
        setBlockingId(pendingBlockId);
        try {
            await adminUserApi.blockStudent(pendingBlockId);

            // Sau khi block thành công:
            // 1) học viên biến mất khỏi danh sách đang học
            await fetchStudents();

            // 2) chuyển sang trang học viên bị khóa
            setConfirmOpen(false);
            setPendingBlockId(null);
            navigate("/admin/blocked");
        } catch (e) {
            console.error("Block thất bại:", e);
        } finally {
            setBlockingId(null);
        }
    };

    const openEditModal = (id) => {
        setEditingId(id);
        setOpenEdit(true);
    };

    const closeEditModal = () => {
        setOpenEdit(false);
        setEditingId(null);
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={800}>
            <Box>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: "#1B2559" }}>
                    Danh sách học viên
                </Typography>

                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: "16px",
                        boxShadow: "0px 20px 40px rgba(0,0,0,0.05)",
                        overflow: "hidden",
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TableStyle.header}>Họ tên</TableCell>
                                <TableCell sx={TableStyle.header}>Email</TableCell>
                                <TableCell sx={TableStyle.header}>Lớp học</TableCell>
                                <TableCell sx={TableStyle.header}>Module</TableCell>
                                <TableCell sx={TableStyle.header} align="center">
                                    Trạng thái
                                </TableCell>
                                <TableCell sx={TableStyle.header} align="center">
                                    Hành động
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {students.length > 0 ? (
                                students.map((s) => (
                                    <TableRow key={s.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                <Avatar sx={{ bgcolor: "#1976d2", width: 35, height: 35 }}>
                                                    {s.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700, color: "#2B3674" }}>
                                                    {s.fullName}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        <TableCell sx={TableStyle.cell}>{s.email}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.className || "Chưa xếp lớp"}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.moduleName || "N/A"}</TableCell>
                                        <TableCell align="center" sx={TableStyle.cell}>
                                            {getStatusChip(s.status)}
                                        </TableCell>

                                        <TableCell align="center" sx={TableStyle.cell}>
                                            <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: "#4318FF", bgcolor: "#F4F7FE" }}
                                                        onClick={() => openEditModal(s.id)}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Khóa học viên">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: "#EE5D50", bgcolor: "#FEEFEE" }}
                                                        disabled={blockingId === s.id}
                                                        onClick={() => askBlock(s.id)}
                                                    >
                                                        <Block fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#707EAE" }}>
                                        Không có dữ liệu học viên để hiển thị.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <EditStudentModal open={openEdit} userId={editingId} onClose={closeEditModal} onSaved={fetchStudents} />

                {/* Confirm Block Dialog */}
                <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Khóa học viên?
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography sx={{ color: "#2B3674", fontWeight: 600 }}>
                            Bạn có chắc chắn muốn khóa học viên này không? Học viên sẽ không thể đăng nhập.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button variant="outlined" onClick={closeConfirm} disabled={!!blockingId} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}>
                            Hủy
                        </Button>
                        <Button variant="contained" onClick={handleBlockConfirmed} disabled={!!blockingId} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}>
                            {blockingId ? "Đang khóa..." : "Khóa"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
};

export default StudentList;
