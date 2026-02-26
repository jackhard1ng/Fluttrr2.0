/**
 * Scheduled background tasks for Fluttrr
 *
 * Jobs:
 *  1. Event reminders — Notify attendees 24 hours before an event
 *  2. Auto-complete events — Mark past events as COMPLETED
 *  3. OTP cleanup — Delete expired/used OTP codes older than 24 hours
 *  4. Story cleanup — Delete expired stories
 */

const cron = require('node-cron');
const prisma = require('./utils/prisma');
const { sendPushNotifications } = require('./utils/pushNotifications');

function setupCronJobs() {
  // ─── Event Reminders — every hour at :00 ───────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find events happening in 24-25 hours (1-hour window)
      const events = await prisma.event.findMany({
        where: {
          status: 'ACTIVE',
          date: { gte: in24h, lt: in25h },
        },
        include: {
          attendees: {
            where: { status: 'JOINED' },
            include: { user: { select: { id: true, fcmToken: true, displayName: true } } },
          },
          business: { select: { businessName: true } },
        },
      });

      for (const event of events) {
        // Create in-app notifications
        const notificationData = event.attendees.map((a) => ({
          userId: a.user.id,
          type: 'EVENT_REMINDER',
          title: `${event.emoji || '🎉'} Tomorrow: ${event.title}`,
          body: `${event.title} by ${event.business.businessName} starts at ${event.startTime}. Don't forget!`,
          data: { eventId: event.id },
        }));

        if (notificationData.length > 0) {
          await prisma.notification.createMany({ data: notificationData });
        }

        // Push notifications
        const pushMessages = event.attendees
          .filter((a) => a.user.fcmToken)
          .map((a) => ({
            to: a.user.fcmToken,
            title: `${event.emoji || '🎉'} Tomorrow: ${event.title}`,
            body: `Starts at ${event.startTime}. See you there!`,
            data: { eventId: event.id, type: 'EVENT_REMINDER' },
          }));

        if (pushMessages.length > 0) {
          await sendPushNotifications(pushMessages);
        }
      }

      if (events.length > 0) {
        const totalNotified = events.reduce((sum, e) => sum + e.attendees.length, 0);
        console.log(`[CRON] Sent reminders for ${events.length} events (${totalNotified} attendees)`);
      }
    } catch (err) {
      console.error('[CRON] Event reminder error:', err.message);
    }
  });

  // ─── Auto-complete past events — daily at 3:00 AM ──────
  cron.schedule('0 3 * * *', async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.event.updateMany({
        where: {
          status: 'ACTIVE',
          date: { lt: yesterday },
        },
        data: { status: 'COMPLETED' },
      });

      if (result.count > 0) {
        console.log(`[CRON] Auto-completed ${result.count} past events`);
      }
    } catch (err) {
      console.error('[CRON] Auto-complete error:', err.message);
    }
  });

  // ─── OTP cleanup — daily at 4:00 AM ───────────────────
  cron.schedule('0 4 * * *', async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.otpCode.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: oneDayAgo } },
            { usedAt: { not: null, lt: oneDayAgo } },
          ],
        },
      });

      if (result.count > 0) {
        console.log(`[CRON] Cleaned up ${result.count} expired OTP codes`);
      }
    } catch (err) {
      console.error('[CRON] OTP cleanup error:', err.message);
    }
  });

  // ─── Story cleanup — every 6 hours ────────────────────
  cron.schedule('0 */6 * * *', async () => {
    try {
      const result = await prisma.story.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      if (result.count > 0) {
        console.log(`[CRON] Cleaned up ${result.count} expired stories`);
      }
    } catch (err) {
      console.error('[CRON] Story cleanup error:', err.message);
    }
  });

  console.log('  Cron jobs scheduled: reminders, auto-complete, OTP cleanup, story cleanup');
}

module.exports = { setupCronJobs };
