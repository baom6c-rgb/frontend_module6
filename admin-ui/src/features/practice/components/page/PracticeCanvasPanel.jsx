// src/features/practice/components/page/PracticeCanvasPanel.jsx
import React from "react";
import {
    Box,
    Button,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import PracticePlayer from "../PracticePlayer";
import PracticeResult from "../PracticeResult";

import PracticeIdleCreatePanel from "./PracticeIdleCreatePanel";
import PracticeReadyStartPanel from "./PracticeReadyStartPanel";

import { MODE } from "../../utils/practicePage.helpers";

const COLORS = {
    border: "#E3E8EF",
    textPrimary: "#1B2559",
    textSecondary: "#6C757D",
    orange: "#EC5E32",
    orangeHover: "#D5522B",
};

export default function PracticeCanvasPanel({
                                                open,
                                                width,
                                                minWidth,

                                                mode,
                                                loading,
                                                materialPresent,

                                                questionCount,
                                                durationMinutes,
                                                minutesPerQuestion,
                                                resultQuestionCount,

                                                attemptDetail,
                                                doingAttemptId,
                                                attemptStartTs,

                                                result,

                                                onGenerate,
                                                onChangeQuestionCount,
                                                onRequestStart,
                                                onRequestReset,

                                                onSubmit,
                                                onRetry,
                                                onNewMaterial,
                                                onViewReview,

                                                playerRef,
                                            }) {
    if (!open) return null;

    // ✅ badge hiển thị sau khi bấm “Tạo đề ngay” (READY/DOING/RESULT)
    const showBadge = mode !== MODE.IDLE;

    return (
        <Box
            sx={{
                width,
                minWidth,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 3,
                overflow: "hidden",
                border: `1px solid ${COLORS.border}`,
                bgcolor: "#F8F9FA",
                minHeight: 0,
            }}
        >
            {/* Top bar: Đổi học liệu + badge */}
            <Box
                sx={{
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    bgcolor: "#fff",
                    borderBottom: `1px solid ${COLORS.border}`,
                    flexShrink: 0,
                    gap: 1,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Đổi học liệu">
                        <Button
                            onClick={onRequestReset}
                            variant="outlined"
                            size="small"
                            startIcon={<RestartAltRoundedIcon />}
                            sx={{
                                borderRadius: 3,
                                fontWeight: 900,
                            }}
                        >
                            Đổi học liệu
                        </Button>
                    </Tooltip>

                    {/* ✅ Badge text bo góc: Số câu · Thời gian */}
                    {showBadge && (
                        <Paper
                            elevation={0}
                            sx={{
                                px: 1.25,
                                py: 0.6,
                                borderRadius: 999,
                                border: `1px solid ${COLORS.border}`,
                                bgcolor: "#F7F9FC",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary }}>
                                Số câu: <b>{mode === MODE.RESULT ? Number(resultQuestionCount) : Number(questionCount)}</b>{" "}
                                · Thời gian:{" "}
                                <b>{Number(durationMinutes) > 0 ? `${Number(durationMinutes)} phút` : "—"}</b>
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2.5 }}>
                {/* ✅ IDLE: UI mới (không đổi flow) */}
                {mode === MODE.IDLE && (
                    <PracticeIdleCreatePanel
                        questionCount={questionCount}
                        durationMinutes={durationMinutes}
                        minutesPerQuestion={minutesPerQuestion}
                        onChangeQuestionCount={onChangeQuestionCount}
                        onGenerate={onGenerate}
                        loading={loading}
                        materialPresent={materialPresent}
                    />
                )}

                {/* ✅ READY: thiết kế lại theo cùng style/layout của IDLE */}
                {mode === MODE.READY && (
                    <PracticeReadyStartPanel
                        questionCount={questionCount}
                        durationMinutes={durationMinutes}
                        minutesPerQuestion={minutesPerQuestion}
                        loading={loading}
                        onStart={onRequestStart}
                        onReset={onRequestReset}
                    />
                )}

                {/* RESULT */}
                {mode === MODE.RESULT && (
                    <PracticeResult
                        result={result}
                        attemptId={doingAttemptId}
                        attemptStartTs={attemptStartTs}
                        onRetry={onRetry}
                        onNewMaterial={onNewMaterial}
                        onViewReview={onViewReview}
                    />
                )}

                {/* DOING */}
                {mode === MODE.DOING && (
                    <PracticePlayer
                        ref={playerRef}
                        attemptDetail={attemptDetail}
                        attemptId={doingAttemptId}
                        attemptStartTs={attemptStartTs}
                        onSubmit={onSubmit}
                    />
                )}
            </Box>
        </Box>
    );
}
