// src/features/users/UserProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Paper,
    Button,
    TextField,
    Avatar,
    IconButton,
    Divider,
    Fade,
    CircularProgress,
    Chip,
    Stack,
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

import AvatarUploadDialog from "./components/AvatarUploadDialog";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { getMyProfileApi, updateMyProfileApi, uploadMyAvatarApi } from "../../api/userApi";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

/** ========= Palette (Cam + Xanh đậm + Trắng) ========= */
const COLORS = {
    primaryBlue: "#0B5ED7",
    primaryBlueHover: "#084298",
    accentOrange: "#FF8C00",
    accentOrangeHover: "#E67600",
    bg: "#F6F8FC",
    white: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    border: "#E5EAF2",
    danger: "#D32F2F",
};

/** ========= Helpers ========= */
const isValidPhone = (raw) => {
    const v = (raw || "").trim();
    if (!v) return true; // optional
    return /^[0-9+()\- ]{8,20}$/.test(v);
};

const CardShell = ({ children, sx }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: "22px",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            overflow: "hidden",
            boxShadow: "0px 18px 45px rgba(15, 23, 42, 0.06)",
            ...sx,
        }}
    >
        {children}
    </Paper>
);

const SectionTitle = ({ title, subtitle, right }) => (
    <Box
        sx={{
            px: { xs: 2, md: 2.5 },
            py: { xs: 1.75, md: 2.25 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.bg} 100%)`,
            borderBottom: `1px solid ${COLORS.border}`,
        }}
    >
        <Box>
            <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, fontSize: { xs: 18, md: 20 } }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography sx={{ mt: 0.25, color: COLORS.textSecondary, fontWeight: 600, fontSize: 13 }}>
                    {subtitle}
                </Typography>
            ) : null}
        </Box>
        {right}
    </Box>
);

/**
 * InfoField:
 * - editable + isEditing => TextField
 * - required => hiển thị * đỏ trên label (khi Edit)
 */
const InfoField = ({
                       icon,
                       label,
                       value,
                       isEditing,
                       editable = false,
                       required = false,
                       inputValue,
                       onChange,
                       error,
                       helperText,
                       disabled,
                       placeholder,
                       type = "text",
                   }) => {
    const showStar = isEditing && editable && required;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.9 }}>
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        background: `${COLORS.primaryBlue}12`,
                        border: `1px solid ${COLORS.border}`,
                        flex: "0 0 auto",
                    }}
                >
                    {icon}
                </Box>

                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 900,
                        color: COLORS.textSecondary,
                        textTransform: "uppercase",
                        fontSize: "0.72rem",
                        letterSpacing: "0.6px",
                        flex: "1 1 auto",
                    }}
                >
                    {label}
                    {showStar ? (
                        <Box component="span" sx={{ color: COLORS.danger, ml: 0.5 }}>
                            *
                        </Box>
                    ) : null}
                </Typography>
            </Stack>

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
                    type={type}
                    required={required}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: "14px",
                            bgcolor: "#FFFFFF",
                            "& fieldset": { borderColor: COLORS.border },
                            "&:hover fieldset": { borderColor: COLORS.primaryBlue },
                            "&.Mui-focused fieldset": { borderColor: COLORS.primaryBlue },
                        },
                        "& .MuiFormHelperText-root": { fontWeight: 700 },
                    }}
                />
            ) : (
                <Box
                    sx={{
                        px: 1,
                        py: 1.15,
                        borderRadius: "14px",
                        bgcolor: COLORS.bg,
                        border: `1px dashed ${COLORS.border}`,
                        flex: "1 1 auto",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Typography sx={{ fontWeight: 800, color: COLORS.textPrimary, wordBreak: "break-word" }}>
                        {value ?? "—"}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

const UserProfile = () => {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState(null);

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

    const [avatarOpen, setAvatarOpen] = useState(false);
    const [changePwOpen, setChangePwOpen] = useState(false);

    const initials = useMemo(() => {
        const name = (profile?.fullName || profile?.email || "U").trim();
        return name.charAt(0).toUpperCase();
    }, [profile]);

    const loadProfile = async () => {
        setLoading(true);
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
            const msg = e?.response?.data?.message || "Không tải được hồ sơ. Vui lòng thử lại.";
            showToast(msg, "error");
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

        if (!name) next.fullName = "Họ và tên là bắt buộc (không được để trống).";
        else if (name.length > 100) next.fullName = "Họ và tên tối đa 100 ký tự.";

        if (phone && !isValidPhone(phone)) next.phoneNumber = "Số điện thoại không hợp lệ (8–20 ký tự).";
        if (addr.length > 255) next.address = "Địa chỉ tối đa 255 ký tự.";

        setErrors(next);

        const ok = !next.fullName && !next.phoneNumber && !next.address;
        if (!ok) showToast("Vui lòng kiểm tra lại dữ liệu nhập.", "warning");
        return ok;
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
        try {
            await updateMyProfileApi({
                fullName: editData.fullName.trim(),
                phoneNumber: (editData.phoneNumber || "").trim() || null,
                address: (editData.address || "").trim() || null,
            });

            await loadProfile();
            setIsEditing(false);
            showToast("Cập nhật thông tin thành công!", "success");
        } catch (e) {
            const msg = e?.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.";
            showToast(msg, "error");
        } finally {
            setTimeout(() => {
                setSaving(false);
            }, 1000);
        }
    };

    const handleChange = (field) => (e) => {
        const val = e.target.value;
        setEditData((prev) => ({ ...prev, [field]: val }));

        if (field === "fullName") {
            setErrors((prev) => ({ ...prev, fullName: val.trim() ? "" : prev.fullName }));
        }
    };

    const handleAvatarSave = async (file) => {
        setSaving(true);
        try {
            const res = await uploadMyAvatarApi(file);
            const newProfile = res.data;

            if (newProfile?.avatarUrl) {
                setProfile((prev) => ({ ...prev, avatarUrl: newProfile.avatarUrl }));
            } else {
                await loadProfile();
            }

            showToast("Cập nhật avatar thành công!", "success");
        } catch (e) {
            const msg = e?.response?.data?.message || "Upload avatar thất bại. Vui lòng thử lại.";
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    const globalLoadingOpen = loading || saving;
    const globalLoadingMessage = saving ? "Đang lưu thay đổi..." : "Đang tải hồ sơ...";

    if (loading) {
        return (
            <Box sx={{ p: 4, display: "flex", gap: 2, alignItems: "center" }}>
                <CircularProgress sx={{ color: COLORS.primaryBlue }} />
                <Typography sx={{ color: COLORS.textSecondary, fontWeight: 800 }}>Đang tải hồ sơ...</Typography>
                <GlobalLoading open={globalLoadingOpen} message={globalLoadingMessage} />
            </Box>
        );
    }

    return (
        <>
            <GlobalLoading open={globalLoadingOpen} message={globalLoadingMessage} />

            <Fade in timeout={700}>
                {/* ✅ MỞ NGANG: bỏ maxWidth + bỏ mx auto để không “lọt thỏm” */}
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "none",
                        mx: 0,
                        px: { xs: 2, md: 3 },
                        py: { xs: 2, md: 3 },
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {/* Page Header */}
                    <Box sx={{ mb: 2.25 }}>
                        <Typography sx={{ fontWeight: 950, color: COLORS.textPrimary, fontSize: { xs: 26, md: 30 } }}>
                            Hồ sơ cá nhân
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: COLORS.textSecondary, fontWeight: 700 }}>
                            Quản lý thông tin cá nhân của bạn
                        </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                        {/* LEFT */}
                        <Grid item xs={12} md={3} lg={3}>
                            <CardShell>
                                <Box
                                    sx={{
                                        px: 2.5,
                                        py: 2.5,
                                        background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.accentOrange} 100%)`,
                                    }}
                                >
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ position: "relative" }}>
                                            <Avatar
                                                src={profile?.avatarUrl || ""}
                                                sx={{
                                                    width: 84,
                                                    height: 84,
                                                    bgcolor: COLORS.white,
                                                    color: COLORS.primaryBlue,
                                                    fontSize: 36,
                                                    fontWeight: 950,
                                                    border: `3px solid rgba(255,255,255,0.7)`,
                                                }}
                                            >
                                                {initials}
                                            </Avatar>

                                            <IconButton
                                                onClick={() => setAvatarOpen(true)}
                                                sx={{
                                                    position: "absolute",
                                                    bottom: -6,
                                                    right: -6,
                                                    bgcolor: COLORS.white,
                                                    color: COLORS.primaryBlue,
                                                    border: `1px solid rgba(15,23,42,0.08)`,
                                                    "&:hover": { bgcolor: "#FFF7ED", color: COLORS.accentOrange },
                                                    width: 36,
                                                    height: 36,
                                                    boxShadow: "0px 12px 18px rgba(0,0,0,0.10)",
                                                }}
                                            >
                                                <PhotoCamera fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 950,
                                                    color: COLORS.white,
                                                    fontSize: 18,
                                                    lineHeight: 1.2,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {profile?.fullName || "—"}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    mt: 0.5,
                                                    color: "rgba(255,255,255,0.85)",
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {profile?.email || "—"}
                                            </Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                <Chip
                                                    size="small"
                                                    label={profile?.className || "Unassigned"}
                                                    sx={{
                                                        bgcolor: "rgba(255,255,255,0.18)",
                                                        color: COLORS.white,
                                                        fontWeight: 900,
                                                        border: "1px solid rgba(255,255,255,0.20)",
                                                    }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={profile?.moduleName || "Unassigned"}
                                                    sx={{
                                                        bgcolor: "rgba(255,255,255,0.18)",
                                                        color: COLORS.white,
                                                        fontWeight: 900,
                                                        border: "1px solid rgba(255,255,255,0.20)",
                                                    }}
                                                />
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Box>

                                <Box sx={{ p: 2.5 }}>
                                    <Button
                                        startIcon={<LockRounded />}
                                        onClick={() => setChangePwOpen(true)}
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            borderRadius: "14px",
                                            textTransform: "none",
                                            fontWeight: 950,
                                            borderColor: COLORS.primaryBlue,
                                            color: COLORS.primaryBlue,
                                            "&:hover": {
                                                borderColor: COLORS.primaryBlueHover,
                                                bgcolor: `${COLORS.primaryBlue}08`,
                                            },
                                        }}
                                    >
                                        Đổi mật khẩu
                                    </Button>
                                </Box>
                            </CardShell>
                        </Grid>

                        {/* RIGHT */}
                        <Grid item xs={12} md={9} lg={9} sx={{ minWidth: 0 }}>
                            <CardShell sx={{ width: "100%" }}>
                                <SectionTitle
                                    title="Thông tin chi tiết"
                                    subtitle={isEditing ? "Chỉnh sửa thông tin của bạn" : "Xem thông tin cá nhân"}
                                    right={
                                        !isEditing ? (
                                            <Button
                                                startIcon={<EditRounded />}
                                                onClick={handleEdit}
                                                variant="contained"
                                                sx={{
                                                    borderRadius: "14px",
                                                    bgcolor: COLORS.primaryBlue,
                                                    textTransform: "none",
                                                    fontWeight: 950,
                                                    px: 2.5,
                                                    boxShadow: "none",
                                                    "&:hover": { bgcolor: COLORS.primaryBlueHover, boxShadow: "none" },
                                                }}
                                            >
                                                Chỉnh sửa
                                            </Button>
                                        ) : (
                                            // ✅ CHỈ ĐỔI STYLE 2 NÚT (Hủy/Lưu) theo yêu cầu
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    startIcon={<CancelRounded />}
                                                    onClick={handleCancel}
                                                    disabled={saving}
                                                    sx={{
                                                        borderRadius: "14px",
                                                        bgcolor: "#FFFFFF",
                                                        color: COLORS.textSecondary, // chữ tối
                                                        textTransform: "none",
                                                        fontWeight: 950,
                                                        px: 2,
                                                        border: `1px solid ${COLORS.border}`,
                                                        "&:hover": {
                                                            bgcolor: "#2E2D84",
                                                            color: "#FFFFFF",
                                                            borderColor: "#2E2D84",
                                                        },
                                                        "&.Mui-disabled": {
                                                            bgcolor: "#FFFFFF",
                                                            color: "#9CA3AF",
                                                            borderColor: COLORS.border,
                                                            opacity: 0.7,
                                                        },
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
                                                        borderRadius: "14px",
                                                        bgcolor: "#FF8C00",
                                                        color: "#FFFFFF",
                                                        textTransform: "none",
                                                        fontWeight: 950,
                                                        px: 2.8,
                                                        boxShadow: "none",
                                                        "&:hover": {
                                                            bgcolor: "#E67600",
                                                            boxShadow: "none",
                                                        },
                                                        "&.Mui-disabled": {
                                                            bgcolor: "#E5E7EB",
                                                            color: "#9CA3AF",
                                                            boxShadow: "none",
                                                        },
                                                    }}
                                                >
                                                    {saving ? "Đang lưu..." : "Lưu"}
                                                </Button>
                                            </Stack>
                                        )
                                    }
                                />

                                {/* ✅ LOCKED 2 rows × 3 columns (View/Edit không đổi layout) */}
                                <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                                            gap: 2.25,
                                            alignItems: "stretch",
                                        }}
                                    >
                                        {/* Row 1 */}
                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<PersonRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
                                                label="Họ và tên"
                                                value={profile?.fullName}
                                                isEditing={isEditing}
                                                editable
                                                required
                                                inputValue={editData.fullName}
                                                onChange={handleChange("fullName")}
                                                error={errors.fullName}
                                                helperText={errors.fullName}
                                                placeholder="Nhập họ và tên"
                                            />
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<PhoneRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
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
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<LocationOnRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
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
                                        </Box>

                                        {/* Row 2 */}
                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<EmailRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
                                                label="Email"
                                                value={profile?.email}
                                                isEditing={isEditing}
                                                editable={false}
                                            />
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<SchoolRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
                                                label="Lớp học"
                                                value={profile?.className || "Unassigned"}
                                                isEditing={isEditing}
                                                editable={false}
                                            />
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <InfoField
                                                icon={<MenuBookRounded sx={{ color: COLORS.primaryBlue, fontSize: 20 }} />}
                                                label="Module"
                                                value={profile?.moduleName || "Unassigned"}
                                                isEditing={isEditing}
                                                editable={false}
                                            />
                                        </Box>
                                    </Box>

                                    <Divider sx={{ mt: 2.25, borderColor: COLORS.border }} />

                                    <Box
                                        sx={{
                                            mt: 1.75,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 1,
                                        }}
                                    >
                                    </Box>
                                </Box>
                            </CardShell>
                        </Grid>
                    </Grid>

                    <AvatarUploadDialog
                        open={avatarOpen}
                        onClose={() => setAvatarOpen(false)}
                        currentAvatarUrl={profile?.avatarUrl || ""}
                        displayName={profile?.fullName || ""}
                        onSave={handleAvatarSave}
                    />
                    <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
                </Box>
            </Fade>
        </>
    );
};

export default UserProfile;
