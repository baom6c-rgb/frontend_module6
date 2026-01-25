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

const ProtectedRoute = ({ allowedRoles }) => {
    const location = useLocation();

    const { token: reduxToken, roles: reduxRoles = [], user: reduxUser } =
        useSelector((state) => state.auth || {});

    const storedUser = getStoredUser();
    const status = (reduxUser?.status || storedUser?.status || "").toUpperCase();

    const isWaitingPath = location.pathname.startsWith("/users/waiting-approval");
    const isWaiting = status === "WAITING_APPROVAL" || localStorage.getItem("pendingApproval") === "1";

    // ✅ FIX QUAN TRỌNG:
    // Cho phép vào trang waiting-approval dù chưa có token
    if (!reduxToken && !localStorage.getItem("accessToken")) {
        if (isWaitingPath && isWaiting) {
            return <Outlet />;
        }
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    const token = reduxToken || localStorage.getItem("accessToken");

    const roles = reduxRoles?.length > 0 ? reduxRoles : getStoredRoles();
    const normalizedRoles = normalizeRoles(roles);

    // role check
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

    // gate theo status
    if (isWaiting && !isWaitingPath) {
        return <Navigate to="/users/waiting-approval" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
