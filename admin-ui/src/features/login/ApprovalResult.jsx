import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function ApprovalResult() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const status = params.get("status");

    useEffect(() => {
        if (status === "success") {
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        }
    }, [status, navigate]);

    return (
        <div style={{ textAlign: "center", marginTop: 100 }}>
            {status === "success" && (
                <>
                    <h2>✅ Duyệt thành công</h2>
                    <p>Học viên đã được kích hoạt.</p>
                    <p>Đang chuyển về trang đăng nhập...</p>
                </>
            )}

            {status === "already-approved" && (
                <>
                    <h2>⚠️ Tài khoản đã được duyệt trước đó</h2>
                    <button onClick={() => navigate("/login")}>
                        Về trang đăng nhập
                    </button>
                </>
            )}

            {status === "error" && (
                <h2>❌ Token không hợp lệ</h2>
            )}
        </div>
    );
}