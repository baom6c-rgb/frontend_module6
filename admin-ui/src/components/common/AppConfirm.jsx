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
    Zoom,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useToast } from "./AppToast";

/**
 * Fade + scale nhẹ
 */
const Transition = forwardRef(function Transition(props, ref) {
    return <Zoom ref={ref} {...props} />;
});

export default function AppConfirm({
                                       open,
                                       title = "Xác nhận",
                                       message,

                                       confirmText = "Xác nhận",
                                       cancelText = "Hủy",

                                       onConfirm,
                                       onClose,

                                       loading,
                                       variant = "default",
                                   }) {
    const toastApi = useToast?.();
    const showToast = toastApi?.showToast;

    const [internalLoading, setInternalLoading] = useState(false);
    const isLoading = typeof loading === "boolean" ? loading : internalLoading;

    const isDanger = variant === "danger";

    const paperSx = useMemo(
        () => ({
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 14px 40px rgba(15, 23, 42, 0.18)",
        }),
        []
    );

    const Icon = isDanger ? WarningAmberRoundedIcon : CheckCircleRoundedIcon;

    const handleClose = () => {
        if (isLoading) return;
        onClose?.();
    };

    const handleConfirm = async () => {
        if (!onConfirm || isLoading) return;

        try {
            if (typeof loading !== "boolean") setInternalLoading(true);

            await onConfirm();

            // ✅ FIX: showToast nhận string + type (không bắn object)
            showToast?.("Thành công", "success");

            onClose?.();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                (typeof err?.response?.data === "string" ? err.response.data : null) ||
                err?.message ||
                "Có lỗi xảy ra, vui lòng thử lại";

            // ✅ FIX: showToast nhận string + type (không bắn object)
            showToast?.(msg, "error");
        } finally {
            if (typeof loading !== "boolean") setInternalLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            // ✅ chặn ESC + backdrop click (chỉ đóng qua nút Hủy)
            onClose={(_, reason) => {
                if (reason === "backdropClick" || reason === "escapeKeyDown") return;
                handleClose();
            }}
            disableEscapeKeyDown
            TransitionComponent={Transition}
            keepMounted
            PaperProps={{ sx: paperSx }}
            fullWidth
            maxWidth="xs"
        >
            {/* Header gradient */}
            <DialogTitle
                sx={{
                    px: 2.5,
                    py: 2,
                    color: "#fff",
                    background:
                        "linear-gradient(135deg, #2E2D84 0%, #3B3AA6 55%, #2E2D84 100%)",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "10px",
                            bgcolor: "rgba(255,255,255,0.16)",
                            display: "grid",
                            placeItems: "center",
                        }}
                    >
                        <Icon sx={{ color: "#fff" }} />
                    </Box>

                    {/* ✅ FIX DOM nesting: DialogTitle = h2, Typography h6 -> set component="span" */}
                    <Typography variant="h6" component="span" sx={{ fontWeight: 900, color: "#fff" }}>
                        {title}
                    </Typography>
                </Stack>
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
                {typeof message === "string" ? (
                    <Typography sx={{ color: "#2B3674", fontWeight: 600, lineHeight: 1.6 }}>
                        {message}
                    </Typography>
                ) : (
                    message
                )}
            </DialogContent>

            {/* Actions */}
            <DialogActions sx={{ px: 2.5, py: 2, bgcolor: "#fff" }}>
                <Stack direction="row" spacing={1.5} sx={{ width: "100%" }} justifyContent="flex-end">
                    {/* ✅ Cancel button style theo yêu cầu */}
                    <Button
                        onClick={handleClose}
                        disabled={isLoading}
                        variant="outlined"
                        sx={{
                            borderRadius: 999,
                            px: 2.6,
                            bgcolor: "#fff",
                            color: "#111",
                            borderColor: "rgba(0,0,0,0.18)",
                            textTransform: "none",
                            fontWeight: 800,
                            transition:
                                "background-color 180ms ease, color 180ms ease, border-color 180ms ease",
                            "&:hover": {
                                bgcolor: "#2E2D84",
                                color: "#fff",
                                borderColor: "#2E2D84",
                            },
                        }}
                    >
                        {cancelText}
                    </Button>

                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        variant="contained"
                        sx={{
                            borderRadius: 999,
                            px: 2.8,
                            bgcolor: "#EC5E32",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 900,
                            boxShadow: "0 10px 20px rgba(236, 94, 50, 0.25)",
                            transition: "background-color 180ms ease",
                            "&:hover": { bgcolor: "#D5522B" },
                        }}
                    >
                        {isLoading ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CircularProgress size={18} sx={{ color: "#fff" }} />
                                <span>Đang xử lý...</span>
                            </Stack>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
