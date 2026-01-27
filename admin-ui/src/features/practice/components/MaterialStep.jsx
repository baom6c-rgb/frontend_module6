// src/features/practice/components/MaterialStep.jsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    Box,
    Paper,
    Typography,
    Divider,
    TextField,
    IconButton,
    Button,
    Chip,
    Alert,
    Stack,
    Tooltip,
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import {materialApi} from "../../../api/materialApi";
import GlobalLoading from "../../../components/common/GlobalLoading";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#FF8C00",
    orangeHover: "#e67e00",
    blueHover: "#2E2D84",
    bgLight: "#F7F9FC",
    bubbleUser: "#FFFFFF",
    bubbleAi: "#F7F9FC",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT_REGEX = /\.(pdf|docx|txt)$/i;

const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 20000;

function formatBytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
}

function cutText(text, max = 1200) {
    if (!text) return "";
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
}

function nowId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function MaterialStep({materialId, onMaterialUploaded}) {
    const fileInputRef = useRef(null);

    // composer
    const [rawText, setRawText] = useState("");
    const [file, setFile] = useState(null);

    // ui
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({type: "", text: ""});

    // chat messages
    const [messages, setMessages] = useState(() => [
        {
            id: nowId(),
            role: "ai",
            type: "system",
            text: "Gửi nội dung (paste) hoặc đính kèm file để AI đọc. Xem preview xong bấm “Xác nhận dùng nội dung này” để sang bước cấu hình. Nếu chưa ưng, cứ gửi nội dung khác.",
        },
    ]);

    // pending confirm
    const [pending, setPending] = useState(null); // { materialId, createdAt }

    useEffect(() => {
        if (!materialId) return;
        // Không auto next.
    }, [materialId]);

    const textLen = rawText.trim().length;
    const canSendText = textLen >= MIN_TEXT_CHARS && textLen <= MAX_TEXT_CHARS;
    const canUploadFile = !!file;
    const canSubmit = !loading && (canUploadFile || canSendText);

    const helperText = useMemo(() => {
        if (file) return "Đã đính kèm file. Nhấn Gửi để upload và trích xuất nội dung.";
        if (!rawText.trim()) return `Dán nội dung vào đây (tối thiểu ${MIN_TEXT_CHARS} ký tự).`;
        if (textLen < MIN_TEXT_CHARS) return `Nội dung còn ngắn (${textLen}/${MIN_TEXT_CHARS}).`;
        if (textLen > MAX_TEXT_CHARS) return `Nội dung quá dài (${textLen}/${MAX_TEXT_CHARS}). Hãy rút gọn.`;
        return `Đủ độ dài (${textLen} ký tự).`;
    }, [file, rawText, textLen]);

    const resetFileInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const clearComposer = () => {
        setRawText("");
        setFile(null);
        resetFileInput();
    };

    const appendMessage = (m) => {
        setMessages((prev) => [...prev, {id: nowId(), ...m}]);
    };

    const replaceLastAiTyping = (newMsg) => {
        setMessages((prev) => {
            const idx = [...prev].reverse().findIndex((x) => x.role === "ai" && x.type === "typing");
            if (idx === -1) return prev;
            const realIndex = prev.length - 1 - idx;
            const next = prev.slice();
            next[realIndex] = {...next[realIndex], ...newMsg, type: newMsg.type || "ai"};
            return next;
        });
    };

    const handlePickFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.size > MAX_SIZE_BYTES) {
            setMsg({type: "error", text: "File quá dung lượng (tối đa 10MB), không thể upload."});
            setFile(null);
            resetFileInput();
            return;
        }

        if (!ALLOWED_EXT_REGEX.test(f.name)) {
            setMsg({type: "error", text: "Chọn file sai định dạng. Chỉ chọn được PDF / DOCX / TXT."});
            setFile(null);
            resetFileInput();
            return;
        }

        setMsg({type: "", text: ""});
        setFile(f);
    };

    const handleRemoveFile = () => {
        setFile(null);
        resetFileInput();
    };

    const handleSend = async () => {
        if (!canSubmit) {
            if (!file && !rawText.trim()) {
                setMsg({type: "error", text: "Hãy upload file hoặc dán nội dung để bắt đầu."});
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
            setMsg({type: "", text: ""});

            // gửi cái mới => pending cũ không còn hiệu lực
            setPending(null);

            // user bubble
            if (file) {
                appendMessage({
                    role: "user",
                    type: "file",
                    fileName: file.name,
                    fileSize: file.size,
                    text: `📎 ${file.name} (${formatBytes(file.size)})`,
                });
            } else {
                const t = rawText.trim();
                appendMessage({
                    role: "user",
                    type: "text",
                    chars: t.length,
                    text: cutText(t, 800),
                    fullText: t,
                });
            }

            // ai typing
            appendMessage({
                role: "ai",
                type: "typing",
                text: file ? "Đang upload & trích xuất nội dung..." : "Đang đọc nội dung bạn gửi...",
            });

            // api
            let res;
            if (file) {
                res = await materialApi.upload(file);
            } else {
                // ⚠️ nếu BE bắt buộc title, thì endpoint text vẫn nhận title=null/undefined ok
                res = await materialApi.createFromText({
                    title: undefined,
                    rawText: rawText.trim(),
                });
            }

            const id = res.data?.materialId;
            const successMessage =
                res.data?.message ||
                (file ? "Upload thành công! Đã trích xuất nội dung." : "Đã nhận nội dung. Đây là preview để xác nhận.");

            // preview text
            let extracted = "";
            if (id && file) {
                try {
                    const textRes = await materialApi.getExtractedText(id);
                    extracted = typeof textRes.data === "string" ? textRes.data : "";
                } catch {
                    extracted = "";
                }
            } else if (!file) {
                extracted = rawText.trim();
            }

            replaceLastAiTyping({
                role: "ai",
                type: "ai",
                text: successMessage,
            });

            if (extracted) {
                appendMessage({
                    role: "ai",
                    type: "preview",
                    text: cutText(extracted, 1200),
                    chars: extracted.length,
                    label: file ? "Văn bản đã trích xuất" : "Văn bản đã gửi",
                });
            }

            appendMessage({
                role: "ai",
                type: "confirm",
                text: "Nếu preview đúng, bấm “Xác nhận dùng nội dung này” để sang bước cấu hình. Hoặc gửi nội dung khác.",
                materialId: id,
            });

            if (id) setPending({materialId: id, createdAt: Date.now()});

            clearComposer();
        } catch (e) {
            const data = e.response?.data;
            const errText = typeof data === "string" ? data : data?.message || "Thao tác thất bại";

            setMsg({type: "error", text: errText});
            replaceLastAiTyping({
                role: "ai",
                type: "ai",
                text: "Có lỗi khi xử lý nội dung. Thử lại hoặc rút gọn nội dung giúp tao nhé.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!pending?.materialId) return;
        onMaterialUploaded?.(pending.materialId);
    };

    const Bubble = ({role, children}) => (
        <Box
            sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                justifyContent: role === "user" ? "flex-end" : "flex-start",
            }}
        >
            {role === "ai" && (
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: "#fff",
                        mt: 0.25,
                    }}
                >
                    <SmartToyRoundedIcon fontSize="small"/>
                </Box>
            )}

            <Box
                sx={{
                    maxWidth: "78%",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 3,
                    p: 1.5,
                    bgcolor: role === "user" ? COLORS.bubbleUser : COLORS.bubbleAi,
                }}
            >
                {children}
            </Box>

            {role === "user" && (
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: "#fff",
                        mt: 0.25,
                    }}
                >
                    <PersonRoundedIcon fontSize="small"/>
                </Box>
            )}
        </Box>
    );

    const renderMessage = (m) => {
        if (m.role === "ai" && m.type === "system") {
            return (
                <Bubble role="ai">
                    <Typography sx={{fontWeight: 900, color: COLORS.textPrimary, mb: 0.25}}>
                        AI Learning Assistant
                    </Typography>
                    <Typography sx={{color: COLORS.textSecondary, fontWeight: 600}}>
                        {m.text}
                    </Typography>
                </Bubble>
            );
        }

        if (m.role === "user" && m.type === "file") {
            return (
                <Bubble role="user">
                    <Stack spacing={0.75}>
                        <Typography sx={{fontWeight: 900, color: COLORS.textPrimary}}>
                            File đính kèm
                        </Typography>
                        <Chip
                            icon={<DescriptionRoundedIcon/>}
                            label={m.text}
                            sx={{
                                fontWeight: 800,
                                bgcolor: "#fff",
                                border: `1px solid ${COLORS.border}`,
                                color: "#2B3674",
                                "& .MuiChip-icon": {color: "#2B3674"},
                            }}
                        />
                    </Stack>
                </Bubble>
            );
        }

        if (m.role === "user" && m.type === "text") {
            return (
                <Bubble role="user">
                    <Stack spacing={0.75}>
                        <Typography sx={{fontWeight: 900, color: COLORS.textPrimary}}>
                            Nội dung
                        </Typography>
                        <Typography
                            sx={{
                                color: COLORS.textSecondary,
                                fontWeight: 600,
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                            }}
                        >
                            {m.text}
                        </Typography>
                        <Typography sx={{color: "#6C757D", fontWeight: 800, fontSize: 12}}>
                            {m.chars} ký tự
                        </Typography>
                    </Stack>
                </Bubble>
            );
        }

        if (m.role === "ai" && m.type === "typing") {
            return (
                <Bubble role="ai">
                    <Typography sx={{color: COLORS.textPrimary, fontWeight: 800}}>
                        {m.text}
                    </Typography>
                    <Typography sx={{mt: 0.5, color: COLORS.textSecondary, fontWeight: 600, fontSize: 13}}>
                        Đang xử lý…
                    </Typography>
                </Bubble>
            );
        }

        if (m.role === "ai" && m.type === "preview") {
            return (
                <Bubble role="ai">
                    <Stack spacing={0.75}>
                        <Box sx={{display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap"}}>
                            <Chip
                                label={m.label || "Văn bản"}
                                sx={{
                                    fontWeight: 900,
                                    bgcolor: "#fff",
                                    border: `1px solid ${COLORS.border}`,
                                    color: "#2B3674",
                                }}
                            />
                            <Chip
                                label={`${m.chars || 0} ký tự`}
                                sx={{
                                    fontWeight: 900,
                                    bgcolor: "#fff",
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.textSecondary,
                                }}
                            />
                        </Box>
                        <Typography
                            sx={{
                                color: COLORS.textSecondary,
                                fontWeight: 600,
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                                fontSize: 13,
                            }}
                        >
                            {m.text}
                        </Typography>
                    </Stack>
                </Bubble>
            );
        }

        if (m.role === "ai" && m.type === "confirm") {
            const isActive = pending?.materialId && m.materialId === pending.materialId;

            return (
                <Bubble role="ai">
                    <Stack spacing={1}>
                        <Typography sx={{color: COLORS.textPrimary, fontWeight: 800}}>
                            {m.text}
                        </Typography>

                        <Box sx={{display: "flex", gap: 1, flexWrap: "wrap"}}>
                            <Button
                                variant="contained"
                                onClick={handleConfirm}
                                disabled={!isActive || loading}
                                startIcon={<CheckCircleRoundedIcon/>}
                                sx={{
                                    bgcolor: COLORS.orange,
                                    fontWeight: 900,
                                    borderRadius: 2,
                                    px: 2.25,
                                    "&:hover": {bgcolor: COLORS.orangeHover},
                                    "&.Mui-disabled": {bgcolor: "#E9ECEF", color: "#6C757D"},
                                }}
                            >
                                Xác nhận dùng nội dung này
                            </Button>

                            <Button
                                variant="outlined"
                                disabled={loading}
                                onClick={() => {
                                    setPending(null);
                                    appendMessage({
                                        role: "ai",
                                        type: "ai",
                                        text: "OK. Mày có thể gửi nội dung khác (file/text) để thay thế.",
                                    });
                                }}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 900,
                                    borderColor: COLORS.border,
                                    color: COLORS.textPrimary,
                                    "&:hover": {borderColor: COLORS.blueHover, bgcolor: "#fff"},
                                }}
                            >
                                Gửi nội dung khác
                            </Button>
                        </Box>
                    </Stack>
                </Bubble>
            );
        }

        if (m.role === "ai") {
            return (
                <Bubble role="ai">
                    <Typography sx={{color: COLORS.textPrimary, fontWeight: 800}}>
                        {m.text}
                    </Typography>
                </Bubble>
            );
        }

        return null;
    };

    return (
        <Box sx={{display: "grid", gap: 2}}>
            <GlobalLoading
                open={loading}
                message={file ? "Đang upload & trích xuất nội dung..." : "Đang xử lý nội dung..."}
            />

            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: "#fff",
                }}
            >
                <Stack spacing={0.5}>
                    <Typography sx={{fontWeight: 900, color: COLORS.textPrimary, fontSize: 20}}>
                        Nhập học liệu
                    </Typography>
                </Stack>

                <Divider sx={{my: 2}}/>

                <Box
                    sx={{
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 3,
                        overflow: "hidden",
                        bgcolor: "#fff",
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            display: "grid",
                            gap: 1.25,
                            minHeight: 240,
                            bgcolor: COLORS.bgLight,
                        }}
                    >
                        {messages.map((m) => (
                            <Box key={m.id}>{renderMessage(m)}</Box>
                        ))}
                    </Box>

                    <Divider/>

                    {/* Composer */}
                    <Box sx={{p: 2}}>
                        <Box
                            sx={{
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: 3,
                                p: 1.5,
                                bgcolor: "#fff",
                            }}
                        >
                            <TextField
                                label="Dán nội dung ở đây"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                fullWidth
                                multiline
                                minRows={4}
                                maxRows={10}
                                disabled={loading || !!file}
                                helperText={helperText}
                                error={!file && !!rawText.trim() && (textLen < MIN_TEXT_CHARS || textLen > MAX_TEXT_CHARS)}
                            />

                            <Box
                                sx={{
                                    mt: 1.25,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1.25,
                                    flexWrap: "wrap",
                                }}
                            >
                                <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap"}}>
                                    <Tooltip title="Đính kèm file (PDF/DOCX/TXT)">
                                        <span>
                                            <IconButton
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={loading}
                                                sx={{
                                                    borderRadius: 2,
                                                    border: `1px solid ${COLORS.border}`,
                                                    bgcolor: "#fff",
                                                    color: COLORS.textPrimary,
                                                    "&:hover": {
                                                        bgcolor: "#2E2D84",
                                                        borderColor: "#2E2D84",
                                                        color: "#fff",
                                                    },
                                                }}
                                            >
                                                <UploadFileRoundedIcon/>
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
                                            label={`📎 ${file.name} (${formatBytes(file.size)})`}
                                            onDelete={loading ? undefined : handleRemoveFile}
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

                                <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                    <Tooltip title="Xoá nội dung">
                                            <span>
                                                <IconButton
                                                    onClick={() => {
                                                        clearComposer();
                                                        setMsg({ type: "", text: "" });
                                                    }}
                                                    disabled={loading || (!file && !rawText)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        border: `1px solid ${COLORS.border}`,
                                                        bgcolor: "#fff",
                                                        color: COLORS.textPrimary,
                                                        "&:hover": {
                                                            bgcolor: "#2E2D84",
                                                            borderColor: "#2E2D84",
                                                            color: "#fff",
                                                        },
                                                    }}
                                                >
                                                    <DeleteOutlineRoundedIcon />
                                                </IconButton>
                                            </span>
                                    </Tooltip>
                                    <Button
                                        variant="contained"
                                        onClick={handleSend}
                                        disabled={!canSubmit}
                                        endIcon={<SendRoundedIcon/>}
                                        sx={{
                                            bgcolor: COLORS.orange,
                                            fontWeight: 900,
                                            borderRadius: 2,
                                            px: 2.5,
                                            "&:hover": {bgcolor: COLORS.orangeHover},
                                            "&.Mui-disabled": {bgcolor: "#E9ECEF", color: "#6C757D"},
                                        }}
                                    >
                                        Gửi
                                    </Button>
                                </Box>
                            </Box>
                        </Box>

                        {msg.text && (
                            <Alert severity={msg.type} sx={{mt: 2}}>
                                {msg.text}
                            </Alert>
                        )}
                    </Box>
                </Box>

                <Alert severity="info" sx={{mt: 2}}>
                    File hỗ trợ PDF/DOCX/TXT tối đa 10MB. Nếu dán nội dung: tối thiểu {MIN_TEXT_CHARS} ký tự, tối
                    đa{" "}
                    {MAX_TEXT_CHARS} ký tự.
                </Alert>
            </Paper>
        </Box>
    );
}
