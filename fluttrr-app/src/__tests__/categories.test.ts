import { CATEGORY_META, getEventEmoji, getEventColor, KC_NEIGHBORHOODS } from '../constants/categories';
import { EventCategory } from '../types/enums';

describe('CATEGORY_META', () => {
  it('has metadata for all event categories', () => {
    const categories = Object.values(EventCategory);
    for (const cat of categories) {
      expect(CATEGORY_META[cat]).toBeDefined();
      expect(CATEGORY_META[cat].label).toBeTruthy();
      expect(CATEGORY_META[cat].emoji).toBeTruthy();
      expect(CATEGORY_META[cat].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has exactly 10 categories', () => {
    expect(Object.keys(CATEGORY_META).length).toBe(10);
  });
});

describe('getEventEmoji', () => {
  it('returns custom emoji when provided', () => {
    expect(getEventEmoji('🎃', EventCategory.SOCIAL)).toBe('🎃');
  });

  it('falls back to category emoji when event emoji is null', () => {
    expect(getEventEmoji(null, EventCategory.MUSIC)).toBe('🎵');
    expect(getEventEmoji(null, EventCategory.GAMES)).toBe('🎮');
    expect(getEventEmoji(null, EventCategory.FOOD_DRINK)).toBe('🍕');
  });
});

describe('getEventColor', () => {
  it('returns custom color when provided', () => {
    expect(getEventColor('#FF0000', EventCategory.SOCIAL)).toBe('#FF0000');
  });

  it('falls back to category color when event color is null', () => {
    expect(getEventColor(null, EventCategory.MUSIC)).toBe('#EC4899');
    expect(getEventColor(null, EventCategory.SPORTS)).toBe('#10B981');
  });
});

describe('KC_NEIGHBORHOODS', () => {
  it('has expected KC areas', () => {
    const labels = KC_NEIGHBORHOODS.map((n) => n.label);
    expect(labels).toContain('Crossroads');
    expect(labels).toContain('Westport');
    expect(labels).toContain('P&L District');
    expect(labels).toContain('River Market');
    expect(labels).toContain('Plaza');
  });

  it('first entry is "All KC"', () => {
    expect(KC_NEIGHBORHOODS[0].label).toBe('All KC');
  });

  it('includes "Other" option', () => {
    const labels = KC_NEIGHBORHOODS.map((n) => n.label);
    expect(labels).toContain('Other');
  });
});
