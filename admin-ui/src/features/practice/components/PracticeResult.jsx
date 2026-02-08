import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Typography, Divider, Chip, Stack } from "@mui/material";
import { practiceApi } from "../../../api/practiceApi"; // ✅ thêm

function clampInt(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, Math.trunc(x)));
}

function formatMMSS(totalSeconds) {
    const s = clampInt(totalSeconds, 0, 10 ** 9);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

// ✅ 7.00 -> 7 ; 7.25 -> 7.25 | 70.0 -> 70 ; 70.5 -> 70.5
function formatNumberTrim(n, maxDecimals) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    const s = x.toFixed(maxDecimals);
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/**
 * Split AI feedback into:
 * - greeting (1 line)
 * - strengths
 * - weaknesses
 * - recommendations
 *
 * Supports:
 * - JSON: { greeting, strengths, weaknesses, recommendations } (or pros/cons)
 * - Headings: "Điểm mạnh:", "Điểm yếu:", "Gợi ý ôn tập:" (and EN aliases)
 * - If cannot detect => fallback into weaknesses
 */
function splitAiFeedback(raw) {
    const text = String(raw || "").trim();
    if (!text) return { greeting: "", strengths: [], weaknesses: [], recommendations: [], raw: "" };

    const normalizeBullet = (s) =>
        String(s || "")
            .replace(/^[-•\u2022]\s*/, "")
            .trim();

    // 1) Try JSON parse
    try {
        const maybe = JSON.parse(text);
        const greeting = String(maybe?.greeting ?? maybe?.hello ?? "").trim();

        const s = maybe?.strengths ?? maybe?.pros ?? [];
        const w = maybe?.weaknesses ?? maybe?.cons ?? [];
        const r = maybe?.recommendations ?? maybe?.suggestions ?? maybe?.studyTips ?? [];

        const strengths = Array.isArray(s) ? s.map(normalizeBullet).filter(Boolean) : [];
        const weaknesses = Array.isArray(w) ? w.map(normalizeBullet).filter(Boolean) : [];
        const recommendations = Array.isArray(r) ? r.map(normalizeBullet).filter(Boolean) : [];

        if (greeting || strengths.length || weaknesses.length || recommendations.length) {
            return { greeting, strengths, weaknesses, recommendations, raw: text };
        }
    } catch {}

    // 2) Line-based parsing with headings
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    // greeting: take the first line if it looks like greeting (Chào/Hello/Hi/Hey)
    let greeting = "";
    let startIdx = 0;
    if (lines.length) {
        const first = lines[0];
        const lower = first.toLowerCase();
        const looksGreeting =
            lower.startsWith("chào ") ||
            lower.startsWith("hello") ||
            lower.startsWith("hi ") ||
            lower.startsWith("hey ");
        if (looksGreeting) {
            greeting = first;
            startIdx = 1;
        }
    }

    const content = lines.slice(startIdx).join("\n");

    const detectHeadingIndex = (candidates) => {
        for (const h of candidates) {
            const re = new RegExp(`(^|\\n)\\s*${h}\\s*[:：\\-]`, "i");
            const m = re.exec(content);
            if (m) return m.index;
        }
        return -1;
    };

    const H = {
        strengths: ["điểm mạnh", "strengths", "pros", "ưu điểm"],
        weaknesses: ["điểm yếu", "weaknesses", "cons", "nhược điểm"],
        recommendations: [
            "gợi ý ôn tập",
            "gợi ý",
            "khuyến nghị",
            "recommendations",
            "suggestions",
            "study tips",
        ],
    };

    const sIdx = detectHeadingIndex(H.strengths);
    const wIdx = detectHeadingIndex(H.weaknesses);
    const rIdx = detectHeadingIndex(H.recommendations);

    const extractSection = (fromIdx, toIdx) => {
        const chunk = content.slice(fromIdx, toIdx >= 0 ? toIdx : undefined).trim();
        const withoutHeading = chunk.replace(/^[^\n]*[:：\-]\s*/i, "").trim();
        return withoutHeading
            .split(/\n+/)
            .map((x) => normalizeBullet(x))
            .filter(Boolean);
    };

    const sections = [
        { key: "strengths", idx: sIdx },
        { key: "weaknesses", idx: wIdx },
        { key: "recommendations", idx: rIdx },
    ]
        .filter((x) => x.idx >= 0)
        .sort((a, b) => a.idx - b.idx);

    if (sections.length) {
        const out = { greeting, strengths: [], weaknesses: [], recommendations: [], raw: text };

        for (let i = 0; i < sections.length; i++) {
            const cur = sections[i];
            const next = sections[i + 1];
            out[cur.key] = extractSection(cur.idx, next ? next.idx : -1);
        }
        return out;
    }

    // 3) Fallback: keep all as weaknesses (actionable)
    const sentences = content
        .split(/(?<=[.!?。！？])\s+/)
        .map((x) => x.trim())
        .filter(Boolean);

    return {
        greeting,
        strengths: [],
        weaknesses: sentences.length ? sentences : content ? [content] : [],
        recommendations: [],
        raw: text,
    };
}

function BulletList({ items, emptyText }) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
        return (
            <Typography sx={{ mt: 1, color: "#716f6f", fontWeight: 650, whiteSpace: "pre-wrap" }}>
                {emptyText}
            </Typography>
        );
    }
    return (
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.2 }}>
            {list.map((t, idx) => (
                <Box component="li" key={idx} sx={{ mb: 0.75 }}>
                    <Typography sx={{ color: "#716f6f", fontWeight: 650, whiteSpace: "pre-wrap" }}>
                        {t}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

export default function PracticeResult({
                                           result,
                                           numberOfQuestions,
                                           onRetry, // start retest
                                           onNewMaterial,
                                           onViewReview,
                                       }) {
    const earned = useMemo(() => Number(result?.earnedPoints ?? 0), [result]);
    const totalPoints = useMemo(() => Number(result?.totalPoints ?? 0), [result]);

    const percent = useMemo(() => {
        const p = Number(result?.score);
        if (Number.isFinite(p)) return Math.max(0, Math.min(100, p));

        if (totalPoints > 0) {
            const x = (earned / totalPoints) * 100;
            return Math.max(0, Math.min(100, x));
        }
        return 0;
    }, [earned, totalPoints, result]);

    // ✅ 70.0% -> 70% ; 70.5% -> 70.5%
    const percentText = useMemo(() => `${formatNumberTrim(percent, 1)}%`, [percent]);

    const score10 = useMemo(() => {
        const s = (percent / 100) * 10;
        return Math.max(0, Math.min(10, s));
    }, [percent]);

    // ✅ 7.00/10 -> 7/10 ; 7.25/10 -> 7.25/10
    const score10Text = useMemo(() => `${formatNumberTrim(score10, 2)}/10`, [score10]);

    const statusRaw = useMemo(() => String(result?.status ?? "").toUpperCase(), [result]);
    const isFailed = useMemo(() => statusRaw === "FAILED", [statusRaw]);
    const isPassed = useMemo(() => statusRaw === "PASSED", [statusRaw]);
    const passedByPercent = useMemo(() => percent >= 50, [percent]);

    const statusLabel = useMemo(() => {
        if (isPassed) return "Đạt";
        if (isFailed) return "Trượt";
        return passedByPercent ? "Đạt" : "Trượt";
    }, [isPassed, isFailed, passedByPercent]);

    const statusColor = useMemo(() => (statusLabel === "Đạt" ? "#1B5E20" : "#B00020"), [statusLabel]);

    const feedback = useMemo(() => String(result?.feedback ?? "").trim(), [result]);
    const aiFeedback = useMemo(() => String(result?.aiFeedback ?? "").trim(), [result]);

    const aiSplit = useMemo(() => splitAiFeedback(aiFeedback), [aiFeedback]);

    const totalQuestions = numberOfQuestions ?? 0;

    const attemptId = useMemo(() => result?.attemptId ?? null, [result]);

    // ===== Retest display rule =====
    const showRetest = useMemo(() => {
        if (typeof result?.showRetest === "boolean") return result.showRetest;
        return isFailed; // fallback
    }, [result, isFailed]);

    // ===== Retest status from BE (source of truth) =====
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [canRetestNow, setCanRetestNow] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);

    const mountedRef = useRef(true);

    const fetchRetestStatus = async () => {
        if (!showRetest || !attemptId) return;
        setStatusLoading(true);
        try {
            const s = await practiceApi.getRetestStatusV2(attemptId);
            const sec = Number(s?.retestRemainingSeconds ?? s?.remainingSeconds);
            const can = Boolean(s?.canRetestNow);

            if (!mountedRef.current) return;

            setCanRetestNow(can);
            if (Number.isFinite(sec)) setRemainingSeconds(Math.max(0, Math.floor(sec)));
            else setRemainingSeconds(0);
        } catch {
            if (!mountedRef.current) return;
            setCanRetestNow(false);
            setRemainingSeconds((prev) => (prev > 0 ? prev : 30));
        } finally {
            if (mountedRef.current) setStatusLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setRemainingSeconds(0);
        setCanRetestNow(false);

        if (!showRetest || !attemptId) return;

        const secFromSubmit = Number(result?.retestRemainingSeconds);
        const canFromSubmit = typeof result?.canRetestNow === "boolean" ? result.canRetestNow : null;

        if (Number.isFinite(secFromSubmit) || canFromSubmit !== null) {
            setRemainingSeconds(Number.isFinite(secFromSubmit) ? Math.max(0, Math.floor(secFromSubmit)) : 0);
            setCanRetestNow(Boolean(canFromSubmit));
            fetchRetestStatus();
            return;
        }

        fetchRetestStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attemptId, showRetest]);

    useEffect(() => {
        if (!showRetest) return;
        if (canRetestNow) return;
        if (remainingSeconds <= 0) return;

        const t = setInterval(() => {
            setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(t);
    }, [showRetest, canRetestNow, remainingSeconds]);

    useEffect(() => {
        if (!showRetest || !attemptId) return;
        if (remainingSeconds !== 0) return;
        if (canRetestNow) return;

        fetchRetestStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remainingSeconds]);

    const retestBtnLabel = useMemo(() => {
        if (!showRetest) return "Làm lại";
        if (statusLoading) return "Đang kiểm tra...";
        if (canRetestNow) return "Làm lại";
        return `Làm lại (${formatMMSS(remainingSeconds)})`;
    }, [showRetest, statusLoading, canRetestNow, remainingSeconds]);

    const retestDisabled = useMemo(() => {
        if (!showRetest) return true;
        if (!attemptId) return true;
        if (statusLoading) return true;
        return !canRetestNow;
    }, [showRetest, attemptId, statusLoading, canRetestNow]);

    const greetingText = useMemo(() => {
        if (aiSplit.greeting) return aiSplit.greeting;
        if (aiFeedback) return "Chào bạn,";
        return "";
    }, [aiFeedback, aiSplit.greeting]);

    return (
        <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#1B2559" }}>Kết quả luyện tập</Typography>

            <Paper
                elevation={0}
                sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #E3E8EF",
                    background: "#F7F9FC",
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Chip
                        label={`Trạng thái: ${statusLabel}`}
                        sx={{
                            fontWeight: 900,
                            bgcolor: statusLabel === "Đạt" ? "rgba(27,94,32,0.12)" : "rgba(176,0,32,0.12)",
                            color: statusColor,
                        }}
                    />
                    <Chip label={percentText} sx={{ fontWeight: 900 }} />
                    {totalQuestions > 0 ? <Chip label={`Số câu: ${totalQuestions}`} sx={{ fontWeight: 900 }} /> : null}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "grid", gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Điểm (thang 10):{" "}
                        <Box component="span" sx={{ color: "#0B5ED7" }}>
                            {score10Text}
                        </Box>
                    </Typography>

                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Tổng điểm:{" "}
                        <Box component="span" sx={{ color: "#2B3674" }}>
                            {earned}/{totalPoints > 0 ? totalPoints : "?"}
                        </Box>{" "}
                        <Box component="span" sx={{ color: "#6a26f1", fontWeight: 800 }}>
                            ({percentText})
                        </Box>
                    </Typography>

                    <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>
                        Trạng thái:{" "}
                        <Box component="span" sx={{ color: statusColor }}>
                            {statusLabel}
                        </Box>
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Đánh giá tổng quan</Typography>
                <Typography sx={{ mt: 1, color: "#716f6f", fontWeight: 600, whiteSpace: "pre-wrap" }}>
                    {feedback || "Chưa có nhận xét."}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Fly AI nhận xét</Typography>

                {greetingText ? (
                    <Typography sx={{ mt: 1, color: "#716f6f", fontWeight: 800, whiteSpace: "pre-wrap" }}>
                        {greetingText}
                    </Typography>
                ) : null}

                <Box
                    sx={{
                        mt: 1.5,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 1.5,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            border: "1px solid rgba(27,94,32,0.25)",
                            bgcolor: "rgba(27,94,32,0.06)",
                        }}
                    >
                        <Typography sx={{ fontWeight: 900, color: "#1B5E20" }}>Điểm mạnh</Typography>
                        <BulletList
                            items={aiSplit.strengths}
                            emptyText={"Chưa có điểm mạnh cụ thể. (Bấm “Xem lại đáp án” để xem theo từng câu.)"}
                        />
                    </Paper>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            border: "1px solid rgba(176,0,32,0.25)",
                            bgcolor: "rgba(176,0,32,0.06)",
                        }}
                    >
                        <Typography sx={{ fontWeight: 900, color: "#B00020" }}>Điểm yếu</Typography>
                        <BulletList
                            items={aiSplit.weaknesses}
                            emptyText={
                                aiFeedback
                                    ? "Chưa tách được điểm yếu rõ ràng. (Bấm “Xem lại đáp án” để xem chi tiết.)"
                                    : "Chưa có feedback. (Có thể bị quota/timeout)."
                            }
                        />
                    </Paper>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 3,
                        border: "1px solid rgba(11,94,215,0.25)",
                        bgcolor: "rgba(11,94,215,0.06)",
                    }}
                >
                    <Typography sx={{ fontWeight: 900, color: "#0B5ED7" }}>Gợi ý ôn tập</Typography>
                    <BulletList
                        items={aiSplit.recommendations}
                        emptyText={
                            aiFeedback
                                ? "Chưa có gợi ý ôn tập cụ thể. (Bấm “Xem lại đáp án” để xem gợi ý theo từng câu.)"
                                : "Chưa có gợi ý ôn tập."
                        }
                    />
                </Paper>

                <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                    {showRetest ? (
                        <Button variant="contained" onClick={onRetry} sx={{ fontWeight: 900 }} disabled={retestDisabled}>
                            {retestBtnLabel}
                        </Button>
                    ) : null}

                    <Button variant="outlined" onClick={onNewMaterial} sx={{ fontWeight: 800 }}>
                        Upload học liệu khác
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={onViewReview}
                        sx={{ fontWeight: 900, borderColor: "#0B5ED7", color: "#0B5ED7" }}
                    >
                        Xem lại đáp án
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
