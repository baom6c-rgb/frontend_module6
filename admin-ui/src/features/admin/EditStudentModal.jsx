import React, { useMemo, useState } from "react";
import { Box, CircularProgress, Stack, TextField } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { adminUserApi } from "../../api/adminUserApi";
import AppModal from "../../components/common/AppModal";

const getClassLabel = (opt) => opt?.label ?? opt?.className ?? opt?.name ?? "";
const getModuleLabel = (opt) => opt?.label ?? opt?.moduleName ?? opt?.name ?? "";

export default function EditStudentModal({ open, userId, onClose, onSaved }) {
    const [editLoading, setEditLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [classOptions, setClassOptions] = useState([]);
    const [moduleOptions, setModuleOptions] = useState([]);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        classId: null,
        moduleId: null,
    });

    const selectedClass = useMemo(
        () => classOptions.find((c) => c.id === form.classId) ?? null,
        [classOptions, form.classId]
    );

    const selectedModule = useMemo(
        () => moduleOptions.find((m) => m.id === form.moduleId) ?? null,
        [moduleOptions, form.moduleId]
    );

    const canSave = useMemo(() => {
        return (
            form.fullName?.trim() &&
            form.email?.trim() &&
            form.classId != null &&
            form.moduleId != null
        );
    }, [form]);

    const loadData = async () => {
        if (!userId) return;
        setEditLoading(true);
        try {
            const [detailRes, classesRes, modulesRes] = await Promise.all([
                adminUserApi.getUserDetail(userId),
                adminUserApi.getClassOptions(),
                adminUserApi.getModuleOptions(),
            ]);

            const detail = detailRes.data;

            setClassOptions(classesRes.data || []);
            setModuleOptions(modulesRes.data || []);

            setForm({
                fullName: detail.fullName || "",
                email: detail.email || "",
                classId: detail.classId ?? null,
                moduleId: detail.moduleId ?? null,
            });
        } finally {
            setEditLoading(false);
        }
    };

    React.useEffect(() => {
        if (open) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, userId]);

    const handleSave = async () => {
        if (!userId || !canSave) return;

        setSaving(true);
        try {
            const payload = {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                classId: Number(form.classId),
                moduleId: Number(form.moduleId),
            };

            await adminUserApi.updateUser(userId, payload);

            // AppModal sẽ tự toast success + tự close sau khi onSubmit resolve (theo code modal m vừa làm)
            await onSaved?.();
        } finally {
            setSaving(false);
        }
    };

    const safeClose = () => {
        if (saving) return;
        onClose?.();
    };

    return (
        <AppModal
            open={open}
            title="Chỉnh sửa học viên"
            onClose={safeClose}
            primaryText="Lưu"
            secondaryText="Hủy"
            onSubmit={handleSave}
            loading={saving}
            maxWidth="sm"
            hideActions={false}
        >
            {editLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Stack spacing={2.2} sx={{ mt: 0.5 }}>
                    <TextField
                        label="Họ tên"
                        value={form.fullName}
                        onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                        fullWidth
                    />

                    <TextField
                        label="Email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        fullWidth
                    />

                    <Autocomplete
                        options={classOptions}
                        value={selectedClass}
                        isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                        getOptionLabel={getClassLabel}
                        onChange={(_, newValue) =>
                            setForm((p) => ({ ...p, classId: newValue?.id ?? null }))
                        }
                        loading={editLoading}
                        noOptionsText="Không có lớp học"
                        renderInput={(params) => <TextField {...params} label="Lớp học" fullWidth />}
                    />

                    <Autocomplete
                        options={moduleOptions}
                        value={selectedModule}
                        isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                        getOptionLabel={getModuleLabel}
                        onChange={(_, newValue) =>
                            setForm((p) => ({ ...p, moduleId: newValue?.id ?? null }))
                        }
                        loading={editLoading}
                        noOptionsText="Không có module"
                        renderInput={(params) => <TextField {...params} label="Module" fullWidth />}
                    />
                </Stack>
            )}
        </AppModal>
    );
}
