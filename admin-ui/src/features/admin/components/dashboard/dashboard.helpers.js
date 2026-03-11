// src/features/admin/components/dashboard/dashboard.helpers.js
export const DASHBOARD_COLORS = {
    primaryBlue: "#0B5ED7",
    primaryBlueHover: "#084298",
    accentOrange: "#FF8C00",
    accentOrangeHover: "#E67600",
    bg: "#F6F8FC",
    white: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    border: "#E5EAF2",
    success: "#16A34A",
    danger: "#DC2626",
    amber: "#F59E0B",
};

export const safeNumber = (x, fallback = 0) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
};

export const fmtInt = (n) => (safeNumber(n, 0) || 0).toLocaleString();

export const fmtPct0 = (rate01) => `${Math.round(safeNumber(rate01, 0) * 100)}%`;

export const normalizeOption = (x) => ({
    id: x?.id ?? x?.classId ?? x?.moduleId ?? x?.value ?? x?.code ?? x?.name,
    name: x?.name ?? x?.title ?? x?.label ?? String(x?.id ?? ""),
});

const pad2 = (v) => String(v).padStart(2, "0");

/**
 * YYYY-MM-DDTHH:mm:ss (local time)
 */
export const toDateTimeLocalSeconds = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const yyyy = date.getFullYear();
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
};

export const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

export const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 0);
    return x;
};

export const getDefaultFilters7d = () => {
    const now = new Date();
    const to = endOfDay(now);
    const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)); // 7 days inclusive
    return {
        preset: "7d",
        classId: "",
        moduleId: "",
        from: toDateTimeLocalSeconds(from),
        to: toDateTimeLocalSeconds(to),
        keyword: "",
        scoreMin: "",
        scoreMax: "",
    };
};

export const applyPreset = (preset) => {
    const now = new Date();
    if (preset === "30d") {
        const to = endOfDay(now);
        const from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
        return { from: toDateTimeLocalSeconds(from), to: toDateTimeLocalSeconds(to) };
    }
    // default 7d
    const to = endOfDay(now);
    const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    return { from: toDateTimeLocalSeconds(from), to: toDateTimeLocalSeconds(to) };
};

export const buildRequestBody = (f) => {
    const body = {};
    if (f.classId) body.classId = Number(f.classId);
    if (f.moduleId) body.moduleId = Number(f.moduleId);

    // BE expects LocalDateTime string
    if (f.from) body.from = f.from;
    if (f.to) body.to = f.to;

    if (f.scoreMin !== "" && f.scoreMin !== null && f.scoreMin !== undefined)
        body.scoreMin = Number(f.scoreMin);
    if (f.scoreMax !== "" && f.scoreMax !== null && f.scoreMax !== undefined)
        body.scoreMax = Number(f.scoreMax);

    if (f.keyword && String(f.keyword).trim()) body.keyword = String(f.keyword).trim();
    return body;
};

export const mapRiskLevel = (riskLevelRaw) => {
    const lv = String(riskLevelRaw || "").trim().toUpperCase();

    // BE: TOT | TRUNG_BINH | YEU
    if (lv === "YEU") {
        return { label: "Yếu", tone: "red" };
    }
    if (lv === "TRUNG_BINH") {
        return { label: "Trung bình", tone: "amber" };
    }
    if (lv === "TOT") {
        return { label: "Tốt", tone: "green" };
    }
    return { label: lv || "N/A", tone: "blue" };
};

export const toneToChipStyle = (tone, COLORS = DASHBOARD_COLORS) => {
    if (tone === "red") return { c: COLORS.danger, bg: `${COLORS.danger}12` };
    if (tone === "amber") return { c: COLORS.amber, bg: `${COLORS.amber}12` };
    if (tone === "green") return { c: COLORS.success, bg: `${COLORS.success}12` };
    if (tone === "orange") return { c: COLORS.accentOrange, bg: `${COLORS.accentOrange}14` };
    return { c: COLORS.primaryBlue, bg: `${COLORS.primaryBlue}12` };
};

export const calcFailCount = (totalAttempts, failRate01) => {
    const t = safeNumber(totalAttempts, 0);
    const fr = safeNumber(failRate01, 0);
    return Math.round(t * fr);
};

export const calcPassCount = (totalAttempts, failRate01) => {
    const t = safeNumber(totalAttempts, 0);
    const fail = calcFailCount(t, failRate01);
    return Math.max(0, t - fail);
};
