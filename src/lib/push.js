const webpush = require('web-push');
const prisma = require('./prisma');
const logger = require('./logger');

// Set VAPID details from environment
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails(
  'mailto:admin@kavana-cleanstock.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * Send push notification to a user's subscriptions
 * @param {number} userId - The user ID to send notification to
 * @param {Object} payload - Notification payload (title, body, data)
 */
async function sendPushNotification(userId, payload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { usuarioId: userId }
    });

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Kavana CleanOps',
      body: payload.body,
      icon: '/icon-192x192.png', // Adjust to your icon path
      data: payload.data || {}
    });

    // Send to all user's devices (non-blocking)
    subscriptions.forEach(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          notificationPayload
        );
      } catch (error) {
        logger.error(`Failed to send push to subscription ${subscription.id}:`, error);
        // Consider removing invalid subscription
        if (error.statusCode === 404 || error.statusCode === 410) {
          prisma.pushSubscription.delete({
            where: { id: subscription.id }
          }).catch(() => {}); // Ignore deletion errors
        }
      }
    });
  } catch (error) {
    logger.error('Error in sendPushNotification:', error);
  }
}

module.exports = { sendPushNotification };