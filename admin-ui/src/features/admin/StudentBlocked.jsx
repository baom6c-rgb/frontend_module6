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
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { useNavigate } from "react-router-dom";
import { adminUserApi } from "../../api/adminUserApi";

const TableStyle = {
    header: { fontWeight: 800, fontSize: "0.95rem", color: "#1B2559", py: 2, bgcolor: "#F4F7FE" },
    cell: { fontWeight: 600, color: "#2B3674", fontSize: "0.95rem", py: 2 },
};

const StudentBlocked = () => {
    const navigate = useNavigate();

    const [blockedStudents, setBlockedStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [unblockingId, setUnblockingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingUnblockId, setPendingUnblockId] = useState(null);

    const fetchBlocked = async () => {
        setLoading(true);
        try {
            const res = await adminUserApi.getBlockedStudents();
            setBlockedStudents(res.data || []);
        } catch (err) {
            console.error("Lỗi khi tải danh sách bị khóa:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocked();
    }, []);

    const askUnblock = (id) => {
        setPendingUnblockId(id);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        if (unblockingId) return;
        setConfirmOpen(false);
        setPendingUnblockId(null);
    };

    const handleUnblockConfirmed = async () => {
        if (!pendingUnblockId) return;
        setUnblockingId(pendingUnblockId);
        try {
            await adminUserApi.unblockStudent(pendingUnblockId);

            // 1) biến mất khỏi list bị khóa
            await fetchBlocked();

            // 2) quay về danh sách đang học
            setConfirmOpen(false);
            setPendingUnblockId(null);
            navigate("/admin/students");
        } catch (error) {
            console.error("Lỗi khi khôi phục học viên:", error);
        } finally {
            setUnblockingId(null);
        }
    };

    if (loading)
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                <CircularProgress />
            </Box>
        );

    return (
        <Fade in timeout={800}>
            <Box>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: "#1B2559" }}>
                    Học viên bị khóa
                </Typography>

                <TableContainer
                    component={Paper}
                    sx={{ borderRadius: "16px", boxShadow: "0px 20px 40px rgba(0,0,0,0.05)", overflow: "hidden" }}
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
                            {blockedStudents.length > 0 ? (
                                blockedStudents.map((s) => (
                                    <TableRow key={s.id} hover>
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                <Avatar sx={{ bgcolor: "#EE5D50", width: 35, height: 35 }}>
                                                    {s.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.email}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.className || "N/A"}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{s.moduleName || "N/A"}</TableCell>
                                        <TableCell align="center" sx={TableStyle.cell}>
                                            <Chip
                                                label="Bị khóa"
                                                sx={{ bgcolor: "#FEEFEE", color: "#EE5D50", fontWeight: 800, borderRadius: "8px" }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={TableStyle.cell}>
                                            <Tooltip title="Khôi phục">
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: "#05CD99", bgcolor: "#E6F9F0" }}
                                                    disabled={unblockingId === s.id}
                                                    onClick={() => askUnblock(s.id)}
                                                >
                                                    <RestoreRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#A3AED0" }}>
                                        Hiện không có học viên nào bị khóa.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Confirm Unblock Dialog */}
                <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Khôi phục học viên?
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography sx={{ color: "#2B3674", fontWeight: 600 }}>
                            Bạn có chắc chắn muốn khôi phục học viên này không?
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button variant="outlined" onClick={closeConfirm} disabled={!!unblockingId} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}>
                            Hủy
                        </Button>
                        <Button variant="contained" onClick={handleUnblockConfirmed} disabled={!!unblockingId} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 800 }}>
                            {unblockingId ? "Đang khôi phục..." : "Khôi phục"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
};

export default StudentBlocked;
