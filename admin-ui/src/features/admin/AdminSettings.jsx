// src/features/admin/AdminSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Switch,
    FormControlLabel,
    Button,
    Divider,
    Stack,
    InputAdornment,
    MenuItem,
    Collapse,
    Tabs,
    Tab,
    Chip,
    alpha,
} from "@mui/material";
import {
    Email as EmailIcon,
    Assessment as AssessmentIcon,
    School as SchoolIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import { adminSettingsApi } from "../../api/adminSettingsApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

const clampInt = (v, min, max) => {
    const n = Number(v);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
};

const isValidTimeHHmm = (s) => {
    if (!s || typeof s !== "string") return false;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim());
};

const formatYearMonthToMMYYYY = (ym) => {
    if (!ym || typeof ym !== "string") return "";
    const m = ym.trim().match(/^(\d{4})-(\d{2})$/);
    if (!m) return ym;
    const year = m[1];
    const month = m[2]; // đã là 2-digit
    return `${month}/${year}`; // "02/2026"
};
const TIME_PRESETS = [
    "00:00",
    "06:00",
    "08:00",
    "12:00",
    "18:00",
    "20:00",
    "22:00",
    "23:00",
    "23:30",
    "23:59",
];

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

const parseEmails = (csv) =>
    String(csv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const toEmailCsv = (emails) =>
    Array.from(
        new Set(
            (emails || [])
                .map((s) => String(s || "").trim().toLowerCase())
                .filter(Boolean)
        )
    ).join(",");

const isValidEmail = (s) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

const TASKS = {
    PRACTICE: 0,
    EMAIL: 1,
    REPORT: 2,
};

export default function AdminSettings() {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [activeTask, setActiveTask] = useState(TASKS.PRACTICE);

    const [form, setForm] = useState({
        passScore: "",
        minutesPerQuestion: "",
        retestCooldownMinutes: 30,

        emailNotificationsEnabled: false,
        adminEmails: "",

        monthlyReportEnabled: false,
        monthlyReportDayOfMonth: 0,
        monthlyReportTime: "23:59",
        monthlyReportTimeZone: DEFAULT_TIMEZONE,
    });

    // ===== Admin email chips =====
    const [emailInput, setEmailInput] = useState("");
    const [adminEmailList, setAdminEmailList] = useState([]);

    const [timeMode, setTimeMode] = useState("preset");
    const [timePresetValue, setTimePresetValue] = useState("23:59");

    const [updatedAt, setUpdatedAt] = useState(null);
    const [lastSentYearMonth, setLastSentYearMonth] = useState(null);

    // ===== Load settings =====
    useEffect(() => {
        let mounted = true;
        setLoading(true);

        adminSettingsApi
            .get()
            .then((data) => {
                if (!mounted) return;

                const monthlyTime = data.monthlyReportTime ?? "23:59";
                const isPreset = TIME_PRESETS.includes(monthlyTime);

                setForm({
                    passScore: data.passScore ?? "",
                    minutesPerQuestion: data.minutesPerQuestion ?? "",
                    retestCooldownMinutes: data.retestCooldownMinutes ?? 30,

                    emailNotificationsEnabled: !!data.emailNotificationsEnabled,
                    adminEmails: data.adminEmails ?? "",

                    monthlyReportEnabled: !!data.monthlyReportEnabled,
                    monthlyReportDayOfMonth: data.monthlyReportDayOfMonth ?? 0,
                    monthlyReportTime: monthlyTime,
                    monthlyReportTimeZone: DEFAULT_TIMEZONE,
                });

                // sync chips from csv
                setAdminEmailList(parseEmails(data.adminEmails));

                setTimeMode(isPreset ? "preset" : "custom");
                setTimePresetValue(isPreset ? monthlyTime : "23:59");

                setUpdatedAt(data.updatedAt ?? null);
                setLastSentYearMonth(data.monthlyReportLastSentYearMonth ?? null);
            })
            .catch(() => showToast("Không tải được System Settings", "error"))
            .finally(() => mounted && setLoading(false));

        return () => {
            mounted = false;
        };
    }, [showToast]);

    const handleChange = (field) => (e) => {
        const value =
            field === "emailNotificationsEnabled" || field === "monthlyReportEnabled"
                ? e.target.checked
                : e.target.value;

        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const displaySecondsPerQuestion = useMemo(() => {
        const m = Number(form.minutesPerQuestion);
        if (Number.isNaN(m) || !Number.isFinite(m)) return "";
        const s = Math.round(m * 60);
        return s <= 0 ? "" : String(s);
    }, [form.minutesPerQuestion]);

    const handleSecondsPerQuestionChange = (e) => {
        const raw = e.target.value;
        const n = Number(raw);
        if (raw === "") {
            setForm((prev) => ({ ...prev, minutesPerQuestion: "" }));
            return;
        }
        if (Number.isNaN(n)) return;
        const seconds = Math.max(1, Math.round(n));
        setForm((prev) => ({ ...prev, minutesPerQuestion: seconds / 60 }));
    };

    const addAdminEmail = () => {
        const email = String(emailInput || "").trim().toLowerCase();
        if (!email) return;
        if (!isValidEmail(email)) {
            showToast("Email không hợp lệ", "error");
            return;
        }

        const next = Array.from(new Set([...adminEmailList, email]));
        setAdminEmailList(next);
        setForm((prev) => ({ ...prev, adminEmails: toEmailCsv(next) }));
        setEmailInput("");
    };

    const removeAdminEmail = (email) => {
        const next = adminEmailList.filter((e) => e !== email);
        setAdminEmailList(next);
        setForm((prev) => ({ ...prev, adminEmails: toEmailCsv(next) }));
    };

    const handleTimePresetChange = (e) => {
        const v = e.target.value;

        if (v === "__CUSTOM__") {
            setTimeMode("custom");
            setForm((prev) => ({
                ...prev,
                monthlyReportTime: isValidTimeHHmm(prev.monthlyReportTime) ? prev.monthlyReportTime : "23:59",
            }));
            return;
        }

        setTimeMode("preset");
        setTimePresetValue(v);
        setForm((prev) => ({ ...prev, monthlyReportTime: v }));
    };

    const saveDisabledReason = useMemo(() => {
        const passScore = Number(form.passScore);
        const minutesPerQuestion = Number(form.minutesPerQuestion);
        const cooldown = Number(form.retestCooldownMinutes);

        if (activeTask === TASKS.PRACTICE) {
            if (Number.isNaN(passScore) || passScore < 0 || passScore > 100) return "Điểm đạt phải 0..100";
            if (Number.isNaN(minutesPerQuestion) || minutesPerQuestion <= 0) return "Thời gian / câu phải > 0";
            if (Number.isNaN(cooldown) || cooldown < 0 || cooldown > 1440) return "Cooldown phải 0..1440";
        }

        if (activeTask === TASKS.EMAIL) {
            return null;
        }

        if (activeTask === TASKS.REPORT) {
            if (form.monthlyReportEnabled) {
                const dom = Number(form.monthlyReportDayOfMonth);
                if (Number.isNaN(dom) || dom < 0 || dom > 31) return "Ngày gửi phải 0..31 (0 = ngày cuối tháng)";
                if (!isValidTimeHHmm(form.monthlyReportTime)) return "Giờ gửi phải đúng định dạng HH:mm";
                if (!String(form.monthlyReportTimeZone || "").trim()) return "Timezone không được rỗng";
            }
        }

        return null;
    }, [form, activeTask]);

    const handleSave = async () => {
        const reason = saveDisabledReason;
        if (reason) {
            showToast(reason, "error");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                passScore: clampInt(form.passScore, 0, 100),
                minutesPerQuestion: Number(form.minutesPerQuestion),
                retestCooldownMinutes: clampInt(form.retestCooldownMinutes, 0, 1440),

                emailNotificationsEnabled: !!form.emailNotificationsEnabled,
                adminEmails: toEmailCsv(adminEmailList),

                monthlyReportEnabled: !!form.monthlyReportEnabled,
                monthlyReportDayOfMonth: clampInt(form.monthlyReportDayOfMonth, 0, 31),
                monthlyReportTime: String(form.monthlyReportTime || "23:59").trim(),
                monthlyReportTimeZone: String(form.monthlyReportTimeZone || DEFAULT_TIMEZONE).trim(),
            };

            const updated = await adminSettingsApi.update(payload);

            setUpdatedAt(updated.updatedAt ?? null);
            setLastSentYearMonth(updated.monthlyReportLastSentYearMonth ?? lastSentYearMonth);

            const monthlyTime = updated.monthlyReportTime ?? form.monthlyReportTime ?? "23:59";
            const isPreset = TIME_PRESETS.includes(monthlyTime);
            setTimeMode(isPreset ? "preset" : "custom");
            setTimePresetValue(isPreset ? monthlyTime : timePresetValue);

            setForm((prev) => ({
                ...prev,
                passScore: updated.passScore ?? prev.passScore,
                minutesPerQuestion: updated.minutesPerQuestion ?? prev.minutesPerQuestion,
                retestCooldownMinutes: updated.retestCooldownMinutes ?? prev.retestCooldownMinutes,

                emailNotificationsEnabled: !!updated.emailNotificationsEnabled,
                adminEmails: updated.adminEmails ?? prev.adminEmails,

                monthlyReportEnabled: !!updated.monthlyReportEnabled,
                monthlyReportDayOfMonth: updated.monthlyReportDayOfMonth ?? prev.monthlyReportDayOfMonth,
                monthlyReportTime: monthlyTime,
                monthlyReportTimeZone: updated.monthlyReportTimeZone ?? prev.monthlyReportTimeZone,
            }));

            showToast("Lưu cấu hình thành công!", "success");
        } catch {
            showToast("Không lưu được cấu hình", "error");
        } finally {
            setSaving(false);
        }
    };

    // ===== RENDER SECTIONS =====
    const sectionPaperSx = {
        p: 2,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
            theme.palette.mode === "dark"
                ? alpha(theme.palette.background.paper, 0.6)
                : theme.palette.background.paper,
        boxShadow: (theme) =>
            theme.palette.mode === "dark"
                ? "0 4px 20px rgba(0,0,0,0.3)"
                : "0 2px 12px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        "&:hover": {
            borderColor: "primary.main",
            boxShadow: (theme) =>
                theme.palette.mode === "dark"
                    ? "0 6px 24px rgba(0,0,0,0.4)"
                    : "0 4px 16px rgba(0,0,0,0.12)",
        },
    };

    const renderPracticeTask = () => (
        <Paper sx={sectionPaperSx}>
            <Stack spacing={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: "primary.main",
                            }}
                        >
                            <SchoolIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Cấu hình bài thi
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Thiết lập điểm số, thời gian và quy tắc làm lại
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <TextField
                    label="Điểm đạt (%)"
                    type="number"
                    value={form.passScore}
                    onChange={handleChange("passScore")}
                    fullWidth
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    helperText="Học viên cần đạt ít nhất số điểm này để đạt đủ điểm yêu cầu."
                    InputProps={{
                        startAdornment: <InputAdornment position="start">🎯</InputAdornment>,
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                        },
                    }}
                />

                <TextField
                    label="Thời gian / câu (giây)"
                    type="number"
                    value={displaySecondsPerQuestion}
                    onChange={handleSecondsPerQuestionChange}
                    fullWidth
                    inputProps={{ min: 1, step: 1 }}
                    helperText="Mỗi câu hỏi sẽ có thời gian làm tối đa theo giây."
                    InputProps={{
                        startAdornment: <InputAdornment position="start">⏱️</InputAdornment>,
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                        },
                    }}
                />

                <TextField
                    label="Cooldown làm lại (phút)"
                    type="number"
                    value={form.retestCooldownMinutes}
                    onChange={handleChange("retestCooldownMinutes")}
                    fullWidth
                    inputProps={{ min: 0, max: 1440, step: 1 }}
                    helperText="Sau khi trượt, học viên phải chờ đủ thời gian này mới được làm lại."
                    InputProps={{
                        startAdornment: <InputAdornment position="start">🔄</InputAdornment>,
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                        },
                    }}
                />
            </Stack>
        </Paper>
    );

    const renderEmailTask = () => (
        <Paper sx={sectionPaperSx}>
            <Stack spacing={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                color: "info.main",
                            }}
                        >
                            <EmailIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Cấu hình email
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Quản lý danh sách email và thông báo
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <Stack spacing={1.5}
                       sx={{
                           p: 2,
                           borderRadius: 2,
                           border: `1px solid ${alpha("#000", 0.08)}`,
                           bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                       }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", sm: "flex-start" }} // ✅ canh theo top input
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <TextField
                                label="Thêm email quản trị"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addAdminEmail();
                                    }
                                }}
                                fullWidth
                                placeholder="admin@email.com"
                                // ✅ bỏ helperText để không đội chiều cao
                                helperText={null}
                                sx={{
                                    "& .MuiOutlinedInput-root": { borderRadius: 2 },
                                }}
                            />
                            {/* ✅ helperText tách riêng */}
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, ml: 0.5 }}>
                                Nhấn Enter hoặc bấm Thêm.
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            onClick={addAdminEmail}
                            sx={{
                                height: 52,
                                borderRadius: 2,
                                px: 3,
                                whiteSpace: "nowrap",
                                // ✅ trên desktop canh đúng với input (để không dính helper)
                                mt: { xs: 0, sm: "0px" },
                                alignSelf: { xs: "stretch", sm: "flex-start" },
                            }}
                        >
                            Thêm
                        </Button>
                    </Stack>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Danh sách email sẽ nhận thông báo (di chuột lên từng email để hiện nút xoá).
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {adminEmailList.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có email nào.
                                </Typography>
                            ) : (
                                adminEmailList.map((email) => (
                                    <Chip
                                        key={email}
                                        label={email}
                                        onDelete={() => removeAdminEmail(email)}
                                        deleteIcon={<span style={{ fontSize: 16, lineHeight: 1 }}>×</span>}
                                        sx={{
                                            borderRadius: 2,
                                            "& .MuiChip-deleteIcon": {
                                                opacity: 0,
                                                transition: "opacity 120ms ease",
                                            },
                                            "&:hover .MuiChip-deleteIcon": {
                                                opacity: 1,
                                            },
                                        }}
                                    />
                                ))
                            )}
                        </Stack>
                    </Box>
                </Stack>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 2,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                    }}
                >
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Thông báo email
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Khi bật, bạn sẽ nhận: báo cáo tháng, học viên mới đăng ký và các thông báo hệ thống quan trọng.
                        </Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.emailNotificationsEnabled}
                                onChange={handleChange("emailNotificationsEnabled")}
                                color="primary"
                            />
                        }
                        label=""
                        sx={{ m: 0 }}
                    />
                </Box>

                {form.emailNotificationsEnabled && (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                            border: "1px solid",
                            borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircleIcon sx={{ color: "success.main", fontSize: 20 }} />
                            <Typography variant="body2" color="success.main" fontWeight={500}>
                                Thông báo email đang được bật
                            </Typography>
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Paper>
    );

    const renderReportTask = () => (
        <Paper sx={sectionPaperSx}>
            <Stack spacing={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                /* height: 40, */
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                color: "success.main",
                            }}
                        >
                            <AssessmentIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Báo cáo tháng tự động
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Lên lịch gửi báo cáo định kỳ
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 2,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                    }}
                >
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Gửi báo cáo tự động
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Kích hoạt để tự động gửi báo cáo hàng tháng
                        </Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.monthlyReportEnabled}
                                onChange={handleChange("monthlyReportEnabled")}
                                color="primary"
                            />
                        }
                        label=""
                        sx={{ m: 0 }}
                    />
                </Box>

                <Collapse in={form.monthlyReportEnabled}>
                    <Stack spacing={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                select
                                label="Ngày gửi"
                                value={form.monthlyReportDayOfMonth}
                                onChange={handleChange("monthlyReportDayOfMonth")}
                                fullWidth
                                helperText="0 = ngày cuối tháng (khuyến nghị)"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">📅</InputAdornment>,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                    },
                                }}
                            >
                                <MenuItem value={0}>Ngày cuối tháng (0)</MenuItem>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <MenuItem key={d} value={d}>
                                        Ngày {d}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Giờ gửi"
                                value={timeMode === "preset" ? timePresetValue : "__CUSTOM__"}
                                onChange={handleTimePresetChange}
                                fullWidth
                                helperText="Có thể tùy chỉnh"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">🕐</InputAdornment>,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                    },
                                }}
                            >
                                {TIME_PRESETS.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                                <Divider sx={{ my: 1 }} />
                                <MenuItem value="__CUSTOM__">✏️ Tùy chỉnh giờ…</MenuItem>
                            </TextField>
                        </Stack>

                        <Collapse in={timeMode === "custom"} unmountOnExit>
                            <TextField
                                label="Giờ gửi (tùy chỉnh)"
                                type="time"
                                value={form.monthlyReportTime}
                                onChange={handleChange("monthlyReportTime")}
                                fullWidth
                                inputProps={{ step: 60 }}
                                helperText="Định dạng HH:mm"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">⏰</InputAdornment>,
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                        </Collapse>

                        <TextField
                            label="Timezone"
                            value={DEFAULT_TIMEZONE}
                            fullWidth
                            helperText="Múi giờ hệ thống cố định"
                            disabled
                            InputProps={{
                                startAdornment: <InputAdornment position="start">🌏</InputAdornment>,
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                },
                            }}
                        />

                        {lastSentYearMonth && (
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                    border: "1px solid",
                                    borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
                                }}
                            >
                                <Typography variant="body2" color="info.main">
                                    📊 Đã gửi gần nhất: {formatYearMonthToMMYYYY(lastSentYearMonth)}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    );

    return (
        <>
            <GlobalLoading open={loading || saving} message={saving ? "Đang lưu cấu hình..." : "Đang tải cấu hình..."} />

            <Box
                sx={{
                    maxWidth: 1100,
                    mx: "auto",
                    ml: { xs: "auto", md: 2 },
                    mr: { xs: "auto", md: "auto" },
                    px: { xs: 1.5, sm: 2 },
                    py: 2,
                }}
            >
                {/* Header */}
                <Box mb={2}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>
                                Cài đặt hệ thống
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Quản lý cấu hình hệ thống
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Tabs */}
                <Paper
                    sx={{
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        mb: 2,
                        overflow: "hidden",
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 4px 20px rgba(0,0,0,0.3)"
                                : "0 2px 12px rgba(0,0,0,0.08)",
                    }}
                >
                    <Tabs
                        value={activeTask}
                        onChange={(_, v) => setActiveTask(v)}
                        variant="fullWidth"
                        sx={{
                            "& .MuiTab-root": {
                                minHeight: 56,
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                },
                            },
                            "& .Mui-selected": {
                                color: "primary.main",
                            },
                            "& .MuiTabs-indicator": {
                                height: 3,
                                borderRadius: "3px 3px 0 0",
                            },
                        }}
                    >
                        <Tab
                            icon={<SchoolIcon />}
                            iconPosition="start"
                            label="Cấu hình bài thi"
                            value={TASKS.PRACTICE}
                        />
                        <Tab icon={<EmailIcon />} iconPosition="start" label="Email" value={TASKS.EMAIL} />
                        <Tab
                            icon={<AssessmentIcon />}
                            iconPosition="start"
                            label="Báo cáo tháng"
                            value={TASKS.REPORT}
                        />
                    </Tabs>
                </Paper>

                {/* Content */}
                <Box mb={2}>
                    {activeTask === TASKS.PRACTICE && renderPracticeTask()}
                    {activeTask === TASKS.EMAIL && renderEmailTask()}
                    {activeTask === TASKS.REPORT && renderReportTask()}
                </Box>

                {/* Footer */}
                <Paper
                    sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        background: (theme) =>
                            theme.palette.mode === "dark"
                                ? alpha(theme.palette.background.paper, 0.6)
                                : theme.palette.background.paper,
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 4px 20px rgba(0,0,0,0.3)"
                                : "0 2px 12px rgba(0,0,0,0.08)",
                    }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        alignItems={{ md: "center" }}
                        justifyContent="space-between"
                    >
                        <Box>
                            {updatedAt ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Cập nhật lần cuối:{" "}
                                        <strong>{new Date(updatedAt).toLocaleString("vi-VN")}</strong>
                                    </Typography>
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có cập nhật
                                </Typography>
                            )}

                            {saveDisabledReason && (
                                <Chip
                                    label={saveDisabledReason}
                                    color="error"
                                    size="small"
                                    sx={{ mt: 1, fontWeight: 500 }}
                                />
                            )}
                        </Box>

                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSave}
                            disabled={!!saveDisabledReason || saving}
                            startIcon={<CheckCircleIcon />}
                            sx={{
                                minWidth: 160,
                                height: 44,
                                borderRadius: 2,
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                textTransform: "none",
                                boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                                "&:hover": {
                                    boxShadow: (theme) => `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                                    transform: "translateY(-2px)",
                                },
                                transition: "all 0.3s ease",
                            }}
                        >
                            Lưu cấu hình
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}