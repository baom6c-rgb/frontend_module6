import { useMemo, useState } from "react";
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    LinearProgress,
    Divider,
    Stack,
    Chip,
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

    // local state (optional)
    const [materialId, setMaterialId] = useState(null);

    const fileLabel = useMemo(() => {
        if (!file) return "";
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        return `${file.name} (${sizeMB} MB)`;
    }, [file]);

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
            setMaterialId(null);
            resetFileInput(e);
            return;
        }

        if (!ALLOWED_EXT_REGEX.test(f.name)) {
            setMsg({ type: "error", text: "Chọn file sai định dạng. Chỉ chọn được PDF / DOCX / TXT." });
            setFile(null);
            setProgress(0);
            setMaterialId(null);
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
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Header */}
            <Stack spacing={0.75}>
                <Typography sx={{ fontWeight: 900, color: "#1B2559", fontSize: 20 }}>
                    Upload tài liệu học
                </Typography>
                <Typography sx={{ color: "#6C757D", fontWeight: 600 }}>
                    Hỗ trợ PDF / DOCX / TXT. Hệ thống sẽ tự trích xuất văn bản để AI tạo câu hỏi.
                </Typography>
            </Stack>

            <Divider />

            {/* Pick file */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center" }}>
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileRoundedIcon />}
                    disabled={loading}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 800,
                        borderColor: "#E3E8EF",
                        color: "#1B2559",
                        "&:hover": { borderColor: "#2E2D84" },
                    }}
                >
                    Chọn file
                    <input hidden type="file" onChange={handlePick} accept=".pdf,.docx,.txt" />
                </Button>

                {file ? (
                    <Chip
                        label={`📄 ${fileLabel}`}
                        sx={{
                            fontWeight: 800,
                            bgcolor: "#F7F9FC",
                            color: "#2B3674",
                            border: "1px solid #E3E8EF",
                        }}
                    />
                ) : (
                    <Chip
                        label="Chưa chọn file"
                        sx={{
                            fontWeight: 800,
                            bgcolor: "#F7F9FC",
                            color: "#6C757D",
                            border: "1px solid #E3E8EF",
                        }}
                    />
                )}
            </Box>

            {/* Progress */}
            {loading && (
                <Box sx={{ mt: 0.5 }}>
                    <Typography sx={{ mb: 1, fontWeight: 700, color: "#1B2559" }}>
                        Đang upload... {progress}%
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>
            )}

            {/* Message */}
            {msg.text && (
                <Alert severity={msg.type} sx={{ mt: 0.5 }}>
                    {msg.text}
                </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end", alignItems: "center" }}>
                <Button
                    variant="contained"
                    onClick={handleUpload}
                    disabled={loading || !file}
                    sx={{
                        bgcolor: "#FF8C00",
                        fontWeight: 900,
                        borderRadius: 2,
                        px: 2.5,
                        "&:hover": { bgcolor: "#e67e00" },
                        "&.Mui-disabled": { bgcolor: "#E9ECEF", color: "#6C757D" },
                    }}
                >
                    {loading ? <CircularProgress size={22} /> : "Upload"}
                </Button>
            </Box>

            {/* Info */}
            <Alert severity="info">
                Chỉ hỗ trợ PDF / DOCX / TXT, dung lượng tối đa 10MB. Upload xong hệ thống tự trích xuất & lưu DB.
            </Alert>

            {/* Optional debug */}
            {materialId && (
                <Typography sx={{ fontWeight: 800, color: "#6C757D" }}>
                    MaterialId: {materialId}
                </Typography>
            )}
        </Box>
    );
}
