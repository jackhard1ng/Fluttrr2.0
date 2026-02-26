// Enums mirroring Prisma schema exactly

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum BusinessStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EventCategory {
  GAMES = 'GAMES',
  FOOD_DRINK = 'FOOD_DRINK',
  MUSIC = 'MUSIC',
  SPORTS = 'SPORTS',
  FITNESS = 'FITNESS',
  ARTS = 'ARTS',
  SOCIAL = 'SOCIAL',
  EDUCATION = 'EDUCATION',
  NIGHTLIFE = 'NIGHTLIFE',
  OTHER = 'OTHER',
}

export enum RecurrenceType {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  FIRST_FRIDAY = 'FIRST_FRIDAY',
}

export enum AttendeeStatus {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  ATTENDED = 'ATTENDED',
}

export enum ChatType {
  EVENT_GROUP = 'EVENT_GROUP',
  DM = 'DM',
  BIZ_DM = 'BIZ_DM',
}

export enum SenderType {
  USER = 'USER',
  BUSINESS = 'BUSINESS',
}

export enum ReportType {
  USER = 'USER',
  BUSINESS = 'BUSINESS',
  EVENT = 'EVENT',
  MESSAGE = 'MESSAGE',
  MOMENT = 'MOMENT',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum NotificationType {
  EVENT_REMINDER = 'EVENT_REMINDER',
  EVENT_JOINED = 'EVENT_JOINED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  MOMENT_LIKE = 'MOMENT_LIKE',
  MOMENT_COMMENT = 'MOMENT_COMMENT',
  ADMIN_MESSAGE = 'ADMIN_MESSAGE',
  BUSINESS_VERIFIED = 'BUSINESS_VERIFIED',
  BUSINESS_SUSPENDED = 'BUSINESS_SUSPENDED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
}
