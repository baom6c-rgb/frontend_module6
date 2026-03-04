// src/features/users/AssignedExamsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

import { assignedExamApi } from "../../api/assignedExamApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";
import AppPagination from "../../components/common/AppPagination";


// ✅ Reuse dialog xem lại đáp án của practice
import PracticeReviewDialog from "../practice/components/PracticeReviewDialog";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeDeep: "#D5522B",
};

// ======================================================
// ✅ DateTime utils (LOCAL-first for LocalDateTime)
// - If BE returns ISO with timezone -> Date parses normally
// - If BE returns LocalDateTime without timezone (Spring LocalDateTime)
//   => treat as LOCAL time (browser local, VN user local)
// ======================================================
function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // Has timezone (Z or +07:00) => safe parse
    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // LocalDateTime: YYYY-MM-DDTHH:mm:ss(.SSS...)
    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?$/
    );
    if (!m) return null;

    const [, yy, mm, dd, hh, mi, ss, frac] = m;

    const year = Number(yy);
    const month = Number(mm) - 1;
    const day = Number(dd);
    const hour = Number(hh);
    const minute = Number(mi);
    const second = Number(ss || 0);

    // keep only milliseconds (first 3 digits)
    const ms = frac ? Number(String(frac).padEnd(3, "0").slice(0, 3)) : 0;

    // ✅ Treat as LOCAL
    const d = new Date(year, month, day, hour, minute, second, ms);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatServerDateTime(input) {
    const d = parseServerDateTime(input);
    if (!d) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    } catch {
        return d.toLocaleString();
    }
}

// ✅ status done/finished mapping (phòng BE đặt tên khác nhau)
function isCompletedStatus(status) {
    const s = String(status || "").toUpperCase();
    return (
        s === "COMPLETED" ||
        s === "DONE" ||
        s === "SUBMITTED" ||
        s === "GRADED" ||
        s === "FINISHED"
    );
}

// ✅ quá hạn nếu dueAt < now (nếu không có dueAt => không coi là quá hạn)
function isExpired(dueAtRaw) {
    const d = parseServerDateTime(dueAtRaw);
    if (!d) return false;
    return d.getTime() < Date.now();
}

// ✅ chưa đến giờ nếu openAt > now (nếu không có openAt => coi như đã đến giờ)
function isNotStarted(openAtRaw) {
    const d = parseServerDateTime(openAtRaw);
    if (!d) return false;
    return d.getTime() > Date.now();
}

// ✅ Normalize review payload về format PracticeReviewDialog cần
function normalizeReviewPayload(payload) {
    if (!payload) return null;

    // practice thường là: { score, correctCount, totalQuestions, items: [...] }
    if (payload?.items && Array.isArray(payload.items)) return payload;

    // fallback: có thể BE trả về { data: {...} }
    if (payload?.data?.items && Array.isArray(payload.data.items)) return payload.data;

    return payload;
}

export default function AssignedExamsPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    // ✅ confirm start
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    // ✅ review dialog
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    const openConfirm = (row) => {
        setSelectedRow(row);
        setConfirmOpen(true);
    };
    const closeConfirm = () => {
        setConfirmOpen(false);
        setSelectedRow(null);
    };

    const closeReview = () => {
        setReviewOpen(false);
        setReviewData(null);
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await assignedExamApi.studentList();
            const list = Array.isArray(data) ? data : data?.items || data?.content || [];

            const mapped = list.map((a) => {
                const assignmentId = a.assignmentId ?? a.id;

                const openAtRaw = a.openAt ?? a.availableFrom ?? a.exam?.openAt ?? null;
                const dueAtRaw = a.dueAt ?? a.availableTo ?? a.exam?.dueAt ?? null;

                const status = a.status ?? a.assignmentStatus ?? "ASSIGNED";

                // ✅ attemptId nếu BE có (đỡ phải query theo assignment)
                const attemptId =
                    a.attemptId ?? a.examAttemptId ?? a.latestAttemptId ?? a.attempt?.id ?? null;

                return {
                    assignmentId,
                    attemptId,

                    title: a.examTitle ?? a.title ?? a.exam?.title ?? "—",
                    durationMinutes:
                        a.durationMinutes ?? a.examDurationMinutes ?? a.exam?.durationMinutes ?? "—",
                    status,

                    openAtText: formatServerDateTime(openAtRaw),
                    dueAtText: formatServerDateTime(dueAtRaw),

                    openAt: openAtRaw,
                    dueAt: dueAtRaw,

                    isCompleted: isCompletedStatus(status),
                    isExpired: isExpired(dueAtRaw),
                    isNotStarted: isNotStarted(openAtRaw),
                };
            });

            setRows(mapped);
        } catch (e) {
            showToast(e?.response?.data?.message || e?.message || "Không tải được danh sách", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ click primary action
    const handlePrimaryAction = async (row) => {
        if (!row) return;

        // 🟡 Chưa đến giờ (và chưa completed) => chặn
        if (row.isNotStarted && !row.isCompleted) return;

        // 🔴 Quá hạn (và chưa completed) => chặn
        if (row.isExpired && !row.isCompleted) return;

        // 🟣 done => xem lại
        if (row.isCompleted) {
            try {
                setReviewLoading(true);

                // dùng assignmentId để lấy kết quả xem lại
                const reviewRaw = await assignedExamApi.studentGetReview(row.assignmentId);

                const normalized = normalizeReviewPayload(reviewRaw);
                setReviewData(normalized);
                setReviewOpen(true);
            } catch (e) {
                showToast(
                    e?.response?.data?.message || e?.message || "Không tải được kết quả để xem lại",
                    "error"
                );
            } finally {
                setReviewLoading(false);
            }
            return;
        }

        // 🟠 not done => confirm start
        openConfirm(row);
    };

    const columns = useMemo(
        () => [
            { field: "title", headerName: "Tên bài kiểm tra", flex: 1, minWidth: 220 },
            { field: "status", headerName: "Trạng thái", width: 140, headerAlign: "center", align: "center" },
            { field: "durationMinutes", headerName: "Thời gian làm bài", width: 150, headerAlign: "center", align: "center" },
            { field: "openAtText", headerName: "Thời gian mở đề", width: 180, headerAlign: "center", align: "center" },
            { field: "dueAtText", headerName: "Thời gian đóng đề", width: 180, headerAlign: "center", align: "center" },
            {
                field: "start",
                headerName: "Hành động",
                width: 230,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                align: "center",
                renderCell: (params) => {
                    const row = params.row;
                    const done = Boolean(row?.isCompleted);
                    const expired = Boolean(row?.isExpired);
                    const notStarted = Boolean(row?.isNotStarted);

                    // 🟡 Chưa đến giờ và chưa làm xong => disable
                    if (notStarted && !done) {
                        return (
                            <Button
                                size="small"
                                variant="contained"
                                disabled
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 900,
                                    bgcolor: "#CBD5E1",
                                    color: "#0F172A",
                                    cursor: "not-allowed",
                                    "&:hover": { bgcolor: "#CBD5E1" },
                                }}
                            >
                                Chưa đến thời gian làm bài
                            </Button>
                        );
                    }

                    // 🔴 Quá hạn và chưa làm xong => disable
                    if (expired && !done) {
                        return (
                            <Button
                                size="small"
                                variant="contained"
                                disabled
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 900,
                                    bgcolor: "#9CA3AF",
                                    color: "#fff",
                                    cursor: "not-allowed",
                                    "&:hover": { bgcolor: "#9CA3AF" },
                                }}
                            >
                                Quá hạn làm bài
                            </Button>
                        );
                    }

                    // 🟣 Đã làm xong => xem lại
                    if (done) {
                        return (
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => handlePrimaryAction(row)}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 900,
                                    bgcolor: "#2E2D84",
                                    "&:hover": { bgcolor: "#25246B" },
                                }}
                            >
                                Xem lại kết quả
                            </Button>
                        );
                    }

                    // 🟠 Chưa làm => vào làm bài
                    return (
                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => handlePrimaryAction(row)}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 900,
                                bgcolor: COLORS.orange,
                                "&:hover": { bgcolor: COLORS.orangeDeep },
                            }}
                        >
                            Vào làm bài
                        </Button>
                    );
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [handlePrimaryAction]
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: COLORS.textPrimary }}>
                        Bài kiểm tra được giao
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: COLORS.textSecondary, fontSize: 13.5 }}>
                        Chọn một bài để bắt đầu làm. Khi làm bài, hệ thống sẽ ghi nhận các hành vi gian lận.
                    </Typography>
                </Box>
                <Chip label={`Tổng: ${rows.length}`} />
            </Stack>

            <Paper
                elevation={0}
                sx={{
                    mt: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 420,
                }}
            >
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    <DataGrid
                        rows={rows}
                        getRowId={(row) => row.assignmentId}
                        columns={columns}
                        autoHeight
                        disableRowSelectionOnClick
                        disableColumnMenu
                        hideFooter
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50]}
                        sx={{
                            border: 0,
                            height: "100%",
                            "& .MuiDataGrid-columnHeaders": {
                                bgcolor: "background.paper",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            },
                            "& .MuiDataGrid-row:nth-of-type(odd)": { bgcolor: "action.hover" },
                            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
                            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
                        }}
                    />
                </Box>

                <Box
                    sx={{
                        px: { xs: 1, sm: 1.5 },
                        py: 1,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 1,
                        flexWrap: "wrap",
                    }}
                >
                    <AppPagination
                        page={paginationModel.page + 1}
                        pageSize={paginationModel.pageSize}
                        total={rows.length}
                        onPageChange={(nextPage) =>
                            setPaginationModel((p) => ({ ...p, page: nextPage - 1 }))
                        }
                        onPageSizeChange={(nextSize) => setPaginationModel({ page: 0, pageSize: nextSize })}
                        pageSizeOptions={[10, 25, 50]}
                        loading={loading}
                    />
                </Box>
            </Paper>

            <GlobalLoading open={loading} message="Đang tải..." />

            {/* ✅ Confirm start */}
            <AppConfirm
                open={confirmOpen}
                onClose={closeConfirm}
                title="Bắt đầu làm bài?"
                message={
                    <Box>
                        <Typography sx={{ color: "#2B3674", fontWeight: 800, lineHeight: 1.6 }}>
                            Bạn sắp vào làm bài:
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "#2B3674", fontWeight: 900 }}>
                            {selectedRow?.title || "—"}
                        </Typography>

                        <Typography sx={{ mt: 1.25, color: "#6C757D", fontWeight: 600, lineHeight: 1.6 }}>
                            Khi bắt đầu, hệ thống sẽ giám sát gian lận (tab / copy / paste / devtools). Hãy đảm bảo
                            bạn đã sẵn sàng.
                        </Typography>

                        <Typography sx={{ mt: 1, color: "#6C757D", fontWeight: 600 }}>
                            Mở: <b>{selectedRow?.openAtText || "—"}</b> • Đóng:{" "}
                            <b>{selectedRow?.dueAtText || "—"}</b>
                        </Typography>
                    </Box>
                }
                confirmText="Vào làm bài"
                cancelText="Hủy"
                variant="danger"
                toastOnSuccess={false}
                autoCloseOnSuccess={true}
                onConfirm={async () => {
                    const id = selectedRow?.assignmentId;
                    if (!id) return;

                    // an toàn: chưa đến giờ / quá hạn thì chặn luôn
                    if (selectedRow?.isNotStarted && !selectedRow?.isCompleted) return;
                    if (selectedRow?.isExpired && !selectedRow?.isCompleted) return;

                    navigate(`/users/exams/${id}`);
                }}
            />

            {/* ✅ Blocking load khi đang fetch review */}
            <GlobalLoading open={reviewLoading} message="Đang tải kết quả..." />

            {/* ✅ Review dialog reuse y hệt practice */}
            <PracticeReviewDialog open={reviewOpen} onClose={closeReview} review={reviewData} />
        </Box>
    );
}