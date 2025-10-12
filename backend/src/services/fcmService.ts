import admin from "firebase-admin";
import logger from "../config/logger";
import { trace, SpanStatusCode } from "@opentelemetry/api";

// Initialize Firebase Admin SDK
// Note: In production, use a service account key file or environment variables
// For now, we'll initialize without credentials for local development
let firebaseApp: admin.app.App | null = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info("Firebase Admin SDK initialized successfully");
  } else {
    logger.warn(
      "Firebase service account not configured. Push notifications will not work."
    );
  }
} catch (error) {
  logger.error("Failed to initialize Firebase Admin SDK:", error);
}

const tracer = trace.getTracer("fcm-service-tracer");

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
  const span = tracer.startSpan("send-push-notification");

  try {
    if (!firebaseApp) {
      logger.warn("Firebase not initialized. Skipping push notification.");
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Firebase not initialized",
      });
      return;
    }

    span.setAttribute("notification.title", payload.title);
    span.setAttribute(
      "notification.click_action",
      payload.clickAction || "main"
    );

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
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    logger.error("Failed to send push notification:", error);
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    // Don't throw - we don't want to break the flow if push notification fails
  } finally {
    span.end();
  }
}

/**
 * Send a push notification to multiple FCM tokens
 */
export async function sendPushNotificationToMultiple(
  fcmTokens: string[],
  payload: PushNotificationPayload
): Promise<void> {
  const span = tracer.startSpan("send-push-notification-multiple");

  try {
    if (!firebaseApp) {
      logger.warn("Firebase not initialized. Skipping push notifications.");
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Firebase not initialized",
      });
      return;
    }

    span.setAttribute("notification.recipients", fcmTokens.length);

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

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    logger.error("Failed to send push notifications:", error);
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
  } finally {
    span.end();
  }
}
