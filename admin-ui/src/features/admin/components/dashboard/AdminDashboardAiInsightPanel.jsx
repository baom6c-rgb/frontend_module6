// src/features/admin/components/dashboard/AdminDashboardAiInsightPanel.jsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider,
    Button,
    Chip,
    Alert,
    Tooltip,
    IconButton,
} from "@mui/material";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import axiosPrivate from "../../../../api/axiosPrivate.js";

import AppModal from "../../../../components/common/AppModal";
import GlobalLoading from "../../../../components/common/GlobalLoading";

/**
 * ✅ 2 mode:
 * - Controlled: props { insight, loading, error, onRun }
 * - Self-managed: props { student, filters, cached, onCache, mode }
 */
export default function AdminDashboardAiInsightPanel(props) {
    const {
        // controlled
        overview,
        insight,
        loading: controlledLoading,
        error: controlledError,
        onRun,

        // self-managed
        student,
        filters,
        cached,
        onCache,
        mode,

        // optional
        title,
        subtitle,
    } = props;

    const isControlled = typeof onRun === "function";

    const [internalLoading, setInternalLoading] = useState(false);
    const [internalError, setInternalError] = useState("");
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    const resolvedMode = useMemo(() => {
        if (mode === "GLOBAL" || mode === "STUDENT") return mode;
        return student?.userId ? "STUDENT" : "GLOBAL";
    }, [mode, student?.userId]);

    const data = isControlled ? insight : cached;
    const loading = isControlled ? !!controlledLoading : !!internalLoading;
    const error = isControlled ? controlledError || "" : internalError;

    const filterBody = useMemo(() => {
        return {
            classId: filters?.classId ?? null,
            moduleId: filters?.moduleId ?? null,
            from: filters?.from ?? null,
            to: filters?.to ?? null,
            keyword: filters?.keyword ?? null,
            scoreMin: filters?.scoreMin ?? null,
            scoreMax: filters?.scoreMax ?? null,
        };
    }, [filters]);

    const studentQuery = useMemo(() => {
        return {
            classId: filters?.classId ?? undefined,
            moduleId: filters?.moduleId ?? undefined,
            from: filters?.from ?? undefined,
            to: filters?.to ?? undefined,
        };
    }, [filters]);

    const normalizeInsight = (raw) => {
        if (!raw || typeof raw !== "object") return null;
        return {
            summary: String(raw.summary || "").trim(),
            keyProblems: Array.isArray(raw.keyProblems) ? raw.keyProblems : [],
            atRiskPatterns: Array.isArray(raw.atRiskPatterns) ? raw.atRiskPatterns : [],
            recommendedActions: Array.isArray(raw.recommendedActions) ? raw.recommendedActions : [],
            confidence: raw.confidence || "",
            generatedAt: raw.generatedAt || "",
            strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
            weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
        };
    };

    const normalized = useMemo(() => normalizeInsight(data), [data]);

    const isValidInsight = useMemo(() => {
        if (!normalized) return false;
        return (
            !!normalized.summary ||
            normalized.keyProblems.length > 0 ||
            normalized.atRiskPatterns.length > 0 ||
            normalized.recommendedActions.length > 0 ||
            normalized.strengths.length > 0 ||
            normalized.weaknesses.length > 0
        );
    }, [normalized]);

    const runAiInternal = async () => {
        setInternalError("");
        setInternalLoading(true);
        try {
            if (resolvedMode === "GLOBAL") {
                const res = await axiosPrivate.post("/admin/analytics/ai-insights", filterBody);
                onCache?.(res?.data ?? null);
            } else {
                const uid = student?.userId;
                if (!uid) return;
                const res = await axiosPrivate.get(`/admin/analytics/students/${uid}/ai-insight`, {
                    params: studentQuery,
                });
                onCache?.(res?.data ?? null);
            }
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message ||
                "Không thể lấy AI insight.";
            setInternalError(msg);
        } finally {
            setInternalLoading(false);
        }
    };

    const runAi = async () => {
        if (isControlled) return onRun?.();
        return runAiInternal();
    };

    const headerTitle =
        title || (resolvedMode === "GLOBAL" ? "AI phân tích theo bộ lọc" : "AI feedback học viên");

    const headerSubtitle =
        subtitle ||
        (resolvedMode === "GLOBAL"
            ? "Chỉ chạy khi admin bấm nút. Kết quả phụ thuộc bộ lọc thời gian/lớp/module."
            : "Chỉ chạy khi admin bấm nút. Dựa trên dữ liệu bài làm của học viên trong DB.");

    const metaChips = useMemo(() => {
        const out = [];
        if (overview?.totalStudents != null) out.push({ label: `👥 ${overview.totalStudents} học viên` });
        if (overview?.totalAttempts != null) out.push({ label: `📝 ${overview.totalAttempts} bài làm` });
        if (normalized?.confidence) out.push({ label: `🎯 ${String(normalized.confidence).toUpperCase()}` });
        return out;
    }, [overview?.totalStudents, overview?.totalAttempts, normalized?.confidence]);

    const sectionTitleSx = {
        fontSize: 13,
        fontWeight: 950,
        color: "#2E2D84",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1.25,
    };

    return (
        <>
            <GlobalLoading open={loading} message="AI đang phân tích theo bộ lọc..." />

            {/* ✅ Gradient header cũ được chuyển xuống đây */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: "18px",
                    overflow: "hidden",
                    border: "1px solid #E3E8EF",
                    background: "linear-gradient(135deg,#2E2D84 0%,#EC5E32 100%)",
                    boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.10)",
                }}
            >
                {/* Glass content */}
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: "16px",
                            overflow: "hidden",
                            bgcolor: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(255,255,255,0.55)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        {/* Header row */}
                        <Box sx={{ px: 2, py: 1.75 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography sx={{ fontWeight: 950, color: "#1B2559", fontSize: 15 }}>
                                            {headerTitle}
                                        </Typography>
                                        <Tooltip title={headerSubtitle}>
                                            <IconButton size="small" sx={{ mt: "-2px" }}>
                                                <InfoOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>

                                    {resolvedMode === "STUDENT" ? (
                                        <Typography sx={{ mt: 0.4, color: "#6C757D", fontWeight: 800, fontSize: 12.5 }}>
                                            {student?.fullName || "Học viên"} {student?.email ? `• ${student.email}` : ""}
                                        </Typography>
                                    ) : (
                                        <Typography sx={{ mt: 0.4, color: "#6C757D", fontWeight: 800, fontSize: 12.5 }}>
                                            {headerSubtitle}
                                        </Typography>
                                    )}
                                </Box>

                                <Button
                                    onClick={runAi}
                                    disabled={loading || (resolvedMode === "STUDENT" && !student?.userId)}
                                    variant="contained"
                                    startIcon={<AutoAwesomeRoundedIcon />}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 900,
                                        boxShadow: "none",
                                        bgcolor: "#2E2D84",
                                        "&:hover": { bgcolor: "#1f1e5c", boxShadow: "none" },
                                    }}
                                >
                                    Chạy AI
                                </Button>
                            </Stack>
                        </Box>

                        <Divider />

                        <Box sx={{ p: 2 }}>
                            {error ? (
                                <Alert
                                    severity="error"
                                    icon={<RefreshRoundedIcon />}
                                    sx={{ mb: 2, borderRadius: 2, border: "1px solid #E3E8EF", fontWeight: 800 }}
                                >
                                    {error}
                                </Alert>
                            ) : null}

                            {!isValidInsight ? (
                                <Typography sx={{ color: "#6C757D", fontWeight: 800 }}>
                                    Bấm “Chạy AI” để tạo phân tích.
                                </Typography>
                            ) : (
                                <Box sx={{ borderRadius: 2, border: "1px solid #E3E8EF", overflow: "hidden", bgcolor: "#fff" }}>
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            background:
                                                "linear-gradient(135deg, rgba(46,45,132,0.10) 0%, rgba(236,94,50,0.08) 100%)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 2,
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 950, color: "#1B2559" }}>
                                                Kết quả phân tích AI
                                            </Typography>
                                            <Typography sx={{ mt: 0.35, color: "#6C757D", fontWeight: 800, fontSize: 12.5 }}>
                                                Nhấn “Xem feedback” để xem chi tiết.
                                            </Typography>
                                        </Box>

                                        <Button
                                            onClick={() => setFeedbackOpen(true)}
                                            variant="contained"
                                            startIcon={<VisibilityRoundedIcon />}
                                            sx={{
                                                borderRadius: 999,
                                                textTransform: "none",
                                                fontWeight: 900,
                                                bgcolor: "#EC5E32",
                                                boxShadow: "0 10px 20px rgba(236,94,50,0.22)",
                                                "&:hover": { bgcolor: "#d64a20" },
                                            }}
                                        >
                                            Xem feedback
                                        </Button>
                                    </Box>

                                    {metaChips.length ? (
                                        <Box sx={{ px: 2, py: 1.25 }}>
                                            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                                                {metaChips.map((c, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        size="small"
                                                        label={c.label}
                                                        sx={{
                                                            fontWeight: 900,
                                                            border: "1px solid #E3E8EF",
                                                            bgcolor: "#F7F9FC",
                                                            color: "#1B2559",
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>
                                    ) : null}

                                    {normalized?.summary ? (
                                        <Box sx={{ px: 2, pb: 2 }}>
                                            <Typography sx={{ color: "#6C757D", fontWeight: 750, lineHeight: 1.6 }}>
                                                {normalized.summary}
                                            </Typography>
                                        </Box>
                                    ) : null}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Paper>

            {/* Modal giữ nguyên (đang dùng AppModal) */}
            <AppModal
                open={feedbackOpen}
                onClose={() => setFeedbackOpen(false)}
                hideActions
                maxWidth={850}
                title={
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(255,255,255,0.16)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <AutoAwesomeRoundedIcon sx={{ color: "#fff" }} />
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 950, color: "#fff", fontSize: 16 }}>
                                    Báo cáo phân tích AI chi tiết
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.80)", fontWeight: 800, fontSize: 12.5 }}>
                                    {resolvedMode === "STUDENT"
                                        ? "Phân tích theo học viên (theo bộ lọc đang áp dụng)"
                                        : "Phân tích theo bộ lọc đang áp dụng"}
                                </Typography>
                            </Box>
                        </Stack>

                        <IconButton
                            onClick={() => setFeedbackOpen(false)}
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "rgba(255,255,255,0.16)",
                                "&:hover": { bgcolor: "rgba(255,255,255,0.24)" },
                            }}
                        >
                            <CloseRoundedIcon sx={{ color: "#fff" }} />
                        </IconButton>
                    </Stack>
                }
            >
                {!isValidInsight ? (
                    <Typography sx={{ color: "#6C757D", fontWeight: 800 }}>
                        Chưa có dữ liệu phân tích hợp lệ để hiển thị.
                    </Typography>
                ) : (
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
                            {metaChips.map((c, idx) => (
                                <Chip
                                    key={idx}
                                    size="small"
                                    label={c.label}
                                    sx={{
                                        fontWeight: 900,
                                        bgcolor: "rgba(46,45,132,0.08)",
                                        color: "#2E2D84",
                                    }}
                                />
                            ))}
                        </Stack>

                        <Box sx={{ mb: 3 }}>
                            <Typography sx={sectionTitleSx}>📊 Tổng quan đánh giá</Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: "1px solid #E0E0FF",
                                    background: "linear-gradient(135deg, #f0f0ff 0%, #fff5f0 100%)",
                                }}
                            >
                                <Typography sx={{ color: "#1e293b", fontWeight: 750, lineHeight: 1.85 }}>
                                    {normalized.summary || "(Không có tổng quan.)"}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography sx={sectionTitleSx}>⚖️ Điểm mạnh & Điểm yếu</Typography>

                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: "#F1F3F7",
                                        borderLeft: "4px solid #16a34a",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 950, color: "#1e293b", mb: 1 }}>
                                        ✅ Điểm mạnh
                                    </Typography>
                                    <Stack spacing={0.75}>
                                        {normalized.strengths.slice(0, 10).map((t, idx) => (
                                            <Typography key={idx} sx={{ color: "#1e293b", fontWeight: 750 }}>
                                                • {t}
                                            </Typography>
                                        ))}
                                        {!normalized.strengths.length ? (
                                            <Typography sx={{ color: "#64748b", fontWeight: 750 }}>
                                                (Chưa có dữ liệu điểm mạnh.)
                                            </Typography>
                                        ) : null}
                                    </Stack>
                                </Box>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: "#fff",
                                        border: "2px solid #fef2f2",
                                        borderLeft: "4px solid #dc2626",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 950, color: "#1e293b", mb: 1 }}>
                                        ⚠️ Điểm yếu
                                    </Typography>
                                    <Stack spacing={0.75}>
                                        {[...normalized.keyProblems, ...normalized.atRiskPatterns]
                                            .filter(Boolean)
                                            .slice(0, 12)
                                            .map((t, idx) => (
                                                <Typography key={idx} sx={{ color: "#1e293b", fontWeight: 750 }}>
                                                    • {t}
                                                </Typography>
                                            ))}
                                        {!normalized.keyProblems.length && !normalized.atRiskPatterns.length ? (
                                            <Typography sx={{ color: "#64748b", fontWeight: 750 }}>
                                                (Chưa có dữ liệu điểm yếu.)
                                            </Typography>
                                        ) : null}
                                    </Stack>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography sx={sectionTitleSx}>💡 Đề xuất cải thiện</Typography>

                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.75 }}>
                                {normalized.recommendedActions.slice(0, 10).map((t, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            border: "2px solid #E2E8F0",
                                            bgcolor: "#fff",
                                            transition: "all 160ms ease",
                                            "&:hover": {
                                                borderColor: "#2E2D84",
                                                boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                                            },
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                            <Box
                                                sx={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 2,
                                                    background: "linear-gradient(135deg, #EC5E32 0%, #d64a20 100%)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <AutoAwesomeRoundedIcon sx={{ color: "#fff", fontSize: 18 }} />
                                            </Box>
                                            <Typography sx={{ color: "#1e293b", fontWeight: 800, lineHeight: 1.65 }}>
                                                {t}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                ))}

                                {!normalized.recommendedActions.length ? (
                                    <Typography sx={{ color: "#64748b", fontWeight: 750 }}>
                                        (Chưa có đề xuất cải thiện.)
                                    </Typography>
                                ) : null}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />
                        <Stack direction="row" justifyContent="flex-end">
                            <Button
                                onClick={() => setFeedbackOpen(false)}
                                variant="outlined"
                                sx={{
                                    borderRadius: 999,
                                    px: 2.5,
                                    fontWeight: 900,
                                    color: "#2E2D84",
                                    borderColor: "rgba(46,45,132,0.35)",
                                    "&:hover": { borderColor: "#2E2D84" },
                                }}
                            >
                                Đóng
                            </Button>
                        </Stack>
                    </Box>
                )}
            </AppModal>
        </>
    );
}
