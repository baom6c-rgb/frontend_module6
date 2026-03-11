import { useEffect, useMemo, useState } from "react";
import { adminUserApi } from "../../../api/adminUserApi";

export function usePendingApprovals({ enabled = true, intervalMs = 3000 } = {}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const count = useMemo(() => items.length, [items]);

    const fetchPending = async () => {
        if (!enabled) return;
        try {
            setLoading(true);
            const res = await adminUserApi.getPendingApprovals();
            setItems(res.data || []);
        } catch (e) {
            console.error("Fetch pending approvals failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) return;

        // fetch ngay lần đầu
        fetchPending();

        // polling
        const intervalId = setInterval(fetchPending, intervalMs);

        // refresh khi quay lại tab
        const onFocus = () => fetchPending();
        window.addEventListener("focus", onFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", onFocus);
        };
    }, [enabled, intervalMs]);

    return {
        items,
        count,
        loading,
        refetch: fetchPending,
    };
}
