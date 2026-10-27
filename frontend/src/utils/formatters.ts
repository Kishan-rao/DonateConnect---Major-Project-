export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Safely parses a timestamp from various backend formats into a valid JavaScript Date.
 * Handles:
 * - ISO strings with UTC 'Z' or timezone offsets
 * - ISO strings without timezone offsets (treated as UTC, preventing local-time misinterpretation)
 * - Space-separated SQL datetime strings (e.g., 'YYYY-MM-DD HH:mm:ss')
 * - Epoch timestamps in milliseconds (~13 digits)
 * - Epoch timestamps in seconds (~10 digits, converted to milliseconds)
 * - Safe handling of Date objects, invalid strings, null, and undefined
 */
export const parseNotificationDate = (input: string | number | Date | null | undefined): Date | null => {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // Handle numbers
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return null;
    const ms = input < 1e11 ? input * 1000 : input;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date;
  }

  const str = String(input).trim();
  if (!str) return null;

  // Handle numeric strings e.g. "1729876543" (seconds) or "1729876543000" (milliseconds)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (isNaN(num) || num <= 0) return null;
    const ms = num < 1e11 ? num * 1000 : num;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date;
  }

  // Normalize 'YYYY-MM-DD HH:mm:ss' to 'YYYY-MM-DDTHH:mm:ss'
  let normalized = str;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(' ', 'T');
  }

  // Ensure string has a recognized date structure (e.g. ISO 2026-10-27 or formatted Oct 27, 2026)
  // to prevent V8's lenient Date parser from interpreting arbitrary text like 'abc 123' as year 123
  const looksLikeDate = /^\d{4}-\d{2}-\d{2}/.test(normalized) ||
    /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}/i.test(normalized);
  if (!looksLikeDate) {
    return null;
  }

  // If it's an ISO-like date string without an explicit timezone offset (no 'Z' and no [+-]HH:mm),
  // treat it as UTC rather than letting the browser parse it as local time.
  const hasTimezone = /[zZ]$|[+-]\d{2}(?::?\d{2})?$/.test(normalized);
  if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  const parsed = new Date(normalized);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const formatDate = (dateInput: string | number | Date | null | undefined): string => {
  const date = parseNotificationDate(dateInput);
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatRelativeTime = (
  dateInput: string | number | Date | null | undefined,
  nowInput: Date = new Date()
): string => {
  const parsed = parseNotificationDate(dateInput);
  if (!parsed) {
    return 'Just now';
  }

  const now = nowInput instanceof Date && !isNaN(nowInput.getTime()) ? nowInput : new Date();
  const pastMs = parsed.getTime();
  const nowMs = now.getTime();
  const diffMs = nowMs - pastMs;

  // Handle future timestamps (or clock skew) safely
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }

  // Check if notification is from yesterday (calendar day difference)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfPast = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const calendarDayDiff = Math.round((startOfToday - startOfPast) / (1000 * 60 * 60 * 24));

  if (calendarDayDiff === 1) {
    return 'Yesterday';
  }

  if (diffHour >= 24 && diffHour < 48 && calendarDayDiff <= 1) {
    return 'Yesterday';
  }

  // Suitable absolute date for older notifications, following existing UI conventions
  return formatDate(parsed);
};

export const getCategoryBadgeColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'education':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'healthcare':
    case 'medical':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'disaster relief':
    case 'emergency':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'environment':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }
};
