/**
 * Format an ISO 8601 timestamp for display, e.g. "July 3, 2026 at 1:25 PM".
 * Uses the viewer's locale and local time zone. Returns "" for missing or
 * invalid input so callers can render nothing gracefully.
 * @param {string} iso
 * @returns {string}
 */
export function formatVaultDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}
