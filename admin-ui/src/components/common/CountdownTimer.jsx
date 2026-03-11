// src/components/common/CountdownTimer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

export default function CountdownTimer({
                                           startTimestamp,        // number (ms)
                                           durationSeconds,       // number
                                           onExpire,
                                           dangerThreshold = 10,
                                       }) {
    const [tick, setTick] = useState(0);     // ✅ dùng tick thật sự
    const expiredRef = useRef(false);

    useEffect(() => {
        const id = setInterval(() => setTick((v) => v + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const remainSeconds = useMemo(() => {
        if (!startTimestamp || !durationSeconds) return 0;
        const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        return Math.max(0, durationSeconds - elapsed);
    }, [startTimestamp, durationSeconds, tick]); // ✅ add tick

    useEffect(() => {
        if (remainSeconds === 0 && !expiredRef.current) {
            expiredRef.current = true;
            onExpire?.();
        }
    }, [remainSeconds, onExpire]);

    const isDanger = remainSeconds <= dangerThreshold;

    const mm = String(Math.floor(remainSeconds / 60)).padStart(2, "0");
    const ss = String(remainSeconds % 60).padStart(2, "0");

    return (
        <Box
            sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                border: "1px solid #E3E8EF",
                bgcolor: "#fff",
                minWidth: 84,
                textAlign: "center",
            }}
        >
            <Typography sx={{ fontWeight: 900, color: isDanger ? "#B00020" : "#1B2559" }}>
                {mm}:{ss}
            </Typography>
        </Box>
    );
}
