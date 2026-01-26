// admin-ui/src/features/admin/EditUserModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Stack, TextField, CircularProgress, Typography } from "@mui/material";
import AppModal from "../../components/common/AppModal";
import { adminUserApi } from "../../api/adminUserApi";
import Grid from "@mui/material/Grid";

const toUpper = (s) => (s || "").toUpperCase();

export default function EditUserModal({
                                          open,
                                          onClose,
                                          userId,
                                          roleOptions = [],
                                          classOptions = [],
                                          moduleOptions = [],
                                          onUpdated, // () => Promise<void> | void
                                      }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        roleName: "STUDENT",
        classId: "",
        moduleId: "",
    });

    const isAdminRole = useMemo(() => toUpper(form.roleName) === "ADMIN", [form.roleName]);

    useEffect(() => {
        if (!open || !userId) return;

        let alive = true;

        (async () => {
            try {
                setLoading(true);
                const res = await adminUserApi.getUserDetail(userId);
                const u = res?.data || {};

                if (!alive) return;

                setForm({
                    fullName: u.fullName ?? "",
                    email: u.email ?? "",
                    roleName: u.roleName ?? u.role ?? "STUDENT",
                    classId: u.classId ?? u.class?.id ?? "",
                    moduleId: u.moduleId ?? u.module?.id ?? "",
                });
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, userId]);

    // ADMIN selected => clear class/module
    useEffect(() => {
        if (isAdminRole) {
            setForm((prev) => ({ ...prev, classId: "", moduleId: "" }));
        }
    }, [isAdminRole]);

    const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async () => {
        if (!userId) return;

        const fullName = form.fullName.trim();
        if (!fullName) throw new Error("Full name is required.");

        const payload = {
            fullName,
            email: form.email.trim(),
            roleName: form.roleName,
            ...(isAdminRole
                ? {}
                : {
                    classId: Number(form.classId),
                    moduleId: Number(form.moduleId),
                }),
        };

        try {
            setSaving(true);
            await adminUserApi.updateUser(userId, payload);
            await onUpdated?.();
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            open={open}
            title="Chỉnh sửa user"
            onClose={onClose}
            primaryText="Lưu"
            secondaryText="Hủy"
            onSubmit={handleSubmit}
            loading={saving}
            maxWidth="sm"
        >
            {loading ? (
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2">Loading user...</Typography>
                </Stack>
            ) : (
                <Stack spacing={2}>
                    <TextField
                        label="Full Name"
                        value={form.fullName}
                        onChange={onChange("fullName")}
                        fullWidth
                    />

                    <TextField
                        label="Email"
                        value={form.email}
                        onChange={onChange("email")}
                        fullWidth
                    />

                    <TextField
                        label="Role"
                        select
                        SelectProps={{ native: true }}
                        value={form.roleName}
                        onChange={onChange("roleName")}
                        fullWidth
                    >
                        {(roleOptions?.length
                                ? roleOptions
                                : [
                                    { id: "STUDENT", name: "STUDENT" },
                                    { id: "ADMIN", name: "ADMIN" },
                                ]
                        ).map((r) => (
                            <option key={r.id} value={r.name}>
                                {r.name}
                            </option>
                        ))}
                    </TextField>

                    <TextField
                        label="Class"
                        select
                        SelectProps={{ native: true }}
                        value={form.classId}
                        onChange={onChange("classId")}
                        disabled={isAdminRole}
                        fullWidth
                        helperText={isAdminRole ? "ADMIN không cần chọn Class" : ""}
                    >
                        <option value="">-- Select --</option>
                        {classOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </TextField>

                    <TextField
                        label="Module"
                        select
                        SelectProps={{ native: true }}
                        value={form.moduleId}
                        onChange={onChange("moduleId")}
                        disabled={isAdminRole}
                        fullWidth
                        helperText={isAdminRole ? "ADMIN không cần chọn Module" : ""}
                    >
                        <option value="">-- Select --</option>
                        {moduleOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </TextField>
                </Stack>
            )}
        </AppModal>
    );
}
