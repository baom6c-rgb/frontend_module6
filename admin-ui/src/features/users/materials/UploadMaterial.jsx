import { useState } from "react";
import {
    Box, Paper, Typography, Button, Alert,
    CircularProgress, LinearProgress
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { materialApi } from "../../../api/materialApi";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt)$/i;

export default function UserMaterialsUpload({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [msg, setMsg] = useState({ type: "", text: "" });

    // local state (không bắt buộc)
    const [materialId, setMaterialId] = useState(null);

    const resetFileInput = (e) => {
        if (e?.target) e.target.value = "";
    };

    const handlePick = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.size > MAX_SIZE_BYTES) {
            setMsg({ type: "error", text: "File quá dung lượng (tối đa 10MB), không thể upload." });
            setFile(null);
            setProgress(0);
            resetFileInput(e);
            return;
        }

        if (!ALLOWED_EXT_REGEX.test(f.name)) {
            setMsg({ type: "error", text: "Chọn file sai định dạng. Chỉ chọn được PDF / DOCX / TXT." });
            setFile(null);
            setProgress(0);
            resetFileInput(e);
            return;
        }

        setFile(f);
        setProgress(0);
        setMsg({ type: "", text: "" });
        setMaterialId(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setMsg({ type: "error", text: "Vui lòng chọn file (PDF / DOCX / TXT)." });
            return;
        }

        try {
            setLoading(true);
            setProgress(0);
            setMsg({ type: "", text: "" });

            const res = await materialApi.upload(file, (p) => setProgress(p));

            const id = res.data?.materialId;
            const message = res.data?.message || "Tải tài liệu thành công!";

            setMsg({ type: "success", text: message });
            setFile(null);
            setMaterialId(id);

            // ✅ QUAN TRỌNG: báo cho parent biết materialId để auto-next step
            if (id) onUploaded?.(id);

        } catch (e) {
            const data = e.response?.data;
            setMsg({
                type: "error",
                text: typeof data === "string" ? data : (data?.message || "Upload thất bại"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#1B2559" }}>
                    Upload tài liệu học (PDF / DOCX / TXT)
                </Typography>

                <Button
                    sx={{ mt: 2 }}
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileRoundedIcon />}
                    disabled={loading}
                >
                    Chọn file
                    <input hidden type="file" onChange={handlePick} accept=".pdf,.docx,.txt" />
                </Button>

                {file && (
                    <Typography sx={{ mt: 1, fontWeight: 600, color: "#2B3674" }}>
                        📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                )}

                {loading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>
                            Đang upload... {progress}%
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </Box>
                )}

                {msg.text && <Alert severity={msg.type} sx={{ mt: 2 }}>{msg.text}</Alert>}

                <Box sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={handleUpload} disabled={loading}>
                        {loading ? <CircularProgress size={22} /> : "Upload"}
                    </Button>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                    Chỉ hỗ trợ PDF / DOCX / TXT, dung lượng tối đa 10MB. Upload xong hệ thống tự trích xuất & lưu DB.
                </Alert>

                {/* (optional) debug */}
                {materialId && (
                    <Typography sx={{ mt: 1, fontWeight: 700, color: "#6C757D" }}>
                        MaterialId: {materialId}
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}
