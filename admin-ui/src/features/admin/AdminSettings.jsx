// src/features/admin/AdminSettings.jsx
import React, { useEffect, useState } from "react";
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
} from "@mui/material";

import { adminSettingsApi } from "../../api/adminSettingsApi";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

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
    });

    const [updatedAt, setUpdatedAt] = useState(null);

    // ===== Load settings =====
    useEffect(() => {
        let mounted = true;
        setLoading(true);

        adminSettingsApi
            .get()
            .then((data) => {
                if (!mounted) return;
                setForm({
                    passScore: data.passScore ?? "",
                    minutesPerQuestion: data.minutesPerQuestion ?? "",
                    retestCooldownMinutes: data.retestCooldownMinutes ?? 30,
                    emailNotificationsEnabled: !!data.emailNotificationsEnabled,
                    adminEmails: data.adminEmails ?? "",
                });
                setUpdatedAt(data.updatedAt);
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
            field === "emailNotificationsEnabled"
                ? e.target.checked
                : e.target.value;

        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                passScore: Number(form.passScore),
                minutesPerQuestion: Number(form.minutesPerQuestion),
                retestCooldownMinutes: Number(form.retestCooldownMinutes),
                emailNotificationsEnabled: form.emailNotificationsEnabled,
                adminEmails: form.adminEmails,
            };

            const updated = await adminSettingsApi.update(payload);

            setUpdatedAt(updated.updatedAt);
            showToast("Cập nhật system settings thành công", "success");
        } catch (e) {
            showToast("Cập nhật thất bại", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <GlobalLoading open={loading || saving} message={saving ? "Đang lưu cấu hình..." : "Đang tải cấu hình..."} />

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
                            label="Thời gian cho một câu hỏi"
                            type="number"
                            value={form.minutesPerQuestion}
                            onChange={handleChange("minutesPerQuestion")}
                            fullWidth
                            inputProps={{ min: 0, step: 0.5 }}
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
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.emailNotificationsEnabled}
                                    onChange={handleChange("emailNotificationsEnabled")}
                                />
                            }
                            label="Thông báo email"
                        />

                        <Divider />

                        {updatedAt && (
                            <Typography variant="body2" color="text.secondary">
                                Cập nhật lần cuối: {new Date(updatedAt).toLocaleString()}
                            </Typography>
                        )}

                        <Box textAlign="right">
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                Lưu cấu hình
                            </Button>
                        </Box>
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}
