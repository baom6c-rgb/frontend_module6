
// src/features/practice/components/chatbot/ChatComposer.jsx
import React, { useMemo, useRef, useState } from "react";
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Button,
    Stack,
    Typography,
    Divider,
    Tooltip,
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
};

export default function ChatComposer({ disabled, onSendText, onSendFile }) {
    const fileRef = useRef(null);
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (file) return true;
        return text.trim().length > 0;
    }, [disabled, file, text]);

    const pickFile = () => fileRef.current?.click();

    const clear = () => {
        setText("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSend = async () => {
        if (!canSend) return;
        if (file) {
            await onSendFile?.(file);
            clear();
            return;
        }
        const payload = text.trim();
        await onSendText?.(payload);
        clear();
    };

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1.25,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                bgcolor: "#fff",
                overflow: "hidden",
            }}
        >
            <Box sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        style={{ display: "none" }}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />

                    <Tooltip title="Upload PDF/DOCX/TXT (≤ 10MB)">
            <span>
              <IconButton
                  onClick={pickFile}
                  disabled={disabled}
                  sx={{
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 2,
                  }}
              >
                <UploadFileRoundedIcon />
              </IconButton>
            </span>
                    </Tooltip>

                    <Box sx={{ flex: 1 }}>
                        <TextField
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste nội dung học liệu ở đây…"
                            disabled={disabled || !!file}
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={6}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "#fff",
                                },
                            }}
                        />
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {file ? `Đã chọn file: ${file.name}` : "Hoặc upload file để hệ thống tự trích xuất."}
                            </Typography>

                            <Box sx={{ flex: 1 }} />

                            <Button
                                variant="contained"
                                endIcon={<SendRoundedIcon />}
                                onClick={handleSend}
                                disabled={!canSend}
                                sx={{
                                    bgcolor: COLORS.orange,
                                    "&:hover": { bgcolor: COLORS.orangeHover },
                                    borderRadius: 2,
                                    fontWeight: 900,
                                    px: 1.75,
                                }}
                            >
                                Gửi
                            </Button>

                            <Tooltip title="Xóa input">
                <span>
                  <IconButton onClick={clear} disabled={disabled && !text && !file}>
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </span>
                            </Tooltip>
                        </Stack>
                    </Box>
                </Stack>
            </Box>
            <Divider />
            <Box sx={{ px: 1.5, py: 1, bgcolor: "#FBFCFE" }}>
                <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                    Sau khi gửi học liệu, hệ thống sẽ tự tạo preview câu hỏi và mở chế độ Split View.
                </Typography>
            </Box>
        </Paper>
    );
}
