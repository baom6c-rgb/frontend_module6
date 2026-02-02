import { createBrowserRouter, Navigate } from "react-router-dom";
import { Box } from "@mui/material";

// --- LAYOUTS ---
import AdminLayout from "../layout/AdminLayout.jsx";
import UserLayout from "../layout/UserLayout.jsx";

// --- COMPONENTS ---
import ProtectedRoute from "./ProtectedRoute.jsx";

// --- PAGES ADMIN ---
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminUserList from "../features/admin/AdminUserList.jsx";
import AdminReview from "../features/admin/AdminReview.jsx";
import AdminSettings from "../features/admin/AdminSettings.jsx"; // ✅ NEW

// --- PAGES USER ---
import UserDashboard from "../features/users/UserDashboard.jsx";
import UserProfile from "../features/users/UserProfile.jsx";
import UserStudy from "../features/users/UserStudy.jsx";
import UserReview from "../features/users/UserReview.jsx";
import StudentMaterialsPage from "../features/users/materials/StudentMaterialsPage";
import PracticePage from "../features/practice/PracticePage.jsx";

// --- PAGES AUTH ---
import Login from "../features/login/Login.jsx";
import Register from "../features/login/Register";
import WaitingApproval from "../features/login/WaitingApproval";
import SelectClassModule from "../features/login/SelectClassModule.jsx";
import ApprovalResult from "../features/login/ApprovalResult.jsx";
import ForgotPassword from "../features/login/ForgotPassword.jsx";
import ResetPassword from "../features/login/ResetPassword.jsx";

const router = createBrowserRouter([
    // =========================
    // 1) PUBLIC ROUTES
    // =========================
    { path: "/", element: <Navigate to="/login" replace /> },

    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },

    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },

    // Google created -> choose class/module
    { path: "/complete-profile", element: <SelectClassModule /> },

    // optional: approval result page
    { path: "/approval-result", element: <ApprovalResult /> },

    // =========================
    // 2) USER ROUTES (STUDENT/ADMIN)
    // =========================
    {
        path: "/users",
        element: <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]} />,
        children: [
            {
                element: <UserLayout />,
                children: [
                    { index: true, element: <UserDashboard /> },
                    { path: "dashboard", element: <UserDashboard /> },

                    // ✅ waiting approval inside UserLayout -> có header/menu/logout
                    { path: "waiting-approval", element: <WaitingApproval /> },

                    { path: "profile", element: <UserProfile /> },
                    { path: "study", element: <UserStudy /> },
                    { path: "practice", element: <PracticePage /> },
                    { path: "review", element: <UserReview /> },

                    {
                        path: "materials",
                        children: [
                            { index: true, element: <StudentMaterialsPage /> }, // /users/materials
                            { path: "upload", element: <StudentMaterialsPage /> }, // /users/materials/upload
                        ],
                    },
                ],
            },
        ],
    },

    // =========================
    // 3) ADMIN ROUTES
    // =========================
    {
        path: "/admin",
        element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    { index: true, element: <AdminDashboard /> },

                    // ✅ CHÚ Ý: trong children của "/admin" thì path chỉ cần "review" (không cần "/admin/review")
                    { path: "review", element: <AdminReview /> },

                    // ✅ NEW: Admin Settings
                    { path: "settings", element: <AdminSettings /> },

                    // redirect các route cũ về /admin/users
                    { path: "students", element: <Navigate to="/admin/users" replace /> },
                    { path: "blocked", element: <Navigate to="/admin/users" replace /> },
                    { path: "approval", element: <Navigate to="/admin/users" replace /> },

                    // trang quản lý user tổng
                    { path: "users", element: <AdminUserList /> },
                ],
            },
        ],
    },

    // =========================
    // 4) NOT FOUND
    // =========================
    {
        path: "*",
        element: (
            <Box sx={{ p: 5, textAlign: "center" }}>
                <h1 style={{ color: "#2B3674" }}>404 Not Found</h1>
                <p>Trang bạn tìm kiếm không tồn tại.</p>
            </Box>
        ),
    },
]);

export default router;
