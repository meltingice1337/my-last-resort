// Fire-and-forget recovery telemetry. Never throws into callers, never sends secrets.
const SESSION = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
})();

export function track(event, meta = {}) {
  try {
    const url = import.meta.env.VITE_COLLECTOR_URL;
    if (!url) return; // silent build

    const payload = JSON.stringify({
      event,
      session: SESSION,
      ts: Date.now(),
      revision: meta.revision ?? null,
      shares: meta.shares ?? null,
      threshold: meta.threshold ?? null,
    });

    const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;

    // Fallback for browsers without sendBeacon.
    fetch(url, { method: "POST", body: payload, keepalive: true }).catch(() => {});
  } catch {
    // Telemetry must never break recovery.
  }
}
