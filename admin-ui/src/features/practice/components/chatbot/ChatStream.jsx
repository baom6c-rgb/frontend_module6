
// src/features/practice/components/chatbot/ChatStream.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Box, Typography, Paper, Stack, Avatar } from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    bubbleUser: "#0B5ED7",
    bubbleAssistant: "#F8FAFC",
};

function Bubble({ role, children }) {
    const isUser = role === "user";
    return (
        <Stack direction="row" spacing={1.2} justifyContent={isUser ? "flex-end" : "flex-start"} sx={{ width: "100%" }}>
            {!isUser && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#fff", border: `1px solid ${COLORS.border}` }}>
                    <SmartToyRoundedIcon sx={{ fontSize: 18, color: COLORS.textPrimary }} />
                </Avatar>
            )}

            <Box
                sx={{
                    maxWidth: "78%",
                    px: 1.5,
                    py: 1.1,
                    borderRadius: 2.5,
                    bgcolor: isUser ? COLORS.bubbleUser : COLORS.bubbleAssistant,
                    color: isUser ? "#fff" : COLORS.textPrimary,
                    border: isUser ? "none" : `1px solid ${COLORS.border}`,
                    boxShadow: isUser ? "0 10px 24px rgba(11, 94, 215, 0.18)" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
            >
                {children}
            </Box>

            {isUser && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#fff", border: `1px solid ${COLORS.border}` }}>
                    <PersonRoundedIcon sx={{ fontSize: 18, color: COLORS.textPrimary }} />
                </Avatar>
            )}
        </Stack>
    );
}

export default function ChatStream({ messages }) {
    const ref = useRef(null);

    useEffect(() => {
        // auto-scroll to bottom when new messages
        ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
    }, [messages?.length]);

    const safe = useMemo(() => Array.isArray(messages) ? messages : [], [messages]);

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                bgcolor: "#fff",
                overflow: "hidden",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary }}>Conversation</Typography>
                <Typography sx={{ mt: 0.25, fontSize: 13, color: COLORS.textSecondary }}>
                    Lịch sử gửi học liệu + phản hồi hệ thống.
                </Typography>
            </Box>

            <Box
                ref={ref}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    px: 2,
                    py: 1.75,
                    bgcolor: "#FBFCFE",
                }}
            >
                <Stack spacing={1.25}>
                    {safe.map((m) => (
                        <Bubble key={m.id} role={m.role}>
                            <Typography sx={{ fontSize: 14, lineHeight: 1.55 }}>
                                {m.text}
                            </Typography>
                            {m.meta?.hint && (
                                <Typography sx={{ mt: 0.5, fontSize: 12, opacity: 0.85 }}>
                                    {m.meta.hint}
                                </Typography>
                            )}
                        </Bubble>
                    ))}
                </Stack>
            </Box>
        </Paper>
    );
}
