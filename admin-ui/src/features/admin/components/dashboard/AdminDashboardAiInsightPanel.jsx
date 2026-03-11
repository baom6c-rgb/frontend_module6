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
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
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

    // ✅ normalize để dùng chung cho GLOBAL + STUDENT
    // ✅ FIX: student endpoint có thể trả wrapper dạng { ... , students:[{ strengths/weakTopics/... }] }
    const normalizeInsight = (raw) => {
        if (!raw || typeof raw !== "object") return null;

        const s0 = Array.isArray(raw.students) && raw.students.length > 0 ? raw.students[0] : null;

        // GLOBAL: summary / keyProblems / atRiskPatterns / recommendedActions
        // STUDENT: insightSummary / weakTopics / recommendedNextSteps / strengths (thường nằm trong students[0])
        const summaryText = String(raw.summary || raw.insightSummary || s0?.insightSummary || "").trim();

        const recommended = Array.isArray(raw.recommendedActions)
            ? raw.recommendedActions
            : Array.isArray(raw.recommendedNextSteps)
                ? raw.recommendedNextSteps
                : Array.isArray(s0?.recommendedNextSteps)
                    ? s0.recommendedNextSteps
                    : [];

        const strengths = Array.isArray(raw.strengths)
            ? raw.strengths
            : Array.isArray(s0?.strengths)
                ? s0.strengths
                : [];

        const weaknesses = Array.isArray(raw.weakTopics)
            ? raw.weakTopics
            : Array.isArray(raw.weaknesses)
                ? raw.weaknesses
                : Array.isArray(s0?.weakTopics)
                    ? s0.weakTopics
                    : [];

        return {
            summary: summaryText,
            keyProblems: Array.isArray(raw.keyProblems) ? raw.keyProblems : [],
            atRiskPatterns: Array.isArray(raw.atRiskPatterns) ? raw.atRiskPatterns : [],
            recommendedActions: recommended,
            confidence: raw.confidence || "",
            generatedAt: raw.generatedAt || "",
            strengths,
            weaknesses,
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
                "Hệ thống không thể đưa ra nhận xét.";
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
        title || (resolvedMode === "GLOBAL" ? "Phân tích theo bộ lọc" : "Nhận xét học viên (AI)");

    const headerSubtitle =
        subtitle ||
        (resolvedMode === "GLOBAL"
            ? "Kết quả phụ thuộc theo bộ lọc thời gian/lớp/module."
            : "Dựa trên dữ liệu bài làm của học viên.");

    const metaChips = useMemo(() => {
        const out = [];
        if (overview?.totalStudents != null) out.push({ label: `👥 ${overview.totalStudents} học viên` });
        if (overview?.totalAttempts != null) out.push({ label: `📝 ${overview.totalAttempts} bài làm` });
        return out;
    }, [overview?.totalStudents, overview?.totalAttempts]);

    const sectionTitleSx = {
        fontSize: 14,
        fontWeight: 950,
        color: "#2E2D84",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1.25,
    };

    const weaknessItems = useMemo(() => {
        // STUDENT: ưu tiên weakTopics
        const w = Array.isArray(normalized?.weaknesses) ? normalized.weaknesses : [];
        if (resolvedMode === "STUDENT") return w.filter(Boolean);

        // GLOBAL: dùng keyProblems + atRiskPatterns
        const kp = Array.isArray(normalized?.keyProblems) ? normalized.keyProblems : [];
        const ap = Array.isArray(normalized?.atRiskPatterns) ? normalized.atRiskPatterns : [];
        return [...kp, ...ap].filter(Boolean);
    }, [normalized, resolvedMode]);

    const strengthItems = useMemo(() => {
        const s = Array.isArray(normalized?.strengths) ? normalized.strengths : [];
        return s.filter(Boolean);
    }, [normalized]);

    const topPassed = useMemo(() => {
        const list = overview?.topPassedStudents;
        return Array.isArray(list) ? list.slice(0, 5) : [];
    }, [overview?.topPassedStudents]);

    const topFailed = useMemo(() => {
        const list = overview?.topFailedStudents;
        return Array.isArray(list) ? list.slice(0, 5) : [];
    }, [overview?.topFailedStudents]);

    const fmtPct = (v) => {
        if (v == null || Number.isNaN(Number(v))) return "-";
        return `${Math.round(Number(v) * 100)}%`;
    };

    const fmtScore = (v) => {
        if (v == null || Number.isNaN(Number(v))) return "-";
        return Number(v).toFixed(1);
    };

    const MiniTable = ({ title, tone, rows, mode }) => {
        const isPass = tone === "PASS";
        const border = isPass ? "#dcfce7" : "#fee2e2";
        const left = isPass ? "#16a34a" : "#dc2626";
        const bg = isPass ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)";
        const chipBg = isPass ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)";
        const chipColor = isPass ? "#166534" : "#991b1b";

        return (
            <Box
                sx={{
                    borderRadius: 2,
                    border: `2px solid ${border}`,
                    borderLeft: `5px solid ${left}`,
                    bgcolor: "#fff",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ px: 1.75, py: 1.25, bgcolor: bg }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 950, color: "#1e293b", fontSize: 14.5 }}>
                            {title}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${rows.length}/5`}
                            sx={{
                                fontWeight: 950,
                                bgcolor: chipBg,
                                color: chipColor,
                                border: "1px solid rgba(0,0,0,0.06)",
                            }}
                        />
                    </Stack>
                </Box>

                <TableContainer>
                    <Table size="small" sx={{ "& td, & th": { borderColor: "rgba(226,232,240,0.9)" } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 950, color: "#334155", fontSize: 12.5 }}>Học viên</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 950, color: "#334155", fontSize: 12.5 }}>Bài</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 950, color: "#334155", fontSize: 12.5 }}>Điểm</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 950, color: "#334155", fontSize: 12.5 }}>
                                    {mode === "PASS" ? "Đạt" : "Trượt"}
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r?.userId ?? Math.random()}>
                                    <TableCell sx={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                                        {r?.fullName || r?.email || "—"}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 850, color: "#0f172a", fontSize: 13 }}>
                                        {r?.attemptsCount ?? 0}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 850, color: "#0f172a", fontSize: 13 }}>
                                        {fmtScore(r?.avgScore)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 950, color: "#0f172a", fontSize: 13 }}>
                                        {mode === "PASS" ? fmtPct(r?.passRate) : fmtPct(r?.failRate)}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!rows.length ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ py: 2 }}>
                                        <Typography sx={{ color: "#64748b", fontWeight: 800, fontSize: 13 }}>
                                            (Chưa có dữ liệu.)
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    return (
        <>
            <GlobalLoading open={loading} message="Đang phân tích dữ liệu hệ thống..." />

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
                        <Box sx={{ px: 2, py: 1.75 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontWeight: 950, color: "#1B2559", fontSize: { xs: 13.5, sm: 15 } }}>
                                        {headerTitle}
                                    </Typography>

                                    {resolvedMode === "STUDENT" ? (
                                        <Typography sx={{ mt: 0.4, color: "#6C757D", fontWeight: 800, fontSize: { xs: 11.5, sm: 12.5 } }}>
                                            {student?.fullName || "Học viên"} {student?.email ? `• ${student.email}` : ""}
                                        </Typography>
                                    ) : (
                                        <Typography sx={{ mt: 0.4, color: "#6C757D", fontWeight: 800, fontSize: { xs: 11.5, sm: 12.5 } }}>
                                            {headerSubtitle}
                                        </Typography>
                                    )}
                                </Box>

                                <Button
                                    onClick={runAi}
                                    disabled={loading || (resolvedMode === "STUDENT" && !student?.userId)}
                                    variant="contained"
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 900,
                                        boxShadow: "none",
                                        flexShrink: 0,
                                        bgcolor: "#2E2D84",
                                        fontSize: { xs: 11.5, sm: 13.5 },
                                        px: { xs: 1.25, sm: 2 },
                                        py: { xs: 0.6, sm: 0.9 },
                                        minWidth: 0,
                                        height: { xs: 32, sm: 38 },
                                        "&:hover": { bgcolor: "#1f1e5c", boxShadow: "none" },
                                    }}
                                >
                                    Phân tích (AI)
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
                                    Bấm “Phân tích (AI)” để xem đánh giá chi tiết.
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
                                            gap: 1.5,
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontWeight: 950, color: "#1B2559", fontSize: { xs: 13.5, sm: 15 } }}>
                                                Kết quả phân tích (AI)
                                            </Typography>
                                            <Typography sx={{ mt: 0.35, color: "#6C757D", fontWeight: 800, fontSize: { xs: 11.5, sm: 12.5 } }}>
                                                Nhấn "Xem đánh giá" để xem chi tiết.
                                            </Typography>
                                        </Box>

                                        <Button
                                            onClick={() => setFeedbackOpen(true)}
                                            variant="contained"
                                            startIcon={<VisibilityRoundedIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
                                            sx={{
                                                borderRadius: 999,
                                                textTransform: "none",
                                                fontWeight: 900,
                                                bgcolor: "#EC5E32",
                                                boxShadow: "0 6px 16px rgba(236,94,50,0.22)",
                                                flexShrink: 0,
                                                fontSize: { xs: 11.5, sm: 13.5 },
                                                px: { xs: 1.25, sm: 2 },
                                                py: { xs: 0.6, sm: 0.9 },
                                                minWidth: 0,
                                                height: { xs: 32, sm: 38 },
                                                "&:hover": { bgcolor: "#d64a20" },
                                            }}
                                        >
                                            Xem đánh giá
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
                                        <Box sx={{ px: 2, py: 2 }}>
                                            <Typography sx={{ color: "#6C757D", fontWeight: 800, lineHeight: 1.7, fontSize: 14.5 }}>
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

            <AppModal
                open={feedbackOpen}
                onClose={() => setFeedbackOpen(false)}
                hideActions
                maxWidth={900}
                title={
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 950, color: "#fff", fontSize: 19 }}>
                                Báo cáo phân tích chi tiết
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 850, fontSize: 13.5 }}>
                                {resolvedMode === "STUDENT"
                                    ? "Phân tích theo học viên (theo bộ lọc đang áp dụng)"
                                    : "Phân tích theo bộ lọc đang áp dụng"}
                            </Typography>
                        </Box>

                        <IconButton
                            onClick={() => setFeedbackOpen(false)}
                            sx={{
                                width: 38,
                                height: 38,
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
                        Chưa có dữ liệu hợp lệ để hiển thị.
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
                                        fontWeight: 950,
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
                                <Typography sx={{ color: "#1e293b", fontWeight: 850, lineHeight: 1.85, fontSize: 15.5 }}>
                                    {normalized.summary || "(Không có đánh giá tổng quan.)"}
                                </Typography>
                            </Box>
                        </Box>

                        {/* ✅ GLOBAL: show 2 mini tables Top 5 */}
                        {resolvedMode === "GLOBAL" ? (
                            <Box sx={{ mb: 3 }}>
                                <Typography sx={sectionTitleSx}>🏆 Học viên xuất sắc & Học viên cần chú ý</Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 2,
                                    }}
                                >
                                    <MiniTable title="Top Học viên xuất sắc" tone="PASS" rows={topPassed} mode="PASS" />
                                    <MiniTable title="Top Học viên cần chú ý" tone="FAIL" rows={topFailed} mode="FAIL" />
                                </Box>

                                {!topPassed.length && !topFailed.length ? (
                                    <Typography sx={{ mt: 1.25, color: "#64748b", fontWeight: 800, fontSize: 13.5 }}>
                                        (Chưa có dữ liệu Top 5. Kiểm tra overview đã trả topPassedStudents/topFailedStudents chưa.)
                                    </Typography>
                                ) : null}
                            </Box>
                        ) : null}

                        {/* ✅ STUDENT: show strengths + weaknesses; GLOBAL: ONLY weaknesses */}
                        {resolvedMode === "STUDENT" ? (
                            <Box sx={{ mb: 3 }}>
                                <Typography sx={sectionTitleSx}>⚖️ Điểm mạnh & Điểm yếu</Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 2,
                                        width: "100%",
                                    }}
                                >
                                    {/* Strengths */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: "#fff",
                                            border: "2px solid #ecfdf5",
                                            borderLeft: "5px solid #16a34a",
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 950, color: "#1e293b", mb: 1, fontSize: 14.5 }}>
                                            ✅ Điểm mạnh
                                        </Typography>
                                        <Stack spacing={0.75}>
                                            {strengthItems.slice(0, 12).map((t, idx) => (
                                                <Typography key={idx} sx={{ color: "#1e293b", fontWeight: 850, fontSize: 14 }}>
                                                    • {t}
                                                </Typography>
                                            ))}
                                            {!strengthItems.length ? (
                                                <Typography sx={{ color: "#64748b", fontWeight: 850, fontSize: 14 }}>
                                                    (Chưa có dữ liệu điểm mạnh.)
                                                </Typography>
                                            ) : null}
                                        </Stack>
                                    </Box>

                                    {/* Weaknesses */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: "#fff",
                                            border: "2px solid #fef2f2",
                                            borderLeft: "5px solid #dc2626",
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 950, color: "#1e293b", mb: 1, fontSize: 14.5 }}>
                                            ⚠️ Điểm yếu
                                        </Typography>
                                        <Stack spacing={0.75}>
                                            {weaknessItems.slice(0, 12).map((t, idx) => (
                                                <Typography key={idx} sx={{ color: "#1e293b", fontWeight: 850, fontSize: 14 }}>
                                                    • {t}
                                                </Typography>
                                            ))}
                                            {!weaknessItems.length ? (
                                                <Typography sx={{ color: "#64748b", fontWeight: 850, fontSize: 14 }}>
                                                    (Chưa có dữ liệu điểm yếu.)
                                                </Typography>
                                            ) : null}
                                        </Stack>
                                    </Box>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ mb: 3 }}>
                                <Typography sx={sectionTitleSx}>⚖️ Nhận định học tập tổng quan</Typography>

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: "#fff",
                                        border: "2px solid #FFFBEB",
                                        borderLeft: "5px solid #F59E0B",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 950, color: "#1e293b", mb: 1, fontSize: 14.5 }}>
                                        ⚠️ Điểm cần lưu ý
                                    </Typography>
                                    <Stack spacing={0.75}>
                                        {weaknessItems.slice(0, 12).map((t, idx) => (
                                            <Typography key={idx} sx={{ color: "#1e293b", fontWeight: 850, fontSize: 14 }}>
                                                • {t}
                                            </Typography>
                                        ))}
                                        {!weaknessItems.length ? (
                                            <Typography sx={{ color: "#64748b", fontWeight: 850, fontSize: 14 }}>
                                                (Chưa có dữ liệu điểm yếu.)
                                            </Typography>
                                        ) : null}
                                    </Stack>
                                </Box>
                            </Box>
                        )}

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
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src="/images/AI_logo.png"
                                                    alt="AI"
                                                    sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 2 }}
                                                />
                                            </Box>
                                            <Typography sx={{ color: "#1e293b", fontWeight: 900, lineHeight: 1.65, fontSize: 14.5 }}>
                                                {t}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                ))}

                                {!normalized.recommendedActions.length ? (
                                    <Typography sx={{ color: "#64748b", fontWeight: 850, fontSize: 14 }}>
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
                                    fontWeight: 950,
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