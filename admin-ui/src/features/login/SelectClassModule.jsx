import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllClassesApi } from "../../api/classApi.js";
import { getAllModulesApi } from "../../api/moduleApi.js";
import { completeProfileApi } from "../../api/userApi.js";

const SelectClassModule = () => {
    const navigate = useNavigate();
    const email = localStorage.getItem("register_email");

    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);
    const [classId, setClassId] = useState("");
    const [moduleId, setModuleId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const classRes = await getAllClassesApi();
                const moduleRes = await getAllModulesApi();
                setClasses(classRes.data);
                setModules(moduleRes.data);
            } catch {
                setError("Không load được danh sách lớp / module");
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError("Không tìm thấy email đăng ký Google");
            return;
        }

        if (!classId || !moduleId) {
            setError("Vui lòng chọn đầy đủ lớp và module");
            return;
        }

        try {
            setLoading(true);
            setError("");

            await completeProfileApi({
                email,
                classId,
                moduleId,
            });

            localStorage.removeItem("register_email");
            navigate("/waiting");
        } catch (err) {
            setError(err.response?.data?.message || "Gửi yêu cầu thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>Hoàn tất hồ sơ</h2>
                <p style={styles.subtitle}>
                    Chọn lớp và module để gửi yêu cầu tham gia hệ thống
                </p>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lớp học</label>
                        <select
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">-- Chọn lớp --</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.className}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Module</label>
                        <select
                            value={moduleId}
                            onChange={(e) => setModuleId(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">-- Chọn module --</option>
                            {modules.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.moduleName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Đang gửi yêu cầu..." : "Gửi yêu cầu"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
    },
    card: {
        width: 380,
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    },
    title: {
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#555",
        textAlign: "center",
        marginBottom: 20,
    },
    error: {
        background: "#ffe5e5",
        color: "#d8000c",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 14,
        marginBottom: 12,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        display: "block",
        fontSize: 14,
        marginBottom: 6,
        fontWeight: 500,
    },
    select: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 6,
        border: "1px solid #ccc",
        fontSize: 14,
    },
    button: {
        width: "100%",
        padding: "12px",
        borderRadius: 8,
        border: "none",
        background: "#667eea",
        color: "#fff",
        fontWeight: 600,
        fontSize: 15,
        marginTop: 8,
    },
};

export default SelectClassModule;