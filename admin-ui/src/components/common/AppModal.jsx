import React, { forwardRef, useMemo, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
    Zoom,
} from "@mui/material";
import { useToast } from "./AppToast";

/**
 * Transition: fade + scale nhẹ (Zoom = opacity + transform)
 */
const Transition = forwardRef(function Transition(props, ref) {
    return <Zoom ref={ref} {...props} />;
});

/**
 * Reusable Modal - Production-grade
 *
 * Props:
 * - open: boolean
 * - title: string | ReactNode
 * - onClose: () => void
 * - children: ReactNode
 * - primaryText?: string (default "Xác nhận")
 * - secondaryText?: string (default "Hủy")
 * - onSubmit?: () => Promise<void> | void
 * - loading?: boolean (disable buttons khi submit) - optional controlled
 * - maxWidth?: "xs"|"sm"|"md"|"lg"|"xl"|false|string|number
 * - hideActions?: boolean (nếu modal chỉ hiển thị nội dung)
 */
export default function AppModal({
                                     open,
                                     title,
                                     onClose,
                                     children,

                                     primaryText = "Xác nhận",
                                     secondaryText = "Hủy",
                                     onSubmit,

                                     loading,
                                     maxWidth = "sm",
                                     hideActions = false,
                                 }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // toast (đã có sẵn ở dự án)
    const toastApi = useToast?.();
    const showToast = toastApi?.showToast;

    // hỗ trợ controlled/uncontrolled loading
    const [internalLoading, setInternalLoading] = useState(false);
    const isSubmitting = typeof loading === "boolean" ? loading : internalLoading;

    // maxWidth responsive nếu truyền string/number (custom)
    const paperSx = useMemo(() => {
        const base = {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 14px 40px rgba(15, 23, 42, 0.18)",
        };

        if (typeof maxWidth === "number") {
            return { ...base, width: "100%", maxWidth };
        }
        if (
            typeof maxWidth === "string" &&
            !["xs", "sm", "md", "lg", "xl", false].includes(maxWidth)
        ) {
            return { ...base, width: "100%", maxWidth };
        }
        return base;
    }, [maxWidth]);

    const handleClose = () => {
        if (isSubmitting) return;
        onClose?.();
    };

    const handleSubmit = async () => {
        if (!onSubmit || isSubmitting) return;

        try {
            if (typeof loading !== "boolean") setInternalLoading(true);

            await onSubmit();

            showToast?.({
                type: "success",
                message: "Thành công",
            });

            onClose?.();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                (typeof err?.response?.data === "string" ? err.response.data : null) ||
                err?.message ||
                "Có lỗi xảy ra, vui lòng thử lại";

            showToast?.({
                type: "error",
                message: msg,
            });
        } finally {
            if (typeof loading !== "boolean") setInternalLoading(false);
        }
    };

    // MUI maxWidth prop: chỉ set nếu thuộc enum/false, còn custom thì dùng Paper sx
    const muiMaxWidth = ["xs", "sm", "md", "lg", "xl", false].includes(maxWidth)
        ? maxWidth
        : "sm";

    return (
        <Dialog
            open={open}
            // ✅ chặn backdrop click + ESC (chỉ cho đóng qua nút Hủy)
            onClose={(_, reason) => {
                if (reason === "backdropClick" || reason === "escapeKeyDown") return;
                handleClose();
            }}
            disableEscapeKeyDown
            fullWidth
            maxWidth={muiMaxWidth}
            fullScreen={isMobile}
            TransitionComponent={Transition}
            keepMounted
            PaperProps={{ sx: paperSx }}
        >
            {/* Header (không có nút X) */}
            <DialogTitle
                sx={{
                    px: 2.5,
                    py: 2,
                    color: "#fff",
                    background:
                        "linear-gradient(135deg, #2E2D84 0%, #3B3AA6 55%, #2E2D84 100%)",
                }}
            >
                {typeof title === "string" ? (
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 800, color: "#fff", wordBreak: "break-word" }}
                    >
                        {title}
                    </Typography>
                ) : (
                    title
                )}
            </DialogTitle>

            {/* Body */}
            <DialogContent
                dividers
                sx={{
                    px: 2.5,
                    py: 2.25,
                    bgcolor: "#fff",
                }}
            >
                {children}
            </DialogContent>

            {/* Actions */}
            {!hideActions && (
                <DialogActions
                    sx={{
                        px: 2.5,
                        py: 2,
                        bgcolor: "#fff",
                    }}
                >
                    <Stack direction="row" spacing={1.5} sx={{ width: "100%" }} justifyContent="flex-end">
                        <Button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            variant="outlined"
                            sx={{
                                borderRadius: 999,
                                px: 2.5,
                                borderColor: "rgba(46,45,132,0.35)",
                                color: "#2E2D84",
                                "&:hover": {
                                    borderColor: "rgba(46,45,132,0.55)",
                                    bgcolor: "rgba(46,45,132,0.06)",
                                },
                            }}
                        >
                            {secondaryText}
                        </Button>

                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !onSubmit}
                            variant="contained"
                            sx={{
                                borderRadius: 999,
                                px: 2.8,
                                bgcolor: "#EC5E32",
                                color: "#fff",
                                boxShadow: "0 10px 20px rgba(236, 94, 50, 0.25)",
                                "&:hover": { bgcolor: "#D5522B" },
                            }}
                        >
                            {isSubmitting ? (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                                    <span>Đang xử lý...</span>
                                </Stack>
                            ) : (
                                primaryText
                            )}
                        </Button>
                    </Stack>
                </DialogActions>
            )}
        </Dialog>
    );
}
