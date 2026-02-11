// src/features/practice/components/page/PracticeChatPanel.jsx
import React, { useEffect, useMemo, useRef } from "react";
import {
    Avatar,
    Box,
    Chip,
    Divider,
    Paper,
    Stack,
    Typography,
    keyframes,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import PracticeHeaderConfig from "../chatbot/PracticeHeaderConfig";
import ChatComposer from "../chatbot/ChatComposer";
import { ASSISTANT_MODE, COLORS, MODE } from "../../utils/practicePage.helpers";

const bounce = keyframes`
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
`;

function TypingIndicator() {
    return (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: 24 }}>
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    sx={{
                        width: 6,
                        height: 6,
                        bgcolor: COLORS.textSecondary,
                        borderRadius: "50%",
                        animation: `${bounce} 1.4s infinite ease-in-out both`,
                        animationDelay: `${i * 0.16}s`,
                    }}
                />
            ))}
        </Stack>
    );
}

function ChatBubble({ role, text, children }) {
    const isUser = role === "user";
    return (
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: isUser ? "row-reverse" : "row" }}>
            <Avatar
                src={isUser ? undefined : "/images/AI_logo.png"}
                sx={{
                    width: 32,
                    height: 32,
                    bgcolor: isUser ? "primary.main" : "transparent",
                    border: isUser ? "none" : `1px solid ${COLORS.border}`,
                }}
            >
                {isUser ? "U" : <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />}
            </Avatar>

            <Box sx={{ maxWidth: "80%" }}>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: COLORS.textSecondary,
                        mb: 0.5,
                        textAlign: isUser ? "right" : "left",
                    }}
                >
                    {isUser ? "You" : "FLY AI"}
                </Typography>

                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: isUser ? "primary.light" : "grey.100",
                        color: isUser ? "primary.contrastText" : "text.primary",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        border: isUser ? "none" : `1px solid ${COLORS.border}`,
                    }}
                >
                    {children ? children : <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>{text}</Typography>}
                </Paper>
            </Box>
        </Box>
    );
}

function ChatTypingBubble() {
    return (
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: "row" }}>
            <Avatar
                src={"/images/AI_logo.png"}
                sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "transparent",
                    border: `1px solid ${COLORS.border}`,
                }}
            >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            </Avatar>

            <Box sx={{ maxWidth: "80%" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: COLORS.textSecondary, mb: 0.5 }}>
                    FLY AI
                </Typography>

                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: "grey.100",
                        color: "text.primary",
                        border: `1px solid ${COLORS.border}`,
                    }}
                >
                    <TypingIndicator />
                </Paper>
            </Box>
        </Box>
    );
}

export default function PracticeChatPanel({
                                              // layout
                                              width,
                                              minWidth,
                                              // state
                                              mode,
                                              assistantMode,
                                              lockGenerate,
                                              hideStudyWhenGenerate,
                                              messagesToRender,
                                              loading,
                                              studyBooting,
                                              materialPresent,
                                              // config display (header only)
                                              questionCount,
                                              durationLabel,
                                              doingAttemptId,
                                              // actions
                                              onSetAssistantModeSafe,
                                              allowUpload,
                                              onUploadFile,
                                              onSendText,
                                              disabledComposer,
                                              helperText,
                                          }) {
    const messagesEndRef = useRef(null);

    const showTyping = useMemo(() => {
        return assistantMode === ASSISTANT_MODE.STUDY ? studyBooting : loading;
    }, [assistantMode, loading, studyBooting]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesToRender, showTyping]);

    return (
        <Box
            sx={{
                width,
                minWidth,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                transition: "width 0.25s ease",
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    overflow: "hidden",
                    bgcolor: "#fff",
                }}
            >
                <Box sx={{ p: 2, pb: 0 }}>
                    <PracticeHeaderConfig
                        questionCount={questionCount}
                        durationMinutes={durationLabel}
                        onChangeQuestionCount={() => {}}
                        attemptId={mode === MODE.DOING ? doingAttemptId : null}
                        attemptStartTs={null}
                        onTimeExpired={null}
                        // ✅ yêu cầu: Ẩn "Số câu / Thời gian" khỏi AI panel
                        hideConfig
                    />

                    <Box sx={{ mt: 1.5, px: 0.5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.25,
                                borderRadius: 3,
                                bgcolor: "#fff",
                                border: `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                <Stack sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                                        Bumblefly AI
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                        {assistantMode === ASSISTANT_MODE.GENERATE
                                            ? "Upload/Paste học liệu để tạo đề"
                                            : "Chỉ nhập từ khóa liên quan đến bài thi"}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                    {!lockGenerate && (
                                        <Chip
                                            label="Tạo đề"
                                            clickable
                                            color={assistantMode === ASSISTANT_MODE.GENERATE ? "primary" : "default"}
                                            onClick={() => onSetAssistantModeSafe(ASSISTANT_MODE.GENERATE)}
                                        />
                                    )}

                                    {!hideStudyWhenGenerate && (
                                        <Chip
                                            label="Hỏi khái niệm"
                                            clickable
                                            color={assistantMode === ASSISTANT_MODE.STUDY ? "primary" : "default"}
                                            onClick={() => onSetAssistantModeSafe(ASSISTANT_MODE.STUDY)}
                                        />
                                    )}
                                </Stack>
                            </Stack>

                            {assistantMode === ASSISTANT_MODE.STUDY && !materialPresent && (
                                <>
                                    <Divider sx={{ my: 1.2 }} />
                                    <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                                        * Bạn cần upload/paste học liệu trước để chat theo đúng bài.
                                    </Typography>
                                </>
                            )}

                            {assistantMode === ASSISTANT_MODE.STUDY && studyBooting && (
                                <Typography sx={{ mt: 1, fontSize: 12, color: COLORS.textSecondary }}>
                                    Đang mở session chat…
                                </Typography>
                            )}
                        </Paper>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pt: 2, pb: 2 }}>
                    <Box sx={{ width: "100%" }}>
                        {messagesToRender.map((m) => (
                            <ChatBubble key={m.id} role={m.role} text={m.text} />
                        ))}
                        {showTyping && <ChatTypingBubble />}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                <Box sx={{ p: 2, pt: 0 }}>
                    <ChatComposer
                        allowUpload={allowUpload}
                        onUploadFile={onUploadFile}
                        onSendText={onSendText}
                        disabled={disabledComposer}
                        helperText={helperText}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
