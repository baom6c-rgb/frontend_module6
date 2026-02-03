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

    const percentText = useMemo(() => `${percent.toFixed(1)}%`, [percent]);

    const score10 = useMemo(() => {
        const s = (percent / 100) * 10;
        return Math.max(0, Math.min(10, s));
    }, [percent]);

    const score10Text = useMemo(() => `${score10.toFixed(2)}/10`, [score10]);

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
            // expected: { canRetestNow, remainingSeconds } (or { retestRemainingSeconds })
            const sec = Number(s?.retestRemainingSeconds ?? s?.remainingSeconds);
            const can = Boolean(s?.canRetestNow);

            if (!mountedRef.current) return;

            setCanRetestNow(can);
            if (Number.isFinite(sec)) setRemainingSeconds(Math.max(0, Math.floor(sec)));
            else setRemainingSeconds(0);
        } catch {
            // nếu lỗi call status, fallback nhẹ: disable 30s để tránh spam click
            if (!mountedRef.current) return;
            setCanRetestNow(false);
            setRemainingSeconds((prev) => (prev > 0 ? prev : 30));
        } finally {
            if (mountedRef.current) setStatusLoading(false);
        }
    };

    // mount/unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // when result changes => sync status
    useEffect(() => {
        setRemainingSeconds(0);
        setCanRetestNow(false);

        if (!showRetest || !attemptId) return;

        // ưu tiên dùng fields BE trả ngay trong submit nếu có
        const secFromSubmit = Number(result?.retestRemainingSeconds);
        const canFromSubmit = typeof result?.canRetestNow === "boolean" ? result.canRetestNow : null;

        if (Number.isFinite(secFromSubmit) || canFromSubmit !== null) {
            setRemainingSeconds(Number.isFinite(secFromSubmit) ? Math.max(0, Math.floor(secFromSubmit)) : 0);
            setCanRetestNow(Boolean(canFromSubmit));
            // vẫn fetch 1 phát để chắc chắn đúng theo system settings
            fetchRetestStatus();
            return;
        }

        // nếu submit không có => fetch status từ BE
        fetchRetestStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attemptId, showRetest]);

    // countdown tick (FE chỉ hiển thị, BE là truth)
    useEffect(() => {
        if (!showRetest) return;
        if (canRetestNow) return;
        if (remainingSeconds <= 0) return;

        const t = setInterval(() => {
            setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(t);
    }, [showRetest, canRetestNow, remainingSeconds]);

    // when countdown hits 0 => re-check BE to avoid drift
    useEffect(() => {
        if (!showRetest || !attemptId) return;
        if (remainingSeconds !== 0) return;
        if (canRetestNow) return;

        // check BE (to prevent early enable if FE clock differs)
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

    return (
        <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#1B2559" }}>
                Kết quả luyện tập
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
                <Typography sx={{ mt: 1, color: "#252525", fontWeight: 600, whiteSpace: "pre-wrap" }}>
                    {feedback || "Chưa có nhận xét."}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography sx={{ fontWeight: 900, color: "#2B3674" }}>
                    Fly AI nhận xét (giải thích lỗi sai + gợi ý đọc lại)
                </Typography>

                <Typography sx={{ mt: 1, color: "#474646", fontWeight: 650, whiteSpace: "pre-wrap" }}>
                    {aiFeedback ||
                        "Chưa có feedback. (Có thể bị quota/timeout). Bấm “Xem lại đáp án” để xem feedback chi tiết từng câu."}
                </Typography>

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
