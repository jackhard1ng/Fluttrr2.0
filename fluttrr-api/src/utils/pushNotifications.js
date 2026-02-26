/**
 * Expo Push Notification utility
 * Sends push notifications via Expo's push notification service.
 * No SDK needed — just POST to https://exp.host/--/api/v2/push/send
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications to one or more Expo push tokens.
 *
 * @param {Array<{to: string, title: string, body: string, data?: object, sound?: string}>} messages
 * @returns {Promise<object>} Expo push response
 */
async function sendPushNotifications(messages) {
  // Filter to valid Expo push tokens only
  const valid = messages.filter(
    (m) => m.to && (m.to.startsWith('ExponentPushToken[') || m.to.startsWith('ExpoPushToken['))
  );

  if (valid.length === 0) return { data: [] };

  // Add default sound if not specified
  const prepared = valid.map((m) => ({
    ...m,
    sound: m.sound || 'default',
    channelId: m.channelId || 'default',
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(prepared),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Push notification send failed:', err.message);
    return { data: [], error: err.message };
  }
}

/**
 * Send a push notification to a single user by looking up their fcmToken.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId - User ID
 * @param {object} notification - { title, body, data? }
 */
async function notifyUser(prisma, userId, { title, body, data }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return;

  return sendPushNotifications([{ to: user.fcmToken, title, body, data }]);
}

/**
 * Send a push notification to a business by looking up their fcmToken.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} businessId - Business ID
 * @param {object} notification - { title, body, data? }
 */
async function notifyBusiness(prisma, businessId, { title, body, data }) {
  const biz = await prisma.business.findUnique({
    where: { id: businessId },
    select: { fcmToken: true },
  });

  if (!biz?.fcmToken) return;

  return sendPushNotifications([{ to: biz.fcmToken, title, body, data }]);
}

/**
 * Notify all attendees of an event (except the excludeUserId).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} eventId
 * @param {object} notification - { title, body, data? }
 * @param {string} [excludeUserId] - Skip this user (e.g. the one who triggered the event)
 */
async function notifyEventAttendees(prisma, eventId, { title, body, data }, excludeUserId) {
  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId, status: 'JOINED' },
    include: {
      user: { select: { id: true, fcmToken: true } },
    },
  });

  const messages = attendees
    .filter((a) => a.user.id !== excludeUserId && a.user.fcmToken)
    .map((a) => ({
      to: a.user.fcmToken,
      title,
      body,
      data: { ...data, eventId },
    }));

  if (messages.length === 0) return;

  return sendPushNotifications(messages);
}

module.exports = {
  sendPushNotifications,
  notifyUser,
  notifyBusiness,
  notifyEventAttendees,
};
