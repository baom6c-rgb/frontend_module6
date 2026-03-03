// src/utils/datetime.js

/**
 * Unified VN datetime handling
 * - If server returns ISO with timezone (Z / +07:00) -> Date(...) ok
 * - If server returns LocalDateTime without timezone (Spring LocalDateTime)
 *   => treat as LOCAL time (browser local; user in VN = correct)
 */

export function parseServerDateTime(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // Case 1: Has timezone -> parse normally
    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // Case 2: LocalDateTime no timezone
    // yyyy-MM-ddTHH:mm(:ss)?(.fraction up to 9)?
    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?$/
    );
    if (!m) return null;

    const [, yy, mm, dd, hh, mi, ss, frac] = m;
    const year = Number(yy);
    const month = Number(mm) - 1;
    const day = Number(dd);
    const hour = Number(hh);
    const minute = Number(mi);
    const second = Number(ss || 0);

    // ms = first 3 digits of fraction
    const ms = frac ? Number(String(frac).padEnd(3, "0").slice(0, 3)) : 0;

    // ✅ Treat as LOCAL time
    const d = new Date(year, month, day, hour, minute, second, ms);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatServerDateTime(input) {
    const d = parseServerDateTime(input);
    if (!d) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    } catch {
        return d.toLocaleString();
    }
}

// input value needs "YYYY-MM-DDTHH:mm" in LOCAL
export function toLocalInput(isoOrLocalDateTime) {
    const d = parseServerDateTime(isoOrLocalDateTime);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

/**
 * ✅ IMPORTANT: Send LocalDateTime string (no Z) for BE LocalDateTime
 * "YYYY-MM-DDTHH:mm:ss"
 */
export function toLocalDateTimeOrNull(localStr) {
    if (!localStr) return null;
    const s = String(localStr).trim();
    if (!s) return null;

    // from <input type="datetime-local"> => "YYYY-MM-DDTHH:mm"
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;

    return `${s}:00`;
}