// src/features/practice/components/chatbot/ChatComposer.jsx
import React, { useMemo, useRef, useState } from "react";
import { Box, TextField, IconButton, Button, Stack, Typography, Tooltip } from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const COLORS = {
    border: "#E3E8EF",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
};

/**
 * ChatComposer
 * - Fix textarea không giãn ngang: fullWidth + minWidth:0 + overflowWrap/wordBreak
 * - Upload file KHÔNG auto send: chọn file chỉ lưu state, bấm Gửi mới gọi onSendFile
 * - Hỗ trợ "send empty" (Generate đề) khi canSendEmpty=true
 */
export default function ChatComposer({
                                         disabled,
                                         allowUpload = true,
                                         accept = ".pdf,.docx,.txt,.xlsx",
                                         placeholder = "Nhập nội dung…",
                                         multiline = true,
                                         maxRows = 4,
                                         onPaste,
                                         canSendEmpty = false,
                                         onSendEmpty,
                                         onSendText,
                                         onSendFile,
                                     }) {
    const fileRef = useRef(null);
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
        }
        // reset để có thể chọn lại cùng tên
        e.target.value = "";
    };

    const handleSendClick = () => {
        if (disabled) return;

        // Ưu tiên gửi file nếu có
        if (file) {
            onSendFile?.(file);
            setFile(null);
            setText("");
            return;
        }

        const t = String(text || "").trim();
        if (t) {
            onSendText?.(t);
            setText("");
            return;
        }

        // send empty (Generate đề)
        if (canSendEmpty) {
            onSendEmpty?.();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (file) return true;
        if (String(text || "").trim().length > 0) return true;
        return Boolean(canSendEmpty);
    }, [canSendEmpty, disabled, file, text]);

    return (
        <Box sx={{ p: 2, bgcolor: "#fff" }}>
            {/* File đang chờ gửi */}
            {file && (
                <Box
                    sx={{
                        mb: 1,
                        p: 1,
                        bgcolor: "#F7F9FC",
                        borderRadius: 2,
                        border: "1px dashed #0B5ED7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <AttachFileIcon sx={{ color: "#0B5ED7", fontSize: 20, flexShrink: 0 }} />
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#1B2559",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 220,
                            }}
                            title={file.name}
                        >
                            {file.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#6C757D", flexShrink: 0 }}>
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Typography>
                    </Stack>

                    <IconButton size="small" onClick={() => setFile(null)}>
                        <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                    </IconButton>
                </Box>
            )}

            <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ minWidth: 0 }}>
                {/* Upload */}
                <Tooltip title={allowUpload ? "Tải tài liệu (PDF, DOCX, TXT, XLSX)" : "Upload đang bị khoá"}>
          <span>
            <IconButton
                onClick={() => fileRef.current?.click()}
                disabled={disabled || !allowUpload || Boolean(file)}
                sx={{
                    bgcolor: "#F4F7FE",
                    color: "#1B2559",
                    borderRadius: 2,
                    p: 1.5,
                    flexShrink: 0,
                    border: `1px solid ${COLORS.border}`,
                    "&:hover": { bgcolor: "#E6EAFA" },
                }}
            >
              <UploadFileRoundedIcon />
              <input hidden type="file" ref={fileRef} onChange={handleFileChange} accept={accept} />
            </IconButton>
          </span>
                </Tooltip>

                {/* Textarea - Fix giãn ngang */}
                <TextField
                    fullWidth
                    multiline={multiline}
                    maxRows={maxRows}
                    placeholder={file ? "Bấm Gửi để upload file…" : placeholder}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={onPaste}
                    disabled={disabled}
                    sx={{
                        minWidth: 0,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#F4F7FE",
                            "& fieldset": { borderColor: "transparent" },
                            "&:hover fieldset": { borderColor: "#E3E8EF" },
                            "&.Mui-focused fieldset": { borderColor: "#0B5ED7" },
                        },
                        "& .MuiInputBase-input": {
                            fontSize: 14,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                        },
                    }}
                />

                {/* Send */}
                <Button
                    variant="contained"
                    onClick={handleSendClick}
                    disabled={!canSend}
                    sx={{
                        minWidth: 48,
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: COLORS.orange,
                        "&:hover": { bgcolor: COLORS.orangeHover },
                        boxShadow: "none",
                        flexShrink: 0,
                    }}
                >
                    <SendRoundedIcon sx={{ fontSize: 20 }} />
                </Button>
            </Stack>
        </Box>
    );
}
