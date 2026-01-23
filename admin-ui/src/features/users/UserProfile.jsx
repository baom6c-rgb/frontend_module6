// src/features/users/UserProfile.jsx
import React, { useEffect, useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Paper,
    Button,
    TextField,
    Avatar,
    IconButton,
    Alert,
    Divider,
    Fade,
    CircularProgress,
} from "@mui/material";
import {
    PersonRounded,
    EmailRounded,
    PhoneRounded,
    LocationOnRounded,
    EditRounded,
    SaveRounded,
    CancelRounded,
    PhotoCamera,
    SchoolRounded,
    MenuBookRounded,
    LockRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import AvatarUploadDialog from "./components/AvatarUploadDialog";
import { getMyProfileApi, updateMyProfileApi, uploadMyAvatarApi } from "../../api/userApi";

const InfoField = ({
                       icon,
                       label,
                       value,
                       isEditing,
                       editable = false,
                       inputValue,
                       onChange,
                       error,
                       helperText,
                       disabled,
                       placeholder,
                   }) => (
    <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            {icon}
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 600,
                    color: "#A3AED0",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                }}
            >
                {label}
            </Typography>
        </Box>

        {isEditing && editable ? (
            <TextField
                fullWidth
                size="medium"
                value={inputValue ?? ""}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                error={Boolean(error)}
                helperText={helperText}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: "#F4F7FE",
                        "& fieldset": { borderColor: "#E0E5F2" },
                    },
                }}
            />
        ) : (
            <Typography variant="body1" sx={{ fontWeight: 600, color: "#2B3674", pl: 1 }}>
                {value ?? "—"}
            </Typography>
        )}
    </Box>
);

const isValidPhone = (raw) => {
    const v = (raw || "").trim();
    if (!v) return true; // optional
    return /^[0-9+()\- ]{8,20}$/.test(v);
};

const UserProfile = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [profile, setProfile] = useState(null);

    // ✅ Edit allowed: name, phone, address (Class disable)
    const [editData, setEditData] = useState({
        fullName: "",
        phoneNumber: "",
        address: "",
    });

    const [errors, setErrors] = useState({
        fullName: "",
        phoneNumber: "",
        address: "",
    });

    // avatar dialog
    const [avatarOpen, setAvatarOpen] = useState(false);

    const loadProfile = async () => {
        setLoading(true);
        setErrorMsg("");

        try {
            const pRes = await getMyProfileApi();
            const p = pRes.data;

            setProfile(p);
            setEditData({
                fullName: p.fullName ?? "",
                phoneNumber: p.phoneNumber ?? "",
                address: p.address ?? "",
            });
        } catch (e) {
            setErrorMsg(e?.response?.data?.message || "Không tải được hồ sơ. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const validate = () => {
        const name = (editData.fullName || "").trim();
        const phone = (editData.phoneNumber || "").trim();
        const addr = (editData.address || "").trim();

        const next = { fullName: "", phoneNumber: "", address: "" };

        if (!name) next.fullName = "Họ và tên không được để trống.";
        else if (name.length > 100) next.fullName = "Họ và tên tối đa 100 ký tự.";

        if (phone && !isValidPhone(phone)) next.phoneNumber = "Số điện thoại không hợp lệ (8–20 ký tự).";

        if (addr.length > 255) next.address = "Địa chỉ tối đa 255 ký tự.";

        setErrors(next);
        return !next.fullName && !next.phoneNumber && !next.address;
    };

    const handleEdit = () => {
        if (!profile) return;
        setIsEditing(true);
        setErrors({ fullName: "", phoneNumber: "", address: "" });
        setEditData({
            fullName: profile.fullName ?? "",
            phoneNumber: profile.phoneNumber ?? "",
            address: profile.address ?? "",
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setErrors({ fullName: "", phoneNumber: "", address: "" });
        if (!profile) return;

        setEditData({
            fullName: profile.fullName ?? "",
            phoneNumber: profile.phoneNumber ?? "",
            address: profile.address ?? "",
        });
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        setErrorMsg("");

        try {
            await updateMyProfileApi({
                fullName: editData.fullName.trim(),
                phoneNumber: (editData.phoneNumber || "").trim() || null,
                address: (editData.address || "").trim() || null,
                // ❌ classId không gửi (Class read-only theo nghiệp vụ)
            });

            await loadProfile();
            setIsEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
        } catch (e) {
            setErrorMsg(e?.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field) => (e) => {
        setEditData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleAvatarSave = async (file) => {
        const res = await uploadMyAvatarApi(file);
        const newProfile = res.data;

        if (newProfile?.avatarUrl) {
            setProfile((prev) => ({ ...prev, avatarUrl: newProfile.avatarUrl }));
        } else {
            await loadProfile();
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={800}>
            <Box>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2559" }}>
                        Hồ sơ cá nhân 👤
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#A3AED0", fontWeight: 500 }}>
                        Quản lý thông tin cá nhân của bạn
                    </Typography>
                </Box>

                {showSuccess && (
                    <Alert severity="success" sx={{ mb: 3, borderRadius: "15px", fontWeight: 600 }}>
                        Cập nhật thông tin thành công!
                    </Alert>
                )}

                {errorMsg && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: "15px", fontWeight: 600 }}>
                        {errorMsg}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* ✅ Left card: shrink when editing */}
                    <Grid item xs={12} md={isEditing ? 2 : 3}>
                        <Paper sx={{ p: 4, borderRadius: "20px", textAlign: "center" }}>
                            <Box sx={{ position: "relative", display: "inline-block", mb: 2 }}>
                                <Avatar
                                    src={profile?.avatarUrl || ""}
                                    sx={{ width: 120, height: 120, bgcolor: "#4318FF", fontSize: 48, fontWeight: 700 }}
                                >
                                    {(profile?.fullName || "U").slice(0, 1).toUpperCase()}
                                </Avatar>

                                <IconButton
                                    onClick={() => setAvatarOpen(true)}
                                    sx={{
                                        position: "absolute",
                                        bottom: 0,
                                        right: 0,
                                        bgcolor: "#4318FF",
                                        color: "#fff",
                                        "&:hover": { bgcolor: "#3311CC" },
                                        width: 40,
                                        height: 40,
                                    }}
                                >
                                    <PhotoCamera />
                                </IconButton>
                            </Box>

                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#2B3674", mb: 0.5 }}>
                                {profile?.fullName || "—"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#A3AED0", mb: 2 }}>
                                {profile?.email || "—"}
                            </Typography>

                            <Button
                                startIcon={<LockRounded />}
                                onClick={() => navigate("/forgot-password")}
                                variant="outlined"
                                sx={{
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontWeight: 800,
                                    px: 2.5,
                                }}
                            >
                                Đổi mật khẩu
                            </Button>
                        </Paper>
                    </Grid>

                    {/* ✅ Right card: expand when editing */}
                    <Grid item xs={12} md={isEditing ? 10 : 9}>
                        <Paper
                            sx={{
                                p: { xs: 3, md: isEditing ? 5 : 4 },
                                borderRadius: "20px",
                                transition: "all .2s ease",
                            }}
                        >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2559" }}>
                                    Thông tin chi tiết
                                </Typography>

                                {!isEditing ? (
                                    <Button
                                        startIcon={<EditRounded />}
                                        onClick={handleEdit}
                                        variant="contained"
                                        sx={{
                                            borderRadius: "12px",
                                            bgcolor: "#4318FF",
                                            textTransform: "none",
                                            fontWeight: 800,
                                            px: 3,
                                            boxShadow: "none",
                                            "&:hover": { bgcolor: "#3311CC", boxShadow: "none" },
                                        }}
                                    >
                                        Chỉnh sửa
                                    </Button>
                                ) : (
                                    <Box sx={{ display: "flex", gap: 1 }}>
                                        <Button
                                            startIcon={<CancelRounded />}
                                            onClick={handleCancel}
                                            disabled={saving}
                                            sx={{
                                                borderRadius: "12px",
                                                color: "#A3AED0",
                                                textTransform: "none",
                                                fontWeight: 800,
                                            }}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            startIcon={<SaveRounded />}
                                            onClick={handleSave}
                                            disabled={saving}
                                            variant="contained"
                                            sx={{
                                                borderRadius: "12px",
                                                bgcolor: "#4318FF",
                                                textTransform: "none",
                                                fontWeight: 800,
                                                px: 3,
                                                boxShadow: "none",
                                                "&:hover": { bgcolor: "#3311CC", boxShadow: "none" },
                                            }}
                                        >
                                            {saving ? "Đang lưu..." : "Lưu"}
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Divider sx={{ mb: 4 }} />

                            {/* ✅ 2 columns, 6 rows (3 each) */}
                            <Grid container spacing={isEditing ? 4 : 3}>
                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<PersonRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Họ và tên"
                                        value={profile?.fullName}
                                        isEditing={isEditing}
                                        editable
                                        inputValue={editData.fullName}
                                        onChange={handleChange("fullName")}
                                        error={errors.fullName}
                                        helperText={errors.fullName}
                                        placeholder="Nhập họ và tên"
                                    />

                                    <InfoField
                                        icon={<PhoneRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Số điện thoại"
                                        value={profile?.phoneNumber}
                                        isEditing={isEditing}
                                        editable
                                        inputValue={editData.phoneNumber}
                                        onChange={handleChange("phoneNumber")}
                                        error={errors.phoneNumber}
                                        helperText={errors.phoneNumber}
                                        placeholder="VD: 0912345678"
                                    />

                                    {/* ✅ Class: read-only in edit mode */}
                                    <InfoField
                                        icon={<SchoolRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Lớp học"
                                        value={profile?.className || "Unassigned"}
                                        isEditing={isEditing}
                                        editable={false}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<EmailRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Email"
                                        value={profile?.email}
                                        isEditing={isEditing}
                                        editable={false}
                                    />

                                    <InfoField
                                        icon={<LocationOnRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Địa chỉ"
                                        value={profile?.address}
                                        isEditing={isEditing}
                                        editable
                                        inputValue={editData.address}
                                        onChange={handleChange("address")}
                                        error={errors.address}
                                        helperText={errors.address}
                                        placeholder="Nhập địa chỉ (optional)"
                                    />

                                    <InfoField
                                        icon={<MenuBookRounded sx={{ color: "#4318FF", fontSize: 20 }} />}
                                        label="Module"
                                        value={profile?.moduleName || "Unassigned"}
                                        isEditing={isEditing}
                                        editable={false}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>

                <AvatarUploadDialog
                    open={avatarOpen}
                    onClose={() => setAvatarOpen(false)}
                    currentAvatarUrl={profile?.avatarUrl || ""}
                    displayName={profile?.fullName || ""}
                    onSave={handleAvatarSave}
                />
            </Box>
        </Fade>
    );
};

export default UserProfile;
