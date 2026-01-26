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
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", bgcolor: "#F4F7FE" }}>
            <GlobalLoading open={loading} message="Vui lòng chờ... Đang gửi yêu cầu" />

            <Card sx={{ maxWidth: 460, mx: "auto", width: "100%", borderRadius: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" textAlign="center" sx={{ fontWeight: 800 }} mb={1}>
                        Hoàn tất hồ sơ
                    </Typography>

                    <Typography textAlign="center" sx={{ color: "#707EAE", fontWeight: 600 }} mb={3}>
                        Chọn lớp và module để gửi yêu cầu tham gia hệ thống
                    </Typography>

                    {!!email && (
                        <Typography textAlign="center" sx={{ color: "#A3AED0", fontWeight: 700 }} mb={2}>
                            {email}
                        </Typography>
                    )}

                    <Stack spacing={2.2}>
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
                                <TextField {...params} label="Lớp học" error={!!classError} helperText={classError} />
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
                                <TextField {...params} label="Module" error={!!moduleError} helperText={moduleError} />
                            )}
                        />

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                            disabled={loading}
                            sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none" }}
                        >
                            Gửi yêu cầu
                        </Button>

                        <Button
                            variant="text"
                            onClick={() => navigate("/login")}
                            disabled={loading}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Quay lại đăng nhập
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
