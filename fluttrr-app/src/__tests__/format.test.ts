import { truncate, formatCount, formatSpotsLeft, isFull, pluralize } from '../utils/format';

describe('truncate', () => {
  it('returns string unchanged if within maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis when exceeding maxLength', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });

  it('handles exact maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('formatCount', () => {
  it('returns small numbers as-is', () => {
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(0)).toBe('0');
  });

  it('formats thousands with K', () => {
    expect(formatCount(1000)).toBe('1.0K');
    expect(formatCount(1500)).toBe('1.5K');
    expect(formatCount(25300)).toBe('25.3K');
  });

  it('formats millions with M', () => {
    expect(formatCount(1000000)).toBe('1.0M');
    expect(formatCount(2500000)).toBe('2.5M');
  });
});

describe('formatSpotsLeft', () => {
  it('returns "Open" when maxSpots is null', () => {
    expect(formatSpotsLeft(null, 5)).toBe('Open');
  });

  it('returns "Full" when at capacity', () => {
    expect(formatSpotsLeft(10, 10)).toBe('Full');
    expect(formatSpotsLeft(10, 15)).toBe('Full');
  });

  it('returns "1 spot left" for singular', () => {
    expect(formatSpotsLeft(10, 9)).toBe('1 spot left');
  });

  it('returns "X spots left" for plural', () => {
    expect(formatSpotsLeft(10, 5)).toBe('5 spots left');
  });
});

describe('isFull', () => {
  it('returns false when maxSpots is null', () => {
    expect(isFull(null, 100)).toBe(false);
  });

  it('returns true when at capacity', () => {
    expect(isFull(10, 10)).toBe(true);
  });

  it('returns true when over capacity', () => {
    expect(isFull(10, 15)).toBe(true);
  });

  it('returns false when under capacity', () => {
    expect(isFull(10, 5)).toBe(false);
  });
});

describe('pluralize', () => {
  it('uses singular for count of 1', () => {
    expect(pluralize(1, 'event')).toBe('1 event');
  });

  it('uses auto-plural for other counts', () => {
    expect(pluralize(0, 'event')).toBe('0 events');
    expect(pluralize(5, 'event')).toBe('5 events');
  });

  it('uses custom plural form', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });
});
