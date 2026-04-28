const { getMessaging } = require('../config/firebase');

/**
 * Send a push notification to one or more devices.
 * @param {string[]} fcmTokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional key-value data payload
 * @returns {Promise<Object|null>} Firebase send result or null if unavailable
 */
async function sendPushNotification(fcmTokens, title, body, data = {}) {
  const messaging = getMessaging();

  if (!messaging) {
    console.warn('⚠️  Firebase not initialized. Push notification skipped:', { title, body });
    return null;
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    console.warn('⚠️  No FCM tokens provided. Push notification skipped.');
    return null;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: Object.entries(data).reduce((acc, [key, val]) => {
        acc[key] = String(val);
        return acc;
      }, {}),
      tokens: fcmTokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(
      `📬 Push notification sent: ${response.successCount}/${fcmTokens.length} succeeded`
    );

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(fcmTokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.warn(`⚠️  ${invalidTokens.length} invalid FCM tokens detected`);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    return null;
  }
}

/**
 * Notify farmer of a new order.
 * @param {Object} farmer - Farmer document (populated with userId)
 * @param {Object} order - Order document
 */
async function notifyNewOrder(farmer, order) {
  const User = require('../models/User');
  const user = await User.findById(farmer.userId);

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

  await sendPushNotification(
    user.fcmTokens,
    '🛒 New Order Received!',
    `You have a new order worth ₹${order.totalAmount}. Tap to view details.`,
    {
      type: 'new_order',
      orderId: order._id.toString(),
    }
  );
}

/**
 * Notify customer that their order has been shipped.
 * @param {Object} customer - Customer document (populated with userId)
 * @param {Object} order - Order document
 */
async function notifyOrderShipped(customer, order) {
  const User = require('../models/User');
  const user = await User.findById(customer.userId);

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

  await sendPushNotification(
    user.fcmTokens,
    '🚚 Order Shipped!',
    `Your order #${order._id.toString().slice(-6).toUpperCase()} is out for delivery.`,
    {
      type: 'order_shipped',
      orderId: order._id.toString(),
    }
  );
}

module.exports = { sendPushNotification, notifyNewOrder, notifyOrderShipped };
