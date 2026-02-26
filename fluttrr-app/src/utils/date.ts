import { format, parseISO, isToday, isTomorrow, isFuture, isPast, formatDistanceToNow, differenceInDays } from 'date-fns';

export function formatEventDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  // Show weekday name only for upcoming days within the next 6 days
  const daysAway = differenceInDays(date, new Date());
  if (daysAway > 0 && daysAway <= 6) return format(date, 'EEEE'); // "Wednesday"
  return format(date, 'MMM d'); // "Mar 15"
}

export function formatEventDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
}

export function formatEventMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM').toUpperCase();
}

export function formatEventDay(dateStr: string): string {
  return format(parseISO(dateStr), 'd');
}

export function formatTime(timeStr: string): string {
  // Backend stores times as strings like "7:00 PM" or "19:00"
  // If already formatted, return as-is
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }
  // Parse 24h format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string | null): string {
  const start = formatTime(startTime);
  if (!endTime) return start;
  return `${start} - ${formatTime(endTime)}`;
}

export function isEventPast(dateStr: string): boolean {
  return isPast(parseISO(dateStr));
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatMessageTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isThisWeek(date)) return format(date, 'EEE h:mm a');
  return format(date, 'MMM d, h:mm a');
}
