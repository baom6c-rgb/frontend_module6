// src/features/practice/components/MaterialStep.jsx
import React, { useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";

import MaterialUpload from "../../users/materials/UploadMaterial";

export default function MaterialStep({ materialId, onMaterialUploaded, onAutoNext }) {

    // ✅ Auto chuyển bước ngay khi upload xong
    useEffect(() => {
        if (materialId) {
            onAutoNext?.();
        }
    }, [materialId, onAutoNext]);

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #E3E8EF",
                    bgcolor: "#fff",
                }}
            >
                <Typography sx={{ fontWeight: 800, color: "#1B2559", mb: 1 }}>
                    Upload học liệu
                </Typography>

                <Typography sx={{ mb: 2, color: "#6C757D", fontWeight: 600 }}>
                    Upload 1 file (PDF / DOCX / TXT). Hệ thống sẽ tự động xử lý và tạo bài luyện tập.
                </Typography>

                {/* Upload 1 file duy nhất */}
                <MaterialUpload onUploaded={onMaterialUploaded} />
            </Paper>
        </Box>
    );
}
