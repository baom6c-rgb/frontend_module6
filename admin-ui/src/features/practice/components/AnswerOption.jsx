// src/features/practice/components/AnswerOption.jsx
import React from "react";
import { Box, Typography } from "@mui/material";

export default function AnswerOption({ label, text, selected, onSelect }) {
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

            <Typography sx={{ fontWeight: 700, color: "#1B2559" }}>
                {text || "(Không có nội dung)"}
            </Typography>
        </Box>
    );
}
