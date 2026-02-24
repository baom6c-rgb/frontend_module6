// src/features/practice/components/AnswerOption.jsx
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";

function cleanAnswerText(raw) {
    if (raw == null) return "";
    return String(raw)
        .replace(/[‘’]/g, "")
        .replace(/[“”]/g, "")
        .trim();
}

export default function AnswerOption({ label, text, selected, onSelect }) {
    const displayText = useMemo(() => {
        const cleaned = cleanAnswerText(text);
        return cleaned || "(Không có nội dung)";
    }, [text]);

    return (
        <Box
            onClick={onSelect} // ✅ QUAN TRỌNG
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: "2px solid",
                borderColor: selected ? "#0B5ED7" : "#E3E8EF",
                bgcolor: selected ? "rgba(11,94,215,0.08)" : "#fff",
                cursor: "pointer",
                userSelect: "none",
                transition: "all .15s ease",
                "&:hover": {
                    bgcolor: selected ? "rgba(11,94,215,0.12)" : "#F7F9FC",
                },
            }}
        >
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    bgcolor: selected ? "#0B5ED7" : "#E3E8EF",
                    color: selected ? "#fff" : "#1B2559",
                    flexShrink: 0,
                }}
            >
                {label}
            </Box>

            {/* ✅ BỎ IN ĐẬM: fontWeight 400 */}
            <Typography sx={{ fontWeight: 400, color: "#1B2559", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {displayText}
            </Typography>
        </Box>
    );
}