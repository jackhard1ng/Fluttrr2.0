import { formatTime, formatTimeRange } from '../utils/date';

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
