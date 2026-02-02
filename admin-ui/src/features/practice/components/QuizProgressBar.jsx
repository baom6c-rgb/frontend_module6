// src/features/practice/components/QuizProgressBar.jsx
import React, { useMemo } from "react";
import { Box, Tooltip, useMediaQuery, useTheme } from "@mui/material";

export default function QuizProgressBar({
                                            total,
                                            currentIndex,
                                            answersMap,
                                            questionIds,
                                            onNavigate,
                                            disabled = false,
                                        }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Nếu nhiều câu + mobile => cho scroll ngang để segment không “dính” quá nhỏ
    const shouldScroll = useMemo(() => {
        if (!total) return false;
        if (total >= 26) return true;
        if (isMobile && total >= 18) return true;
        return false;
    }, [total, isMobile]);

    const normalizeAnswered = (qid) => {
        if (!qid) return false;
        const a = answersMap?.[qid];
        if (!a) return false;

        // MCQ
        if (a.selectedAnswer) return true;

        // ESSAY / SHORT_ANSWER
        if (typeof a.textAnswer === "string" && a.textAnswer.trim().length > 0) return true;

        return false;
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: 0.5,
                width: "100%",
                mb: 2,
                mt: 0.5,

                // Responsive / overflow cho quiz nhiều câu
                overflowX: shouldScroll ? "auto" : "hidden",
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
            }}
        >
            {Array.from({ length: total }).map((_, index) => {
                const isActive = index === currentIndex;

                const qId = questionIds?.[index];
                const isAnswered = normalizeAnswered(qId);

                // Colors (đồng bộ màu đang dùng ở PracticePlayer)
                const pendingBg = "#E3E8EF";
                const doneBg = "#B6E8A6";
                const activeBg = "#2E2D84";
                const hoverBg = "#80E356";
                const activeHoverBg = "#3A39A3";

                let bgcolor = pendingBg;
                if (isActive) bgcolor = activeBg;
                else if (isAnswered) bgcolor = doneBg;

                // Mobile: nhìn giống các “ô nhỏ” hơn
                const height = isMobile ? 10 : 6;
                const radius = isMobile ? 2 : 4;

                return (
                    <Tooltip
                        key={index}
                        title={`Câu hỏi ${index + 1}`}
                        arrow
                        placement="top"
                        disableInteractive
                    >
                        <Box
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                if (disabled) return;
                                onNavigate?.(index);
                            }}
                            onKeyDown={(e) => {
                                if (disabled) return;
                                if (e.key === "Enter" || e.key === " ") onNavigate?.(index);
                            }}
                            sx={{
                                flex: shouldScroll ? "0 0 auto" : 1,
                                minWidth: shouldScroll ? (isMobile ? 14 : 18) : 0,

                                height,
                                borderRadius: radius,
                                bgcolor,
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.6 : 1,

                                transition: "all 0.18s ease",
                                "&:hover": disabled
                                    ? {}
                                    : {
                                        transform: "scaleY(1.5)",
                                        bgcolor: isActive ? activeHoverBg : hoverBg,
                                    },

                                // Focus a11y
                                outline: "none",
                                "&:focus-visible": {
                                    boxShadow: "0 0 0 3px rgba(236,94,50,0.25)",
                                },
                            }}
                        />
                    </Tooltip>
                );
            })}
        </Box>
    );
}
