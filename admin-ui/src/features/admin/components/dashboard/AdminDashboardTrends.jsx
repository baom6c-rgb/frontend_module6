// src/features/admin/components/dashboard/AdminDashboardTrends.jsx
import React from "react";
import { Box, Stack } from "@mui/material";
import AdminDashboardAttemptsChart from "./AdminDashboardAttemptsChart";
import AdminDashboardPassRateChart from "./AdminDashboardPassRateChart";

export default function AdminDashboardTrends({ timeSeries = [] }) {
    return (
        <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2, sm: 2.5, md: 3 }}
            sx={{ width: "100%", minWidth: 0 }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <AdminDashboardAttemptsChart timeSeries={timeSeries} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <AdminDashboardPassRateChart timeSeries={timeSeries} />
            </Box>
        </Stack>
    );
}