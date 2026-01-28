// src/features/practice/PracticePage.jsx
import React, { useMemo, useState, useCallback } from "react";
import { Box, Paper, Typography, Stepper, Step, StepLabel, Divider } from "@mui/material";

import { practiceApi } from "../../api/practiceApi";

// Components
import MaterialStep from "./components/MaterialStep";
import PracticeConfigPanel from "./components/PracticeConfigPanel";
import PracticePreviewDialog from "./components/PracticePreviewDialog";
import PracticePlayer from "./components/PracticePlayer";
import PracticeResult from "./components/PracticeResult";
import PracticeReviewDialog from "./components/PracticeReviewDialog";

// Common
import GlobalLoading from "../../components/common/GlobalLoading";
import { useToast } from "../../components/common/AppToast";

const STEPS = ["Upload học liệu", "Cấu hình đề", "Làm bài", "Kết quả"];

const STEP_KEYS = {
    MATERIAL: 0,
    CONFIG: 1,
    DOING: 2,
    RESULT: 3,
};

// localStorage keys
const attemptStorageKey = (attemptId) => `practice_attempt_${attemptId}`;

export default function PracticePage() {
    const { showToast } = useToast();

    const [activeStep, setActiveStep] = useState(STEP_KEYS.MATERIAL);

    // global loading (Backdrop)
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // ===== Step 1 (Material) =====
    const [materialId, setMaterialId] = useState(null);

    // prevent auto-next loop
    const [materialReady, setMaterialReady] = useState(false);

    // ===== Step 2 (Config) =====
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(15);

    // Preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewQuestions, setPreviewQuestions] = useState([]);

    // previewToken để start() dùng cache => tránh gọi AI lần 2
    const [previewToken, setPreviewToken] = useState("");

    // ===== Step 3 (Attempt) =====
    const [attemptId, setAttemptId] = useState(null);
    const [attemptDetail, setAttemptDetail] = useState(null);

    // ===== Step 4 (Result) =====
    const [result, setResult] = useState(null);

    // Review dialog
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

    // ✅ helper: support axios response OR unwrapped data
    const unwrap = useCallback((res) => (res && typeof res === "object" && "data" in res ? res.data : res), []);

    const canGenerate = useMemo(() => {
        const n = Number(questionCount);
        return !!materialId && Number.isFinite(n) && n >= 1;
    }, [materialId, questionCount]);

    const buildConfigPayload = useCallback(() => {
        return {
            materialId,
            numberOfQuestions: Number(questionCount),
            durationMinutes: Number(durationMinutes),
        };
    }, [materialId, questionCount, durationMinutes]);

    // reset preview khi đổi config (tránh dùng token cũ sai cấu hình)
    const resetPreviewCache = useCallback(() => {
        setPreviewOpen(false);
        setPreviewQuestions([]);
        setPreviewToken("");
    }, []);

    const resetForNewMaterial = useCallback(() => {
        setActiveStep(STEP_KEYS.MATERIAL);

        setMaterialId(null);
        setMaterialReady(false);

        setPreviewOpen(false);
        setPreviewQuestions([]);
        setPreviewToken("");

        if (attemptId) {
            localStorage.removeItem(attemptStorageKey(attemptId));
        }

        setAttemptId(null);
        setAttemptDetail(null);

        setResult(null);

        setReviewOpen(false);
        setReviewData(null);

        setQuestionCount(10);
        setDurationMinutes(15);
    }, [attemptId]);

    const resetForRetry = useCallback(() => {
        setActiveStep(STEP_KEYS.CONFIG);

        setPreviewOpen(false);
        setPreviewQuestions([]);
        setPreviewToken("");

        if (attemptId) {
            localStorage.removeItem(attemptStorageKey(attemptId));
        }

        setAttemptId(null);
        setAttemptDetail(null);

        setResult(null);

        setReviewOpen(false);
        setReviewData(null);
    }, [attemptId]);

    // ===== Actions =====

    // ✅ FIX: generatePreview unwrap
    const handleOpenPreview = async () => {
        if (!canGenerate) {
            showToast?.("Vui lòng upload học liệu và nhập số câu hợp lệ", "warning");
            return;
        }

        try {
            setLoadingMessage("Đang sinh đề xem trước...");
            setLoading(true);

            const res = await practiceApi.generatePreview(buildConfigPayload());
            const data = unwrap(res);

            const token = data?.previewToken ?? "";
            const questions = data?.questions ?? [];

            setPreviewToken(token);
            setPreviewQuestions(Array.isArray(questions) ? questions : []);
            setPreviewOpen(true);

            if (!token) {
                showToast?.("Preview tạo được nhưng thiếu previewToken. Kiểm tra response BE/FE.", "warning");
            } else {
                showToast?.("Đã sinh đề xem trước", "success");
            }
        } catch (e) {
            const msg = typeof e.response?.data === "string" ? e.response.data : "Không thể sinh đề xem trước";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: start + getAttempt unwrap
    const handleStartAttempt = async () => {
        if (!canGenerate) {
            showToast?.("Vui lòng upload học liệu và nhập số câu hợp lệ", "warning");
            return;
        }

        // bắt buộc preview trước để start() không gọi AI lần 2
        if (!previewToken) {
            showToast?.("Hãy bấm 'Xem trước đề' trước khi bắt đầu", "warning");
            return;
        }

        try {
            setLoadingMessage("Đang khởi tạo bài luyện tập...");
            setLoading(true);

            const payload = {
                ...buildConfigPayload(),
                previewToken,
            };

            const startRes = await practiceApi.start(payload);
            const startData = unwrap(startRes);

            const newAttemptId = startData?.attemptId ?? startData?.id;
            if (!newAttemptId) throw new Error("Missing attemptId from server");

            // lưu mốc thời gian bắt đầu theo attemptId => reload vẫn chạy
            const startTs = Date.now();
            localStorage.setItem(
                attemptStorageKey(newAttemptId),
                JSON.stringify({
                    startTs,
                    // ✅ lưu luôn answers để reload vẫn giữ đáp án
                    answers: {},
                })
            );

            setAttemptId(newAttemptId);

            setLoadingMessage("Đang tải đề để làm bài...");
            const detailRes = await practiceApi.getAttempt(newAttemptId);
            const detailData = unwrap(detailRes);

            setAttemptDetail(detailData);

            setActiveStep(STEP_KEYS.DOING);
            showToast?.("Bắt đầu làm bài", "success");
        } catch (e) {
            const msg =
                typeof e.response?.data === "string"
                    ? e.response.data
                    : e.message || "Không thể bắt đầu làm bài";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: submit unwrap + ✅ NEW: fetch review ngay để lấy AI feedback tổng quan
    const handleSubmit = async (answersArray, meta = {}) => {
        if (!attemptId) {
            showToast?.("Thiếu attemptId, không thể nộp bài", "error");
            return;
        }

        try {
            setLoadingMessage(meta?.timedOut ? "Hết giờ! Đang tự động nộp bài..." : "Đang nộp bài và chấm điểm...");
            setLoading(true);

            const payload = { answers: answersArray };
            const res = await practiceApi.submit(attemptId, payload);
            const data = unwrap(res);

            // dọn timer storage sau khi submit thành công
            localStorage.removeItem(attemptStorageKey(attemptId));

            // set result trước để UI lên kết quả ngay
            setResult(data);
            setActiveStep(STEP_KEYS.RESULT);

            // ✅ Luôn cố gắng lấy review để có:
            // - review.aiFeedback tổng quan
            // - feedback từng câu (MCQ/ESSAY)
            // => giúp trang Result hiển thị “Nhận xét AI” không bị rỗng
            try {
                setLoadingMessage("Đang tải nhận xét AI...");
                const reviewRes = await practiceApi.getReview(attemptId);
                const review = unwrap(reviewRes);

                setReviewData(review);

                // ✅ “vá” aiFeedback vào result nếu submit trả rỗng
                const submitAi = String(data?.aiFeedback ?? "").trim();
                const reviewAi = String(review?.aiFeedback ?? "").trim();

                if (!submitAi && reviewAi) {
                    setResult((prev) => ({
                        ...(prev || data),
                        aiFeedback: reviewAi,
                    }));
                }

                // (optional) nếu BE từng trả data.review thì vẫn ok
            } catch (e) {
                // không chặn flow kết quả nếu review fail
            }

            showToast?.(meta?.timedOut ? "Đã tự động nộp bài (hết giờ)" : "Nộp bài thành công", "success");
        } catch (e) {
            const msg = typeof e.response?.data === "string" ? e.response.data : "Nộp bài thất bại";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: review unwrap
    const handleOpenReview = async () => {
        if (!attemptId) {
            showToast?.("Thiếu attemptId, không thể xem lại", "error");
            return;
        }

        if (reviewData) {
            setReviewOpen(true);
            return;
        }

        try {
            setLoadingMessage("Đang tải dữ liệu xem lại...");
            setLoading(true);

            const res = await practiceApi.getReview(attemptId);
            const data = unwrap(res);

            setReviewData(data);
            setReviewOpen(true);
        } catch (e) {
            const msg = typeof e.response?.data === "string" ? e.response.data : "Không thể tải dữ liệu xem lại";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ===== UI =====

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#F7F9FC", minHeight: "100vh" }}>
            <GlobalLoading open={loading} message={loadingMessage} />

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: "1px solid #E3E8EF",
                    maxWidth: 1200,
                    mx: "auto",
                    bgcolor: "#fff",
                }}
            >
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1B2559" }}>
                    Practice – AI Quiz từ học liệu
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel sx={{ "& .MuiStepLabel-label": { fontWeight: 700 } }}>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* STEP 1: MATERIAL */}
                {activeStep === STEP_KEYS.MATERIAL && (
                    <MaterialStep
                        materialId={materialReady ? materialId : null}
                        onMaterialUploaded={(id) => {
                            setMaterialId(id);
                            setMaterialReady(true);

                            resetPreviewCache();

                            showToast?.("Đã xác nhận học liệu, sang bước cấu hình", "success");
                            setActiveStep(STEP_KEYS.CONFIG);
                        }}
                    />
                )}

                {/* STEP 2: CONFIG */}
                {activeStep === STEP_KEYS.CONFIG && (
                    <>
                        <PracticeConfigPanel
                            materialId={materialId}
                            questionCount={questionCount}
                            durationMinutes={durationMinutes}
                            onChangeQuestionCount={setQuestionCount}
                            onChangeDuration={setDurationMinutes}
                            onConfigChanged={resetPreviewCache}
                            onBack={() => {
                                setActiveStep(STEP_KEYS.MATERIAL);
                                setMaterialReady(false);
                            }}
                            onPreview={handleOpenPreview}
                            onStart={handleStartAttempt}
                            loading={loading}
                        />

                        <PracticePreviewDialog
                            open={previewOpen}
                            onClose={() => setPreviewOpen(false)}
                            questions={previewQuestions}
                        />
                    </>
                )}

                {/* STEP 3: DOING */}
                {activeStep === STEP_KEYS.DOING && (
                    <PracticePlayer
                        attemptDetail={attemptDetail}
                        durationMinutes={durationMinutes}
                        attemptId={attemptId}
                        onBackToConfig={() => setActiveStep(STEP_KEYS.CONFIG)}
                        onSubmit={(answersArray, meta) => handleSubmit(answersArray, meta)}
                    />
                )}

                {/* STEP 4: RESULT */}
                {activeStep === STEP_KEYS.RESULT && (
                    <>
                        <PracticeResult
                            result={result}
                            numberOfQuestions={questionCount}
                            onRetry={resetForRetry}
                            onNewMaterial={resetForNewMaterial}
                            onViewReview={handleOpenReview}
                        />

                        <PracticeReviewDialog
                            open={reviewOpen}
                            onClose={() => setReviewOpen(false)}
                            review={reviewData}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
}
