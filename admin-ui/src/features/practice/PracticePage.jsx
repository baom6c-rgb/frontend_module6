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

    // ✅ global loading (Backdrop)
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Vui lòng chờ...");

    // ===== Step 1 (Material) =====
    const [materialId, setMaterialId] = useState(null);

    // ✅ prevent auto-next loop
    const [materialReady, setMaterialReady] = useState(false);

    // ===== Step 2 (Config) =====
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(15);

    // Preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewQuestions, setPreviewQuestions] = useState([]);

    // ✅ previewToken để start() dùng cache => tránh gọi AI lần 2
    const [previewToken, setPreviewToken] = useState("");

    // ===== Step 3 (Attempt) =====
    const [attemptId, setAttemptId] = useState(null);
    const [attemptDetail, setAttemptDetail] = useState(null);

    // ===== Step 4 (Result) =====
    const [result, setResult] = useState(null);

    // ✅ Review dialog
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState(null);

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

    // ✅ reset preview khi đổi config (để tránh dùng token cũ sai cấu hình)
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

        // dọn attempt localStorage nếu có
        if (attemptId) {
            localStorage.removeItem(attemptStorageKey(attemptId));
        }

        setAttemptId(null);
        setAttemptDetail(null);

        setResult(null);

        // ✅ reset review
        setReviewOpen(false);
        setReviewData(null);

        // optional: reset config default
        setQuestionCount(10);
        setDurationMinutes(15);
    }, [attemptId]);

    const resetForRetry = useCallback(() => {
        setActiveStep(STEP_KEYS.CONFIG);

        setPreviewOpen(false);
        setPreviewQuestions([]);
        setPreviewToken("");

        // dọn attempt localStorage nếu có
        if (attemptId) {
            localStorage.removeItem(attemptStorageKey(attemptId));
        }

        setAttemptId(null);
        setAttemptDetail(null);

        setResult(null);

        // ✅ reset review
        setReviewOpen(false);
        setReviewData(null);
    }, [attemptId]);

    // ===== Actions =====

    const handleOpenPreview = async () => {
        if (!canGenerate) {
            showToast?.("Vui lòng upload học liệu và nhập số câu hợp lệ", "warning");
            return;
        }

        try {
            setLoadingMessage("Đang sinh đề xem trước...");
            setLoading(true);

            const res = await practiceApi.generatePreview(buildConfigPayload());

            // ✅ shape BE: { previewToken, questions, ... }
            const token = res.data?.previewToken ?? "";
            const questions = res.data?.questions ?? [];

            setPreviewToken(token);
            setPreviewQuestions(Array.isArray(questions) ? questions : []);
            setPreviewOpen(true);

            showToast?.("Đã sinh đề xem trước", "success");
        } catch (e) {
            const msg =
                typeof e.response?.data === "string" ? e.response.data : "Không thể sinh đề xem trước";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleStartAttempt = async () => {
        if (!canGenerate) {
            showToast?.("Vui lòng upload học liệu và nhập số câu hợp lệ", "warning");
            return;
        }

        // ✅ bắt buộc preview trước để start() không gọi AI lần 2
        if (!previewToken) {
            showToast?.("Hãy bấm 'Xem trước đề' trước khi bắt đầu", "warning");
            return;
        }

        try {
            setLoadingMessage("Đang khởi tạo bài luyện tập...");
            setLoading(true);

            const payload = {
                ...buildConfigPayload(),
                previewToken, // ✅ quan trọng: cache hit ở BE
            };

            const startRes = await practiceApi.start(payload);
            const newAttemptId = startRes.data?.attemptId ?? startRes.data?.id;
            if (!newAttemptId) throw new Error("Missing attemptId from server");

            // ✅ lưu mốc thời gian bắt đầu theo attemptId => reload vẫn chạy
            const startTs = Date.now();
            localStorage.setItem(attemptStorageKey(newAttemptId), JSON.stringify({ startTs }));

            setAttemptId(newAttemptId);

            setLoadingMessage("Đang tải đề để làm bài...");
            const detailRes = await practiceApi.getAttempt(newAttemptId);
            setAttemptDetail(detailRes.data);

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

    const handleSubmit = async (answersArray) => {
        if (!attemptId) {
            showToast?.("Thiếu attemptId, không thể nộp bài", "error");
            return;
        }

        try {
            setLoadingMessage("Đang nộp bài và chấm điểm...");
            setLoading(true);

            const payload = { answers: answersArray };
            const res = await practiceApi.submit(attemptId, payload);

            // ✅ dọn timer storage sau khi submit thành công
            localStorage.removeItem(attemptStorageKey(attemptId));

            setResult(res.data);
            setActiveStep(STEP_KEYS.RESULT);

            // ✅ nếu backend trả sẵn review thì cache luôn (optional)
            if (res.data?.review) setReviewData(res.data.review);

            showToast?.("Nộp bài thành công", "success");
        } catch (e) {
            const msg = typeof e.response?.data === "string" ? e.response.data : "Nộp bài thất bại";
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // ✅ mở review (ưu tiên dùng cache, không có thì gọi API)
    const handleOpenReview = async () => {
        if (!attemptId) {
            showToast?.("Thiếu attemptId, không thể xem lại", "error");
            return;
        }

        // 1) có cache thì mở luôn
        if (reviewData) {
            setReviewOpen(true);
            return;
        }

        // 2) không có cache -> gọi API
        try {
            setLoadingMessage("Đang tải dữ liệu xem lại...");
            setLoading(true);

            const res = await practiceApi.getReview(attemptId);
            setReviewData(res.data);
            setReviewOpen(true);
        } catch (e) {
            const msg =
                typeof e.response?.data === "string" ? e.response.data : "Không thể tải dữ liệu xem lại";
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

                <Typography sx={{ mt: 0.5, color: "#6C757D", fontWeight: 600 }}>
                    Upload tài liệu → hệ thống xử lý → sinh đề → làm bài → nhận điểm & nhận xét
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

                            // ✅ material đổi => reset preview/token
                            resetPreviewCache();

                            showToast?.("Upload thành công, đang xử lý học liệu…", "success");
                            setActiveStep(STEP_KEYS.CONFIG);
                        }}
                        onAutoNext={() => {
                            if (materialReady && materialId) setActiveStep(STEP_KEYS.CONFIG);
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
                            onConfigChanged={resetPreviewCache} // ✅ QUAN TRỌNG (nếu panel support)
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
                        attemptId={attemptId}                 // ✅ NEW: truyền attemptId để timer đọc storage
                        onBackToConfig={() => setActiveStep(STEP_KEYS.CONFIG)}
                        onSubmit={handleSubmit}               // ✅ dùng chung submit
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
