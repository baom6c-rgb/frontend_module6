import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import AppConfirm from "../../../../components/common/AppConfirm";

/**
 * Imperative confirm manager:
 * ref.current.requestStart()
 * ref.current.requestReset()
 * ref.current.requestSubmit(answersArray, meta)
 */
const PracticeConfirmManager = forwardRef(function PracticeConfirmManager(
    { onStart, onReset, onSubmit },
    ref
) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(null); // "START" | "RESET" | "SUBMIT"

    const pendingSubmitRef = useRef({ answersArray: null, meta: null });

    const close = () => {
        setOpen(false);
        setType(null);
        pendingSubmitRef.current = { answersArray: null, meta: null };
    };

    useImperativeHandle(ref, () => ({
        requestStart: () => {
            setType("START");
            setOpen(true);
        },
        requestReset: () => {
            setType("RESET");
            setOpen(true);
        },
        requestSubmit: (answersArray, meta = {}) => {
            // ✅ timedOut -> auto submit (no confirm)
            if (meta?.timedOut) {
                onSubmit?.(answersArray, meta);
                return;
            }
            pendingSubmitRef.current = { answersArray, meta };
            setType("SUBMIT");
            setOpen(true);
        },
        close,
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
            onClose={close}
            // ✅ PracticePage tự xử lý toast -> tắt toast ở đây
            toastOnSuccess={false}
            toastOnError={false}
            // ✅ Manager tự close để không double-close
            autoCloseOnSuccess={false}
            onConfirm={async () => {
                try {
                    if (type === "START") {
                        await onStart?.();
                        close();
                        return;
                    }
                    if (type === "RESET") {
                        await onReset?.();
                        close();
                        return;
                    }
                    // SUBMIT
                    const { answersArray, meta } = pendingSubmitRef.current || {};
                    close(); // đóng trước cho mượt UI
                    await onSubmit?.(Array.isArray(answersArray) ? answersArray : [], meta || {});
                } catch {
                    // parent (PracticePage) sẽ toast/error handling
                }
            }}
        />
    );
});

export default PracticeConfirmManager;
