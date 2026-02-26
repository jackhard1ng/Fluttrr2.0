import { EventCategory } from '@/types/enums';

export interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  [EventCategory.GAMES]:      { label: 'Games',        emoji: '🎮', color: '#8B5CF6' },
  [EventCategory.FOOD_DRINK]: { label: 'Food & Drink', emoji: '🍕', color: '#F59E0B' },
  [EventCategory.MUSIC]:      { label: 'Music',        emoji: '🎵', color: '#EC4899' },
  [EventCategory.SPORTS]:     { label: 'Sports',       emoji: '⚽', color: '#10B981' },
  [EventCategory.FITNESS]:    { label: 'Fitness',      emoji: '💪', color: '#06B6D4' },
  [EventCategory.ARTS]:       { label: 'Arts',         emoji: '🎨', color: '#F97316' },
  [EventCategory.SOCIAL]:     { label: 'Social',       emoji: '🥂', color: '#A855F7' },
  [EventCategory.EDUCATION]:  { label: 'Education',    emoji: '📚', color: '#3B82F6' },
  [EventCategory.NIGHTLIFE]:  { label: 'Nightlife',    emoji: '🌙', color: '#6366F1' },
  [EventCategory.OTHER]:      { label: 'Other',        emoji: '✨', color: '#64748B' },
};

// Get display values for an event, falling back to category defaults
export function getEventEmoji(eventEmoji: string | null, category: EventCategory): string {
  return eventEmoji || CATEGORY_META[category]?.emoji || '✨';
}

export function getEventColor(eventColor: string | null, category: EventCategory): string {
  return eventColor || CATEGORY_META[category]?.color || '#64748B';
}

// Neighborhoods in Kansas City
export const KC_NEIGHBORHOODS = [
  { label: 'All KC', emoji: '🏙️' },
  { label: 'Crossroads', emoji: '🎨' },
  { label: 'P&L District', emoji: '🎉' },
  { label: 'River Market', emoji: '🌊' },
  { label: 'Westport', emoji: '🍺' },
  { label: 'Southwest Blvd', emoji: '🌮' },
  { label: 'Plaza', emoji: '🛍️' },
  { label: 'Midtown', emoji: '🏘️' },
] as const;
