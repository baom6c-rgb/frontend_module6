import React, { useState } from 'react';
import {
    Box, Grid, Typography, Paper, Button, TextField,
    Avatar, IconButton, Alert, Divider, Fade
} from '@mui/material';
import {
    PersonRounded, EmailRounded, PhoneRounded,
    LocationOnRounded, CakeRounded, EditRounded,
    SaveRounded, CancelRounded, PhotoCamera,
    SchoolRounded, MenuBookRounded
} from '@mui/icons-material';

// Component con cho từng trường thông tin
const InfoField = ({ icon, label, value, field, editable = true, isEditing, editData, handleChange }) => (
    <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            {icon}
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#A3AED0', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                {label}
            </Typography>
        </Box>
        {isEditing && editable ? (
            <TextField
                fullWidth
                size="small"
                value={editData[field]}
                onChange={handleChange(field)}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        bgcolor: '#F4F7FE',
                        '& fieldset': { borderColor: '#E0E5F2' }
                    }
                }}
            />
        ) : (
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#2B3674', pl: 1 }}>
                {value}
            </Typography>
        )}
    </Box>
);

const UserProfile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [profileData, setProfileData] = useState({
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        phone: '0123456789',
        address: 'Hà Nội, Việt Nam',
        birthDate: '01/01/2000',
        studentId: 'HV2024001',
        major: 'Công nghệ thông tin',
        enrollmentDate: '15/09/2023'
    });

    const [editData, setEditData] = useState(profileData);

    const handleEdit = () => {
        setIsEditing(true);
        setEditData(profileData);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditData(profileData);
    };

    const handleSave = () => {
        setProfileData(editData);
        setIsEditing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleChange = (field) => (e) => {
        setEditData({ ...editData, [field]: e.target.value });
    };

    return (
        <Fade in={true} timeout={800}>
            <Box>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1B2559' }}>
                        Hồ sơ cá nhân 👤
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A3AED0', fontWeight: 500 }}>
                        Quản lý thông tin cá nhân của bạn
                    </Typography>
                </Box>

                {/* Success Alert */}
                {showSuccess && (
                    <Alert
                        severity="success"
                        sx={{ mb: 3, borderRadius: '15px', fontWeight: 600 }}
                        onClose={() => setShowSuccess(false)}
                    >
                        Cập nhật thông tin thành công!
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Cột trái: Profile Card */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 4, borderRadius: '20px', textAlign: 'center' }}>
                            <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                                <Avatar
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        bgcolor: '#4318FF',
                                        fontSize: 48,
                                        fontWeight: 700
                                    }}
                                >
                                    H
                                </Avatar>
                                {isEditing && (
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            bgcolor: '#4318FF',
                                            color: '#fff',
                                            '&:hover': { bgcolor: '#3311CC' },
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <PhotoCamera />
                                    </IconButton>
                                )}
                            </Box>

                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2B3674', mb: 1 }}>
                                {profileData.fullName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#A3AED0', mb: 3 }}>
                                {profileData.studentId}
                            </Typography>

                            <Divider sx={{ my: 3 }} />

                            <Box sx={{ textAlign: 'left' }}>
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <MenuBookRounded sx={{ color: '#A3AED0', fontSize: 20 }} />
                                        <Typography variant="caption" sx={{ color: '#A3AED0', fontWeight: 600 }}>
                                            CHUYÊN NGÀNH
                                        </Typography>
                                    </Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#2B3674', pl: 1 }}>
                                        {profileData.major}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <SchoolRounded sx={{ color: '#A3AED0', fontSize: 20 }} />
                                        <Typography variant="caption" sx={{ color: '#A3AED0', fontWeight: 600 }}>
                                            NGÀY NHẬP HỌC
                                        </Typography>
                                    </Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#2B3674', pl: 1 }}>
                                        {profileData.enrollmentDate}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Cột phải: Information Card */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 4, borderRadius: '20px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1B2559' }}>
                                    Thông tin chi tiết
                                </Typography>
                                {!isEditing ? (
                                    <Button
                                        startIcon={<EditRounded />}
                                        onClick={handleEdit}
                                        variant="contained"
                                        sx={{
                                            borderRadius: '12px',
                                            bgcolor: '#4318FF',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            px: 3,
                                            boxShadow: 'none',
                                            '&:hover': { bgcolor: '#3311CC', boxShadow: 'none' }
                                        }}
                                    >
                                        Chỉnh sửa
                                    </Button>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            startIcon={<CancelRounded />}
                                            onClick={handleCancel}
                                            sx={{
                                                borderRadius: '12px',
                                                color: '#A3AED0',
                                                textTransform: 'none',
                                                fontWeight: 700
                                            }}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            startIcon={<SaveRounded />}
                                            onClick={handleSave}
                                            variant="contained"
                                            sx={{
                                                borderRadius: '12px',
                                                bgcolor: '#4318FF',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                px: 3,
                                                boxShadow: 'none',
                                                '&:hover': { bgcolor: '#3311CC', boxShadow: 'none' }
                                            }}
                                        >
                                            Lưu
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Divider sx={{ mb: 4 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<PersonRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Họ và tên"
                                        value={profileData.fullName}
                                        field="fullName"
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<EmailRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Email"
                                        value={profileData.email}
                                        field="email"
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<PhoneRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Số điện thoại"
                                        value={profileData.phone}
                                        field="phone"
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<CakeRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Ngày sinh"
                                        value={profileData.birthDate}
                                        field="birthDate"
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <InfoField
                                        icon={<LocationOnRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Địa chỉ"
                                        value={profileData.address}
                                        field="address"
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <InfoField
                                        icon={<PersonRounded sx={{ color: '#4318FF', fontSize: 20 }} />}
                                        label="Mã học viên"
                                        value={profileData.studentId}
                                        field="studentId"
                                        editable={false}
                                        isEditing={isEditing}
                                        editData={editData}
                                        handleChange={handleChange}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Fade>
    );
};

export default UserProfile;