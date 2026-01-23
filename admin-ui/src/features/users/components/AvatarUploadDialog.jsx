import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";

const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarUploadDialog({
                                               open,
                                               onClose,
                                               currentAvatarUrl,
                                               displayName,
                                               onSave, // async (file) => returns newProfile or newAvatarUrl
                                           }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const fallbackLetter = useMemo(() => (displayName?.trim()?.[0] || "U").toUpperCase(), [displayName]);

    useEffect(() => {
        if (!open) return;
        setFile(null);
        setPreview("");
        setError("");
        setSaving(false);
    }, [open]);

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const validate = (f) => {
        if (!f) return "Vui lòng chọn ảnh.";
        if (!ALLOWED_TYPES.includes(f.type)) return "Chỉ chấp nhận ảnh jpg/png/webp.";
        if (f.size > MAX_BYTES) return `Dung lượng ảnh tối đa ${MAX_MB}MB.`;
        return "";
    };

    const handlePick = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const msg = validate(f);
        if (msg) {
            setError(msg);
            return;
        }
        setError("");
        setFile(f);
    };

    const handleSave = async () => {
        const msg = validate(file);
        if (msg) {
            setError(msg);
            return;
        }
        setSaving(true);
        setError("");

        try {
            await onSave(file);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || "Upload avatar thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Đổi avatar</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Avatar
                            src={preview || currentAvatarUrl || ""}
                            sx={{ width: 120, height: 120, bgcolor: "#4318FF", fontSize: 42, fontWeight: 800 }}
                        >
                            {fallbackLetter}
                        </Avatar>
                    </Box>

                    <Button
                        variant="outlined"
                        component="label"
                        sx={{ borderRadius: "12px", textTransform: "none" }}
                        disabled={saving}
                    >
                        Chọn ảnh
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePick} />
                    </Button>

                    <Typography variant="caption" sx={{ color: "#A3AED0" }}>
                        Chỉ chấp nhận jpg/png/webp, tối đa {MAX_MB}MB. (crop/zoom: TODO)
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", borderRadius: "12px" }}>
                    Hủy
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                    sx={{
                        borderRadius: "12px",
                        bgcolor: "#4318FF",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 3,
                        boxShadow: "none",
                        "&:hover": { bgcolor: "#3311CC", boxShadow: "none" },
                    }}
                >
                    {saving ? "Đang lưu..." : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
