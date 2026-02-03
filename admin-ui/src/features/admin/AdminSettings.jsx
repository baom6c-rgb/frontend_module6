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
} from "@mui/material";

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

const TZ_PRESETS = [
    "Asia/Bangkok",
    "Asia/Ho_Chi_Minh",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
];

export default function AdminSettings() {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        passScore: "",
        minutesPerQuestion: "",
        retestCooldownMinutes: 30,
        emailNotificationsEnabled: false,
        adminEmails: "",

        // ===== Monthly report =====
        monthlyReportEnabled: false,
        monthlyReportDayOfMonth: 0, // 0 = last day
        monthlyReportTime: "23:59", // HH:mm
        monthlyReportTimeZone: "Asia/Bangkok",
    });

    // UI-only state: select preset vs custom time input
    const [timeMode, setTimeMode] = useState("preset"); // "preset" | "custom"
    const [timePresetValue, setTimePresetValue] = useState("23:59"); // used when timeMode === "preset"

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
                    monthlyReportTimeZone: data.monthlyReportTimeZone ?? "Asia/Bangkok",
                });

                setTimeMode(isPreset ? "preset" : "custom");
                setTimePresetValue(isPreset ? monthlyTime : "23:59");

                setUpdatedAt(data.updatedAt ?? null);
                setLastSentYearMonth(data.monthlyReportLastSentYearMonth ?? null);
            })
            .catch(() => {
                showToast("Không tải được System Settings", "error");
            })
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

    const handleTimePresetChange = (e) => {
        const v = e.target.value;

        if (v === "__CUSTOM__") {
            setTimeMode("custom");
            // keep current form.monthlyReportTime if valid, else set default
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

        if (Number.isNaN(passScore) || passScore < 0 || passScore > 100) return "Điểm đạt phải 0..100";
        if (Number.isNaN(minutesPerQuestion) || minutesPerQuestion <= 0) return "Thời gian / câu phải > 0";
        if (Number.isNaN(cooldown) || cooldown < 0 || cooldown > 1440) return "Cooldown phải 0..1440";

        if (form.monthlyReportEnabled) {
            const dom = Number(form.monthlyReportDayOfMonth);
            if (Number.isNaN(dom) || dom < 0 || dom > 31) return "Ngày gửi phải 0..31 (0 = ngày cuối tháng)";
            if (!isValidTimeHHmm(form.monthlyReportTime)) return "Giờ gửi phải đúng định dạng HH:mm";
            if (!String(form.monthlyReportTimeZone || "").trim()) return "Timezone không được rỗng";
        }

        return null;
    }, [form]);

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
                adminEmails: String(form.adminEmails || "").trim(),

                monthlyReportEnabled: !!form.monthlyReportEnabled,
                monthlyReportDayOfMonth: clampInt(form.monthlyReportDayOfMonth, 0, 31),
                monthlyReportTime: String(form.monthlyReportTime || "").trim(),
                monthlyReportTimeZone: String(form.monthlyReportTimeZone || "").trim(),
            };

            const updated = await adminSettingsApi.update(payload);

            // reflect latest from BE
            setUpdatedAt(updated.updatedAt ?? null);
            setLastSentYearMonth(updated.monthlyReportLastSentYearMonth ?? lastSentYearMonth);

            const monthlyTime = updated.monthlyReportTime ?? form.monthlyReportTime;
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

            showToast("Cập nhật system settings thành công", "success");
        } catch (e) {
            showToast("Cập nhật thất bại", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <GlobalLoading
                open={loading || saving}
                message={saving ? "Đang lưu cấu hình..." : "Đang tải cấu hình..."}
            />

            <Box sx={{ maxWidth: 900, mx: "auto" }}>
                <Typography variant="h4" fontWeight={800} mb={3}>
                    ⚙️ Cài đặt hệ thống
                </Typography>

                <Paper sx={{ p: 4, borderRadius: 3 }}>
                    <Stack spacing={3}>
                        <TextField
                            label="Điểm đạt (%)"
                            type="number"
                            value={form.passScore}
                            onChange={handleChange("passScore")}
                            fullWidth
                            inputProps={{ min: 0, max: 100 }}
                        />

                        <TextField
                            label="Thời gian cho một câu hỏi (phút)"
                            type="number"
                            value={form.minutesPerQuestion}
                            onChange={handleChange("minutesPerQuestion")}
                            fullWidth
                            inputProps={{ min: 0.5, step: 0.5 }}
                        />

                        <TextField
                            label="Cooldown làm lại (phút)"
                            type="number"
                            value={form.retestCooldownMinutes}
                            onChange={handleChange("retestCooldownMinutes")}
                            fullWidth
                            inputProps={{ min: 0, max: 1440, step: 1 }}
                            helperText="Ví dụ: 30 phút. Sau khi trượt, học viên phải chờ đủ thời gian này mới được làm lại."
                        />

                        <TextField
                            label="Email quản trị viên"
                            value={form.adminEmails}
                            onChange={handleChange("adminEmails")}
                            fullWidth
                            placeholder="admin1@email.com, admin2@email.com"
                            helperText="Nhập CSV, cách nhau bằng dấu phẩy."
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.emailNotificationsEnabled}
                                    onChange={handleChange("emailNotificationsEnabled")}
                                />
                            }
                            label="Bật thông báo email"
                        />

                        <Divider />

                        {/* ===== Monthly Report ===== */}
                        <Typography variant="h6" fontWeight={800}>
                            📩 Báo cáo tháng
                        </Typography>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.monthlyReportEnabled}
                                    onChange={handleChange("monthlyReportEnabled")}
                                />
                            }
                            label="Bật gửi báo cáo tháng tự động"
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            {/* Day of month select */}
                            <TextField
                                select
                                label="Ngày gửi"
                                value={form.monthlyReportDayOfMonth}
                                onChange={handleChange("monthlyReportDayOfMonth")}
                                fullWidth
                                disabled={!form.monthlyReportEnabled}
                                helperText="0 = ngày cuối tháng (khuyến nghị). Nếu chọn 29/30/31, tháng không có ngày đó sẽ không gửi."
                            >
                                <MenuItem value={0}>Ngày cuối tháng (0)</MenuItem>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <MenuItem key={d} value={d}>
                                        Ngày {d}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {/* Time preset select + custom */}
                            <TextField
                                select
                                label="Giờ gửi"
                                value={timeMode === "preset" ? timePresetValue : "__CUSTOM__"}
                                onChange={handleTimePresetChange}
                                fullWidth
                                disabled={!form.monthlyReportEnabled}
                                helperText="Chọn preset hoặc tùy chỉnh"
                            >
                                {TIME_PRESETS.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                                <Divider />
                                <MenuItem value="__CUSTOM__">Tùy chỉnh giờ…</MenuItem>
                            </TextField>
                        </Stack>

                        <Collapse in={form.monthlyReportEnabled && timeMode === "custom"} unmountOnExit>
                            <TextField
                                label="Giờ gửi (tùy chỉnh)"
                                type="time"
                                value={form.monthlyReportTime}
                                onChange={handleChange("monthlyReportTime")}
                                fullWidth
                                inputProps={{ step: 60 }}
                                helperText="Định dạng HH:mm"
                                sx={{ mt: 1 }}
                            />
                        </Collapse>

                        <TextField
                            select
                            label="Timezone"
                            value={form.monthlyReportTimeZone}
                            onChange={handleChange("monthlyReportTimeZone")}
                            fullWidth
                            disabled={!form.monthlyReportEnabled}
                            helperText="Chọn timezone (IANA)"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">🌏</InputAdornment>,
                            }}
                        >
                            {TZ_PRESETS.map((z) => (
                                <MenuItem key={z} value={z}>
                                    {z}
                                </MenuItem>
                            ))}
                        </TextField>

                        {lastSentYearMonth && (
                            <Typography variant="body2" color="text.secondary">
                                Đã gửi gần nhất: {lastSentYearMonth}
                            </Typography>
                        )}

                        <Divider />

                        {updatedAt && (
                            <Typography variant="body2" color="text.secondary">
                                Cập nhật lần cuối: {new Date(updatedAt).toLocaleString()}
                            </Typography>
                        )}

                        <Box textAlign="right">
                            <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
                                Lưu cấu hình
                            </Button>
                        </Box>

                        {saveDisabledReason && (
                            <Typography variant="body2" color="error">
                                {saveDisabledReason}
                            </Typography>
                        )}
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}
