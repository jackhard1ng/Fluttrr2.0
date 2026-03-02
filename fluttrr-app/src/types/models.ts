// TypeScript interfaces mirroring Prisma models
// passwordHash is never sent to the client

import {
  UserRole,
  AccountStatus,
  BusinessStatus,
  EventStatus,
  EventCategory,
  RecurrenceType,
  AttendeeStatus,
  ChatType,
  SenderType,
  ReportType,
  ReportStatus,
  NotificationType,
} from './enums';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  profilePhoto: string;
  photos: string[];
  city: string | null;
  lat: number | null;
  lng: number | null;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  fcmToken: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  email: string;
  businessName: string;
  description: string | null;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  photos: string[];
  verified: boolean;
  status: BusinessStatus;
  subscriptionTier: string;
  subscriptionEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startTime: string;
  endTime: string | null;
  date: string;
  maxSpots: number | null;
  lat: number | null;
  lng: number | null;
  area: string | null;
  color: string | null;
  emoji: string | null;
  photos: string[];
  status: EventStatus;
  recurring: RecurrenceType | null;
  recurringDay: number | null;
  parentEventId: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  // Populated relations (optional, depends on endpoint)
  business?: Business;
  attendees?: EventAttendee[];
  _count?: { attendees?: number };
}

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: AttendeeStatus;
  guestCount: number;
  joinedAt: string;
  user?: User;
  event?: Event;
}

export interface Chat {
  id: string;
  type: ChatType;
  eventId: string | null;
  pinnedMessage: string | null;
  createdAt: string;
  updatedAt: string;
  event?: Event;
  members?: ChatMember[];
  messages?: Message[];
  _count?: { messages?: number };
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string | null;
  businessId: string | null;
  joinedAt: string;
  lastReadAt: string | null;
  user?: User;
  business?: Business;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  createdAt: string;
  sender?: User | Business;
}

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  rating: number;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  business?: Business;
}

export interface Report {
  id: string;
  reportType: ReportType;
  targetId: string;
  reportedById: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reportedBy?: User;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocker?: User;
  blocked?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  targetType: string;
  targetId: string | null;
  subject: string;
  body: string;
  sentBy: string;
  createdAt: string;
}

export interface Moment {
  id: string;
  userId: string;
  content: string | null;
  photos: string[];
  eventId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  likes?: MomentLike[];
  comments?: MomentComment[];
  _count?: { likes?: number; comments?: number };
}

export interface MomentLike {
  id: string;
  momentId: string;
  userId: string;
  createdAt: string;
}

export interface MomentComment {
  id: string;
  momentId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: User;
}

export interface Story {
  id: string;
  businessId: string;
  photo: string;
  caption: string | null;
  expiresAt: string;
  createdAt: string;
  business?: Business;
}

export interface EventRecap {
  id: string;
  businessId: string;
  eventId: string;
  content: string | null;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  business?: Pick<Business, 'id' | 'businessName' | 'logo' | 'verified'>;
  event?: Pick<Event, 'id' | 'title' | 'category' | 'date' | 'emoji' | 'color'> & {
    _count?: { attendees?: number };
  };
}
