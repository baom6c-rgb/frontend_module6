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

import { getAllClassesApi } from "../../api/classApi.js";
import { getAllModulesApi } from "../../api/moduleApi.js";
import { completeProfileApi } from "../../api/userApi.js";

import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

const safeParse = (key, fallback = null) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

export default function SelectClassModule() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [form, setForm] = useState({ classId: null, moduleId: null });
    const [touched, setTouched] = useState({ classId: false, moduleId: false });
    const [loading, setLoading] = useState(false);

    // ✅ resolve email robustly (register_email OR userData.email)
    const resolveEmail = () => {
        const reg = localStorage.getItem("register_email");
        if (reg && String(reg).trim()) return String(reg).trim();

        const u = safeParse("userData", {});
        const fromUserData = u?.email;
        if (fromUserData && String(fromUserData).trim()) return String(fromUserData).trim();

        return "";
    };

    const [email, setEmail] = useState(() => resolveEmail());

    // ===== load options =====
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const [classRes, moduleRes] = await Promise.all([
                    getAllClassesApi(),
                    getAllModulesApi(),
                ]);
                if (!mounted) return;
                setClasses(classRes?.data || []);
                setModules(moduleRes?.data || []);
            } catch {
                showToast("Không load được danh sách lớp / module", "error");
            }
        };

        fetchData();
        return () => {
            mounted = false;
        };
    }, [showToast]);

    // ✅ ensure email exists, and sync back to register_email
    useEffect(() => {
        const e = resolveEmail();
        if (!e) {
            showToast("Không tìm thấy email đăng ký Google. Vui lòng đăng nhập lại.", "warning");
            navigate("/login", { replace: true });
            return;
        }
        setEmail(e);
        localStorage.setItem("register_email", e);
    }, [navigate, showToast]);

    const selectedClass = useMemo(
        () => classes.find((c) => c.id === form.classId) || null,
        [classes, form.classId]
    );

    const selectedModule = useMemo(
        () => modules.find((m) => m.id === form.moduleId) || null,
        [modules, form.moduleId]
    );

    const classError = touched.classId && !form.classId ? "Vui lòng chọn lớp" : "";
    const moduleError = touched.moduleId && !form.moduleId ? "Vui lòng chọn module" : "";

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

            // ✅ bắt lỗi BE trả sai format
            if (!payload || typeof payload === "string") {
                showToast("BE chưa trả AuthResponse sau complete-profile.", "error");
                return;
            }

            const status = String(payload?.status || "").toUpperCase();

            // ✅ nghiệp vụ đúng: complete-profile xong phải là WAITING_APPROVAL
            if (status !== "WAITING_APPROVAL") {
                showToast(`Trạng thái sau complete-profile không đúng: ${status || "(empty)"}`, "error");
                return;
            }

            // ✅ sync auth localStorage
            const token = payload?.token || payload?.accessToken || payload?.jwt;
            if (token) localStorage.setItem("accessToken", token);

            localStorage.setItem("userRoles", JSON.stringify(payload.roles || []));
            localStorage.setItem("userData", JSON.stringify(payload));

            // ✅ set flag để ProtectedRoute gate đúng
            localStorage.setItem("pendingApproval", "1");
            localStorage.removeItem("onboardingCreated"); // nếu có dùng
            localStorage.removeItem("register_email"); // xong onboarding thì bỏ

            showToast("Gửi yêu cầu thành công. Vui lòng chờ admin phê duyệt.", "success");

            // ✅ luôn chuyển sang trang chờ duyệt
            navigate("/users/waiting-approval", { replace: true });
        } catch (err) {
            console.error("complete-profile error:", err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
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
