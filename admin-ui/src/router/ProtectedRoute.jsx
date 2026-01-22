import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles }) => {
    // Lấy thông tin từ Redux Store với fallback
    const { token, roles = [] } = useSelector((state) => state.auth || {});

    // 1. Kiểm tra xem đã đăng nhập chưa
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Kiểm tra quyền truy cập (nếu có yêu cầu roles)
    if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRoles = roles.map(r => r.replace("ROLE_", ""));

        const hasPermission = allowedRoles.some(role => normalizedRoles.includes(role));


        if (!hasPermission) {
            console.log("Allowed:", allowedRoles, "User Roles:", normalizedRoles);
            // Nếu là Admin nhưng vào nhầm trang User hoặc ngược lại
            // Chuyển hướng về trang chủ tương ứng với Role của họ
            if (normalizedRoles.includes("ADMIN")) {
                return <Navigate to="/admin" replace />;
            }
            if (normalizedRoles.includes("STUDENT")) {
                return <Navigate to="/users/dashboard" replace />;
            }
            return <Navigate to="/login" replace />;
        }
    }

    // Nếu thỏa mãn hết điều kiện -> Cho phép truy cập vào trang con (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;