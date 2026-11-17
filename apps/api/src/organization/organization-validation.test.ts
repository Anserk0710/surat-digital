import { describe, expect, it } from 'vitest';

import {
  parseCalendarDate,
  validateDateRange,
  validateIanaTimezone,
} from './organization-validation.js';

describe('P05-T03 IANA timezone', () => {
  it.each(['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura', 'UTC'])('accepts %s', (timezone) => {
    expect(validateIanaTimezone(timezone)).toBe(timezone);
  });

  it.each([
    'GMT+8',
    '+08:00',
    'WITA',
    'Asia/Invalid',
    'Not/A_Timezone',
    'Asia/Makassar;DROP TABLE offices;',
    '',
  ])('rejects %s', (timezone) => {
    expect(() => validateIanaTimezone(timezone)).toThrow();
  });
});

describe('P05 assignment date validation', () => {
  it('accepts a valid period', () => {
    expect(() =>
      validateDateRange(parseCalendarDate('2026-01-01'), parseCalendarDate('2026-12-31')),
    ).not.toThrow();
  });

  it('rejects reversed periods', () => {
    expect(() =>
      validateDateRange(parseCalendarDate('2026-12-31'), parseCalendarDate('2026-01-01')),
    ).toThrow();
  });

  it('rejects non-existing calendar dates', () => {
    expect(() => parseCalendarDate('2026-02-30')).toThrow();
  });

  it('allows open-ended assignments', () => {
    expect(() => validateDateRange(parseCalendarDate('2026-01-01'), null)).not.toThrow();
  });
});
