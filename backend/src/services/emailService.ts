import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { config } from "../config/config";
import logger from "../config/logger";

const mailerSend = new MailerSend({
  apiKey: config.mailerSend.apiKey,
});

const sentFrom = new Sender(
  config.mailerSend.senderEmail,
  config.mailerSend.senderName
);

const createEmailTemplate = (name: string, resetLink: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Сброс пароля</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
            .header h1 { margin: 0; font-size: 24px; color: #0a0a0a; }
            .content { padding: 20px 0; }
            .content p { margin: 0 0 15px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Хочу Плачу</h1>
            </div>
            <div class="content">
                <p>Здравствуйте, ${name}!</p>
                <p>Вы запросили сброс пароля для вашего аккаунта. Чтобы установить новый пароль, пожалуйста, нажмите на кнопку ниже:</p>
                <p style="text-align: center;">
                    <a href="${resetLink}" class="button">Сбросить пароль</a>
                </p>
                <p>Эта ссылка для сброса пароля будет действительна в течение 15 минут.</p>
                <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Хочу Плачу. Все права защищены.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const sendPasswordResetEmail = async (
  recipientEmail: string,
  resetLink: string
) => {
  if (!config.mailerSend.apiKey) {
    logger.error("MailerSend API key is not configured. Cannot send email.");
    // In development, you might want to log the reset link instead of sending an email
    if (process.env.NODE_ENV !== "production") {
      logger.info(
        `[DEV MODE] Password reset link for ${recipientEmail}: ${resetLink}`
      );
    }
    return; // Don't proceed if API key is missing
  }

  const recipients = [new Recipient(recipientEmail)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("Инструкции по сбросу пароля для Хочу Плачу")
    .setHtml(createEmailTemplate(recipientEmail, resetLink));

  try {
    await mailerSend.email.send(emailParams);
    logger.info(`Password reset email sent to ${recipientEmail}`);
  } catch (error) {
    logger.error(`Failed to send email to ${recipientEmail}:`, error);
    // Depending on the policy, you might want to re-throw the error
    // or handle it silently. For now, we just log it.
  }
};
