import React, { useEffect, useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";

import AppModal from "../../../components/common/AppModal";
import PasswordField from "../../../components/form/PasswordField";
import { useToast } from "../../../components/common/AppToast";
import { changeMyPasswordApi } from "../../../api/userApi";

const MIN_LEN = 6;

export default function ChangePasswordModal({ open, onClose }) {
    const { showToast } = useToast();

    const [form, setForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const [errors, setErrors] = useState({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const resetAll = () => {
        setForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
        setErrors({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
    };

    useEffect(() => {
        if (!open) resetAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const isValid = useMemo(() => {
        return (
            form.oldPassword.trim().length > 0 &&
            form.newPassword.trim().length >= MIN_LEN &&
            form.confirmNewPassword.trim().length > 0 &&
            form.confirmNewPassword === form.newPassword
        );
    }, [form]);

    const validate = () => {
        const next = { oldPassword: "", newPassword: "", confirmNewPassword: "" };

        if (!form.oldPassword?.trim()) next.oldPassword = "Vui lòng nhập mật khẩu cũ.";
        if (!form.newPassword?.trim()) next.newPassword = "Vui lòng nhập mật khẩu mới.";
        else if (form.newPassword.length < MIN_LEN)
            next.newPassword = `Mật khẩu mới tối thiểu ${MIN_LEN} ký tự.`;

        if (!form.confirmNewPassword?.trim())
            next.confirmNewPassword = "Vui lòng xác nhận mật khẩu mới.";
        else if (form.confirmNewPassword !== form.newPassword)
            next.confirmNewPassword = "Xác nhận mật khẩu mới không khớp.";

        setErrors(next);
        return !next.oldPassword && !next.newPassword && !next.confirmNewPassword;
    };

    const handleChange = (key) => (e) => {
        const val = e.target.value;
        setForm((prev) => ({ ...prev, [key]: val }));

        // clear error realtime nhẹ
        setErrors((prev) => ({ ...prev, [key]: "" }));
        if (key === "newPassword" || key === "confirmNewPassword") {
            setErrors((prev) => ({ ...prev, confirmNewPassword: "" }));
        }
    };

    const handleClose = () => {
        resetAll();
        onClose?.();
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        // gọi BE
        await changeMyPasswordApi({
            oldPassword: form.oldPassword,
            newPassword: form.newPassword,
        });

        showToast("Đổi mật khẩu thành công", "success");

        // clear + close, không logout, không reload
        resetAll();
        onClose?.();
    };

    return (
        <AppModal
            open={open}
            title="Đổi mật khẩu"
            onClose={handleClose}
            primaryText="Cập nhật"
            secondaryText="Hủy"
            onSubmit={handleSubmit}
            maxWidth="sm"
        >
            <Box>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
                    Vui lòng nhập mật khẩu cũ và mật khẩu mới của bạn.
                </Typography>

                <Stack spacing={2}>
                    <PasswordField
                        label="Mật khẩu cũ"
                        value={form.oldPassword}
                        onChange={handleChange("oldPassword")}
                        error={Boolean(errors.oldPassword)}
                        helperText={errors.oldPassword}
                        autoComplete="current-password"
                    />

                    <PasswordField
                        label="Mật khẩu mới"
                        value={form.newPassword}
                        onChange={handleChange("newPassword")}
                        error={Boolean(errors.newPassword)}
                        helperText={errors.newPassword}
                        autoComplete="new-password"
                    />

                    <PasswordField
                        label="Xác nhận mật khẩu mới"
                        value={form.confirmNewPassword}
                        onChange={handleChange("confirmNewPassword")}
                        error={Boolean(errors.confirmNewPassword)}
                        helperText={errors.confirmNewPassword}
                        autoComplete="new-password"
                    />
                </Stack>

                {/* optional: hint nhỏ */}
                <Typography sx={{ mt: 1.5, color: "text.secondary", fontWeight: 600, fontSize: 12 }}>
                    Mật khẩu mới tối thiểu {MIN_LEN} ký tự.
                </Typography>
            </Box>
        </AppModal>
    );
}
