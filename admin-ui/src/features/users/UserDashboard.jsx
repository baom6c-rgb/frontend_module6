// src/features/users/UserDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Paper,
    Fade,
    CircularProgress,
    Alert,
    Avatar,
    Container,
    Chip,
    Divider,
    Button,
    Stack,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Timer as TimerIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingIcon,
    School as SchoolIcon,
    Lightbulb as LightbulbIcon,
    AutoGraph as ProgressIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    LocalFireDepartment as FireIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { getDashboardStatsApi } from "../../api/dashboardApi";
import { getMyProfileApi } from "../../api/userApi";
import { getMyExamAttemptsApi } from "../../api/examApi";
import { useNavigate } from "react-router-dom";

const COLORS = {
    primary: "#2E2D84",
    primaryDeep: "#1E1D6F",
    primaryLight: "#EEF2FF",

    orange: "#EC5E32",
    orangeDeep: "#D5522B",
    orangeLight: "#FFF1EB",

    success: "#2E7D32",
    successDeep: "#1B5E20",
    successLight: "#E8F5E9",

    error: "#D32F2F",
    errorDeep: "#C62828",
    errorLight: "#FFEBEE",

    bg: "#F7F9FC",
    white: "#FFFFFF",
    text: "#1B2559",
    subtext: "#6C757D",
    border: "#E3E8EF",
};

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

const fmtInt = (v, fallback = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(n);
};

const fmtHours = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "0h";
    const mins = Math.round(n * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const CardShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "20px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
            height: "100%",
            width: "100%",
            ...sx,
        }}
    >
        {children}
    </Paper>
);

const KpiCard = ({ icon, title, value, subtitle, tone = "primary" }) => {
    const toneColor =
        tone === "orange" ? COLORS.orange :
            tone === "success" ? COLORS.success :
                tone === "error" ? COLORS.error :
                    COLORS.primary;

    return (
        <CardShell
            sx={{
                p: 2.5,
                display: "flex",
                alignItems: "center",
                height: "100%",
                minHeight: 120,
                transition: "all 0.22s ease",
                "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 22px 55px rgba(15, 23, 42, 0.1)",
                    borderColor: alpha(toneColor, 0.5),
                },
            }}
        >
            <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                    sx={{
                        width: 52,
                        height: 52,
                        borderRadius: "14px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha(toneColor, 0.1),
                        color: toneColor,
                        flex: "0 0 auto",
                    }}
                >
                    {React.cloneElement(icon, { fontSize: "medium" })}
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: COLORS.subtext,
                            fontWeight: 900,
                            letterSpacing: "0.6px",
                            textTransform: "uppercase",
                            display: "block",
                            lineHeight: 1.2,
                            mb: 0.5,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {title}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 0.75,
                            minWidth: 0,
                            flexWrap: "nowrap",
                        }}
                    >
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 950,
                                color: COLORS.text,
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {value}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: alpha(COLORS.subtext, 0.95),
                                fontWeight: 700,
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {subtitle || " "}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </CardShell>
    );
};

export default function UserDashboard() {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState(0); // 0: Gợi ý, 1: Câu hỏi

    // Hàm chuyển tab
    const handleNext = () => setActiveTab((prev) => (prev === 0 ? 1 : 0));
    const handlePrev = () => setActiveTab((prev) => (prev === 1 ? 0 : 1));

    // Thêm state để lưu lộ trình từ bài thi gần nhất
    const [latestStudyGuide, setLatestStudyGuide] = useState(null);

    // Hàm đọc study guide từ localStorage
    const readStudyGuide = useCallback((userId) => {
        if (!userId) return;
        const storageKey = `latest_study_guide_${userId}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                setLatestStudyGuide(JSON.parse(savedData));
            } catch (e) {
                console.error("Lỗi parse dữ liệu AI:", e);
                setLatestStudyGuide(null);
            }
        } else {
            setLatestStudyGuide(null);
        }
    }, []);

    useEffect(() => {
        if (!user?._id) return;

        // Đọc lần đầu
        readStudyGuide(user._id);

        // Lắng nghe khi localStorage thay đổi từ tab/trang khác
        const handleStorage = (e) => {
            if (e.key === `latest_study_guide_${user._id}`) {
                readStudyGuide(user._id);
            }
        };

        // Lắng nghe khi user quay lại tab (sau khi làm bài xong)
        const handleFocus = () => readStudyGuide(user._id);
        const handleVisibility = () => {
            if (document.visibilityState === "visible") readStudyGuide(user._id);
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [user, readStudyGuide]);

    const [stats, setStats] = useState(null);
    const [profile, setProfile] = useState(null);
    const [examAttempts, setExamAttempts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;

        const fetchAll = async () => {
            try {
                setLoading(true);

                const [statsRes, profileRes, attemptsRes] = await Promise.allSettled([
                    getDashboardStatsApi(),
                    getMyProfileApi(),
                    getMyExamAttemptsApi(),
                ]);

                if (!alive) return;

                if (statsRes.status === "fulfilled") {
                    setStats(statsRes.value.data);
                    setError(null);
                } else {
                    console.error("Dashboard Error:", statsRes.reason);
                    setError("Không thể tải dữ liệu thống kê. Vui lòng kiểm tra lại kết nối Server.");
                }

                if (profileRes.status === "fulfilled") {
                    const p = profileRes.value.data;
                    setProfile(p);

                    if (p?.avatarUrl) {
                        const u = safeParse("userData", {});
                        localStorage.setItem(
                            "userData",
                            JSON.stringify({ ...(u || {}), avatarUrl: p.avatarUrl })
                        );
                    }
                }

                if (attemptsRes.status === "fulfilled") {
                    const attemptsData = attemptsRes.value.data || [];
                    setExamAttempts(Array.isArray(attemptsData) ? attemptsData : []);
                    console.log("📊 Exam Attempts Data:", attemptsData);
                    if (attemptsData && attemptsData.length > 0) {
                        console.log("📝 Sample Attempt:", attemptsData[0]);
                    }
                } else {
                    console.warn("Attempts Error:", attemptsRes.reason);
                    setExamAttempts([]);
                }
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchAll();
        return () => {
            alive = false;
        };
    }, []);

    const userData = safeParse("userData", null);

    const displayName =
        profile?.fullName ||
        user?.fullName ||
        userData?.fullName ||
        profile?.email ||
        user?.email ||
        userData?.email ||
        "User";

    const avatarUrl =
        profile?.avatarUrl ||
        user?.avatarUrl ||
        userData?.avatarUrl ||
        userData?.avatar ||
        userData?.profileImageUrl ||
        "";

    const initials = useMemo(() => {
        const name = String(displayName || "U").trim();
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name ? name.charAt(0).toUpperCase() : "U";
    }, [displayName]);

    const streakData = useMemo(() => {
        if (!examAttempts || examAttempts.length === 0) {
            return { streak: 0, didTodaysExam: false };
        }

        // Hàm phụ để lấy chuỗi YYYY-MM-DD theo giờ địa phương
        const getLocalDateString = (dateObj) => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 1. Lấy danh sách các ngày duy nhất (Local Time)
        const datesSet = new Set();
        examAttempts.forEach(attempt => {
            const dateField = attempt.submitTime || attempt.submittedAt ||
                attempt.endTime || attempt.completedAt ||
                attempt.finishedAt || attempt.date;

            if (dateField) {
                const d = new Date(dateField);
                if (!isNaN(d.getTime())) {
                    datesSet.add(getLocalDateString(d));
                }
            }
        });

        const uniqueDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
        if (uniqueDates.length === 0) return { streak: 0, didTodaysExam: false };

        // 2. Xác định mốc thời gian Hôm nay & Hôm qua
        const now = new Date();
        const todayStr = getLocalDateString(now);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        const mostRecentDate = uniqueDates[0];
        const didTodaysExam = mostRecentDate === todayStr;

        // 3. Kiểm tra nếu chuỗi streak bị đứt (không làm hôm nay cũng không làm hôm qua)
        if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
            return { streak: 0, didTodaysExam: false };
        }

        // 4. Đếm streak bằng cách lùi ngày
        let streak = 0;
        let checkDate = new Date(didTodaysExam ? now : yesterday);

        while (true) {
            const expectedStr = getLocalDateString(checkDate);

            // Tìm ngày dự kiến trong danh sách đã làm bài
            if (datesSet.has(expectedStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1); // Lùi về 1 ngày để check tiếp
            } else {
                break; // Đứt chuỗi
            }
        }

        return { streak, didTodaysExam };
    }, [examAttempts]);

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: "72vh",
                    display: "grid",
                    placeItems: "center",
                    px: 2,
                    bgcolor: COLORS.bg,
                }}
            >
                <Box sx={{ textAlign: "center" }}>
                    <CircularProgress thickness={5} size={56} sx={{ color: COLORS.primary }} />
                    <Typography sx={{ mt: 2, color: alpha(COLORS.subtext, 0.95), fontWeight: 800 }}>
                        Đang tải dữ liệu học tập...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: "16px", fontWeight: 800 }}>
                    {error}
                </Alert>
            </Container>
        );
    }

    const completed = fmtInt(stats?.completedLessons, 0);
    const onlineTimeText = fmtHours(stats?.onlineTime || 0);
    const avgScore = fmtInt(stats?.averageScore, 0);
    const rank = fmtInt(stats?.rank, 0);
    const totalStudents = fmtInt(stats?.totalStudents, 0);
    const passedLessons = fmtInt(stats?.passedLessons, 0);
    const failedLessons = fmtInt(stats?.failedLessons, 0);

    const greeting = stats?.greeting || `Chào mừng ${displayName}!`;
    const suggestion =
        stats?.suggestion || "Hãy làm bài kiểm tra để AI phân tích lộ trình phù hợp nhất cho bạn.";

    const scorePct = Math.max(0, Math.min(100, avgScore));

    return (
        <Fade in timeout={650}>
            <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", py: { xs: 2.5, md: 4 } }}>
                <Container
                    maxWidth={false}
                    disableGutters
                    sx={{
                        width: "100%",
                        px: { xs: 2, sm: 3, md: 4, lg: 5 },
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            mx: "auto",
                            maxWidth: { xs: "100%", lg: 1560, xl: 1720 },
                        }}
                    >
                        {/* ===== HEADER HERO ===== */}
                        <CardShell
                            sx={{
                                mb: 3,
                                p: { xs: 2.5, md: 3.5 },
                                background: `linear-gradient(135deg, ${COLORS.primaryDeep} 0%, ${COLORS.primary} 45%, ${COLORS.orange} 120%)`,
                                color: "#fff",
                                position: "relative",
                                minHeight: 170,
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0.00) 42%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.00) 45%)",
                                    pointerEvents: "none",
                                }}
                            />

                            <Box
                                sx={{
                                    position: "relative",
                                    zIndex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 2,
                                    flexWrap: { xs: "wrap", md: "nowrap" },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        minWidth: 0,
                                        flex: 1,
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl || undefined}
                                        imgProps={{ referrerPolicy: "no-referrer" }}
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            border: "4px solid rgba(255,255,255,0.45)",
                                            bgcolor: alpha("#000", 0.12),
                                            fontWeight: 950,
                                            fontSize: "1.6rem",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        {initials}
                                    </Avatar>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 950,
                                                lineHeight: 1.1,
                                                mb: 0.5,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {greeting}
                                        </Typography>

                                        <Typography sx={{ opacity: 0.92, fontWeight: 700, mb: 1.5 }}>
                                            Học hành là chuyện cả đời. Bắt đầu học tập chưa bao giờ là quá muộn ! 📚
                                        </Typography>

                                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                            <Chip
                                                size="small"
                                                label={`Điểm hiện tại: ${avgScore}/100`}
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label="Mục tiêu: Top 10"
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label={`Tiến độ: ${scorePct}%`}
                                                sx={{
                                                    bgcolor: alpha("#fff", 0.16),
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    borderRadius: "999px",
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.25,
                                        color: alpha("#fff", 0.92),
                                        flex: "0 0 auto",
                                        minWidth: { xs: "100%", md: 240 },
                                        justifyContent: { xs: "flex-start", md: "flex-end" },
                                    }}
                                >
                                    <ProgressIcon sx={{ fontSize: 36 }} />
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1 }}>
                                            {rank ? `#${rank}` : "--"}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.9 }}>
                                            {totalStudents ? `Trên ${totalStudents} học viên` : "Bảng xếp hạng"}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardShell>

                        {/* ===== KPI GRID ===== */}
                        <Box sx={{ mb: 3 }}>
                            <CardShell sx={{ p: 2.5 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, 1fr)',
                                            md: 'repeat(3, 1fr)'
                                        },
                                        gap: 2.5,
                                    }}
                                >
                                    {/* Hàng 1 - 3 cards trên */}
                                    <KpiCard
                                        icon={<AssignmentIcon />}
                                        title="Hoàn thành"
                                        value={completed}
                                        subtitle="bài đã nộp"
                                        tone="primary"
                                    />
                                    <KpiCard
                                        icon={<SchoolIcon />}
                                        title="Điểm trung bình"
                                        value={avgScore}
                                        subtitle="/100"
                                        tone="primary"
                                    />
                                    <KpiCard
                                        icon={<TimerIcon />}
                                        title="Thời gian"
                                        value={onlineTimeText}
                                        subtitle="Tổng thời gian làm bài"
                                        tone="orange"
                                    />

                                    {/* Hàng 2 - 3 cards dưới */}
                                    <KpiCard
                                        icon={<CheckCircleIcon />}
                                        title="Số bài Đạt"
                                        value={passedLessons}
                                        subtitle="Đạt"
                                        tone="success"
                                    />
                                    <KpiCard
                                        icon={<CancelIcon />}
                                        title="Số bài Trượt"
                                        value={failedLessons}
                                        subtitle="Trượt"
                                        tone="error"
                                    />
                                    <KpiCard
                                        icon={<TrendingIcon />}
                                        title="Xếp hạng"
                                        value={rank ? `#${rank}` : "--"}
                                        subtitle={totalStudents ? `/${totalStudents}` : ""}
                                        tone="orange"
                                    />
                                </Box>
                            </CardShell>
                        </Box>

                        {/* ===== MAIN CONTENT ===== */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2.5,
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* LEFT: Lộ trình ôn tập chi tiết - Slide */}
                            <Box sx={{flex: {xs: '1 1 100%', md: '7'}, display: "flex", minWidth: 0}}>
                                <CardShell sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                                    <Box sx={{p: 2.5, height: "100%", display: 'flex', flexDirection: 'column'}}>

                                        {/* Header with slide nav */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 1.5
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 36, height: 36,
                                                    borderRadius: '10px',
                                                    bgcolor: activeTab === 0 ? alpha(COLORS.orange, 0.12) : alpha(COLORS.primary, 0.1),
                                                    display: 'grid', placeItems: 'center',
                                                    transition: 'all 0.3s ease',
                                                }}>
                                                    {activeTab === 0
                                                        ? <LightbulbIcon sx={{ fontSize: 18, color: COLORS.orangeDeep }} />
                                                        : <SchoolIcon sx={{ fontSize: 18, color: COLORS.primaryDeep }} />
                                                    }
                                                </Box>
                                                <Box>
                                                    <Typography sx={{fontWeight: 950, color: COLORS.text, fontSize: '1rem', lineHeight: 1.2}}>
                                                        {activeTab === 0 ? "Xem và không đánh giá " : "Phải bạn không - Cùng sửa nhé"}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: COLORS.subtext,
                                                        fontWeight: 700,
                                                        fontSize: '12px'
                                                    }}>
                                                        {activeTab === 0 ? "AI phân tích từ bài thi gần nhất của bạn" : "Tự trả lời để củng cố kiến thức"}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                {/* Slide tab pills */}
                                                <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                                                    {[
                                                        { label: "💡 Gợi ý", idx: 0, color: COLORS.orange },
                                                        { label: "📝 Câu hỏi", idx: 1, color: COLORS.primary },
                                                    ].map((tab) => (
                                                        <Box
                                                            key={tab.idx}
                                                            onClick={() => setActiveTab(tab.idx)}
                                                            sx={{
                                                                px: 1.25, py: 0.4,
                                                                borderRadius: '20px',
                                                                fontSize: '11px',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.25s ease',
                                                                bgcolor: activeTab === tab.idx ? tab.color : 'transparent',
                                                                color: activeTab === tab.idx ? '#fff' : COLORS.subtext,
                                                                border: `1.5px solid ${activeTab === tab.idx ? tab.color : COLORS.border}`,
                                                                userSelect: 'none',
                                                                '&:hover': {
                                                                    bgcolor: activeTab === tab.idx ? tab.color : alpha(tab.color, 0.07),
                                                                    borderColor: tab.color,
                                                                    color: activeTab === tab.idx ? '#fff' : tab.color,
                                                                }
                                                            }}
                                                        >
                                                            {tab.label}
                                                        </Box>
                                                    ))}
                                                </Box>
                                                <Button
                                                    onClick={handlePrev}
                                                    size="small"
                                                    sx={{
                                                        minWidth: 28, width: 28, height: 28,
                                                        borderRadius: '50%',
                                                        border: `1px solid ${COLORS.border}`,
                                                        color: COLORS.text, p: 0,
                                                        '&:hover': { bgcolor: alpha(COLORS.text, 0.06) }
                                                    }}
                                                >
                                                    <ChevronLeftIcon sx={{ fontSize: 16 }}/>
                                                </Button>
                                                <Button
                                                    onClick={handleNext}
                                                    size="small"
                                                    sx={{
                                                        minWidth: 28, width: 28, height: 28,
                                                        borderRadius: '50%',
                                                        border: `1px solid ${COLORS.border}`,
                                                        color: COLORS.text, p: 0,
                                                        '&:hover': { bgcolor: alpha(COLORS.text, 0.06) }
                                                    }}
                                                >
                                                    <ChevronRightIcon sx={{ fontSize: 16 }}/>
                                                </Button>
                                            </Stack>
                                        </Box>

                                        <Divider/>

                                        {/* Slide content area */}
                                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 2, overflow: 'hidden', position: 'relative' }}>
                                            <Box sx={{
                                                height: '340px',
                                                overflowY: 'auto',
                                                pr: 0.5,
                                                '&::-webkit-scrollbar': {width: '4px'},
                                                '&::-webkit-scrollbar-thumb': {
                                                    bgcolor: alpha(COLORS.text, 0.1),
                                                    borderRadius: '5px'
                                                }
                                            }}>
                                                <Fade in={true} key={activeTab} timeout={350}>
                                                    <Stack spacing={1.2}>
                                                        {activeTab === 0 ? (
                                                            /* === SLIDE 0: GỢI Ý HỌC TẬP (tips) === */
                                                            latestStudyGuide?.tips?.length > 0 ? (
                                                                latestStudyGuide.tips.map((tip, idx) => (
                                                                    <Box key={`tip-${idx}`} sx={{
                                                                        p: 1.5,
                                                                        bgcolor: alpha(COLORS.orange, 0.05),
                                                                        borderRadius: '12px',
                                                                        borderLeft: `4px solid ${COLORS.orange}`,
                                                                        display: 'flex', gap: 1.25, alignItems: 'flex-start',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': { bgcolor: alpha(COLORS.orange, 0.09), transform: 'translateX(2px)' }
                                                                    }}>
                                                                        <Box sx={{
                                                                            minWidth: 22, height: 22, borderRadius: '6px',
                                                                            bgcolor: COLORS.orange, color: '#fff',
                                                                            display: 'grid', placeItems: 'center',
                                                                            fontSize: '11px', fontWeight: 900, flexShrink: 0, mt: 0.1
                                                                        }}>{idx + 1}</Box>
                                                                        <Typography sx={{ color: COLORS.text, fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.55 }}>
                                                                            {tip}
                                                                        </Typography>
                                                                    </Box>
                                                                ))
                                                            ) : (
                                                                /* Fallback khi chưa có AI guide - dùng stats */
                                                                [
                                                                    {
                                                                        icon: "🎯",
                                                                        title: "Xem lại các bài thi trượt",
                                                                        desc: failedLessons > 0
                                                                            ? `Bạn có ${failedLessons} bài thi trượt. Hãy vào "Đánh giá học tập" để xem lại các câu sai và củng cố kiến thức.`
                                                                            : "Bạn chưa có bài thi trượt nào. Hãy tiếp tục duy trì phong độ tốt!"
                                                                    },
                                                                    {
                                                                        icon: "📈",
                                                                        title: "Cải thiện điểm trung bình",
                                                                        desc: avgScore >= 80
                                                                            ? `Điểm trung bình của bạn là ${avgScore}/100 - rất tốt! Hãy thử thách bản thân với các đề khó hơn.`
                                                                            : `Điểm trung bình hiện tại là ${avgScore}/100. Cần cải thiện lên ≥ 80 để đạt kết quả tốt.`
                                                                    },
                                                                    {
                                                                        icon: "🔥",
                                                                        title: "Duy trì streak học tập",
                                                                        desc: streakData.streak > 0
                                                                            ? `Bạn đang có streak ${streakData.streak} ngày liên tiếp. Hãy làm bài hôm nay để giữ vững chuỗi này!`
                                                                            : "Hãy bắt đầu streak ngay hôm nay bằng cách hoàn thành ít nhất 1 bài thi."
                                                                    },
                                                                    {
                                                                        icon: "✨",
                                                                        title: "Nhận gợi ý AI cá nhân hóa",
                                                                        desc: "Hoàn thành một bài thi và nhận phân tích chi tiết từ AI để có lộ trình học tập phù hợp nhất với bạn."
                                                                    },
                                                                ].map((item, idx) => (
                                                                    <Box key={idx} sx={{
                                                                        p: 1.5,
                                                                        bgcolor: alpha(COLORS.orange, 0.04),
                                                                        borderRadius: '12px',
                                                                        borderLeft: `4px solid ${alpha(COLORS.orange, 0.6)}`,
                                                                        display: 'flex',
                                                                        gap: 1.25,
                                                                        alignItems: 'flex-start',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': { bgcolor: alpha(COLORS.orange, 0.08), transform: 'translateX(2px)' }
                                                                    }}>
                                                                        <Typography sx={{ fontSize: '18px', lineHeight: 1.3, flexShrink: 0, mt: 0.1 }}>{item.icon}</Typography>
                                                                        <Box>
                                                                            <Typography sx={{ color: COLORS.text, fontWeight: 800, fontSize: '0.8rem', lineHeight: 1.3, mb: 0.3 }}>
                                                                                {item.title}
                                                                            </Typography>
                                                                            <Typography sx={{ color: COLORS.subtext, fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.5 }}>
                                                                                {item.desc}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                ))
                                                            )
                                                        ) : (
                                                            /* === SLIDE 1: CÂU HỎI ÔN TẬP === */
                                                            latestStudyGuide?.questions?.length > 0 ? (
                                                                latestStudyGuide.questions.map((q, idx) => (
                                                                    <Box key={idx} sx={{
                                                                        p: 1.5,
                                                                        bgcolor: COLORS.primaryLight,
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${alpha(COLORS.primary, 0.1)}`,
                                                                        borderLeft: `4px solid ${COLORS.primary}`,
                                                                        display: 'flex',
                                                                        gap: 1.25,
                                                                        alignItems: 'flex-start',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': { bgcolor: alpha(COLORS.primary, 0.07), transform: 'translateX(2px)' }
                                                                    }}>
                                                                        <Box sx={{
                                                                            minWidth: 22, height: 22, borderRadius: '6px',
                                                                            bgcolor: COLORS.primary, color: '#fff',
                                                                            display: 'grid', placeItems: 'center',
                                                                            fontSize: '11px', fontWeight: 900, flexShrink: 0, mt: 0.1
                                                                        }}>Q{idx + 1}</Box>
                                                                        <Typography sx={{
                                                                            color: COLORS.primaryDeep, fontWeight: 700,
                                                                            fontSize: '0.875rem', lineHeight: 1.5
                                                                        }}>{q}</Typography>
                                                                    </Box>
                                                                ))
                                                            ) : (
                                                                /* Fallback câu hỏi ôn tập chung */
                                                                [
                                                                    "Bạn đã hiểu rõ các câu trả lời sai trong bài thi chưa? Hãy thử giải thích lại tại sao đáp án đúng là vậy.",
                                                                    "Trong số các bài thi bị điểm thấp, chủ đề nào bạn cần ôn lại ngay hôm nay?",
                                                                    "Hãy tự làm lại 3 câu sai khó nhất mà không nhìn đáp án — bạn có làm được không?",
                                                                    "Nếu ngày mai thi lại bài này, bạn tự tin đạt bao nhiêu điểm và vì sao?",
                                                                    "Phần kiến thức nào trong bài thi bạn chưa từng gặp trước đó? Hãy tìm hiểu thêm về phần đó.",
                                                                ].map((q, idx) => (
                                                                    <Box key={idx} sx={{
                                                                        p: 1.5,
                                                                        bgcolor: alpha(COLORS.primary, 0.04),
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${alpha(COLORS.primary, 0.08)}`,
                                                                        borderLeft: `4px solid ${alpha(COLORS.primary, 0.5)}`,
                                                                        display: 'flex',
                                                                        gap: 1.25,
                                                                        alignItems: 'flex-start',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': { bgcolor: alpha(COLORS.primary, 0.08), transform: 'translateX(2px)' }
                                                                    }}>
                                                                        <Box sx={{
                                                                            minWidth: 22, height: 22, borderRadius: '6px',
                                                                            bgcolor: alpha(COLORS.primary, 0.6), color: '#fff',
                                                                            display: 'grid', placeItems: 'center',
                                                                            fontSize: '11px', fontWeight: 900, flexShrink: 0, mt: 0.1
                                                                        }}>Q{idx + 1}</Box>
                                                                        <Typography sx={{
                                                                            color: COLORS.text, fontWeight: 600,
                                                                            fontSize: '0.875rem', lineHeight: 1.5, fontStyle: 'italic'
                                                                        }}>{q}</Typography>
                                                                    </Box>
                                                                ))
                                                            )
                                                        )}
                                                    </Stack>
                                                </Fade>
                                            </Box>

                                            {/* Footer: source label + dot indicator */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5 }}>
                                                <Typography variant="caption" sx={{ color: alpha(COLORS.subtext, 0.7), fontWeight: 700, fontSize: '11px' }}>
                                                    {latestStudyGuide?.updatedAt
                                                        ? `✨ AI phân tích · ${new Date(latestStudyGuide.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                                        : latestStudyGuide
                                                            ? `✨ Phân tích AI từ bài thi gần nhất`
                                                            : `💡 Gợi ý tổng quát — làm bài để nhận phân tích AI`
                                                    }
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                    {[
                                                        { idx: 0, color: COLORS.orange },
                                                        { idx: 1, color: COLORS.primary },
                                                    ].map((dot) => (
                                                        <Box
                                                            key={dot.idx}
                                                            onClick={() => setActiveTab(dot.idx)}
                                                            sx={{
                                                                width: activeTab === dot.idx ? 20 : 7,
                                                                height: 7,
                                                                borderRadius: 4,
                                                                bgcolor: activeTab === dot.idx ? dot.color : COLORS.border,
                                                                transition: 'all 0.3s ease',
                                                                cursor: 'pointer',
                                                                '&:hover': { bgcolor: activeTab === dot.idx ? dot.color : alpha(dot.color, 0.4) }
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardShell>
                            </Box>

                            {/* RIGHT: Tóm tắt mục tiêu */}
                            <Box sx={{ flex: { xs: '1 1 100%', md: '5' }, display: "flex", minWidth: 0 }}>
                                <CardShell>
                                    <Box
                                        sx={{
                                            p: 3,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2.5,
                                            height: "100%",
                                            width: "100%",
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 950, color: COLORS.text, mb: 0.5 }}>
                                                Mục tiêu hằng ngày
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: COLORS.subtext, fontWeight: 700 }}>
                                                Giữ vững nhịp độ và cải thiện điểm số
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ borderColor: alpha(COLORS.border, 0.9) }} />

                                        <Box
                                            sx={{
                                                p: 2.5,
                                                borderRadius: "16px",
                                                border: `1px solid ${alpha(COLORS.orange, 0.18)}`,
                                                bgcolor: alpha(COLORS.orangeLight, 0.65),
                                                minWidth: 0,
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {/* Decorative gradient */}
                                            {streakData.streak >= 7 && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: -50,
                                                        right: -50,
                                                        width: 150,
                                                        height: 150,
                                                        borderRadius: '50%',
                                                        background: `radial-gradient(circle, ${alpha(COLORS.orange, 0.15)} 0%, transparent 70%)`,
                                                        pointerEvents: 'none',
                                                    }}
                                                />
                                            )}

                                            <Typography variant="caption" sx={{ color: COLORS.subtext, fontWeight: 900, position: 'relative', zIndex: 1 }}>
                                                STREAK HIỆN TẠI
                                            </Typography>

                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.75, position: 'relative', zIndex: 1 }}>
                                                <FireIcon
                                                    sx={{
                                                        fontSize: streakData.streak >= 30 ? '2.5rem' : streakData.streak >= 7 ? '2rem' : '1.5rem',
                                                        color: streakData.streak >= 30 ? COLORS.error : streakData.streak >= 7 ? COLORS.orange : COLORS.orangeDeep,
                                                        transition: 'all 0.3s ease',
                                                        filter: streakData.streak >= 7 ? 'drop-shadow(0 2px 4px rgba(236, 94, 50, 0.3))' : 'none'
                                                    }}
                                                />

                                                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                                                    <Typography
                                                        variant="h4"
                                                        sx={{
                                                            fontWeight: 950,
                                                            color: COLORS.text,
                                                            fontSize: streakData.streak >= 30 ? '2.5rem' : '2rem',
                                                        }}
                                                    >
                                                        {streakData.streak}
                                                    </Typography>
                                                    <Typography sx={{ fontWeight: 900, color: COLORS.subtext }}>
                                                        ngày
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Typography
                                                variant="body2"
                                                sx={{ color: COLORS.text, fontWeight: 700, mt: 1, position: 'relative', zIndex: 1 }}
                                            >
                                                {streakData.streak === 0
                                                    ? "Bắt đầu chuỗi streak ngay hôm nay!"
                                                    : streakData.streak < 7
                                                        ? `Cố lên nào !`
                                                        : streakData.streak < 30
                                                            ? `Streak ${streakData.streak} ngày ấn tượng! Thật kiên trì!`
                                                            : `${streakData.streak} ngày liên tiếp! Bạn là huyền thoại!`
                                                }
                                            </Typography>

                                            <Box sx={{ display: "flex", gap: 1, mt: 1.75, flexWrap: "wrap", position: 'relative', zIndex: 1 }}>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        streakData.streak >= 30 ? "👑 HUYỀN THOẠI" :
                                                            streakData.streak >= 7 ? "🔥 STREAK MẠNH" :
                                                                streakData.streak >= 3 ? "💪 ĐANG TIẾN BỘ" :
                                                                    streakData.streak > 0 ? "⚡ STREAK YẾU" : "💤 CHƯA CÓ STREAK"
                                                    }
                                                    sx={{
                                                        bgcolor: alpha(
                                                            streakData.streak >= 7 ? COLORS.success :
                                                                streakData.streak >= 3 ? COLORS.orange :
                                                                    COLORS.primary,
                                                            0.1
                                                        ),
                                                        color: streakData.streak >= 7 ? COLORS.successDeep :
                                                            streakData.streak >= 3 ? COLORS.orangeDeep :
                                                                COLORS.primaryDeep,
                                                        fontWeight: 900,
                                                        border: `1px solid ${alpha(
                                                            streakData.streak >= 7 ? COLORS.success :
                                                                streakData.streak >= 3 ? COLORS.orange :
                                                                    COLORS.primary,
                                                            0.2
                                                        )}`,
                                                    }}
                                                />

                                                {/* Thay đổi logic hiển thị câu thông báo tại đây */}
                                                <Chip
                                                    size="small"
                                                    label={streakData.didTodaysExam ? "✅ Bạn đã làm bài thi hôm nay !" : "⚠️ Hãy làm bài để giữ Streak nhé !"}
                                                    sx={{
                                                        bgcolor: alpha(streakData.didTodaysExam ? COLORS.success : COLORS.error, 0.1),
                                                        color: streakData.didTodaysExam ? COLORS.successDeep : COLORS.errorDeep,
                                                        fontWeight: 900,
                                                        border: `1px solid ${alpha(streakData.didTodaysExam ? COLORS.success : COLORS.error, 0.2)}`,
                                                    }}
                                                />
                                            </Box>

                                        </Box>

                                        <Box sx={{ flex: 1 }} />

                                        <Box
                                            sx={{
                                                p: 2.5,
                                                borderRadius: "16px",
                                                border: `1px solid ${alpha(COLORS.orange, 0.2)}`,
                                                bgcolor: alpha(COLORS.orangeLight, 0.65),
                                                minWidth: 0,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                                <LightbulbIcon sx={{ fontSize: 18, color: COLORS.orangeDeep, mr: 1 }} />
                                                <Typography variant="caption" sx={{ color: COLORS.orangeDeep, fontWeight: 900, letterSpacing: '0.5px' }}>
                                                    NHẮC NHỞ
                                                </Typography>
                                            </Box>

                                            <Stack spacing={1.5}>
                                                {(stats?.aiSuggestions || [
                                                    {
                                                        title: "Xem lại lại các bài thi Trượt",
                                                        // Sử dụng template string để truyền biến failedLessons vào câu thông báo
                                                        desc: `Bạn có ${failedLessons} bài thi trượt, hãy xem lại bài làm và các câu sai ở trang "Đánh giá học tập"`
                                                    },
                                                    {
                                                        title: "Mục tiêu điểm số",
                                                        desc: `Cần cải thiện từ ${avgScore} lên ≥ 80 điểm`
                                                    }
                                                ]).map((action, idx) => (
                                                    <Box key={idx} sx={{ display: 'flex', gap: 1.5 }}>
                                                        <Box sx={{
                                                            width: 20, height: 20, borderRadius: '50%',
                                                            bgcolor: COLORS.orangeDeep, color: '#fff',
                                                            display: 'grid', placeItems: 'center',
                                                            fontSize: '10px', fontWeight: 900, flexShrink: 0, mt: 0.2
                                                        }}>
                                                            {idx + 1}
                                                        </Box>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: 900, color: COLORS.text, lineHeight: 1.2 }}>
                                                                {action.title}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '11.5px', color: COLORS.subtext, fontWeight: 700, mt: 0.3, lineHeight: 1.4 }}>
                                                                {action.desc}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Stack>

                                            <Button
                                                variant="contained"
                                                fullWidth
                                                // Giả sử route của trang PracticePage là "/practice"
                                                onClick={() => navigate("/users/practice")}
                                                sx={{
                                                    mt: 2,
                                                    bgcolor: COLORS.orange,
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    textTransform: "none",
                                                    borderRadius: "10px",
                                                    fontSize: "13px",
                                                    "&:hover": {
                                                        bgcolor: COLORS.orangeDeep
                                                    }
                                                }}
                                            >
                                                Cải thiện điểm số
                                            </Button>
                                        </Box>
                                    </Box>
                                </CardShell>
                            </Box>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Fade>
    );
}