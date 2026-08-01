import admin from "firebase-admin";
import logger from "../config/logger";

// Initialize Firebase Admin SDK
// Note: In production, use a service account key file or environment variables
// For now, we'll initialize without credentials for local development
let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK lazily (only when needed)
 */
async function initializeFirebase(): Promise<void> {
  if (firebaseApp) return; // Already initialized

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      // Fix escaped newlines in private_key
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(
          /\\n/g,
          "\n"
        );
      }

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info("Firebase Admin SDK initialized successfully");
    } else {
      logger.warn(
        "Firebase service account not configured. Push notifications will not work."
      );
      throw new Error("Firebase service account not configured");
    }
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  clickAction?: string; // "main" or "archive"
  data?: Record<string, string>;
}

/**
 * Send a push notification to a specific FCM token
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    await initializeFirebase();

    if (!firebaseApp) {
      return;
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        click_action: payload.clickAction || "main",
        ...payload.data,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "payment_notifications",
          priority: "high",
        },
      },
    };

    await admin.messaging().send(message);
    logger.info(
      `Push notification sent successfully to token: ${fcmToken.substring(
        0,
        20
      )}...`
    );
  } catch (error) {
    logger.error("Failed to send push notification:", error);
    // Don't throw - we don't want to break the flow if push notification fails
  }
}

/**
 * Send a push notification to multiple FCM tokens
 */
export async function sendPushNotificationToMultiple(
  fcmTokens: string[],
  payload: PushNotificationPayload
): Promise<void> {
  try {
    await initializeFirebase();

    if (!firebaseApp) {
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        click_action: payload.clickAction || "main",
        ...payload.data,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "payment_notifications",
          priority: "high",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(
      `Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`
    );

    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          logger.error(
            `Failed to send to token ${fcmTokens[idx].substring(0, 20)}...: ${
              resp.error
            }`
          );
        }
      });
    }
  } catch (error) {
    logger.error("Failed to send push notifications:", error);
  }
}
