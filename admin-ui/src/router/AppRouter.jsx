import { createBrowserRouter, Navigate } from "react-router-dom";
import { Box } from '@mui/material';

// --- LAYOUTS ---
import AdminLayout from "../layout/AdminLayout.jsx";
import UserLayout from "../layout/UserLayout.jsx";

// --- COMPONENTS ---
import ProtectedRoute from "./ProtectedRoute.jsx"; // Đảm bảo file này nằm cùng thư mục hoặc đúng đường dẫn

// --- PAGES ADMIN ---
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import StudentList from "../features/admin/StudentList";
import AdminApproval from "../features/admin/AdminApproval";
import StudentBlocked from "../features/admin/StudentBlocked";
import AdminUserList from "../features/admin/AdminUserList.jsx";


// --- PAGES USER ---
import UserDashboard from "../features/users/UserDashboard.jsx";
import UserProfile from "../features/users/UserProfile.jsx";
import UserStudy from "../features/users/UserStudy.jsx";
import UserReview from "../features/users/UserReview.jsx";
import StudentMaterialsPage from "../features/users/materials/StudentMaterialsPage";


// --- PAGES AUTH ---
import Login from "../features/login/Login.jsx";
import Register from "../features/login/Register";
import WaitingApproval from "../features/login/WaitingApproval";
import SelectClassModule from "../features/login/SelectClassModule.jsx";
import ApprovalResult from "../features/login/ApprovalResult.jsx";
import ForgotPassword from "../features/login/ForgotPassword.jsx";
import ResetPassword from "../features/login/ResetPassword.jsx";


const router = createBrowserRouter([
    // 1. NHÓM PUBLIC ROUTES (Ai cũng vào được)
    {
        path: "/",
        element: <Navigate to="/login" replace />,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
    },
    {
        path: "/reset-password",
        element: <ResetPassword />,
    },

    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/waiting",
        element: <WaitingApproval />,
    },
    {
        path: "/complete-profile",
        element: <SelectClassModule />,
    },
    {
        path: "/approval-result",
        element: <ApprovalResult />,
    },

    // 2. NHÓM USER ROUTES (Yêu cầu đăng nhập & Role STUDENT/ADMIN)
    {
        path: "/users",
        element: <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']} />,
        children: [
            {
                // ĐÂY LÀ ĐỐI TƯỢNG BỊ THIẾU DẤU { } HOẶC ĐẶT SAI CẤP
                element: <UserLayout />,
                children: [
                    {
                        index: true,
                        element: <UserDashboard />,
                    },
                    {
                        path: "dashboard",
                        element: <UserDashboard />,
                    },
                    {
                        path: "profile",
                        element: <UserProfile />,
                    },
                    {
                        path: "study",
                        element: <UserStudy />,
                    },
                    {
                        path: "review",
                        element: <UserReview />,
                    },
                    {
                        path: "materials",
                        children: [
                            { index: true, element: <StudentMaterialsPage /> },      // /users/materials
                            { path: "upload", element: <StudentMaterialsPage /> },   // /users/materials/upload
                        ],
                    }
                ]
            } // Đóng đối tượng bọc UserLayout
        ],
    },

    // 3. NHÓM ADMIN ROUTES (Chỉ dành riêng cho ADMIN)
    {
        path: "/admin",
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    { index: true, element: <AdminDashboard /> },
                    { path: "students", element: <StudentList /> },
                    { path: "blocked", element: <StudentBlocked /> },
                    { path: "approval", element: <AdminApproval /> },
                    { path: "users", element: <AdminUserList /> },
                ]
            }
        ],
    },

    // 4. NOT FOUND
    {
        path: "*",
        element: (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <h1 style={{ color: '#2B3674' }}>404 Not Found</h1>
                <p>Trang bạn tìm kiếm không tồn tại.</p>
            </Box>
        ),
    },

]);

export default router;