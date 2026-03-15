import { google } from 'googleapis';
import { supabaseAdmin } from '@/app/_lib/supabase';

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildVerificationEmailBody(userName, verificationLink, template) {
  const safeTemplate = escapeHtml(template || '').trim();
  const rawLinkHtml = `<a href="${verificationLink}" style="color:#2563eb;word-break:break-all;">${verificationLink}</a>`;
  if (safeTemplate) {
    let withLink = safeTemplate
      .replace(/\[\s*verification\s*link\s*\]/gi, rawLinkHtml)
      .replace(/\{\{\s*verification_link\s*\}\}/gi, rawLinkHtml);

    if (!withLink.includes(verificationLink)) {
      withLink = `${withLink}<br /><br />${rawLinkHtml}`;
    }
    return withLink.replace(/\n/g, '<br />');
  }

  return `
    Hello ${escapeHtml(userName || 'Member')},<br /><br />
    Your NEUPC account is ready. Please verify your email by clicking the link below:<br /><br />
    ${rawLinkHtml}<br /><br />
    If you did not request this, you can ignore this message.<br /><br />
    Best regards,<br />
    NEUPC Team
  `;
}

export async function sendActivationEmail(
  userEmail,
  userName,
  verificationLink,
  template = ''
) {
  const GMAIL_USER = process.env.GMAIL_USER || process.env.SMTP_USER;
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

  if (!GMAIL_USER || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn(
      '⚠️ Gmail API variables missing (GMAIL_USER/SMTP_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN). Skipping email send to',
      userEmail
    );
    // Simulate a successful send if vars are missing (for local dev)
    return { success: true, warning: 'Gmail API variables missing' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verify Your Email</h1>
            </div>
            <div style="padding: 24px;">
              <div style="font-size: 16px; color: #374151; margin-bottom: 24px; line-height: 1.6;">
                ${buildVerificationEmailBody(userName, verificationLink, template)}
              </div>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${verificationLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Verify Email</a>
              </div>
              <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0 0 16px; word-break: break-all;">
                If the button does not work, copy and open this link:<br />
                <a href="${verificationLink}" style="color:#2563eb;">${verificationLink}</a>
              </p>
              <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 32px;">If you have any questions, feel free to reply to this email.</p>
            </div>
          </div>
        </div>
    `;

    // Construct raw MIME message
    const rawMessage = [
      `From: "NEUPC Admin" <${GMAIL_USER}>`,
      `To: ${userEmail}`,
      `Subject: Verify Your NEUPC Account Email`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      htmlContent
    ].join('\r\n');

    // Base64url encode the message
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('Error sending activation email via Gmail API:', error);
    return { error: error.message };
  }
}

export async function sendActivationEmailForUser(
  userId,
  verificationLink,
  template = ''
) {
  if (!userId) return { error: 'Missing user id' };

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (error || !user?.email) {
    return { error: 'Unable to resolve user email from users table' };
  }

  return sendActivationEmail(
    user.email,
    user.full_name,
    verificationLink,
    template
  );
}

export async function sendCustomEmail(
  userEmail,
  subject,
  htmlContent
) {
  const GMAIL_USER = process.env.GMAIL_USER || process.env.SMTP_USER;
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

  if (!GMAIL_USER || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn('⚠️ Gmail API variables missing. Skipping custom email send to', userEmail);
    return { success: true, warning: 'Gmail API variables missing' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "https://developers.google.com/oauthplayground");
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const rawMessage = [
      `From: "NEUPC Admin" <${GMAIL_USER}>`,
      `To: ${userEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      htmlContent
    ].join('\r\n');

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('Error sending custom email via Gmail API:', error);
    return { error: error.message };
  }
}
