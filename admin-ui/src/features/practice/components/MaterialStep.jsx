// src/features/practice/components/MaterialStep.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Divider,
    TextField,
    Button,
    Chip,
    Alert,
    LinearProgress,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip,
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { materialApi } from "../../../api/materialApi"; // ✅ dùng trực tiếp, khỏi tách component

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    blueHover: "#2E2D84",
    bgLight: "#F7F9FC",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt)$/i;

const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 20000;

export default function MaterialStep({ materialId, onMaterialUploaded, onAutoNext }) {
    const fileInputRef = useRef(null);

    const [textTitle, setTextTitle] = useState("");
    const [rawText, setRawText] = useState("");

    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [msg, setMsg] = useState({ type: "", text: "" });

    // ✅ Auto next khi có materialId từ parent
    useEffect(() => {
        if (materialId) onAutoNext?.();
    }, [materialId, onAutoNext]);

    const fileLabel = useMemo(() => {
        if (!file) return "";
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        return `${file.name} (${sizeMB} MB)`;
    }, [file]);

    const textLen = rawText.trim().length;

    const canSendText = textLen >= MIN_TEXT_CHARS && textLen <= MAX_TEXT_CHARS;
    const canUploadFile = !!file;

    const canSubmit = !loading && (canUploadFile || canSendText);

    const resetFileInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const clearAll = () => {
        setFile(null);
        resetFileInput();
        setTextTitle("");
        setRawText("");
        setProgress(0);
        setMsg({ type: "", text: "" });
    };

    const handlePickFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.size > MAX_SIZE_BYTES) {
            setMsg({ type: "error", text: "File quá dung lượng (tối đa 10MB), không thể upload." });
            setFile(null);
            resetFileInput();
            return;
        }

        if (!ALLOWED_EXT_REGEX.test(f.name)) {
            setMsg({ type: "error", text: "Chọn file sai định dạng. Chỉ chọn được PDF / DOCX / TXT." });
            setFile(null);
            resetFileInput();
            return;
        }

        // ✅ chọn file thì coi như ưu tiên file (chat kiểu “attach”)
        setFile(f);
        setMsg({ type: "", text: "" });
        setProgress(0);
    };

    const handleSubmit = async () => {
        if (!canSubmit) {
            if (!file && !rawText.trim()) {
                setMsg({ type: "error", text: "Hãy upload file hoặc dán nội dung để bắt đầu." });
                return;
            }
            if (!file && !canSendText) {
                setMsg({
                    type: "error",
                    text: `Nội dung dán còn ngắn (tối thiểu ${MIN_TEXT_CHARS} ký tự) hoặc quá dài (${MAX_TEXT_CHARS} ký tự).`,
                });
                return;
            }
            return;
        }

        try {
            setLoading(true);
            setMsg({ type: "", text: "" });
            setProgress(0);

            // ✅ Ưu tiên FILE nếu có
            if (file) {
                const res = await materialApi.upload(file, (p) => setProgress(p));
                const id = res.data?.materialId;
                const message = res.data?.message || "Upload thành công!";

                setMsg({ type: "success", text: message });
                clearAll();

                if (id) onMaterialUploaded?.(id);
                return;
            }

            // ✅ Không có file -> dùng PASTE TEXT
            const res = await materialApi.createFromText({
                title: textTitle.trim() || undefined,
                rawText: rawText.trim(),
            });

            const id = res.data?.materialId;
            const message = res.data?.message || "Tạo học liệu từ văn bản thành công!";

            setMsg({ type: "success", text: message });
            clearAll();

            if (id) onMaterialUploaded?.(id);
        } catch (e) {
            const data = e.response?.data;
            setMsg({
                type: "error",
                text: typeof data === "string" ? data : (data?.message || "Thao tác thất bại"),
            });
        } finally {
            setLoading(false);
        }
    };

    const helperText = useMemo(() => {
        if (file) return "Đang dùng file đã chọn (AI sẽ trích xuất và tạo câu hỏi).";
        if (!rawText.trim()) return `Dán nội dung vào đây (tối thiểu ${MIN_TEXT_CHARS} ký tự).`;
        if (textLen < MIN_TEXT_CHARS) return `Nội dung còn ngắn (${textLen}/${MIN_TEXT_CHARS}).`;
        if (textLen > MAX_TEXT_CHARS) return `Nội dung quá dài (${textLen}/${MAX_TEXT_CHARS}). Hãy rút gọn.`;
        return `Đủ độ dài (${textLen} ký tự).`;
    }, [file, rawText, textLen]);

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: "#fff",
                }}
            >
                {/* Header */}
                <Stack spacing={0.75}>
                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, fontSize: 20 }}>
                        Nhập học liệu để AI tạo câu hỏi
                    </Typography>
                    <Typography sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>
                        Upload file hoặc dán nội dung trực tiếp. Sau đó nhấn “Tạo học liệu”.
                    </Typography>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Chat-like composer */}
                <Box
                    sx={{
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 3,
                        p: 2,
                        bgcolor: COLORS.bgLight,
                    }}
                >
                    {/* Title row (optional) */}
                    <TextField
                        label="Tiêu đề (tuỳ chọn)"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        fullWidth
                        disabled={loading}
                        sx={{ mb: 1.5, bgcolor: "#fff", borderRadius: 2 }}
                    />

                    <TextField
                        label="Dán nội dung ở đây"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        fullWidth
                        multiline
                        minRows={6}
                        maxRows={12}
                        disabled={loading || !!file} // ✅ chọn file thì disable text để tránh nhập nhầm
                        helperText={helperText}
                        error={!file && !!rawText.trim() && (textLen < MIN_TEXT_CHARS || textLen > MAX_TEXT_CHARS)}
                        sx={{ bgcolor: "#fff", borderRadius: 2 }}
                    />

                    {/* Attachment + actions */}
                    <Box
                        sx={{
                            mt: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            flexWrap: "wrap",
                        }}
                    >
                        {/* Left: attach */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Tooltip title="Đính kèm file (PDF/DOCX/TXT)">
                                <span>
                                    <IconButton
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        sx={{
                                            bgcolor: "#fff",
                                            border: `1px solid ${COLORS.border}`,
                                            "&:hover": { bgcolor: "#fff", borderColor: COLORS.blueHover },
                                        }}
                                    >
                                        <UploadFileRoundedIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <input
                                ref={fileInputRef}
                                hidden
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={handlePickFile}
                            />

                            {file ? (
                                <Chip
                                    label={`📎 ${fileLabel}`}
                                    onDelete={
                                        loading
                                            ? undefined
                                            : () => {
                                                setFile(null);
                                                resetFileInput();
                                            }
                                    }
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: "#fff",
                                        border: `1px solid ${COLORS.border}`,
                                        color: "#2B3674",
                                    }}
                                />
                            ) : (
                                <Chip
                                    label={`${textLen}/${MAX_TEXT_CHARS}`}
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: "#fff",
                                        border: `1px solid ${COLORS.border}`,
                                        color: COLORS.textSecondary,
                                    }}
                                />
                            )}
                        </Box>

                        {/* Right: buttons */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Tooltip title="Xoá nội dung">
                                <span>
                                    <IconButton
                                        onClick={clearAll}
                                        disabled={loading || (!file && !rawText && !textTitle)}
                                        sx={{
                                            bgcolor: "#fff",
                                            border: `1px solid ${COLORS.border}`,
                                            "&:hover": { bgcolor: "#fff", borderColor: COLORS.blueHover },
                                        }}
                                    >
                                        <DeleteOutlineRoundedIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                endIcon={loading ? null : <SendRoundedIcon />}
                                sx={{
                                    bgcolor: COLORS.orange,
                                    fontWeight: 900,
                                    borderRadius: 2,
                                    px: 2.5,
                                    "&:hover": { bgcolor: "#e67e00" },
                                    "&.Mui-disabled": { bgcolor: "#E9ECEF", color: "#6C757D" },
                                }}
                            >
                                {loading ? <CircularProgress size={22} /> : "Tạo học liệu"}
                            </Button>
                        </Box>
                    </Box>

                    {/* Upload progress */}
                    {loading && file && (
                        <Box sx={{ mt: 1.5 }}>
                            <Typography sx={{ mb: 1, fontWeight: 700, color: COLORS.textPrimary }}>
                                Đang upload... {progress}%
                            </Typography>
                            <LinearProgress variant="determinate" value={progress} />
                        </Box>
                    )}
                </Box>

                {/* Message */}
                {msg.text && (
                    <Alert severity={msg.type} sx={{ mt: 2 }}>
                        {msg.text}
                    </Alert>
                )}

                {/* Hint */}
                <Alert severity="info" sx={{ mt: 2 }}>
                    File hỗ trợ PDF/DOCX/TXT tối đa 10MB. Nếu dán nội dung: tối thiểu {MIN_TEXT_CHARS} ký tự, tối đa{" "}
                    {MAX_TEXT_CHARS} ký tự.
                </Alert>
            </Paper>
        </Box>
    );
}
