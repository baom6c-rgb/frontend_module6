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
    InputAdornment,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";
import {
    registerApi,
    requestRegisterOtpApi,
    verifyRegisterOtpApi,
} from "../../api/authApi";

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

        // ✅ OTP fields
        otp: "",
        otpSessionId: "",
    });

    const [touched, setTouched] = useState({
        email: false,
        password: false,
        classId: false,
        moduleId: false,
        otp: false,
    });

    // ✅ Loading states
    const [loading, setLoading] = useState(false); // for register
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // ✅ OTP UI states
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [cooldown, setCooldown] = useState(0); // seconds
    const [expiresIn, setExpiresIn] = useState(0); // seconds

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
       Helpers
    ===================== */
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password) => (password || "").length >= 6;

    const validateOtp = (otp) => /^\d{6}$/.test((otp || "").trim());

    const resetOtpState = () => {
        setOtpSent(false);
        setOtpVerified(false);
        setCooldown(0);
        setExpiresIn(0);
        setForm((p) => ({ ...p, otp: "", otpSessionId: "" }));
        setTouched((p) => ({ ...p, otp: false }));
    };

    // ✅ Timer for cooldown + expires
    useEffect(() => {
        if (cooldown <= 0 && expiresIn <= 0) return;

        const t = setInterval(() => {
            setCooldown((s) => (s > 0 ? s - 1 : 0));
            setExpiresIn((s) => (s > 0 ? s - 1 : 0));
        }, 1000);

        return () => clearInterval(t);
    }, [cooldown, expiresIn]);

    /* =====================
       Validators
    ===================== */
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

        if (otpSent && touched.otp && !validateOtp(form.otp)) {
            e.otp = "OTP gồm 6 chữ số";
        }

        return e;
    }, [form, touched, otpSent]);

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
            otp: true,
        });
    };

    const getErrorMessage = (e, fallback) => {
        return typeof e?.response?.data === "string"
            ? e.response.data
            : e?.response?.data?.message || fallback;
    };

    /* =====================
       OTP Actions
    ===================== */
    const sendOtp = async () => {
        setTouched((p) => ({ ...p, email: true }));

        if (!validateEmail(form.email)) {
            showToast("Vui lòng nhập email hợp lệ trước khi gửi OTP", "warning");
            return;
        }

        if (cooldown > 0) return;

        try {
            setSendingOtp(true);

            // Nếu user đổi email sau khi đã gửi/verify → reset OTP
            if (otpSent || otpVerified) resetOtpState();

            const res = await requestRegisterOtpApi(form.email.trim());
            const data = res?.data || {};

            const otpSessionId = data?.otpSessionId || data?.sessionId || "";
            if (!otpSessionId) {
                showToast("Không nhận được otpSessionId từ server", "error");
                return;
            }

            setForm((p) => ({ ...p, otpSessionId }));
            setOtpSent(true);

            // backend trả cooldownSeconds / expiresInSeconds (đúng như BE)
            const cd = Number(data?.cooldownSeconds ?? 60);
            const exp = Number(data?.expiresInSeconds ?? 300);

            setCooldown(Number.isFinite(cd) ? cd : 60);
            setExpiresIn(Number.isFinite(exp) ? exp : 300);

            showToast("Đã gửi OTP, vui lòng kiểm tra email", "success");
        } catch (e) {
            showToast(getErrorMessage(e, "Gửi OTP thất bại"), "error");
        } finally {
            setSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        setTouched((p) => ({ ...p, otp: true, email: true }));

        if (!validateEmail(form.email)) {
            showToast("Email không hợp lệ", "warning");
            return;
        }
        if (!form.otpSessionId) {
            showToast("Thiếu otpSessionId, vui lòng gửi OTP lại", "warning");
            return;
        }
        if (!validateOtp(form.otp)) {
            showToast("OTP phải gồm đúng 6 chữ số", "warning");
            return;
        }
        if (expiresIn <= 0) {
            showToast("OTP đã hết hạn, vui lòng gửi lại mã", "warning");
            return;
        }

        try {
            setVerifyingOtp(true);

            await verifyRegisterOtpApi({
                otpSessionId: form.otpSessionId,
                email: form.email.trim(),
                otp: form.otp.trim(),
            });

            setOtpVerified(true);
            showToast("Xác nhận email thành công", "success");
        } catch (e) {
            setOtpVerified(false);
            showToast(getErrorMessage(e, "OTP không đúng hoặc đã hết hạn"), "error");
        } finally {
            setVerifyingOtp(false);
        }
    };

    /* =====================
       Submit Register
    ===================== */
    const submit = async () => {
        markAllTouched();

        if (!otpVerified) {
            showToast("Vui lòng xác nhận OTP trước khi đăng ký", "warning");
            return;
        }

        if (
            !validateEmail(form.email) ||
            !validatePassword(form.password) ||
            !form.classId ||
            !form.moduleId ||
            !validateOtp(form.otp) ||
            !form.otpSessionId
        ) {
            showToast("Vui lòng kiểm tra lại thông tin đăng ký", "warning");
            return;
        }

        const payload = {
            email: form.email.trim(),
            password: form.password,
            classId: form.classId,
            moduleId: form.moduleId,
            fullName: form.fullName?.trim() || form.email.split("@")[0],

            // ✅ OTP required by BE
            otp: form.otp.trim(),
            otpSessionId: form.otpSessionId,
        };

        try {
            setLoading(true);
            await registerApi(payload);

            showToast("Đăng ký thành công! Vui lòng đăng nhập", "success");
            navigate("/login", { state: { registered: true } });
        } catch (e) {
            showToast(
                getErrorMessage(e, "Đăng ký thất bại, vui lòng thử lại"),
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    const disableAll = loading || sendingOtp || verifyingOtp;

    const otpHelperText = useMemo(() => {
        if (!otpSent) return "";
        if (otpVerified) return "Email đã được xác nhận ";
        if (expiresIn > 0) return `Mã hết hạn sau ${expiresIn}s`;
        return "OTP đã hết hạn, vui lòng gửi lại mã";
    }, [otpSent, otpVerified, expiresIn]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                backgroundImage: 'url(/images/background_login.jpg)',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
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
            <GlobalLoading
                open={loading}
                message="Vui lòng chờ... Đang đăng ký"
            />

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
                                filter:
                                    "drop-shadow(0 4px 12px rgba(46, 45, 132, 0.25))",
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
                        {/* Email + Send OTP */}
                        <TextField
                            label="Email"
                            value={form.email}
                            onChange={(e) => {
                                const nextEmail = e.target.value;
                                setForm((p) => ({ ...p, email: nextEmail }));

                                if (!touched.email) {
                                    setTouched((p) => ({ ...p, email: true }));
                                }
                                if (otpSent || otpVerified) {
                                    resetOtpState();
                                }
                            }}
                            onBlur={() =>
                                setTouched((p) => ({ ...p, email: true }))
                            }
                            error={!!errors.email}
                            helperText={errors.email}
                            autoComplete="email"
                            disabled={disableAll}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Button
                                            onClick={sendOtp}
                                            disabled={
                                                disableAll ||
                                                !validateEmail(form.email) ||
                                                cooldown > 0
                                            }
                                            sx={{
                                                minWidth: 108,
                                                borderRadius: 2,
                                                textTransform: "none",
                                                fontWeight: 600,
                                                px: 1.5,
                                            }}
                                            variant="outlined"
                                        >
                                            {sendingOtp
                                                ? "Đang gửi..."
                                                : cooldown > 0
                                                    ? `Gửi lại (${cooldown}s)`
                                                    : "Gửi mã"}
                                        </Button>
                                    </InputAdornment>
                                ),
                            }}
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

                        {/* OTP (show after sent) */}
                        {otpSent && (
                            <Stack spacing={1.2}>
                                <TextField
                                    label="Mã OTP (6 số)"
                                    value={form.otp}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                        setForm((p) => ({ ...p, otp: v }));
                                        if (!touched.otp) {
                                            setTouched((p) => ({ ...p, otp: true }));
                                        }
                                        // nếu đã verify mà user sửa OTP -> bỏ verify
                                        if (otpVerified) setOtpVerified(false);
                                    }}
                                    onBlur={() =>
                                        setTouched((p) => ({ ...p, otp: true }))
                                    }
                                    error={!!errors.otp}
                                    helperText={errors.otp || otpHelperText}
                                    disabled={disableAll}
                                    fullWidth
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
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

                                <Stack direction="row" spacing={1.2}>
                                    <Button
                                        onClick={verifyOtp}
                                        disabled={
                                            disableAll ||
                                            otpVerified ||
                                            !validateOtp(form.otp) ||
                                            expiresIn <= 0
                                        }
                                        variant="contained"
                                        sx={{
                                            flex: 1,
                                            borderRadius: 2.5,
                                            textTransform: "none",
                                            fontWeight: 700,
                                            background:
                                                otpVerified
                                                    ? "linear-gradient(135deg, #2E2D84 0%, #2E2D84 100%)"
                                                    : "linear-gradient(135deg, #2E2D84 0%, #EC5E32 100%)",
                                            boxShadow: "0 6px 20px rgba(46, 45, 132, 0.25)",
                                            "&:hover": {
                                                background:
                                                    otpVerified
                                                        ? "linear-gradient(135deg, #2E2D84 0%, #2E2D84 100%)"
                                                        : "linear-gradient(135deg, #242370 0%, #d34d28 100%)",
                                            },
                                        }}
                                    >
                                        {verifyingOtp
                                            ? "Đang xác nhận..."
                                            : otpVerified
                                                ? "Đã xác nhận "
                                                : "Xác nhận OTP"}
                                    </Button>
                                </Stack>
                            </Stack>
                        )}

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
                            disabled={disableAll || !otpVerified}
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
                            helperText={
                                otpVerified
                                    ? "Có thể bỏ trống (sẽ lấy từ email)"
                                    : "Vui lòng xác nhận email trước"
                            }
                            autoComplete="name"
                            disabled={disableAll || !otpVerified}
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
                            disabled={disableAll || !otpVerified}
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
                            disabled={disableAll || !otpVerified}
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
                            disabled={disableAll || !otpVerified}
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