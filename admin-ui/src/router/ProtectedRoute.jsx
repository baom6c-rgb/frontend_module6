import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const safeJson = (key, fallback) => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch {
        return fallback;
    }
};

const getStoredUser = () => safeJson("userData", null);
const getStoredRoles = () => safeJson("userRoles", []);

const normalizeRoles = (roles) =>
    (roles || [])
        .filter(Boolean)
        .map((r) => (typeof r === "string" ? r.replace("ROLE_", "") : String(r).replace("ROLE_", "")));

export default function ProtectedRoute({ allowedRoles }) {
    const location = useLocation();

    const { token: reduxToken, roles: reduxRoles = [], user: reduxUser } =
        useSelector((state) => state.auth || {});

    const token = reduxToken || localStorage.getItem("accessToken");

    const storedUser = getStoredUser();

    const rawStatus =
        reduxUser?.status ||
        reduxUser?.userStatus ||
        storedUser?.status ||
        storedUser?.userStatus ||
        "";

    const status = String(rawStatus).toUpperCase();

    const isWaitingPath = location.pathname.startsWith("/users/waiting-approval");
    const isCompleteProfilePath = location.pathname.startsWith("/complete-profile");

    // ===== No token =====
    if (!token) {
        // CREATED (google new) can access complete-profile without token if you allow it
        if (status === "CREATED" && isCompleteProfilePath) return <Outlet />;

        // WAITING without token: rare, but don't force login loop
        if (status === "WAITING_APPROVAL" && isWaitingPath) return <Outlet />;

        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    // ===== STATUS GATE FIRST (important) =====
    // WAITING: always allow waiting page; redirect everything else to waiting page
    if (status === "WAITING_APPROVAL") {
        return isWaitingPath ? <Outlet /> : <Navigate to="/users/waiting-approval" replace />;
    }

    // CREATED: force complete-profile
    if (status === "CREATED") {
        return isCompleteProfilePath ? <Outlet /> : <Navigate to="/complete-profile" replace />;
    }

    // For non-ACTIVE statuses (REJECTED/BLOCKED/UNKNOWN), back to login
    if (status && status !== "ACTIVE") {
        return <Navigate to="/login" replace />;
    }

    // ===== ROLE CHECK ONLY WHEN ACTIVE =====
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

    return <Outlet />;
}
