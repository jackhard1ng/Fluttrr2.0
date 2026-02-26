import { formatTime, formatTimeRange, formatEventMonth, formatEventDay, formatEventDateFull, isEventPast } from '../utils/date';

describe('formatTime', () => {
  it('returns AM/PM formatted strings as-is', () => {
    expect(formatTime('7:00 PM')).toBe('7:00 PM');
    expect(formatTime('11:30 AM')).toBe('11:30 AM');
  });

  it('converts 24h format to 12h', () => {
    expect(formatTime('19:00')).toBe('7:00 PM');
    expect(formatTime('07:30')).toBe('7:30 AM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('13:45')).toBe('1:45 PM');
    expect(formatTime('23:59')).toBe('11:59 PM');
  });
});

describe('formatTimeRange', () => {
  it('returns just start when no end time', () => {
    expect(formatTimeRange('19:00', null)).toBe('7:00 PM');
  });

  it('returns range with both times', () => {
    expect(formatTimeRange('19:00', '21:00')).toBe('7:00 PM - 9:00 PM');
  });

  it('handles AM/PM format inputs', () => {
    expect(formatTimeRange('7:00 PM', '9:00 PM')).toBe('7:00 PM - 9:00 PM');
  });
});

describe('formatEventMonth', () => {
  it('returns 3-letter uppercase month', () => {
    expect(formatEventMonth('2026-01-15T00:00:00.000Z')).toBe('JAN');
    expect(formatEventMonth('2026-06-20T00:00:00.000Z')).toBe('JUN');
    expect(formatEventMonth('2026-12-25T00:00:00.000Z')).toBe('DEC');
  });
});

describe('formatEventDay', () => {
  it('returns day of month as string', () => {
    expect(formatEventDay('2026-01-01T00:00:00.000Z')).toBe('1');
    expect(formatEventDay('2026-03-15T00:00:00.000Z')).toBe('15');
    expect(formatEventDay('2026-12-31T00:00:00.000Z')).toBe('31');
  });
});

describe('formatEventDateFull', () => {
  it('returns full formatted date', () => {
    const result = formatEventDateFull('2026-03-15T00:00:00.000Z');
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });
});

describe('isEventPast', () => {
  it('returns true for past dates', () => {
    expect(isEventPast('2020-01-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for future dates', () => {
    expect(isEventPast('2030-12-31T23:59:59.000Z')).toBe(false);
  });
});
