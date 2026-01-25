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

export default function SelectClassModule() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const email = localStorage.getItem("register_email") || "";

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);

    const [form, setForm] = useState({ classId: null, moduleId: null });
    const [touched, setTouched] = useState({ classId: false, moduleId: false });
    const [loading, setLoading] = useState(false);

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

    // ===== missing email => back login =====
    useEffect(() => {
        if (!email) {
            showToast("Không tìm thấy email đăng ký Google. Vui lòng đăng nhập lại.", "warning");
            navigate("/login", { replace: true });
        }
    }, [email, navigate, showToast]);

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

        try {
            setLoading(true);

            // ✅ BE cần trả AuthResponse (token/roles/status/email)
            const res = await completeProfileApi({
                email,
                classId: form.classId,
                moduleId: form.moduleId,
            });

            const payload = res?.data;

            // Nếu BE vẫn trả string => báo rõ để m biết BE chưa sửa
            if (!payload || typeof payload === "string") {
                showToast("BE chưa trả token sau complete-profile. Cần sửa API trả AuthResponse.", "error");
                return;
            }

            // ✅ sync auth localStorage theo chuẩn authSlice của m
            if (payload.token) localStorage.setItem("accessToken", payload.token);
            localStorage.setItem("userRoles", JSON.stringify(payload.roles || []));
            localStorage.setItem("userData", JSON.stringify(payload));

            // ✅ xóa register_email sau khi đã có token
            localStorage.removeItem("register_email");

            showToast("Gửi yêu cầu thành công. Vui lòng chờ admin phê duyệt.", "success");

            // ✅ waiting nằm trong user layout (có header + logout)
            navigate("/users/waiting-approval", { replace: true });
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
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
