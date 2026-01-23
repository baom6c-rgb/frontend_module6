import React, { useEffect, useState } from "react";
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Avatar, Chip,
    CircularProgress, Fade, IconButton, Tooltip
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DoNotDisturbOnRoundedIcon from "@mui/icons-material/DoNotDisturbOnRounded";
import { adminUserApi } from "../../api/adminUserApi";

const TableStyle = {
    header: { fontWeight: 800, fontSize: "0.95rem", color: "#1B2559", py: 2, bgcolor: "#F4F7FE" },
    cell: { fontWeight: 600, color: "#2B3674", fontSize: "0.95rem", py: 2 }
};

const AdminApproval = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState(null);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await adminUserApi.getPendingApprovals();
            setUsers(res.data || []);
        } catch (e) {
            console.error("Lỗi fetch pending approvals:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id) => {
        setActingId(id);
        try {
            await adminUserApi.approvePendingUser(id);
            await fetchPending(); // refresh list
        } catch (e) {
            console.error("Lỗi khi duyệt:", e);
        } finally {
            setActingId(null);
        }
    };

    // ⚠️ Chỉ bật khi backend có endpoint reject.
    const handleReject = async (id) => {
        setActingId(id);
        try {
            await adminUserApi.rejectPendingUser(id);
            await fetchPending();
        } catch (e) {
            console.error("Lỗi khi từ chối:", e);
        } finally {
            setActingId(null);
        }
    };

    const statusChip = () => (
        <Chip
            label="Chờ duyệt"
            sx={{ bgcolor: "#FFF5E6", color: "#FFA500", fontWeight: 800, borderRadius: "8px" }}
        />
    );

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
                    Phê duyệt học viên
                </Typography>

                <TableContainer component={Paper} sx={{ borderRadius: "16px", boxShadow: "0px 20px 40px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TableStyle.header}>Họ tên</TableCell>
                                <TableCell sx={TableStyle.header}>Email</TableCell>
                                <TableCell sx={TableStyle.header}>Lớp học</TableCell>
                                <TableCell sx={TableStyle.header}>Module</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Trạng thái</TableCell>
                                <TableCell sx={TableStyle.header} align="center">Hành động</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <TableRow key={u.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <TableCell sx={TableStyle.cell}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                <Avatar sx={{ bgcolor: "#FFA500", fontWeight: 700, width: 35, height: 35 }}>
                                                    {u.fullName?.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 700 }}>{u.fullName}</Typography>
                                            </Box>
                                        </TableCell>

                                        <TableCell sx={TableStyle.cell}>{u.email}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{u.className || "N/A"}</TableCell>
                                        <TableCell sx={TableStyle.cell}>{u.moduleName || "N/A"}</TableCell>
                                        <TableCell align="center" sx={TableStyle.cell}>{statusChip()}</TableCell>

                                        <TableCell align="center" sx={TableStyle.cell}>
                                            <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                                                <Tooltip title="Phê duyệt">
                          <span>
                            <IconButton
                                size="small"
                                sx={{ color: "#05CD99", bgcolor: "#E6F9F0" }}
                                disabled={actingId === u.id}
                                onClick={() => handleApprove(u.id)}
                            >
                              <CheckCircleRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                                                </Tooltip>

                                                <Tooltip title="Từ chối">
                          <span>
                            <IconButton
                                size="small"
                                sx={{ color: "#EE5D50", bgcolor: "#FEEFEE" }}
                                disabled={actingId === u.id}
                                onClick={() => handleReject(u.id)}
                            >
                              <DoNotDisturbOnRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#A3AED0" }}>
                                        Không có yêu cầu phê duyệt nào.
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

export default AdminApproval;
