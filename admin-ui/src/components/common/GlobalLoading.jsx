import React from "react";
import { Backdrop, Box, CircularProgress, Typography } from "@mui/material";

export default function GlobalLoading({ open, message = "Vui lòng chờ..." }) {
    return (
        <Backdrop
            open={!!open}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 2000,
                color: "#fff",
            }}
        >
            <Box
                sx={{
                    bgcolor: "rgba(11, 20, 55, 0.9)",
                    px: 4,
                    py: 3,
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                    minWidth: 260,
                }}
            >
                <CircularProgress />
                <Typography sx={{ fontWeight: 800 }}>{message}</Typography>
                <Typography sx={{ fontSize: 13, opacity: 0.85, textAlign: "center" }}>
                    Hệ thống đang xử lý, đừng tắt trang nha.
                </Typography>
            </Box>
        </Backdrop>
    );
}
