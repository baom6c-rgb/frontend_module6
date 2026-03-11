import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography, Divider, Chip, Stack } from "@mui/material";

import AppModal from "../../../components/common/AppModal";
import GlobalLoading from "../../../components/common/GlobalLoading";
import { assignedExamApi } from "../../../api/assignedExamApi";

// =============================
// Small utils
// =============================
function clampInt(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, Math.trunc(x)));
}

function formatNumberTrim(n, maxDecimals) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    const s = x.toFixed(maxDecimals);
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// =============================
// AI Feedback parsing (Strength/Weakness)
// =============================
function splitAiFeedback(raw) {
    const text = String(raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    const empty = { greeting: "", strengths: [], weaknesses: [], raw: text };
    if (!text) return empty;

    const normalizeBullet = (s) =>
        String(s || "")
            .replace(/^\s*[-•\u2022*]+\s*/g, "")
            .trim();

    const headingKey = (s) =>
        normalizeBullet(s)
            .replace(/^#+\s*/g, "")
            .replace(/\*\*/g, "")
            .replace(/[:：]\s*$/g, "")
            .trim()
            .toLowerCase();

    const isGreetingLine = (line) => {
        const lower = String(line || "").trim().toLowerCase();
        return lower.startsWith("chào ") || lower.startsWith("xin chào");
    };

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

    const out = { greeting, strengths: [], weaknesses: [], raw: text };

    const H = {
        strengths: new Set(["điểm mạnh", "strengths", "pros", "ưu điểm", "highlights"]),
        weaknesses: new Set(["điểm yếu", "weaknesses", "cons", "nhược điểm", "focus areas", "focus area"]),
    };

    let current = null;

    for (let i = idxStart; i < lines.length; i++) {
        const line = lines[i];
        const key = headingKey(line);

        if (H.strengths.has(key)) {
            current = "strengths";
            continue;
        }
        if (H.weaknesses.has(key)) {
            current = "weaknesses";
            continue;
        }
        if (!current) continue;

        const cleaned = normalizeBullet(line);
        if (!cleaned) continue;

        const k2 = headingKey(cleaned);
        if (H.strengths.has(k2) || H.weaknesses.has(k2)) continue;

        out[current].push(cleaned);
    }

    return out;
}

function BulletList({ items, emptyText }) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
        return (
            <Typography sx={{ mt: 1, color: "#64748B", fontWeight: 500, fontSize: "14px", whiteSpace: "pre-wrap" }}>
                {emptyText}
            </Typography>
        );
    }
    return (
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.2 }}>
            {list.map((t, idx) => (
                <Box component="li" key={idx} sx={{ mb: 0.75 }}>
                    <Typography sx={{ color: "#64748B", fontWeight: 500, fontSize: "14px", whiteSpace: "pre-wrap" }}>
                        {t}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

// =============================
// Study Guide parsing (reuse from old PracticeResult)
// =============================
function normalizeLine(s) {
    return String(s || "")
        .replace(/^\s*[-•\u2022*]+\s*/g, "")
        .trim();
}

function sanitizeStudyGuideClient(raw) {
    let t = String(raw || "");

    t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    t = t.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
    t = t.replace(/@\s*\n\s*(\w)/g, "@$1");

    const lines = t.split("\n");
    const out = [];
    let pending = "";

    const isSingleLetterLine = (s) => {
        const x = String(s || "").trim();
        if (!x) return false;
        if (x.length !== 1) return false;
        const c = x.charAt(0);
        return /[A-Za-zÀ-Ỵà-ỵ]/.test(c);
    };

    const flushPending = () => {
        if (!pending) return;
        out.push(pending);
        pending = "";
    };

    for (const line of lines) {
        const l = String(line || "").trim();

        if (!l) {
            flushPending();
            out.push("");
            continue;
        }

        if (isSingleLetterLine(l)) {
            pending += l;
            continue;
        }

        if (pending) {
            const merged = `${pending}${l}`;
            pending = "";
            out.push(merged);
        } else {
            out.push(l);
        }
    }
    flushPending();

    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitLines(raw) {
    const cleaned = sanitizeStudyGuideClient(raw);
    return String(cleaned || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
}

function isHeader(line, header) {
    const a = normalizeLine(line).toLowerCase().replace(/[:：]\s*$/g, "");
    const b = normalizeLine(header).toLowerCase().replace(/[:：]\s*$/g, "");
    return a === b;
}

function parseStudyGuide(raw) {
    const lines = splitLines(raw);
    const out = { title: "", subject: "", topic: "", summary: "", tips: [], concepts: [], vocab: [], questions: [] };
    if (!lines.length) return out;

    const idx = lines.findIndex((l) => isHeader(l, "Gợi ý ôn tập:"));
    const body = idx >= 0 ? lines.slice(idx + 1) : lines;

    let current = null;
    const isBulletLine = (line) => /^\s*[-•\u2022*]+\s+/.test(String(line || ""));

    const pushTipsOrQuestions = (arr, line) => {
        const cleaned = normalizeLine(line);
        if (!cleaned) return;

        const bullet = isBulletLine(line);

        if (!bullet) {
            if (arr.length) {
                arr[arr.length - 1] = `${arr[arr.length - 1]} ${cleaned}`.trim();
                return;
            }
            arr.push(cleaned);
            return;
        }

        arr.push(cleaned);
    };

    const pushConceptOrVocab = (arr, line) => {
        const cleaned = normalizeLine(line);
        if (!cleaned) return;

        if (isBulletLine(line)) {
            arr.push(cleaned);
            return;
        }

        const hasColon = cleaned.includes(":");
        if (hasColon) {
            arr.push(cleaned);
            return;
        }

        if (arr.length) {
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
        if (/^tóm tắt\s*[:：]/i.test(n)) {
            out.summary = n.replace(/^tóm tắt\s*[:：]\s*/i, "").trim();
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

        if (current === "tips") pushTipsOrQuestions(out.tips, line);
        if (current === "concepts") pushConceptOrVocab(out.concepts, line);
        if (current === "vocab") pushConceptOrVocab(out.vocab, line);
        if (current === "questions") pushTipsOrQuestions(out.questions, line);
    }

    return out;
}

function GuideItems({ items }) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
        return (
            <Typography
                sx={{
                    mt: 0.75,
                    color: "#4A5568",
                    fontWeight: 500,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.75,
                    fontSize: 14,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                }}
            >
                Chưa có nội dung.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.15} sx={{ mt: 1 }}>
            {list.map((t, idx) => (
                <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.1 }}>
                    <Box
                        sx={{
                            mt: "9px",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#94A3B8",
                            flex: "0 0 auto",
                        }}
                    />
                    <Typography
                        sx={{
                            color: "#4A5568",
                            fontWeight: 500,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.75,
                            fontSize: 14,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                        }}
                    >
                        {t}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

function GuideSection({ title, children }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid #E3E8EF",
                bgcolor: "#FFFFFF",
                borderLeft: "4px solid rgba(46,45,132,0.28)",
            }}
        >
            <Typography sx={{ fontWeight: 900, fontSize: 16, color: "#2B3674" }}>{title}</Typography>
            {children}
        </Paper>
    );
}

// =============================
// Component (ASSIGNED EXAM)
// =============================
export default function AssignedExamResult({
                                               assignmentId,
                                               result,
                                               numberOfQuestions,
                                               onViewReview,
                                           }) {
    const earned = useMemo(() => Number(result?.earnedPoints ?? 0), [result]);
    const totalPoints = useMemo(() => Number(result?.totalPoints ?? 0), [result]);
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();

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

    const statusRaw = useMemo(() => String(result?.status ?? "").toUpperCase(), [result]);
    const isFailed = useMemo(() => statusRaw === "FAILED", [statusRaw]);
    const isPassed = useMemo(() => statusRaw === "PASSED", [statusRaw]);

    const statusLabel = useMemo(() => {
        if (isPassed) return "Đạt";
        if (isFailed) return "Trượt";
        return percent >= 50 ? "Đạt" : "Trượt";
    }, [isPassed, isFailed, percent]);

    const statusColor = useMemo(() => (statusLabel === "Đạt" ? "#1B5E20" : "#B00020"), [statusLabel]);

    const feedback = useMemo(() => String(result?.feedback ?? "").trim(), [result]);
    const aiFeedback = useMemo(() => String(result?.aiFeedback ?? "").trim(), [result]);

    const aiSplit = useMemo(() => splitAiFeedback(aiFeedback), [aiFeedback]);

    // Study guide state (lazy fetch)
    const [openStudyGuide, setOpenStudyGuide] = useState(false);
    const [studyGuideLoading, setStudyGuideLoading] = useState(false);
    const [studyGuideError, setStudyGuideError] = useState("");

    const [studyGuideText, setStudyGuideText] = useState(() => String(result?.studyGuide ?? "").trim());
    useEffect(() => {
        setStudyGuideText(String(result?.studyGuide ?? "").trim());
    }, [result]);

    const studyGuideRawClean = useMemo(() => sanitizeStudyGuideClient(studyGuideText), [studyGuideText]);
    const studyGuide = useMemo(() => parseStudyGuide(studyGuideRawClean), [studyGuideRawClean]);

    const hasRecommendations = useMemo(() => {
        const g = studyGuide || {};
        return (
            Boolean(String(g.title || "").trim()) ||
            Boolean(String(g.subject || "").trim()) ||
            Boolean(String(g.topic || "").trim()) ||
            Boolean(String(g.summary || "").trim()) ||
            (Array.isArray(g.tips) && g.tips.filter(Boolean).length > 0) ||
            (Array.isArray(g.concepts) && g.concepts.filter(Boolean).length > 0) ||
            (Array.isArray(g.vocab) && g.vocab.filter(Boolean).length > 0) ||
            (Array.isArray(g.questions) && g.questions.filter(Boolean).length > 0)
        );
    }, [studyGuide]);

    const handleOpenStudyGuide = async () => {
        if (studyGuideLoading) return;
        setStudyGuideError("");

        // có sẵn => mở luôn
        if (String(studyGuideText || "").trim()) {
            setOpenStudyGuide(true);
            return;
        }

        if (!assignmentId) {
            setStudyGuideError("Không tìm thấy assignmentId để lấy hướng dẫn ôn tập.");
            setOpenStudyGuide(true);
            return;
        }

        setStudyGuideLoading(true);
        try {
            // ✅ Assigned Exam endpoint
            const res = await assignedExamApi.studentGetStudyGuide(assignmentId);
            const guide = String(res?.studyGuide ?? "").trim();
            if (!guide) setStudyGuideError("Chưa nhận được hướng dẫn ôn tập. Bạn thử lại nhé.");
            else setStudyGuideText(guide);
        } catch {
            setStudyGuideError("Không lấy được hướng dẫn ôn tập (có thể do quota/timeout). Bạn thử lại nhé.");
        } finally {
            setStudyGuideLoading(false);
            setOpenStudyGuide(true);
        }
    };

    // optional save
    useEffect(() => {
        if (!user || !user._id) return;
        const g = studyGuide || {};
        const ok =
            (g?.concepts?.length ?? 0) > 0 ||
            (g?.vocab?.length ?? 0) > 0 ||
            (g?.tips?.length ?? 0) > 0 ||
            (g?.questions?.length ?? 0) > 0;
        if (!ok) return;

        const dataToSave = {
            ...g,
            userId: user._id,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`latest_assigned_study_guide_${user._id}`, JSON.stringify(dataToSave));
    }, [studyGuide, user]);

    const totalQuestions = numberOfQuestions ?? 0;

    return (
        <Box>
            <GlobalLoading open={studyGuideLoading} message="Đang tạo hướng dẫn ôn tập..." />

            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#1B2559" }}>
                Kết quả & Nhận xét Bài thi
            </Typography>

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

                <Typography sx={{ fontWeight: 900, color: "#2B3674", fontSize: "16px" }}>Đánh giá tổng quan</Typography>
                <Typography
                    sx={{
                        mt: 1,
                        color: "#64748B",
                        fontWeight: 500,
                        whiteSpace: "pre-wrap",
                        fontSize: "14px",
                    }}
                >
                    {feedback || "Chưa có nhận xét."}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674", fontSize: "16px" }}>Nhận xét sau khi làm bài</Typography>

                {aiSplit.greeting ? (
                    <Typography sx={{ mt: 1, color: "#64748B", fontWeight: 500, fontSize: "14px", whiteSpace: "pre-wrap" }}>
                        {aiSplit.greeting}
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
                        <Typography sx={{ fontWeight: 900, color: "#1B5E20", fontSize: "16px" }}>Điểm mạnh</Typography>
                        <BulletList items={aiSplit.strengths} emptyText={"Chưa có điểm mạnh cụ thể. (Bấm “Xem lại đáp án” để xem theo từng câu.)"} />
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
                        <Typography sx={{ fontWeight: 900, color: "#B00020", fontSize: "16px" }}>Điểm yếu</Typography>
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
                    <Button
                        variant="outlined"
                        onClick={handleOpenStudyGuide}
                        sx={{ fontWeight: 900, borderColor: "#2E2D84", color: "#2E2D84" }}
                        disabled={!assignmentId || studyGuideLoading}
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

                    <Button
                        variant="contained"
                        onClick={() => navigate("/users/exams")}
                        sx={{ fontWeight: 900, bgcolor: "#2E2D84", color: "#fff", "&:hover": { bgcolor: "#25247a" } }}
                    >
                        Quay lại
                    </Button>
                </Box>
            </Paper>

            {/* ===== Modal “Hướng dẫn ôn tập” ===== */}
            <AppModal open={openStudyGuide} title="Hướng dẫn ôn tập" onClose={() => setOpenStudyGuide(false)} hideActions maxWidth="md">
                <Box
                    sx={{
                        mt: 0.5,
                        border: "1px solid #E3E8EF",
                        borderRadius: 3,
                        bgcolor: "#F7F9FC",
                        p: 1.5,
                        overflow: "visible",
                    }}
                >
                    {studyGuideError ? (
                        <Typography
                            sx={{
                                mb: 1,
                                p: 1,
                                borderRadius: 2,
                                bgcolor: "rgba(176,0,32,0.08)",
                                border: "1px solid rgba(176,0,32,0.25)",
                                color: "#B00020",
                                fontWeight: 800,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {studyGuideError}
                        </Typography>
                    ) : null}

                    {String(studyGuide?.title || "").trim() ? (
                        <Typography sx={{ fontWeight: 950, fontSize: 16, color: "#1B2559" }}>
                            {studyGuide.title}
                        </Typography>
                    ) : null}

                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                        <GuideSection title="Môn học">
                            <Typography sx={{ mt: 0.75, color: "#4A5568", fontWeight: 500, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14 }}>
                                {String(studyGuide?.subject || "").trim() || "Chưa có thông tin môn học."}
                            </Typography>
                        </GuideSection>

                        <GuideSection title="Chủ đề">
                            <Typography sx={{ mt: 0.75, color: "#4A5568", fontWeight: 500, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14 }}>
                                {String(studyGuide?.topic || "").trim() || "Chưa có thông tin chủ đề."}
                            </Typography>
                        </GuideSection>

                        <GuideSection title="Tóm tắt">
                            <Typography sx={{ mt: 0.75, color: "#4A5568", fontWeight: 500, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14 }}>
                                {String(studyGuide?.summary || "").trim() || "Chưa có tóm tắt."}
                            </Typography>
                        </GuideSection>
                    </Stack>

                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                        <GuideSection title="Gợi ý ôn tập">
                            <GuideItems items={studyGuide?.tips} />
                        </GuideSection>

                        <GuideSection title="Các khái niệm chính">
                            <GuideItems items={studyGuide?.concepts} />
                        </GuideSection>

                        <GuideSection title="Danh sách từ vựng">
                            <GuideItems items={studyGuide?.vocab} />
                        </GuideSection>

                        <GuideSection title="Câu hỏi ôn tập">
                            <GuideItems items={studyGuide?.questions} />
                        </GuideSection>
                    </Stack>

                    {!hasRecommendations ? (
                        <Typography sx={{ mt: 1.25, color: "#4A5568", fontWeight: 600, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14.5 }}>
                            {studyGuideRawClean ? "Chưa có hướng dẫn ôn tập cụ thể." : "Chưa có hướng dẫn ôn tập."}
                        </Typography>
                    ) : null}

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                        <Button variant="contained" onClick={() => setOpenStudyGuide(false)} sx={{ fontWeight: 900 }}>
                            Đóng
                        </Button>
                    </Box>
                </Box>
            </AppModal>
        </Box>
    );
}