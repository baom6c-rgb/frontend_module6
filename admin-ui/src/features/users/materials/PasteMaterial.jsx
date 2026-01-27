import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
    Alert,
    Stack,
    Divider,
} from "@mui/material";
import ContentPasteRoundedIcon from "@mui/icons-material/ContentPasteRounded";
import { materialApi } from "../../../api/materialApi";

const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 20000;

export default function PasteMaterial({ onCreated }) {
    const [title, setTitle] = useState("");
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const charCount = rawText.length;

    const helperText = useMemo(() => {
        if (!rawText.trim()) return `Dán nội dung vào đây (tối thiểu ${MIN_TEXT_CHARS} ký tự).`;
        if (charCount < MIN_TEXT_CHARS) return `Nội dung còn ngắn (${charCount}/${MIN_TEXT_CHARS}).`;
        if (charCount > MAX_TEXT_CHARS) return `Nội dung quá dài (${charCount}/${MAX_TEXT_CHARS}). Hãy rút gọn.`;
        return `Đủ độ dài (${charCount} ký tự).`;
    }, [rawText, charCount]);

    const canSubmit =
        rawText.trim().length >= MIN_TEXT_CHARS &&
        rawText.trim().length <= MAX_TEXT_CHARS &&
        !loading;

    const handleCreate = async () => {
        try {
            setLoading(true);
            setMsg({ type: "", text: "" });

            const res = await materialApi.createFromText({
                title: title.trim() || undefined,
                rawText: rawText.trim(),
            });

            const materialId = res.data?.materialId;
            const message = res.data?.message || "Tạo học liệu từ văn bản thành công!";

            setMsg({ type: "success", text: message });

            if (materialId) {
                onCreated?.(materialId);
            }
        } catch (e) {
            const data = e.response?.data;
            setMsg({
                type: "error",
                text: typeof data === "string" ? data : (data?.message || "Tạo học liệu thất bại"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Stack spacing={1}>
                <Typography sx={{ fontWeight: 800, color: "#1B2559" }}>
                    Dán nội dung (Paste text)
                </Typography>
                <Typography sx={{ color: "#6C757D", fontWeight: 600 }}>
                    Dùng khi m có sẵn nội dung và muốn tạo bài luyện tập ngay, không cần upload file.
                </Typography>
            </Stack>

            <Divider />

            <TextField
                label="Tiêu đề (tuỳ chọn)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chương 1 - OOP"
                fullWidth
            />

            <TextField
                label="Nội dung"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Dán nội dung vào đây..."
                fullWidth
                multiline
                minRows={8}
                maxRows={14}
                helperText={helperText}
                error={!!rawText.trim() && (charCount < MIN_TEXT_CHARS || charCount > MAX_TEXT_CHARS)}
            />

            {msg.text && <Alert severity={msg.type} sx={{ mt: 1 }}>{msg.text}</Alert>}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <Typography sx={{ color: "#6C757D", fontWeight: 700 }}>
                    {charCount}/{MAX_TEXT_CHARS}
                </Typography>

                <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={!canSubmit}
                    startIcon={loading ? null : <ContentPasteRoundedIcon />}
                    sx={{
                        bgcolor: "#FF8C00",
                        fontWeight: 800,
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
    );
}
