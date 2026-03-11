// src/features/practice/components/AnswerOption.jsx
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";

// ✅ Syntax highlight (compact for options)
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function cleanAnswerText(raw) {
    if (raw == null) return "";
    return String(raw)
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .trim();
}

/**
 * Parse markdown code fence in option:
 * ```js
 * code...
 * ```
 */
function parseCodeFence(text) {
    if (!text) return null;
    const t = String(text);

    const start = t.indexOf("```");
    if (start === -1) return null;

    const after = t.slice(start + 3);

    // allow: ```javascript do... (no newline) -> still try
    const firstLineEnd = after.indexOf("\n");
    if (firstLineEnd === -1) return null;

    const lang = after.slice(0, firstLineEnd).trim() || "text";
    const rest = after.slice(firstLineEnd + 1);

    const end = rest.lastIndexOf("```");
    if (end === -1) return null;

    const code = rest.slice(0, end).trimEnd();
    if (!code) return null;

    return { language: lang.toLowerCase(), code };
}

export default function AnswerOption({ label, text, selected, onSelect, disabled }) {
    const cleaned = useMemo(() => cleanAnswerText(text), [text]);

    const parsed = useMemo(() => parseCodeFence(cleaned), [cleaned]);
    const isCode = Boolean(parsed);

    const displayText = useMemo(() => {
        if (isCode) return ""; // code handled by SyntaxHighlighter
        return cleaned || "(Không có nội dung)";
    }, [cleaned, isCode]);

    return (
        <Box
            onClick={() => {
                if (disabled) return;
                onSelect?.();
            }}
            sx={{
                display: "flex",
                alignItems: "stretch",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: "2px solid",
                borderColor: disabled ? "#EEF2F7" : selected ? "#0B5ED7" : "#E3E8EF",
                bgcolor: disabled
                    ? "#FAFBFC"
                    : selected
                        ? "rgba(11,94,215,0.08)"
                        : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                userSelect: "none",
                opacity: disabled ? 0.55 : 1,
                transition: "all .15s ease",
                "&:hover": {
                    bgcolor: disabled
                        ? "#FAFBFC"
                        : selected
                            ? "rgba(11,94,215,0.12)"
                            : "#F7F9FC",
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
                    bgcolor: disabled ? "#E9EEF5" : selected ? "#0B5ED7" : "#E3E8EF",
                    color: disabled ? "#94A3B8" : selected ? "#fff" : "#1B2559",
                    flexShrink: 0,
                    mt: isCode ? 0.25 : 0,
                }}
            >
                {label}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                {isCode ? (
                    <Box
                        sx={{
                            border: "1px solid #E3E8EF",
                            borderRadius: 2,
                            overflow: "hidden",
                            bgcolor: "#0f172a",
                        }}
                    >
                        {/* small label like inline header */}
                        <Box sx={{ px: 1.25, py: 0.5, bgcolor: "rgba(255,255,255,0.06)" }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#E5E7EB" }}>
                                {(parsed.language || "code").toUpperCase()}
                            </Typography>
                        </Box>

                        <SyntaxHighlighter
                            language={parsed.language}
                            style={oneDark}
                            customStyle={{
                                margin: 0,
                                background: "transparent",
                                padding: "10px 12px",
                                fontSize: 12,
                                lineHeight: 1.55,
                            }}
                            codeTagProps={{
                                style: {
                                    fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                },
                            }}
                        >
                            {parsed.code}
                        </SyntaxHighlighter>
                    </Box>
                ) : (
                    <Typography
                        sx={{
                            fontWeight: 400,
                            color: "#1B2559",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        {displayText}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}