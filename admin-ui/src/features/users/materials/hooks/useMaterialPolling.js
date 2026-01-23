import { useEffect, useRef } from "react";
import { getMaterialDetailApi } from "../../../../api/materialApi";

export const useMaterialPolling = ({
                                       materialId,
                                       enabled,
                                       intervalMs = 1500,
                                       maxAttempts = 40,
                                       onUpdate,
                                       onDone,
                                       onError,
                                   }) => {
    const attemptsRef = useRef(0);

    useEffect(() => {
        if (!enabled || !materialId) return;

        let timer = null;

        const tick = async () => {
            try {
                attemptsRef.current += 1;

                const res = await getMaterialDetailApi(materialId);
                const data = res.data;
                onUpdate?.(data);

                const status = (data.status || "").toUpperCase();
                if (status === "READY" || status === "FAILED") {
                    onDone?.(data);
                    return;
                }

                if (attemptsRef.current >= maxAttempts) {
                    onError?.(new Error("Polling timeout"));
                    return;
                }

                timer = setTimeout(tick, intervalMs);
            } catch (e) {
                onError?.(e);
            }
        };

        tick();
        return () => timer && clearTimeout(timer);
    }, [materialId, enabled, intervalMs, maxAttempts, onUpdate, onDone, onError]);
};
