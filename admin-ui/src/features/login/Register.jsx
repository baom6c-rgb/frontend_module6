import React, { useEffect, useMemo, useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Autocomplete,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";
import { registerApi } from "../../api/authApi";

import PasswordField from "../../components/form/PasswordField";
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

export default function Register() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [form, setForm] = useState({
        email: "",
        password: "",
        fullName: "",
        classId: null,
        moduleId: null,
    });

    const [touched, setTouched] = useState({
        email: false,
        password: false,
        classId: false,
        moduleId: false,
    });

    const [loading, setLoading] = useState(false);

    /* =====================
       Load options
    ===================== */
    useEffect(() => {
        Promise.all([getAllClassesApi(), getAllModulesApi()])
            .then(([cRes, mRes]) => {
                setClasses(cRes?.data || []);
                setModules(mRes?.data || []);
            })
            .catch(() => {
                setClasses([]);
                setModules([]);
            });
    }, []);

    /* =====================
       Validators
    ===================== */
    const validateEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password) =>
        (password || "").length >= 6;

    const errors = useMemo(() => {
        const e = {};

        if (touched.email && !validateEmail(form.email)) {
            e.email = "Email không đúng định dạng";
        }
        if (touched.password && !validatePassword(form.password)) {
            e.password = "Mật khẩu tối thiểu 6 ký tự";
        }
        if (touched.classId && !form.classId) {
            e.classId = "Vui lòng chọn lớp";
        }
        if (touched.moduleId && !form.moduleId) {
            e.moduleId = "Vui lòng chọn module";
        }

        return e;
    }, [form, touched]);

    const selectedClass = useMemo(
        () => classes.find((c) => c.id === form.classId) || null,
        [classes, form.classId]
    );

    const selectedModule = useMemo(
        () => modules.find((m) => m.id === form.moduleId) || null,
        [modules, form.moduleId]
    );

    const markAllTouched = () => {
        setTouched({
            email: true,
            password: true,
            classId: true,
            moduleId: true,
        });
    };

    /* =====================
       Submit
    ===================== */
    const submit = async () => {
        markAllTouched();

        if (
            !validateEmail(form.email) ||
            !validatePassword(form.password) ||
            !form.classId ||
            !form.moduleId
        ) {
            showToast("Vui lòng kiểm tra lại thông tin đăng ký", "warning");
            return;
        }

        const payload = {
            ...form,
            // ✅ nếu chưa nhập tên → lấy từ email
            fullName:
                form.fullName?.trim() ||
                form.email.split("@")[0],
        };

        try {
            setLoading(true);
            await registerApi(payload);

            showToast("Đăng ký thành công! Vui lòng đăng nhập", "success");
            navigate("/login", { state: { registered: true } });
        } catch (e) {
            const msg =
                typeof e?.response?.data === "string"
                    ? e.response.data
                    : e?.response?.data?.message ||
                    "Đăng ký thất bại, vui lòng thử lại";

            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                // Ảnh nền từ thư mục public/images
                backgroundImage: 'url(/images/background_login.jpg)',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                // Overlay tối nhẹ để làm nổi bật form
                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(3px)",
                    zIndex: 0,
                },
            }}
        >
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang đăng ký" />

            <Card
                sx={{
                    maxWidth: 420,
                    width: "90%",
                    mx: "auto",
                    position: "relative",
                    zIndex: 1,
                    backdropFilter: "blur(16px)",
                    backgroundColor: "rgba(255, 255, 255, 0.75)",
                    boxShadow: "0 12px 48px 0 rgba(46, 45, 132, 0.4)",
                    borderRadius: "20px",
                    border: "2px solid rgba(46, 45, 132, 0.2)",
                }}
            >
                <CardContent sx={{ p: 3.5 }}>
                    {/* Logo từ public/images */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: 1.5,
                        }}
                    >
                        <Box
                            component="img"
                            src="/images/codegym_login.png"
                            alt="Logo"
                            sx={{
                                width: 60,
                                height: 60,
                                borderRadius: "50%",
                                objectFit: "cover",
                                filter: "drop-shadow(0 4px 12px rgba(46, 45, 132, 0.25))",
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h4"
                        textAlign="center"
                        mb={0.5}
                        sx={{
                            fontWeight: 700,
                            color: "#2E2D84",
                            letterSpacing: "-0.5px",
                            fontSize: "26px",
                        }}
                    >
                        Đăng ký tài khoản
                    </Typography>

                    <Typography
                        variant="body2"
                        textAlign="center"
                        mb={2.5}
                        sx={{
                            color: "text.secondary",
                            fontSize: "13px",
                        }}
                    >
                        Tạo tài khoản mới để bắt đầu
                    </Typography>

                    <Stack spacing={2}>
                        {/* Email */}
                        <TextField
                            label="Email"
                            value={form.email}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, email: e.target.value }));
                                if (!touched.email)
                                    setTouched((p) => ({ ...p, email: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, email: true }))
                            }
                            error={!!errors.email}
                            helperText={errors.email}
                            autoComplete="email"
                            disabled={loading}
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.5,
                                    backgroundColor: "#f8f8fc",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: "#f0f0fa",
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: "#fff",
                                        "& fieldset": {
                                            borderColor: "#2E2D84",
                                            borderWidth: "2px",
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "#2E2D84",
                                },
                            }}
                        />

                        {/* Password */}
                        <PasswordField
                            label="Mật khẩu"
                            value={form.password}
                            onChange={(e) => {
                                setForm((p) => ({ ...p, password: e.target.value }));
                                if (!touched.password)
                                    setTouched((p) => ({ ...p, password: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, password: true }))
                            }
                            error={!!errors.password}
                            helperText={errors.password}
                            autoComplete="new-password"
                            disabled={loading}
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.5,
                                    backgroundColor: "#f8f8fc",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: "#f0f0fa",
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: "#fff",
                                        "& fieldset": {
                                            borderColor: "#2E2D84",
                                            borderWidth: "2px",
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "#2E2D84",
                                },
                            }}
                        />

                        {/* Full name */}
                        <TextField
                            label="Họ và tên"
                            value={form.fullName}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, fullName: e.target.value }))
                            }
                            helperText="Có thể bỏ trống (sẽ lấy từ email)"
                            autoComplete="name"
                            disabled={loading}
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2.5,
                                    backgroundColor: "#f8f8fc",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        backgroundColor: "#f0f0fa",
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: "#fff",
                                        "& fieldset": {
                                            borderColor: "#2E2D84",
                                            borderWidth: "2px",
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root.Mui-focused": {
                                    color: "#2E2D84",
                                },
                            }}
                        />

                        {/* Class */}
                        <Autocomplete
                            options={classes}
                            value={selectedClass}
                            getOptionLabel={(o) => o?.className || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, classId: v?.id || null }));
                                setTouched((p) => ({ ...p, classId: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, classId: true }))
                            }
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Class"
                                    error={!!errors.classId}
                                    helperText={errors.classId}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: 2.5,
                                            backgroundColor: "#f8f8fc",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f0f0fa",
                                            },
                                            "&.Mui-focused": {
                                                backgroundColor: "#fff",
                                                "& fieldset": {
                                                    borderColor: "#2E2D84",
                                                    borderWidth: "2px",
                                                },
                                            },
                                        },
                                        "& .MuiInputLabel-root.Mui-focused": {
                                            color: "#2E2D84",
                                        },
                                    }}
                                />
                            )}
                        />

                        {/* Module */}
                        <Autocomplete
                            options={modules}
                            value={selectedModule}
                            getOptionLabel={(o) => o?.moduleName || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, moduleId: v?.id || null }));
                                setTouched((p) => ({ ...p, moduleId: true }));
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, moduleId: true }))
                            }
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Module"
                                    error={!!errors.moduleId}
                                    helperText={errors.moduleId}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: 2.5,
                                            backgroundColor: "#f8f8fc",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f0f0fa",
                                            },
                                            "&.Mui-focused": {
                                                backgroundColor: "#fff",
                                                "& fieldset": {
                                                    borderColor: "#2E2D84",
                                                    borderWidth: "2px",
                                                },
                                            },
                                        },
                                        "& .MuiInputLabel-root.Mui-focused": {
                                            color: "#2E2D84",
                                        },
                                    }}
                                />
                            )}
                        />

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                            disabled={loading}
                            sx={{
                                borderRadius: 2.5,
                                py: 1.3,
                                textTransform: "none",
                                fontSize: 15,
                                fontWeight: 600,
                                background: "linear-gradient(135deg, #2E2D84 0%, #EC5E32 100%)",
                                boxShadow: "0 6px 20px rgba(46, 45, 132, 0.35)",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    background: "linear-gradient(135deg, #242370 0%, #d34d28 100%)",
                                    boxShadow: "0 8px 28px rgba(46, 45, 132, 0.45)",
                                    transform: "translateY(-2px)",
                                },
                                "&:active": {
                                    transform: "translateY(0px)",
                                },
                                "&.Mui-disabled": {
                                    background: "linear-gradient(135deg, #a5a4c8 0%, #e0b0a0 100%)",
                                },
                            }}
                        >
                            Đăng ký
                        </Button>

                        <Typography
                            variant="body2"
                            onClick={() => navigate("/login")}
                            sx={{
                                textAlign: "center",
                                color: "#2E2D84",
                                cursor: "pointer",
                                fontWeight: 500,
                                fontSize: "13px",
                                mt: 0.5,
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    textDecoration: "underline",
                                    color: "#1f1c5e",
                                },
                            }}
                        >
                            Đã có tài khoản? Đăng nhập
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}