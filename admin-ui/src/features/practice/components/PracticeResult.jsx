import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Typography, Divider, Chip, Stack } from "@mui/material";
import { practiceApi } from "../../../api/practiceApi"; // ✅ dùng cho retest status
import AppModal from "../../../components/common/AppModal";

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

// =============================
// Study Guide parsing + rendering helpers
// =============================
function normalizeLine(s) {
    return String(s || "")
        .replace(/^\s*[-•\u2022*]+\s*/g, "")
        .trim();
}

function splitLines(raw) {
    return String(raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
}

function isHeader(line, header) {
    const a = normalizeLine(line).toLowerCase();
    const b = normalizeLine(header).toLowerCase().replace(/[:：]\s*$/g, "");
    return a.replace(/[:：]\s*$/g, "") === b;
}

function parseStudyGuide(raw) {
    const lines = splitLines(raw);
    if (!lines.length) {
        return {
            title: "",
            subject: "",
            topic: "",
            tips: [],
            concepts: [],
            vocab: [],
            questions: [],
        };
    }

    // Find first "Gợi ý ôn tập:" section (outer heading)
    const idx = lines.findIndex((l) => isHeader(l, "Gợi ý ôn tập:"));
    const body = idx >= 0 ? lines.slice(idx + 1) : lines;

    const out = {
        title: "",
        subject: "",
        topic: "",
        tips: [],
        concepts: [],
        vocab: [],
        questions: [],
    };

    let current = null; // tips | concepts | vocab | questions

    const pushBullet = (arr, line) => {
        const cleaned = normalizeLine(line);
        if (!cleaned) return;

        const isBullet = /^\s*[-•\u2022*]+\s+/.test(line);
        if (!isBullet && arr.length) {
            arr[arr.length - 1] = `${arr[arr.length - 1]} ${cleaned}`.trim();
            return;
        }
        arr.push(cleaned);
    };

    for (let i = 0; i < body.length; i++) {
        const line = body[i];
        const n = normalizeLine(line);

        if (/^tiêu đề\s*[:：]/i.test(n)) {
            out.title = n.replace(/^tiêu đề\s*[:：]\s*/i, "").trim();
            current = null;
            continue;
        }
        if (/^môn học\s*[:：]/i.test(n)) {
            out.subject = n.replace(/^môn học\s*[:：]\s*/i, "").trim();
            current = null;
            continue;
        }
        if (/^chủ đề\s*[:：]/i.test(n)) {
            out.topic = n.replace(/^chủ đề\s*[:：]\s*/i, "").trim();
            current = null;
            continue;
        }

        if (isHeader(n, "Gợi ý ôn tập:")) {
            current = "tips";
            continue;
        }
        if (isHeader(n, "Các khái niệm chính:")) {
            current = "concepts";
            continue;
        }
        if (isHeader(n, "Danh sách từ vựng:")) {
            current = "vocab";
            continue;
        }
        if (isHeader(n, "Câu hỏi ôn tập:")) {
            current = "questions";
            continue;
        }

        if (!current) continue;

        if (current === "tips") pushBullet(out.tips, line);
        if (current === "concepts") pushBullet(out.concepts, line);
        if (current === "vocab") pushBullet(out.vocab, line);
        if (current === "questions") pushBullet(out.questions, line);
    }

    return out;
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightKeywords(text, keywords) {
    const t = String(text || "");
    const keys = Array.isArray(keywords) ? keywords.map((k) => String(k || "").trim()).filter(Boolean) : [];
    if (!t || !keys.length) return t;

    const sorted = [...new Set(keys)].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sorted.map(escapeRegExp).join("|")})`, "gi");

    const parts = t.split(pattern);
    return parts.map((p, i) => {
        const hit = sorted.some((k) => k.toLowerCase() === String(p).toLowerCase());
        if (!hit) return <React.Fragment key={i}>{p}</React.Fragment>;
        return (
            <Box component="span" key={i} sx={{ fontWeight: 900, color: "#1B2559" }}>
                {p}
            </Box>
        );
    });
}

function BulletItems({ items, keywordPool }) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return null;

    return (
        <Stack spacing={1} sx={{ mt: 1 }}>
            {list.map((t, idx) => (
                <Box
                    key={idx}
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                    }}
                >
                    <Box
                        sx={{
                            mt: "9px",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#9AA4B2",
                            flex: "0 0 auto",
                        }}
                    />
                    <Typography sx={{ color: "#716f6f", fontWeight: 650, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                        {highlightKeywords(t, keywordPool)}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

function SectionCard({ title, children }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid #E3E8EF",
                bgcolor: "#FFFFFF",
            }}
        >
            <Typography sx={{ fontWeight: 900, color: "#1B2559" }}>{title}</Typography>
            {children}
        </Paper>
    );
}

/**
 * Split AI feedback into:
 * - greeting (optional)
 * - strengths
 * - weaknesses
 * - recommendations
 *
 * Robust parsing:
 * - Try JSON first (if BE ever returns structured)
 * - Else: line-by-line state machine using headings:
 *   "Điểm mạnh", "Điểm yếu", "Gợi ý ôn tập" (+ EN aliases)
 * - Headings can appear with/without ":" and can be prefixed by bullets "- • *"
 */
function splitAiFeedback(raw) {
    const text = String(raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    const empty = { greeting: "", strengths: [], weaknesses: [], recommendations: [], raw: text };
    if (!text) return empty;

    const normalizeBullet = (s) =>
        String(s || "")
            .replace(/^\s*[-•\u2022*]+\s*/g, "")
            .trim();

    const normalizeHeadingKey = (s) => {
        return normalizeBullet(s)
            .replace(/[:：]\s*$/g, "")
            .trim()
            .toLowerCase();
    };

    const isGreetingLine = (line) => {
        const lower = String(line || "").trim().toLowerCase();
        return (
            lower.startsWith("chào ") ||
            lower.startsWith("xin chào") ||
            lower.startsWith("hello") ||
            lower.startsWith("hi ") ||
            lower.startsWith("hey ")
        );
    };

    // 1) Try JSON parse (optional / future-proof)
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

    // 2) State machine by headings
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    let greeting = "";
    let idxStart = 0;

    if (lines.length && isGreetingLine(lines[0])) {
        greeting = lines[0];
        idxStart = 1;
    }

    const H = {
        strengths: new Set(["điểm mạnh", "strengths", "pros", "ưu điểm"]),
        weaknesses: new Set(["điểm yếu", "weaknesses", "cons", "nhược điểm"]),
        recommendations: new Set([
            "gợi ý ôn tập",
            "gợi ý",
            "khuyến nghị",
            "recommendations",
            "suggestions",
            "study tips",
            "study tip",
        ]),
    };

    const out = { greeting, strengths: [], weaknesses: [], recommendations: [], raw: text };

    let current = null; // "strengths" | "weaknesses" | "recommendations" | null

    const pushLine = (key, line) => {
        const cleaned = normalizeBullet(line);
        if (!cleaned) return;

        const nk = normalizeHeadingKey(cleaned);
        if (H.strengths.has(nk) || H.weaknesses.has(nk) || H.recommendations.has(nk)) return;

        out[key].push(cleaned);
    };

    for (let i = idxStart; i < lines.length; i++) {
        const line = lines[i];
        const key = normalizeHeadingKey(line);

        if (H.strengths.has(key)) {
            current = "strengths";
            continue;
        }
        if (H.weaknesses.has(key)) {
            current = "weaknesses";
            continue;
        }
        if (H.recommendations.has(key)) {
            current = "recommendations";
            continue;
        }

        if (!current) {
            const lower = line.toLowerCase();
            const looksWeak =
                lower.includes("lỗi") ||
                lower.includes("chưa") ||
                lower.includes("thiếu") ||
                lower.includes("nhầm") ||
                lower.includes("sai") ||
                lower.includes("không");
            current = looksWeak ? "weaknesses" : "recommendations";
        }

        pushLine(current, line);
    }

    if (!out.strengths.length && !out.weaknesses.length && !out.recommendations.length) {
        const one = text.replace(/\s+/g, " ").trim();
        if (one) out.weaknesses = [one];
    }

    return out;
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

    const percentText = useMemo(() => `${formatNumberTrim(percent, 1)}%`, [percent]);

    const score10 = useMemo(() => {
        const s = (percent / 100) * 10;
        return Math.max(0, Math.min(10, s));
    }, [percent]);

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

    const studyGuide = useMemo(() => parseStudyGuide(aiFeedback), [aiFeedback]);
    const keywordPool = useMemo(
        () => [...(studyGuide?.concepts ?? []), ...(studyGuide?.vocab ?? [])].filter(Boolean),
        [studyGuide]
    );

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

    // ✅ Modal state for Study Guide
    const [openStudyGuide, setOpenStudyGuide] = useState(false);

    const hasRecommendations = useMemo(() => {
        const g = studyGuide || {};
        const hasAny =
            Boolean(String(g.title || "").trim()) ||
            Boolean(String(g.subject || "").trim()) ||
            Boolean(String(g.topic || "").trim()) ||
            (Array.isArray(g.tips) && g.tips.filter(Boolean).length > 0) ||
            (Array.isArray(g.concepts) && g.concepts.filter(Boolean).length > 0) ||
            (Array.isArray(g.vocab) && g.vocab.filter(Boolean).length > 0) ||
            (Array.isArray(g.questions) && g.questions.filter(Boolean).length > 0);
        return hasAny;
    }, [studyGuide]);

    return (
        <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#1B2559" }}>Kết quả & Nhận xét Bài thi</Typography>

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
                        Bạn đã hoàn thành:{" "}
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

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>Nhận xét sau khi làm bài</Typography>

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

                <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                    {showRetest ? (
                        <Button variant="contained" onClick={onRetry} sx={{ fontWeight: 900 }} disabled={retestDisabled}>
                            {retestBtnLabel}
                        </Button>
                    ) : null}

                    <Button
                        variant="outlined"
                        onClick={() => setOpenStudyGuide(true)}
                        sx={{ fontWeight: 900, borderColor: "#2E2D84", color: "#2E2D84" }}
                        disabled={!hasRecommendations}
                    >
                        Hướng dẫn ôn tập
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

            {/* ✅ Modal “Hướng dẫn ôn tập” theo style Gemini */}
            <AppModal
                open={openStudyGuide}
                title="Hướng dẫn ôn tập"
                onClose={() => setOpenStudyGuide(false)}
                hideActions
                maxWidth="md"
            >
                <Box
                    sx={{
                        mt: 0.5,
                        border: "1px solid #E3E8EF",
                        borderRadius: 3,
                        bgcolor: "#F7F9FC",
                        p: 1.5,
                        maxHeight: "60vh",
                        overflow: "auto",
                    }}
                >
                    {String(studyGuide?.title || "").trim() ? (
                        <Typography sx={{ fontWeight: 950, fontSize: 16, color: "#1B2559" }}>
                            {studyGuide.title}
                        </Typography>
                    ) : null}

                    {/* Subject + Topic must be separate blocks */}
                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                        <SectionCard title="Môn học">
                            <Typography sx={{ mt: 0.75, color: "#716f6f", fontWeight: 650 }}>
                                {String(studyGuide?.subject || "").trim() || "Chưa có thông tin môn học."}
                            </Typography>
                        </SectionCard>

                        <SectionCard title="Chủ đề">
                            <Typography sx={{ mt: 0.75, color: "#716f6f", fontWeight: 650 }}>
                                {String(studyGuide?.topic || "").trim() || "Chưa có thông tin chủ đề."}
                            </Typography>
                        </SectionCard>
                    </Stack>

                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                        <SectionCard title="Gợi ý ôn tập">
                            <BulletItems items={studyGuide?.tips} keywordPool={keywordPool} />
                        </SectionCard>

                        <SectionCard title="Các khái niệm chính">
                            <BulletItems items={studyGuide?.concepts} keywordPool={keywordPool} />
                        </SectionCard>

                        <SectionCard title="Danh sách từ vựng">
                            <BulletItems items={studyGuide?.vocab} keywordPool={keywordPool} />
                        </SectionCard>

                        <SectionCard title="Câu hỏi ôn tập">
                            <BulletItems items={studyGuide?.questions} keywordPool={keywordPool} />
                        </SectionCard>
                    </Stack>

                    {!hasRecommendations ? (
                        <Typography sx={{ mt: 1.25, color: "#716f6f", fontWeight: 650, whiteSpace: "pre-wrap" }}>
                            {aiFeedback ? "Chưa có hướng dẫn ôn tập cụ thể." : "Chưa có hướng dẫn ôn tập."}
                        </Typography>
                    ) : null}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button variant="contained" onClick={() => setOpenStudyGuide(false)} sx={{ fontWeight: 900 }}>
                        Đóng
                    </Button>
                </Box>
            </AppModal>

            {/* giữ prop onNewMaterial để không ảnh hưởng flow parent (không dùng nữa) */}
            {typeof onNewMaterial === "function" ? null : null}
        </Box>
    );
}
