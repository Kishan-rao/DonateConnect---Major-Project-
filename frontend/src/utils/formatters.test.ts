import { describe, it, expect } from 'vitest';
import { parseNotificationDate, formatDate, formatRelativeTime } from './formatters';

describe('Timestamp parsing and relative time formatting', () => {
  const baseTime = new Date('2026-10-27T12:00:00Z');

  describe('parseNotificationDate', () => {
    it('returns null for missing, null, or empty values', () => {
      expect(parseNotificationDate(null)).toBeNull();
      expect(parseNotificationDate(undefined)).toBeNull();
      expect(parseNotificationDate('')).toBeNull();
      expect(parseNotificationDate('   ')).toBeNull();
    });

    it('returns null for invalid string inputs without crashing or NaN', () => {
      expect(parseNotificationDate('invalid-date')).toBeNull();
      expect(parseNotificationDate('abc 123')).toBeNull();
      expect(parseNotificationDate('undefined')).toBeNull();
    });

    it('handles Date objects safely', () => {
      const validDate = new Date('2026-10-27T12:00:00Z');
      expect(parseNotificationDate(validDate)?.toISOString()).toBe(validDate.toISOString());

      const invalidDate = new Date('invalid');
      expect(parseNotificationDate(invalidDate)).toBeNull();
    });

    it('handles numeric epoch timestamps in seconds vs milliseconds', () => {
      // 1793102400 is approx 2026-10-27T12:00:00Z in seconds
      const seconds = 1793102400;
      const parsedFromSec = parseNotificationDate(seconds);
      expect(parsedFromSec?.getTime()).toBe(seconds * 1000);

      // numeric string in seconds
      const parsedFromStringSec = parseNotificationDate('1793102400');
      expect(parsedFromStringSec?.getTime()).toBe(seconds * 1000);

      // milliseconds
      const millis = 1793102400000;
      const parsedFromMs = parseNotificationDate(millis);
      expect(parsedFromMs?.getTime()).toBe(millis);

      // numeric string in milliseconds
      const parsedFromStringMs = parseNotificationDate('1793102400000');
      expect(parsedFromStringMs?.getTime()).toBe(millis);
    });

    it('handles UTC timestamps ending in Z', () => {
      const parsed = parseNotificationDate('2026-10-27T12:00:00Z');
      expect(parsed?.toISOString()).toBe('2026-10-27T12:00:00.000Z');
    });

    it('handles timestamps with explicit positive and negative timezone offsets', () => {
      // +05:30 offset
      const istParsed = parseNotificationDate('2026-10-27T17:30:00+05:30');
      expect(istParsed?.toISOString()).toBe('2026-10-27T12:00:00.000Z');

      // -04:00 offset
      const edtParsed = parseNotificationDate('2026-10-27T08:00:00-04:00');
      expect(edtParsed?.toISOString()).toBe('2026-10-27T12:00:00.000Z');
    });

    it('handles ISO timestamps without timezone suffix by treating them as UTC', () => {
      // Server sends LocalDateTime without 'Z': 2026-10-27T12:00:00
      const parsed = parseNotificationDate('2026-10-27T12:00:00');
      expect(parsed?.toISOString()).toBe('2026-10-27T12:00:00.000Z');

      const parsedWithMs = parseNotificationDate('2026-10-27T12:00:00.456');
      expect(parsedWithMs?.toISOString()).toBe('2026-10-27T12:00:00.456Z');
    });

    it('handles space-separated SQL datetimes by normalizing and treating as UTC', () => {
      const parsed = parseNotificationDate('2026-10-27 12:00:00');
      expect(parsed?.toISOString()).toBe('2026-10-27T12:00:00.000Z');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Just now" for recent notifications (less than 60 seconds)', () => {
      expect(formatRelativeTime('2026-10-27T12:00:00Z', baseTime)).toBe('Just now');
      expect(formatRelativeTime('2026-10-27T11:59:45Z', baseTime)).toBe('Just now');
      expect(formatRelativeTime('2026-10-27T11:59:01Z', baseTime)).toBe('Just now');
    });

    it('returns accurate relative minutes ("1 minute ago", "5 minutes ago")', () => {
      // Exactly 1 minute ago
      expect(formatRelativeTime('2026-10-27T11:59:00Z', baseTime)).toBe('1 minute ago');
      expect(formatRelativeTime('2026-10-27T11:58:30Z', baseTime)).toBe('1 minute ago');

      // 5 minutes ago
      expect(formatRelativeTime('2026-10-27T11:55:00Z', baseTime)).toBe('5 minutes ago');

      // 45 minutes ago
      expect(formatRelativeTime('2026-10-27T11:15:00Z', baseTime)).toBe('45 minutes ago');
    });

    it('returns accurate relative hours ("1 hour ago", "2 hours ago")', () => {
      // Exactly 1 hour ago
      expect(formatRelativeTime('2026-10-27T11:00:00Z', baseTime)).toBe('1 hour ago');

      // 2 hours ago
      expect(formatRelativeTime('2026-10-27T10:00:00Z', baseTime)).toBe('2 hours ago');

      // 12 hours ago
      expect(formatRelativeTime('2026-10-27T00:00:00Z', baseTime)).toBe('12 hours ago');

      // 23 hours ago
      const twentyThreeHoursPast = new Date(baseTime.getTime() - 23 * 60 * 60 * 1000);
      expect(formatRelativeTime(twentyThreeHoursPast.toISOString(), baseTime)).toBe('23 hours ago');
    });

    it('returns "Yesterday" for previous day notifications (24-48 hours ago / calendar yesterday)', () => {
      // 26 hours ago (same calendar day before baseTime)
      const yesterdayDate = new Date(baseTime.getTime() - 26 * 60 * 60 * 1000);
      expect(formatRelativeTime(yesterdayDate.toISOString(), baseTime)).toBe('Yesterday');
    });

    it('returns a formatted absolute date for older notifications (2+ days)', () => {
      const threeDaysAgo = new Date('2026-10-24T12:00:00Z');
      const formatted = formatRelativeTime(threeDaysAgo.toISOString(), baseTime);
      expect(formatted).toMatch(/Oct 24, 2026/);
    });

    it('safely handles future timestamps due to device clock skew', () => {
      // 30 seconds in the future
      expect(formatRelativeTime('2026-10-27T12:00:30Z', baseTime)).toBe('Just now');
      // 10 minutes in the future
      expect(formatRelativeTime('2026-10-27T12:10:00Z', baseTime)).toBe('Just now');
      // 1 day in the future
      expect(formatRelativeTime('2026-10-28T12:00:00Z', baseTime)).toBe('Just now');
    });

    it('safely handles missing, null, undefined, and invalid timestamps without NaN', () => {
      expect(formatRelativeTime(null)).toBe('Just now');
      expect(formatRelativeTime(undefined)).toBe('Just now');
      expect(formatRelativeTime('')).toBe('Just now');
      expect(formatRelativeTime('invalid-date-string')).toBe('Just now');
      expect(formatRelativeTime('NaN')).toBe('Just now');
    });

    it('correctly handles seconds vs milliseconds timestamps in relative time calculation', () => {
      const baseMs = baseTime.getTime();
      // 5 minutes ago in seconds
      const fiveMinAgoSec = Math.floor((baseMs - 5 * 60 * 1000) / 1000);
      expect(formatRelativeTime(fiveMinAgoSec, baseTime)).toBe('5 minutes ago');

      // 5 minutes ago in milliseconds
      const fiveMinAgoMs = baseMs - 5 * 60 * 1000;
      expect(formatRelativeTime(fiveMinAgoMs, baseTime)).toBe('5 minutes ago');
    });

    it('correctly parses server timestamps without explicit Z without offset skew', () => {
      // If server sent "2026-10-27T11:55:00" (5 mins before 12:00 UTC)
      expect(formatRelativeTime('2026-10-27T11:55:00', baseTime)).toBe('5 minutes ago');
      // If server sent "2026-10-27T10:00:00" (2 hours before 12:00 UTC)
      expect(formatRelativeTime('2026-10-27T10:00:00', baseTime)).toBe('2 hours ago');
    });
  });

  describe('formatDate', () => {
    it('formats valid date strings into localized short month, day, year', () => {
      expect(formatDate('2026-10-27T12:00:00Z')).toBe('Oct 27, 2026');
    });

    it('returns "N/A" for null, undefined, empty, or invalid inputs', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
      expect(formatDate('invalid')).toBe('N/A');
    });
  });
});

