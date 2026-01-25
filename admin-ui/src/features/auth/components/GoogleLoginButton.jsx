import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { googleLoginThunk } from "../authThunk"; // sửa path đúng project
import { useToast } from "../../../components/common/AppToast"; // sửa path đúng project

export default function GoogleLoginButton({ disabled = false }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const normalizeRoles = (roles) =>
        (roles || []).map((r) => (typeof r === "string" ? r.replace("ROLE_", "") : r));

    const persistAuth = (res) => {
        const accessToken = res?.token || res?.accessToken || res?.jwt;
        if (accessToken) localStorage.setItem("accessToken", accessToken);

        localStorage.setItem("userRoles", JSON.stringify(res?.roles || []));
        localStorage.setItem("userData", JSON.stringify(res || {}));
    };

    const navigateByRole = (roles) => {
        const normalized = normalizeRoles(roles);
        if (normalized.includes("ADMIN")) return navigate("/admin", { replace: true });
        return navigate("/users/dashboard", { replace: true });
    };

    const onSuccess = async (credentialResponse) => {
        try {
            const idToken = credentialResponse?.credential;
            if (!idToken) {
                showToast("Google token not found", "error");
                return;
            }

            const res = await dispatch(googleLoginThunk(idToken)).unwrap();

            // ✅ Xử lý theo status trước để tránh race-condition lần 1
            if (res?.status === "CREATED") {
                // lưu để complete-profile dùng
                localStorage.removeItem("pendingApproval");
                localStorage.setItem("register_email", res?.email || "");
                // vẫn lưu userData/roles nếu muốn
                localStorage.setItem("userData", JSON.stringify(res || {}));
                localStorage.setItem("userRoles", JSON.stringify(res?.roles || []));
                navigate("/complete-profile", { replace: true });
                return;
            }

            if (res?.status === "WAITING_APPROVAL") {
                // ✅ set flag + userData TRƯỚC
                localStorage.setItem("pendingApproval", "1");
                localStorage.setItem("userData", JSON.stringify(res || {}));
                localStorage.setItem("userRoles", JSON.stringify(res?.roles || []));

                // nếu BE có trả token thì lưu luôn (không có cũng ok)
                const accessToken = res?.token || res?.accessToken || res?.jwt;
                if (accessToken) localStorage.setItem("accessToken", accessToken);

                showToast("Tài khoản đang chờ duyệt", "info");
                navigate("/users/waiting-approval", { replace: true });
                return;
            }

            if (res?.status === "ACTIVE") {
                localStorage.removeItem("pendingApproval");
                persistAuth(res);
                showToast("Đăng nhập Google thành công", "success");
                navigateByRole(res?.roles);
                return;
            }

            // fallback
            persistAuth(res);
            navigate("/users/dashboard", { replace: true });
        } catch (e) {
            const msg = typeof e === "string" ? e : e?.message || "Google login thất bại";
            showToast(msg, "error");
        }
    };

    return (
        <GoogleLogin
            onSuccess={onSuccess}
            onError={() => showToast("Google Login Failed", "error")}
            useOneTap={false}
            scope="openid email profile"
            disabled={disabled}
        />
    );
}
