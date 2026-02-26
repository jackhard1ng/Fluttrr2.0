export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

export function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function formatSpotsLeft(maxSpots: number | null, attendeeCount: number): string {
  if (maxSpots === null) return 'Open';
  const left = maxSpots - attendeeCount;
  if (left <= 0) return 'Full';
  if (left === 1) return '1 spot left';
  return `${left} spots left`;
}

export function isFull(maxSpots: number | null, attendeeCount: number): boolean {
  if (maxSpots === null) return false;
  return attendeeCount >= maxSpots;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}
