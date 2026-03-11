import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import AppConfirm from "../../../../components/common/AppConfirm";

/**
 * Imperative confirm manager (Promise-based):
 * await ref.current.requestStart()  -> boolean (true=confirmed)
 * await ref.current.requestReset()  -> boolean
 * await ref.current.requestSubmit(answersArray, meta) -> boolean (false=cancel or failed)
 */
const PracticeConfirmManager = forwardRef(function PracticeConfirmManager(
    { onStart, onReset, onSubmit },
    ref
) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(null); // "START" | "RESET" | "SUBMIT"

    const pendingSubmitRef = useRef({ answersArray: null, meta: null });

    // ✅ resolver để trả kết quả confirm (true/false) về caller
    const resolverRef = useRef(null); // (value:boolean) => void

    const safeResolve = (value) => {
        const r = resolverRef.current;
        resolverRef.current = null;
        if (typeof r === "function") r(Boolean(value));
    };

    const resetPending = () => {
        pendingSubmitRef.current = { answersArray: null, meta: null };
    };

    const close = (resolveValue = null) => {
        setOpen(false);
        setType(null);
        resetPending();

        // ✅ nếu caller đang await thì trả về (mặc định false khi đóng)
        if (resolveValue !== null) safeResolve(resolveValue);
    };

    const openWithPromise = (nextType) => {
        // nếu đang mở 1 confirm khác -> đóng cái cũ và resolve false
        if (open) safeResolve(false);

        setType(nextType);
        setOpen(true);

        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    };

    useImperativeHandle(ref, () => ({
        requestStart: () => openWithPromise("START"),
        requestReset: () => openWithPromise("RESET"),

        requestSubmit: async (answersArray, meta = {}) => {
            // ✅ timedOut -> auto submit (no confirm)
            if (meta?.timedOut) {
                try {
                    await onSubmit?.(Array.isArray(answersArray) ? answersArray : [], meta);
                    return true;
                } catch {
                    return false;
                }
            }

            pendingSubmitRef.current = { answersArray, meta };
            return openWithPromise("SUBMIT");
        },

        close: () => close(false),
    }));

    const ui = useMemo(() => {
        if (type === "START") {
            return {
                title: "Xác nhận bắt đầu",
                message:
                    "Bạn sắp bắt đầu làm bài. Khi đã bắt đầu, bạn không thể thay đổi cấu hình đề. Tiếp tục?",
                confirmText: "Bắt đầu",
                cancelText: "Hủy",
                variant: "default",
            };
        }
        if (type === "RESET") {
            return {
                title: "Xác nhận đổi học liệu",
                message:
                    "Bạn muốn đổi học liệu? Phiên/lượt làm bài hiện tại sẽ bị hủy. Tiếp tục?",
                confirmText: "Đổi học liệu",
                cancelText: "Hủy",
                variant: "danger",
            };
        }
        // SUBMIT
        return {
            title: "Xác nhận nộp bài",
            message:
                "Bạn chắc chắn muốn nộp bài ngay bây giờ? Sau khi nộp, bạn sẽ xem kết quả và không thể chỉnh sửa đáp án.",
            confirmText: "Nộp bài",
            cancelText: "Hủy",
            variant: "default",
        };
    }, [type]);

    return (
        <AppConfirm
            open={open}
            title={ui.title}
            message={ui.message}
            confirmText={ui.confirmText}
            cancelText={ui.cancelText}
            variant={ui.variant}
            // ✅ Cancel / backdrop / ESC => resolve false
            onClose={() => close(false)}
            toastOnSuccess={false}
            toastOnError={false}
            autoCloseOnSuccess={false}
            onConfirm={async () => {
                try {
                    if (type === "START") {
                        await onStart?.();
                        // ✅ confirm OK
                        close(true);
                        return;
                    }

                    if (type === "RESET") {
                        await onReset?.();
                        close(true);
                        return;
                    }

                    // SUBMIT
                    const { answersArray, meta } = pendingSubmitRef.current || {};
                    // đóng trước cho mượt UI (nhưng vẫn giữ resolver để trả true/false)
                    setOpen(false);

                    await onSubmit?.(Array.isArray(answersArray) ? answersArray : [], meta || {});

                    // ✅ submit OK
                    setType(null);
                    resetPending();
                    safeResolve(true);
                } catch {
                    // ✅ submit fail => mở khóa lại cho PracticePlayer
                    setOpen(false);
                    setType(null);
                    resetPending();
                    safeResolve(false);
                }
            }}
        />
    );
});

export default PracticeConfirmManager;