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
    IconButton,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import {
    Email as EmailIcon,
    Assessment as AssessmentIcon,
    School as SchoolIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    SmartToyRounded as SmartToyRoundedIcon,
    VisibilityRounded as VisibilityRoundedIcon,
    VisibilityOffRounded as VisibilityOffRoundedIcon,
    KeyRounded as KeyRoundedIcon,
    MemoryRounded as MemoryRoundedIcon,
    ThermostatRounded as ThermostatRoundedIcon,
} from "@mui/icons-material";

import { adminSettingsApi } from "../../api/adminSettingsApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";
import AppConfirm from "../../components/common/AppConfirm";

const clampInt = (v, min, max) => {
    const n = Number(v);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
};

const clampFloat = (v, min, max, fallback = min) => {
    const n = Number(v);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
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
    const month = m[2];
    return `${month}/${year}`;
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
    MODEL_AI: 3,
};

const AI_PROVIDER_OPTIONS = [
    { value: "GEMINI", label: "Gemini" },
    { value: "OPENROUTER", label: "OpenRouter" },
];

const AI_MODELS = {
    GEMINI: [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
    ],
    OPENROUTER: [
        "deepseek/deepseek-chat",
        "deepseek/deepseek-r1",
        "deepseek/deepseek-r1:free",
    ],
};

const DEFAULT_MODEL_BY_PROVIDER = {
    GEMINI: "gemini-2.5-flash",
    OPENROUTER: "deepseek/deepseek-chat",
};

const normalizeProvider = (provider) => {
    const p = String(provider || "").trim().toUpperCase();
    return p === "OPENROUTER" ? "OPENROUTER" : "GEMINI";
};

const getDefaultModelByProvider = (provider) =>
    DEFAULT_MODEL_BY_PROVIDER[normalizeProvider(provider)] || "gemini-2.5-flash";

export default function AdminSettings() {
    const { showToast } = useToast();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [activeTask, setActiveTask] = useState(TASKS.PRACTICE);

    const [form, setForm] = useState({
        passScore: "",
        minutesPerQuestion: "",
        retestCooldownMinutes: 30,

        emailNotificationsEnabled: false,
        adminEmails: "",

        mcqQuestionCount: 10,
        essayQuestionCount: 0,

        monthlyReportEnabled: false,
        monthlyReportDayOfMonth: 0,
        monthlyReportTime: "23:59",
        monthlyReportTimeZone: DEFAULT_TIMEZONE,
    });

    const [emailInput, setEmailInput] = useState("");
    const [adminEmailList, setAdminEmailList] = useState([]);

    const [timeMode, setTimeMode] = useState("preset");
    const [timePresetValue, setTimePresetValue] = useState("23:59");

    const [updatedAt, setUpdatedAt] = useState(null);
    const [lastSentYearMonth, setLastSentYearMonth] = useState(null);

    const [aiLoading, setAiLoading] = useState(false);
    const [aiUpdatedAt, setAiUpdatedAt] = useState(null);
    const [aiKeyMasked, setAiKeyMasked] = useState(null);

    const [aiForm, setAiForm] = useState({
        aiProvider: "GEMINI",
        aiModel: "gemini-2.5-flash",
        aiTemperature: 0.0,
        aiEnabled: true,
        aiApiKey: "",
    });

    const [showAiKey, setShowAiKey] = useState(false);

    const [removeKeyOpen, setRemoveKeyOpen] = useState(false);
    const [deletingAiKey, setDeletingAiKey] = useState(false);

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

                    mcqQuestionCount: data.mcqQuestionCount ?? 10,
                    essayQuestionCount: data.essayQuestionCount ?? 0,

                    monthlyReportEnabled: !!data.monthlyReportEnabled,
                    monthlyReportDayOfMonth: data.monthlyReportDayOfMonth ?? 0,
                    monthlyReportTime: monthlyTime,
                    monthlyReportTimeZone: DEFAULT_TIMEZONE,
                });

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

    useEffect(() => {
        let mounted = true;
        if (activeTask !== TASKS.MODEL_AI) return;

        setAiLoading(true);
        adminSettingsApi
            .getAi()
            .then((data) => {
                if (!mounted) return;

                const provider = normalizeProvider(data.aiProvider);
                const model = String(data.aiModel || "").trim() || getDefaultModelByProvider(provider);

                setAiForm({
                    aiProvider: provider,
                    aiModel: model,
                    aiTemperature: clampFloat(data.aiTemperature, 0, 1, 0),
                    aiEnabled: data.aiEnabled !== false,
                    aiApiKey: "",
                });

                setAiKeyMasked(data.aiApiKeyMasked ?? null);
                setAiUpdatedAt(data.updatedAt ?? null);
            })
            .catch(() => showToast("Không tải được Model AI Settings", "error"))
            .finally(() => mounted && setAiLoading(false));

        return () => {
            mounted = false;
        };
    }, [activeTask, showToast]);

    const handleChange = (field) => (e) => {
        const value =
            field === "emailNotificationsEnabled" || field === "monthlyReportEnabled"
                ? e.target.checked
                : e.target.value;

        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAiChange = (field) => (e) => {
        const value = field === "aiEnabled" ? e.target.checked : e.target.value;

        if (field === "aiProvider") {
            const nextProvider = normalizeProvider(value);
            setAiForm((prev) => {
                const currentModel = String(prev.aiModel || "").trim();
                const availableModels = AI_MODELS[nextProvider] || [];
                const nextModel = availableModels.includes(currentModel)
                    ? currentModel
                    : getDefaultModelByProvider(nextProvider);

                return {
                    ...prev,
                    aiProvider: nextProvider,
                    aiModel: nextModel,
                };
            });
            return;
        }

        if (field === "aiTemperature") {
            setAiForm((prev) => ({
                ...prev,
                aiTemperature: value,
            }));
            return;
        }

        setAiForm((prev) => ({ ...prev, [field]: value }));
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
                monthlyReportTime: isValidTimeHHmm(prev.monthlyReportTime)
                    ? prev.monthlyReportTime
                    : "23:59",
            }));
            return;
        }

        setTimeMode("preset");
        setTimePresetValue(v);
        setForm((prev) => ({ ...prev, monthlyReportTime: v }));
    };

    const questionDistributionSummary = useMemo(() => {
        const mcq = clampInt(form.mcqQuestionCount, 0, 200);
        const essay = clampInt(form.essayQuestionCount, 0, 200);
        const total = mcq + essay;

        const mpq = Number(form.minutesPerQuestion);
        const estMinutes =
            Number.isFinite(mpq) && mpq > 0 && total > 0 ? Math.ceil(total * mpq) : null;

        return { mcq, essay, total, estMinutes };
    }, [form.essayQuestionCount, form.mcqQuestionCount, form.minutesPerQuestion]);

    const currentAiModelOptions = useMemo(() => {
        return AI_MODELS[normalizeProvider(aiForm.aiProvider)] || [];
    }, [aiForm.aiProvider]);

    const providerDescription = useMemo(() => {
        return normalizeProvider(aiForm.aiProvider) === "OPENROUTER"
            ? "Dùng OpenRouter để gọi model như DeepSeek."
            : "Dùng Gemini trực tiếp từ Google AI.";
    }, [aiForm.aiProvider]);

    const saveDisabledReason = useMemo(() => {
        const passScore = Number(form.passScore);
        const minutesPerQuestion = Number(form.minutesPerQuestion);
        const cooldown = Number(form.retestCooldownMinutes);

        const mcq = Number(form.mcqQuestionCount);
        const essay = Number(form.essayQuestionCount);

        if (activeTask === TASKS.PRACTICE) {
            if (Number.isNaN(passScore) || passScore < 0 || passScore > 100) return "Điểm đạt phải 0-100";
            if (Number.isNaN(minutesPerQuestion) || minutesPerQuestion <= 0) return "Thời gian / câu phải > 0";
            if (Number.isNaN(cooldown) || cooldown < 0 || cooldown > 1440) return "Cooldown phải 0-1440";

            if (Number.isNaN(mcq) || mcq < 0 || mcq > 20) return "Số câu MCQ phải 0-20";
            if (Number.isNaN(essay) || essay < 0 || essay > 20) return "Số câu tự luận phải 0-20";
            if (mcq + essay <= 0) return "Tổng số câu (MCQ + Tự luận) phải > 0";
        }

        if (activeTask === TASKS.EMAIL) return null;

        if (activeTask === TASKS.REPORT) {
            if (form.monthlyReportEnabled) {
                const dom = Number(form.monthlyReportDayOfMonth);
                if (Number.isNaN(dom) || dom < 0 || dom > 31) return "Ngày gửi phải 0-31 (0 = ngày cuối tháng)";
                if (!isValidTimeHHmm(form.monthlyReportTime)) return "Giờ gửi phải đúng định dạng HH:mm";
                if (!String(form.monthlyReportTimeZone || "").trim()) return "Timezone không được rỗng";
            }
        }

        if (activeTask === TASKS.MODEL_AI) {
            const provider = normalizeProvider(aiForm.aiProvider);
            const model = String(aiForm.aiModel || "").trim();
            const temp = Number(aiForm.aiTemperature);

            if (!provider) return "Provider không được rỗng";
            if (!["GEMINI", "OPENROUTER"].includes(provider)) {
                return "Provider chỉ hỗ trợ GEMINI hoặc OPENROUTER";
            }
            if (!model) return "Model không được rỗng";
            if (Number.isNaN(temp) || temp < 0 || temp > 1) {
                return "Temperature phải trong khoảng 0.0 - 1.0";
            }
            return null;
        }

        return null;
    }, [form, activeTask, aiForm]);

    const handleSave = async () => {
        const reason = saveDisabledReason;
        if (reason) {
            showToast(reason, "error");
            return;
        }

        setSaving(true);
        try {
            if (activeTask !== TASKS.MODEL_AI) {
                const payload = {
                    passScore: clampInt(form.passScore, 0, 100),
                    minutesPerQuestion: Number(form.minutesPerQuestion),
                    retestCooldownMinutes: clampInt(form.retestCooldownMinutes, 0, 1440),

                    emailNotificationsEnabled: !!form.emailNotificationsEnabled,
                    adminEmails: toEmailCsv(adminEmailList),

                    mcqQuestionCount: clampInt(form.mcqQuestionCount, 0, 200),
                    essayQuestionCount: clampInt(form.essayQuestionCount, 0, 200),

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

                    mcqQuestionCount: updated.mcqQuestionCount ?? prev.mcqQuestionCount,
                    essayQuestionCount: updated.essayQuestionCount ?? prev.essayQuestionCount,

                    monthlyReportEnabled: !!updated.monthlyReportEnabled,
                    monthlyReportDayOfMonth: updated.monthlyReportDayOfMonth ?? prev.monthlyReportDayOfMonth,
                    monthlyReportTime: monthlyTime,
                    monthlyReportTimeZone: updated.monthlyReportTimeZone ?? prev.monthlyReportTimeZone,
                }));

                setAdminEmailList(parseEmails(updated.adminEmails ?? toEmailCsv(adminEmailList)));

                showToast("Lưu cấu hình thành công!", "success");
                return;
            }

            const provider = normalizeProvider(aiForm.aiProvider);

            const aiPayload = {
                aiProvider: provider,
                aiModel: String(aiForm.aiModel || "").trim(),
                aiTemperature: clampFloat(aiForm.aiTemperature, 0, 1, 0),
                aiEnabled: !!aiForm.aiEnabled,
                aiApiKey: String(aiForm.aiApiKey || "").trim(),
            };

            const updatedAi = await adminSettingsApi.updateAi(aiPayload);
            const nextProvider = normalizeProvider(updatedAi.aiProvider ?? provider);

            setAiUpdatedAt(updatedAi.updatedAt ?? null);
            setAiKeyMasked(updatedAi.aiApiKeyMasked ?? aiKeyMasked);

            setAiForm((prev) => ({
                ...prev,
                aiProvider: nextProvider,
                aiModel: String(updatedAi.aiModel || "").trim() || getDefaultModelByProvider(nextProvider),
                aiTemperature: clampFloat(updatedAi.aiTemperature, 0, 1, prev.aiTemperature),
                aiEnabled: updatedAi.aiEnabled !== false,
                aiApiKey: "",
            }));

            showToast("Lưu Model AI thành công!", "success");
        } catch (e) {
            console.error(e);
            showToast("Không lưu được cấu hình", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAiKey = async () => {
        if (!aiKeyMasked) return;

        setDeletingAiKey(true);
        try {
            const updated = await adminSettingsApi.deleteAiKey();

            setAiUpdatedAt(updated?.updatedAt ?? new Date().toISOString());
            setAiKeyMasked(updated?.aiApiKeyMasked ?? null);

            setAiForm((prev) => ({
                ...prev,
                aiApiKey: "",
            }));

            setShowAiKey(false);

            showToast("Đã xoá API Key thành công!", "success");
        } catch (e) {
            console.error(e);
            showToast("Không xoá được API Key", "error");
        } finally {
            setDeletingAiKey(false);
            setRemoveKeyOpen(false);
        }
    };

    const sectionPaperSx = {
        p: { xs: 1.5, sm: 2 },
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
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                flex: "0 0 auto",
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
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={700} noWrap>
                                Cấu hình bài thi
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Thiết lập điểm số, thời gian và số lượng câu MCQ/Tự luận
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                        label="Số câu trắc nghiệm (MCQ)"
                        type="number"
                        value={form.mcqQuestionCount}
                        onChange={handleChange("mcqQuestionCount")}
                        fullWidth
                        inputProps={{ min: 0, max: 20, step: 1 }}
                        helperText="0-20"
                        InputProps={{
                            startAdornment: <InputAdornment position="start">🧠</InputAdornment>,
                        }}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />

                    <TextField
                        label="Số câu tự luận (Essay)"
                        type="number"
                        value={form.essayQuestionCount}
                        onChange={handleChange("essayQuestionCount")}
                        fullWidth
                        inputProps={{ min: 0, max: 20, step: 1 }}
                        helperText="0-20"
                        InputProps={{
                            startAdornment: <InputAdornment position="start">✍️</InputAdornment>,
                        }}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                </Stack>

                <Box
                    sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        Tổng số câu hiện tại:{" "}
                        <span style={{ color: theme.palette.primary.main }}>
                            {questionDistributionSummary.total}
                        </span>{" "}
                        (MCQ {questionDistributionSummary.mcq} + Tự luận {questionDistributionSummary.essay})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {questionDistributionSummary.estMinutes != null
                            ? `Ước tính thời gian làm bài: ~${questionDistributionSummary.estMinutes} phút (theo thời gian/câu).`
                            : "Nhập thời gian/câu hợp lệ để xem ước tính thời gian làm bài."}
                    </Typography>
                </Box>

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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
            </Stack>
        </Paper>
    );

    const renderEmailTask = () => (
        <Paper sx={sectionPaperSx}>
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                flex: "0 0 auto",
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
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={700} noWrap>
                                Cấu hình email
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Quản lý danh sách email và thông báo
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <Stack
                    spacing={1.5}
                    sx={{
                        p: { xs: 1.25, sm: 2 },
                        borderRadius: 2,
                        border: `1px solid ${alpha("#000", 0.08)}`,
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                        alignItems={{ xs: "stretch", sm: "flex-start" }}
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
                                helperText={null}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5, ml: 0.5 }}
                            >
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
                                            "&:hover .MuiChip-deleteIcon": { opacity: 1 },
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
                        gap: 2,
                        p: { xs: 1.25, sm: 2 },
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
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
                            p: { xs: 1.25, sm: 2 },
                            borderRadius: 2,
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                            border: "1px solid",
                            borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircleIcon sx={{ color: "success.main", fontSize: 20 }} />
                            <Typography variant="body2" color="success.main" fontWeight={600}>
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
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                flex: "0 0 auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                color: "success.main",
                            }}
                        >
                            <AssessmentIcon />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={{ xs: 0.75, sm: 2 }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={700} noWrap>
                                        Báo cáo tháng tự động
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Lên lịch gửi báo cáo định kỳ theo ngày và giờ đã cấu hình.
                                    </Typography>
                                </Box>

                                <Chip
                                    size="small"
                                    label={form.monthlyReportEnabled ? "REPORT: Bật" : "REPORT: Tắt"}
                                    color={form.monthlyReportEnabled ? "success" : "default"}
                                    sx={{ fontWeight: 800, alignSelf: { xs: "flex-start", sm: "center" } }}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: { xs: 1, sm: 1.25 },
                    }}
                >
                    <Box
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        }}
                    >
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Trạng thái báo cáo
                                </Typography>
                                <Typography variant="h6" fontWeight={900} sx={{ mt: 0.25 }}>
                                    {form.monthlyReportEnabled ? "Đang bật" : "Đang tắt"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Bật để hệ thống tự động gửi báo cáo hàng tháng cho admin.
                                </Typography>
                            </Box>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={!!form.monthlyReportEnabled}
                                        onChange={handleChange("monthlyReportEnabled")}
                                        color="primary"
                                    />
                                }
                                label=""
                                sx={{ m: 0 }}
                            />
                        </Stack>
                    </Box>

                    <Box
                        sx={{
                            p: { xs: 1.5, sm: 2 },
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: (theme) => alpha(theme.palette.info.main, 0.18),
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
                        }}
                    >
                        <Stack spacing={0.75}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ScheduleIcon fontSize="small" color="info" />
                                <Typography variant="subtitle2" color="text.secondary">
                                    Thông tin hệ thống
                                </Typography>
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                                Timezone
                            </Typography>
                            <Typography variant="h6" fontWeight={900} sx={{ mt: -0.25 }}>
                                {DEFAULT_TIMEZONE}
                            </Typography>

                            <Divider sx={{ my: 0.75, opacity: 0.6 }} />

                            <Typography variant="body2" color="text.secondary">
                                Đã gửi gần nhất
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800}>
                                {lastSentYearMonth ? formatYearMonthToMMYYYY(lastSentYearMonth) : "Chưa có"}
                            </Typography>
                        </Stack>
                    </Box>
                </Box>

                <Box
                    sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? alpha(theme.palette.background.paper, 0.55)
                                : alpha(theme.palette.background.paper, 0.85),
                    }}
                >
                    <Stack spacing={1.5}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <AssessmentIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle1" fontWeight={900}>
                                    Lịch gửi báo cáo
                                </Typography>
                            </Stack>

                            {!form.monthlyReportEnabled && (
                                <Chip
                                    size="small"
                                    label="Bật báo cáo để cấu hình lịch"
                                    variant="outlined"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                            Chọn ngày trong tháng và giờ gửi. Khuyến nghị dùng “ngày cuối tháng (0)” để tránh lỗi tháng thiếu ngày.
                        </Typography>

                        <Collapse in={form.monthlyReportEnabled}>
                            <Stack spacing={2} sx={{ mt: 0.5 }}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                        select
                                        label="Ngày gửi"
                                        value={form.monthlyReportDayOfMonth}
                                        onChange={handleChange("monthlyReportDayOfMonth")}
                                        fullWidth
                                        helperText="0 = ngày cuối tháng (khuyến nghị)"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    📅
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                                        helperText="Chọn preset hoặc chuyển sang tùy chỉnh"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    🕐
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    ⏰
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    />
                                </Collapse>

                                <TextField
                                    label="Timezone"
                                    value={DEFAULT_TIMEZONE}
                                    fullWidth
                                    helperText="Múi giờ hệ thống (read-only)"
                                    disabled
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                🌏
                                            </InputAdornment>
                                        ),
                                        readOnly: true,
                                    }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />

                                <Box
                                    sx={{
                                        p: 1.25,
                                        borderRadius: 2,
                                        border: "1px solid",
                                        borderColor: (theme) => alpha(theme.palette.success.main, 0.22),
                                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 900, color: "success.main" }}>
                                        Lịch hiện tại:{" "}
                                        {Number(form.monthlyReportDayOfMonth) === 0
                                            ? "Ngày cuối tháng"
                                            : `Ngày ${Number(form.monthlyReportDayOfMonth)}`}{" "}
                                        · {String(form.monthlyReportTime || "").trim() || "23:59"} · {DEFAULT_TIMEZONE}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        (Thời gian hiển thị theo timezone hệ thống)
                                    </Typography>
                                </Box>
                            </Stack>
                        </Collapse>
                    </Stack>
                </Box>
            </Stack>
        </Paper>
    );

    const renderModelAiTask = () => (
        <Paper sx={sectionPaperSx}>
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                flex: "0 0 auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                                color: "warning.main",
                            }}
                        >
                            <SmartToyRoundedIcon />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={{ xs: 0.75, sm: 2 }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={700} noWrap>
                                        Model AI
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Quản lý provider, model, temperature và API Key.
                                    </Typography>
                                </Box>

                                <Chip
                                    size="small"
                                    label={aiForm.aiEnabled ? "AI: Bật" : "AI: Tắt"}
                                    color={aiForm.aiEnabled ? "success" : "default"}
                                    sx={{ fontWeight: 800, alignSelf: { xs: "flex-start", sm: "center" } }}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                {aiLoading ? (
                    <Box sx={{ py: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Đang tải cấu hình AI...
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                gap: { xs: 1, sm: 1.25 },
                            }}
                        >
                            <Box
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                }}
                            >
                                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Trạng thái AI
                                        </Typography>
                                        <Typography variant="h6" fontWeight={900} sx={{ mt: 0.25 }}>
                                            {aiForm.aiEnabled ? "Đang bật" : "Đang tắt"}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Tắt để khoá toàn bộ tính năng AI trong hệ thống.
                                        </Typography>
                                    </Box>

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={!!aiForm.aiEnabled}
                                                onChange={handleAiChange("aiEnabled")}
                                                color="primary"
                                            />
                                        }
                                        label=""
                                        sx={{ m: 0 }}
                                    />
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: (theme) => alpha(theme.palette.info.main, 0.18),
                                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <MemoryRoundedIcon fontSize="small" color="info" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Provider hiện tại
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={900}>
                                    {normalizeProvider(aiForm.aiProvider)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {providerDescription}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: (theme) => alpha(theme.palette.warning.main, 0.18),
                                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.07),
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <SmartToyRoundedIcon fontSize="small" sx={{ color: "warning.main" }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Mô hình
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={900}>
                                    {aiForm.aiModel || "-"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Mô hình AI đang được sử dụng để tạo nội dung.
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: (theme) => alpha(theme.palette.success.main, 0.18),
                                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.06),
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <ThermostatRoundedIcon fontSize="small" sx={{ color: "success.main" }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Temperature
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight={900}>
                                    {String(aiForm.aiTemperature)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Dùng giá trị thấp để output ổn định hơn, giá trị cao để đa dạng hơn.
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                p: { xs: 1.5, sm: 2 },
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? alpha(theme.palette.background.paper, 0.55)
                                        : alpha(theme.palette.background.paper, 0.85),
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                        select
                                        label="AI Provider"
                                        value={aiForm.aiProvider}
                                        onChange={handleAiChange("aiProvider")}
                                        fullWidth
                                        helperText="Chọn provider AI"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MemoryRoundedIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    >
                                        {AI_PROVIDER_OPTIONS.map((item) => (
                                            <MenuItem key={item.value} value={item.value}>
                                                {item.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        label="Model"
                                        value={aiForm.aiModel}
                                        onChange={handleAiChange("aiModel")}
                                        fullWidth
                                        helperText="Chọn model mặc định cho provider hiện tại"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SmartToyRoundedIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    >
                                        {currentAiModelOptions.map((model) => (
                                            <MenuItem key={model} value={model}>
                                                {model}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>

                                <TextField
                                    label="Temperature"
                                    type="number"
                                    value={aiForm.aiTemperature}
                                    onChange={handleAiChange("aiTemperature")}
                                    fullWidth
                                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                                    helperText="Giá trị từ 0.0 đến 1.0"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <ThermostatRoundedIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />
                            </Stack>
                        </Box>

                        <Box
                            sx={{
                                p: { xs: 1.5, sm: 2 },
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? alpha(theme.palette.background.paper, 0.55)
                                        : alpha(theme.palette.background.paper, 0.85),
                            }}
                        >
                            <Stack spacing={1.25}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    justifyContent="space-between"
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <KeyRoundedIcon fontSize="small" color="primary" />
                                        <Typography variant="subtitle1" fontWeight={900}>
                                            API Key
                                        </Typography>
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ width: { xs: "100%", sm: "auto" } }}
                                    >
                                        {aiKeyMasked ? (
                                            <Chip
                                                size="small"
                                                label={`Đang có key: ${aiKeyMasked}`}
                                                color="success"
                                                variant="outlined"
                                                sx={{ fontWeight: 800 }}
                                            />
                                        ) : (
                                            <Chip
                                                size="small"
                                                label="Chưa có key"
                                                color="warning"
                                                variant="outlined"
                                                sx={{ fontWeight: 800 }}
                                            />
                                        )}

                                        {aiKeyMasked && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                disabled={deletingAiKey}
                                                onClick={() => setRemoveKeyOpen(true)}
                                                sx={{
                                                    borderRadius: 2,
                                                    fontWeight: 900,
                                                    textTransform: "none",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {deletingAiKey ? "Đang xoá..." : "Xoá key"}
                                            </Button>
                                        )}
                                    </Stack>
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    Key được lưu theo provider hiện tại. Nếu để trống rồi bấm lưu thì hệ thống giữ key cũ.
                                </Typography>

                                <TextField
                                    label={`Nhập API Key mới cho ${normalizeProvider(aiForm.aiProvider)}`}
                                    value={aiForm.aiApiKey}
                                    onChange={handleAiChange("aiApiKey")}
                                    fullWidth
                                    type={showAiKey ? "text" : "password"}
                                    placeholder={aiKeyMasked ? aiKeyMasked : "Chưa có key"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <KeyRoundedIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowAiKey((v) => !v)}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showAiKey ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />

                                {!aiKeyMasked && !String(aiForm.aiApiKey || "").trim() && (
                                    <Box
                                        sx={{
                                            p: 1.25,
                                            borderRadius: 2,
                                            border: "1px solid",
                                            borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
                                            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 900 }}>
                                            ⚠️ Chưa có API Key — AI sẽ không hoạt động
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>

                        <AppConfirm
                            open={removeKeyOpen}
                            title="Xoá AI API Key?"
                            message="Thao tác này sẽ xoá key hiện tại của provider đang chọn. AI sẽ không hoạt động cho đến khi bạn nhập key mới."
                            onClose={() => setRemoveKeyOpen(false)}
                            onConfirm={handleRemoveAiKey}
                            loading={deletingAiKey}
                            confirmText="Xoá key"
                            cancelText="Huỷ"
                            variant="danger"
                        />
                    </>
                )}
            </Stack>
        </Paper>
    );

    return (
        <>
            <GlobalLoading
                open={loading || saving || aiLoading}
                message={
                    saving
                        ? "Đang lưu cấu hình..."
                        : aiLoading
                            ? "Đang tải Model AI..."
                            : "Đang tải cấu hình..."
                }
            />

            <Box
                sx={{
                    maxWidth: 1100,
                    mx: "auto",
                    px: { xs: 1.25, sm: 2, md: 3 },
                    py: { xs: 1.5, sm: 2 },
                }}
            >
                <Box mb={{ xs: 1.5, sm: 2 }}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={{ xs: 0.5, sm: 1.5 }}
                        sx={{ minWidth: 0 }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="h1"
                                fontWeight={500}
                                sx={{ fontSize: { xs: "1rem", sm: "1.5rem" } }}
                            >
                                Cài đặt hệ thống
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                Quản lý cấu hình hệ thống
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

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
                        variant={isMobile ? "scrollable" : "fullWidth"}
                        allowScrollButtonsMobile
                        scrollButtons={isMobile ? "on" : false}
                        TabScrollButtonProps={{ sx: { width: 40 } }}
                        centered={!isMobile}
                        sx={{
                            "& .MuiTab-root": {
                                minHeight: 56,
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                px: { xs: 1.25, sm: 2 },
                                minWidth: isMobile ? 140 : 0,
                            },
                            "& .MuiTabs-flexContainer": {
                                justifyContent: isMobile ? "flex-start" : "space-between",
                            },
                        }}
                    >
                        <Tab icon={<SchoolIcon />} iconPosition="start" label="Cấu hình bài thi" value={TASKS.PRACTICE} />
                        <Tab icon={<EmailIcon />} iconPosition="start" label="Email" value={TASKS.EMAIL} />
                        <Tab icon={<AssessmentIcon />} iconPosition="start" label="Báo cáo tháng" value={TASKS.REPORT} />
                        <Tab icon={<SmartToyRoundedIcon />} iconPosition="start" label="Model AI" value={TASKS.MODEL_AI} />
                    </Tabs>
                </Paper>

                <Box mb={2}>
                    {activeTask === TASKS.PRACTICE && renderPracticeTask()}
                    {activeTask === TASKS.EMAIL && renderEmailTask()}
                    {activeTask === TASKS.REPORT && renderReportTask()}
                    {activeTask === TASKS.MODEL_AI && renderModelAiTask()}
                </Box>

                <Paper
                    sx={{
                        p: { xs: 1.5, sm: 2 },
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
                        spacing={{ xs: 1.25, md: 2 }}
                        alignItems={{ xs: "stretch", md: "center" }}
                        justifyContent="space-between"
                    >
                        <Box sx={{ minWidth: 0 }}>
                            {activeTask === TASKS.MODEL_AI ? (
                                aiUpdatedAt ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Cập nhật lần cuối:{" "}
                                            <strong>{new Date(aiUpdatedAt).toLocaleString("vi-VN")}</strong>
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có cập nhật
                                    </Typography>
                                )
                            ) : updatedAt ? (
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
                                    sx={{ mt: 1, fontWeight: 600 }}
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
                                width: { xs: "100%", md: "auto" },
                                minWidth: { xs: "100%", md: 160 },
                                height: 44,
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                textTransform: "none",
                                boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                                "&:hover": {
                                    boxShadow: (theme) => `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                                    transform: { xs: "none", md: "translateY(-2px)" },
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