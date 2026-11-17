/**
 * Formats a byte quantity into a human-readable string (e.g. 1.4 GB)
 */
export function formatBytes(bytes?: number, decimals = 1): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Formats numbers with locale-aware thousands separators (e.g. 1,250,000)
 */
export function formatNumber(num?: number): string {
  if (num === undefined || num === null || Number.isNaN(num)) {
    return '0';
  }
  return num.toLocaleString();
}

/**
 * Formats a date or timestamp into a friendly readable string
 */
export function formatDate(timestamp?: number | string): string {
  if (!timestamp) {
    return '—';
  }
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }
    return date.toLocaleString();
  } catch {
    return String(timestamp);
  }
}
