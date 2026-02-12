// src/features/practice/components/chatbot/ChatComposer.jsx
import React, { useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Tooltip,
    Typography,
    Divider,
    Stack,
} from "@mui/material";

import SendRoundedIcon from "@mui/icons-material/SendRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    bg: "#FFFFFF",
    hoverBg: "rgba(46, 45, 132, 0.06)",
};

export default function ChatComposer({
                                         allowUpload = true,
                                         onUploadFile,
                                         onSendText,
                                         disabled = false,
                                         helperText = "",
                                     }) {
    const fileRef = useRef(null);

    const [text, setText] = useState("");
    const [file, setFile] = useState(null);

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (file) return true; // ✅ có file thì send được
        return String(text || "").trim().length > 0;
    }, [disabled, file, text]);

    const openFilePicker = () => {
        if (!allowUpload) return;
        fileRef.current?.click?.();
    };

    // ✅ CHỈ LƯU FILE, KHÔNG AUTO UPLOAD
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setFile(f);
        // reset để chọn lại cùng file vẫn trigger
        e.target.value = "";
    };

    const clearFile = () => setFile(null);

    const handleSend = () => {
        if (!canSend) return;

        // ✅ Ưu tiên gửi file nếu có (đúng yêu cầu: chỉ gửi khi bấm Gửi)
        if (file) {
            onUploadFile?.(file);
            setFile(null);
            setText("");
            return;
        }

        const value = String(text || "").trim();
        if (!value) return;

        onSendText?.(value);
        setText("");
    };

    const handleKeyDown = (e) => {
        // Enter để gửi; Shift+Enter để xuống dòng (nếu muốn multiline)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                bgcolor: COLORS.bg,
                overflow: "hidden",
            }}
        >
            <Box sx={{ p: 1.25 }}>
                {/* Hidden file input */}
                <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    disabled={!allowUpload}
                    accept=".pdf,.docx,.txt,.xlsx"
                />

                {/* ✅ Preview file (chờ gửi) */}
                {file && (
                    <Box
                        sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 2,
                            border: "1px dashed rgba(46,45,132,0.45)",
                            bgcolor: "rgba(46,45,132,0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <AttachFileIcon sx={{ fontSize: 18, color: "rgba(46,45,132,0.9)", flexShrink: 0 }} />
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: COLORS.textPrimary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: 260,
                                }}
                                title={file.name}
                            >
                                {file.name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, flexShrink: 0 }}>
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </Typography>
                        </Stack>

                        <Tooltip title="Bỏ file" arrow>
                            <IconButton
                                size="small"
                                onClick={clearFile}
                                sx={{
                                    borderRadius: 2,
                                    border: `1px solid ${COLORS.border}`,
                                    bgcolor: "#fff",
                                    "&:hover": { bgcolor: COLORS.hoverBg },
                                }}
                            >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Row: upload + input + send */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {/* Upload button */}
                    <Tooltip
                        title={
                            allowUpload
                                ? file
                                    ? "Đã chọn file (bấm Gửi để upload)"
                                    : "Chọn file"
                                : "Upload bị tắt trong chế độ này"
                        }
                        arrow
                        placement="top"
                    >
                        <span>
                            <IconButton
                                onClick={openFilePicker}
                                disabled={!allowUpload || Boolean(file)} // ✅ đang có file thì không cho chọn thêm
                                sx={{
                                    borderRadius: 2,
                                    border: `1px solid ${COLORS.border}`,
                                    bgcolor: "transparent",
                                    "&:hover": { bgcolor: COLORS.hoverBg },
                                }}
                            >
                                <UploadFileRoundedIcon />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Input */}
                    <TextField
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder={
                            file
                                ? "Đã chọn file — bấm Gửi để upload…"
                                : allowUpload
                                    ? "Nhập nội dung (hoặc chọn file rồi bấm Gửi)"
                                    : "Nhập từ khóa ngắn gọn…"
                        }
                        fullWidth
                        size="small"
                        multiline
                        maxRows={3}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                bgcolor: "#fff",
                            },
                        }}
                    />

                    {/* Send button */}
                    <Tooltip title={canSend ? "Gửi" : disabled ? "Đang bị khóa" : "Nhập nội dung hoặc chọn file"} arrow>
                        <span>
                            <IconButton
                                onClick={handleSend}
                                disabled={!canSend}
                                sx={{
                                    borderRadius: 2,
                                    border: `1px solid ${COLORS.border}`,
                                    bgcolor: canSend ? "primary.main" : "transparent",
                                    color: canSend ? "#fff" : "inherit",
                                    transition: "all 0.25s ease",
                                    "&:hover": {
                                        bgcolor: canSend ? "primary.dark" : COLORS.hoverBg,
                                    },
                                }}
                            >
                                <SendRoundedIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Helper text */}
            {helperText ? (
                <>
                    <Divider />
                    <Box sx={{ px: 1.5, py: 1 }}>
                        <Typography sx={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.35 }}>
                            {helperText}
                        </Typography>
                    </Box>
                </>
            ) : null}
        </Paper>
    );
}
