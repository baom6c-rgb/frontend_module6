export const typography = {
    fontFamily: ["Roboto", "system-ui", "Segoe UI", "Arial", "sans-serif"].join(","),

    // Nền tảng: đủ to để học/đọc, vẫn gọn cho dashboard
    fontSize: 14,

    // Headings: rõ ràng cho dashboard, không quá “màu mè”
    h1: { fontSize: "2.125rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" },
    h2: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3 },
    h4: { fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.35 },
    h5: { fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.4 },
    h6: { fontSize: "1rem", fontWeight: 700, lineHeight: 1.4 },

    // Body: ưu tiên đọc lâu (learning app)
    body1: { fontSize: "0.95rem", fontWeight: 400, lineHeight: 1.7 },
    body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.65 },

    // UI text
    subtitle1: { fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.45 },

    button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none", letterSpacing: "0.01em" },
    caption: { fontSize: "0.8rem", fontWeight: 400, lineHeight: 1.4 },
    overline: { fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
};
