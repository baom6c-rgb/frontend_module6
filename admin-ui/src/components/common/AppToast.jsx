import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";

/**
 * Toast context
 */
const ToastContext = createContext(null);

/**
 * Provider bọc toàn app
 */
export function ToastProvider({ children }) {
    const [toast, setToast] = useState({
        open: false,
        message: "",
        severity: "info", // success | error | warning | info
    });

    const showToast = useCallback((message, severity = "info") => {
        setToast({
            open: true,
            message,
            severity,
        });
    }, []);

    const closeToast = (_, reason) => {
        if (reason === "clickaway") return;
        setToast((prev) => ({ ...prev, open: false }));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={closeToast}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={closeToast}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ fontWeight: 600 }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}

/**
 * Hook dùng trong component
 */
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used inside ToastProvider");
    }
    return ctx;
}
