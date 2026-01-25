import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const getStoredUser = () => {
    try {
        const s = localStorage.getItem("userData");
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
};

const getStoredRoles = () => {
    try {
        return JSON.parse(localStorage.getItem("userRoles") || "[]");
    } catch {
        return [];
    }
};

const normalizeRoles = (roles) =>
    (roles || [])
        .filter(Boolean)
        .map((r) => (typeof r === "string" ? r.replace("ROLE_", "") : r));

export default function ProtectedRoute({ allowedRoles }) {
    const location = useLocation();

    const { token: reduxToken, roles: reduxRoles = [], user: reduxUser } =
        useSelector((state) => state.auth || {});

    const storedUser = getStoredUser();
    const status = (reduxUser?.status || storedUser?.status || "").toUpperCase();

    // ===== paths =====
    const isWaitingPath = location.pathname.startsWith("/users/waiting-approval");
    const isCompleteProfilePath = location.pathname.startsWith("/complete-profile");

    // ===== flags/status =====
    // ✅ WAITING ưu tiên theo flag (vì status có thể chưa kịp update)
    const isWaiting =
        localStorage.getItem("pendingApproval") === "1" || status === "WAITING_APPROVAL";

    // ✅ CREATED chỉ đúng khi chưa bước sang WAITING
    const isCreated =
        !isWaiting && (status === "CREATED" || localStorage.getItem("onboardingCreated") === "1");

    // ===== token =====
    const token = reduxToken || localStorage.getItem("accessToken");

    // ✅ ALLOW WITHOUT TOKEN:
    // - CREATED users can access /complete-profile
    // - WAITING users can access /users/waiting-approval
    if (!token) {
        if (isCreated && isCompleteProfilePath) return <Outlet />;
        if (isWaiting && isWaitingPath) return <Outlet />;
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    // ===== role check =====
    const roles = reduxRoles?.length > 0 ? reduxRoles : getStoredRoles();
    const normalizedRoles = normalizeRoles(roles);

    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.some((r) =>
            normalizedRoles.includes(String(r).replace("ROLE_", ""))
        );

        if (!hasPermission) {
            if (normalizedRoles.includes("ADMIN")) return <Navigate to="/admin" replace />;
            if (normalizedRoles.includes("STUDENT")) return <Navigate to="/users/dashboard" replace />;
            return <Navigate to="/login" replace />;
        }
    }

    // ✅ GATE ORDER: WAITING trước CREATED
    if (isWaiting && !isWaitingPath) {
        return <Navigate to="/users/waiting-approval" replace />;
    }

    if (isCreated && !isCompleteProfilePath) {
        return <Navigate to="/complete-profile" replace />;
    }

    return <Outlet />;
}
