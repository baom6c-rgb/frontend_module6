import React, { useMemo, useRef, useState } from "react";
import {
    Box, Paper, TextField, IconButton, Button, Stack, Typography, Divider, Tooltip,
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

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt|xlsx)$/i;

export default function ChatComposer({ disabled, onSendText, onSendFile }) {
    const fileRef = useRef(null);
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (file) return true;
        return text.trim().length > 0;
    }, [disabled, file, text]);

    const pickFile = () => fileRef.current?.click();

    const clear = () => {
        setText("");
        setFile(null);
        setFileError("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const onPickFile = (e) => {
        const f = e.target.files?.[0] || null;
        setFileError("");

        if (!f) {
            setFile(null);
            return;
        }

        if (f.size > MAX_SIZE_BYTES) {
            setFile(null);
            setFileError("File quá dung lượng (tối đa 10MB).");
            if (fileRef.current) fileRef.current.value = "";
            return;
        }

        if (!ALLOWED_EXT_REGEX.test(f.name)) {
            setFile(null);
            setFileError("Sai định dạng. Chỉ hỗ trợ PDF/DOCX/TXT/XLSX.");
            if (fileRef.current) fileRef.current.value = "";
            return;
        }

        setFile(f);
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
                        accept=".pdf,.docx,.txt,.xlsx"
                        style={{ display: "none" }}
                        onChange={onPickFile}
                    />

                    <Tooltip title="Upload PDF/DOCX/TXT/XLSX (≤ 10MB)">
            <span>
              <IconButton
                  onClick={pickFile}
                  disabled={disabled}
                  sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}
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
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {file
                                    ? `Đã chọn file: ${file.name}`
                                    : "Hoặc upload file (PDF/DOCX/TXT/XLSX) để hệ thống tự trích xuất."}
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

                        {fileError && (
                            <Typography sx={{ mt: 0.5, fontSize: 12, color: "#C0392B", fontWeight: 800 }}>
                                {fileError}
                            </Typography>
                        )}
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
