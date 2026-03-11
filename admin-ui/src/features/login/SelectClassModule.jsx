// src/features/login/SelectClassModule.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    Autocomplete,
    TextField,
} from "@mui/material";
import { useDispatch } from "react-redux";

import { getAllClassesApi } from "../../api/classApi";
import { getAllModulesApi } from "../../api/moduleApi";
import { completeProfileApi } from "../../api/userApi";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

// ✅ đúng theo project của mày (WaitingApproval cũng đang import kiểu này)
import { setAuth } from "../auth/authSlice";

// ===== helpers =====
const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

const normalizeStatus = (v) => String(v || "").trim().toUpperCase();

const resolveEmail = () => {
    const reg = localStorage.getItem("register_email");
    if (reg && String(reg).trim()) return String(reg).trim();

    const u = safeParse("userData", {});
    const fromUserData = u?.email;
    if (fromUserData && String(fromUserData).trim()) return String(fromUserData).trim();

    return "";
};

const normalizeRoles = (roles) =>
    (roles || [])
        .filter(Boolean)
        .map((r) => String(r).replace("ROLE_", "").toUpperCase());

export default function SelectClassModule() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const dispatch = useDispatch();

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [form, setForm] = useState({ classId: null, moduleId: null });
    const [touched, setTouched] = useState({ classId: false, moduleId: false });

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(() => resolveEmail());

    // ===== 1) Ensure email exists =====
    useEffect(() => {
        const e = resolveEmail();
        if (!e) {
            showToast("Không tìm thấy email Google. Vui lòng đăng nhập lại.", "warning");
            navigate("/login", { replace: true });
            return;
        }
        setEmail(e);
        localStorage.setItem("register_email", e);
    }, [navigate, showToast]);

    // ===== 2) Load options =====
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const [classRes, moduleRes] = await Promise.all([getAllClassesApi(), getAllModulesApi()]);
                if (!mounted) return;

                setClasses(Array.isArray(classRes?.data) ? classRes.data : []);
                setModules(Array.isArray(moduleRes?.data) ? moduleRes.data : []);
            } catch {
                showToast("Không load được danh sách lớp / module", "error");
            }
        };

        fetchData();
        return () => {
            mounted = false;
        };
    }, [showToast]);

    const selectedClass = useMemo(
        () => classes.find((c) => c?.id === form.classId) || null,
        [classes, form.classId]
    );

    const selectedModule = useMemo(
        () => modules.find((m) => m?.id === form.moduleId) || null,
        [modules, form.moduleId]
    );

    const classError = touched.classId && !form.classId ? "Vui lòng chọn lớp" : "";
    const moduleError = touched.moduleId && !form.moduleId ? "Vui lòng chọn module" : "";

    // ✅ sync redux auth ngay sau complete-profile
    const syncReduxAuthNow = (token, roles, user) => {
        dispatch(
            setAuth({
                token: token || "",
                roles: roles || [],
                user: user || null,
            })
        );
    };

    const submit = async () => {
        if (loading) return;

        setTouched({ classId: true, moduleId: true });

        if (!form.classId || !form.moduleId) {
            showToast("Vui lòng chọn đầy đủ lớp và module", "warning");
            return;
        }

        const currentEmail = resolveEmail();
        if (!currentEmail) {
            showToast("Thiếu email. Vui lòng đăng nhập lại.", "error");
            navigate("/login", { replace: true });
            return;
        }

        try {
            setLoading(true);

            const res = await completeProfileApi({
                email: currentEmail,
                classId: form.classId,
                moduleId: form.moduleId,
            });

            const payload = res?.data;

            if (!payload || typeof payload === "string") {
                showToast("Backend chưa trả AuthResponse hợp lệ sau complete-profile.", "error");
                return;
            }

            // token/roles/status
            const token = payload?.token || payload?.accessToken || payload?.jwt || "";
            const roles = normalizeRoles(payload?.roles || safeParse("userRoles", []));
            const status = normalizeStatus(payload?.status || payload?.userStatus) || "WAITING_APPROVAL";

            // ===== Sync localStorage (ProtectedRoute fallback) =====
            if (token) localStorage.setItem("accessToken", token);
            localStorage.setItem("userRoles", JSON.stringify(roles));

            const prevUser = safeParse("userData", {});
            const mergedUserData = {
                ...prevUser,
                ...payload,
                email: payload?.email || prevUser?.email || currentEmail,
                status, // ✅ quan trọng
                classId: form.classId,
                moduleId: form.moduleId,
            };
            localStorage.setItem("userData", JSON.stringify(mergedUserData));

            localStorage.setItem("pendingApproval", "1");
            // giữ register_email cho ổn định
            // localStorage.removeItem("register_email");

            // ===== ✅ Sync Redux ngay lập tức (KEY FIX) =====
            syncReduxAuthNow(token || localStorage.getItem("accessToken") || "", roles, mergedUserData);

            // ===== Route by status =====
            if (status === "WAITING_APPROVAL") {
                showToast("Gửi yêu cầu thành công. Vui lòng chờ admin phê duyệt.", "success");
                navigate("/users/waiting-approval", { replace: true });
                return;
            }

            if (status === "ACTIVE") {
                showToast("Tài khoản đã ACTIVE. Chuyển về Dashboard.", "success");
                navigate("/users/dashboard", { replace: true });
                return;
            }

            showToast(`Trạng thái tài khoản: ${status}. Vui lòng đăng nhập lại.`, "warning");
            navigate("/login", { replace: true });
        } catch (err) {
            console.error("complete-profile error:", err);
            const msg =
                (typeof err?.response?.data === "string" && err.response.data) ||
                err?.response?.data?.message ||
                err?.message ||
                "Gửi yêu cầu thất bại";
            showToast(String(msg), "error");
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
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang gửi yêu cầu" />

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
                        Hoàn tất hồ sơ
                    </Typography>

                    <Typography
                        variant="body2"
                        textAlign="center"
                        mb={2}
                        sx={{
                            color: "text.secondary",
                            fontSize: "13px",
                        }}
                    >
                        Chọn lớp và module để gửi yêu cầu tham gia hệ thống
                    </Typography>

                    {!!email && (
                        <Typography
                            textAlign="center"
                            sx={{
                                color: "#2E2D84",
                                fontWeight: 600,
                                fontSize: "14px",
                                mb: 2.5,
                                px: 2,
                                py: 1,
                                backgroundColor: "rgba(46, 45, 132, 0.08)",
                                borderRadius: 2,
                            }}
                        >
                            {email}
                        </Typography>
                    )}

                    <Stack spacing={2}>
                        <Autocomplete
                            options={classes}
                            value={selectedClass}
                            getOptionLabel={(o) => o?.className || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, classId: v?.id || null }));
                                setTouched((p) => ({ ...p, classId: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, classId: true }))}
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Lớp học"
                                    error={!!classError}
                                    helperText={classError}
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

                        <Autocomplete
                            options={modules}
                            value={selectedModule}
                            getOptionLabel={(o) => o?.moduleName || ""}
                            isOptionEqualToValue={(o, v) => o?.id === v?.id}
                            onChange={(_, v) => {
                                setForm((p) => ({ ...p, moduleId: v?.id || null }));
                                setTouched((p) => ({ ...p, moduleId: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, moduleId: true }))}
                            disabled={loading}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Module"
                                    error={!!moduleError}
                                    helperText={moduleError}
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
                            Gửi yêu cầu
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
                            Quay lại đăng nhập
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}