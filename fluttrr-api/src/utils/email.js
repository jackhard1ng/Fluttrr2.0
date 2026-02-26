/**
 * Email service using Resend
 *
 * Falls back to console.log when RESEND_API_KEY is not set (dev mode).
 */

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'Fluttrr <noreply@fluttrr.com>';

// ─── Shared Styles ──────────────────────────────────────

const BRAND = {
  bg: '#0A0E17',
  surface: '#141924',
  blue: '#1E90FF',
  text: '#FFFFFF',
  muted: '#8E9BB3',
  border: '#1E2A3A',
};

function baseHtml(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:${BRAND.surface};border-radius:12px;border:1px solid ${BRAND.border};padding:40px 32px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:28px;font-weight:800;color:${BRAND.blue};letter-spacing:-0.5px;">Fluttrr</span>
        </td></tr>
        ${content}
        <tr><td align="center" style="padding-top:32px;border-top:1px solid ${BRAND.border};">
          <span style="font-size:12px;color:${BRAND.muted};">© ${new Date().getFullYear()} Fluttrr · Kansas City</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email Templates ────────────────────────────────────

function otpEmailHtml(code) {
  return baseHtml(`
    <tr><td align="center" style="padding-bottom:8px;">
      <span style="font-size:18px;font-weight:600;color:${BRAND.text};">Verify your email</span>
    </td></tr>
    <tr><td align="center" style="padding-bottom:24px;">
      <span style="font-size:14px;color:${BRAND.muted};">Enter this code to finish signing up:</span>
    </td></tr>
    <tr><td align="center" style="padding-bottom:24px;">
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 32px;display:inline-block;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND.text};">${code}</span>
      </div>
    </td></tr>
    <tr><td align="center">
      <span style="font-size:13px;color:${BRAND.muted};">This code expires in 10 minutes. If you didn't create an account, ignore this email.</span>
    </td></tr>
  `);
}

function resetEmailHtml(code) {
  return baseHtml(`
    <tr><td align="center" style="padding-bottom:8px;">
      <span style="font-size:18px;font-weight:600;color:${BRAND.text};">Reset your password</span>
    </td></tr>
    <tr><td align="center" style="padding-bottom:24px;">
      <span style="font-size:14px;color:${BRAND.muted};">Enter this code to reset your password:</span>
    </td></tr>
    <tr><td align="center" style="padding-bottom:24px;">
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:16px 32px;display:inline-block;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND.text};">${code}</span>
      </div>
    </td></tr>
    <tr><td align="center">
      <span style="font-size:13px;color:${BRAND.muted};">This code expires in 10 minutes. If you didn't request a password reset, ignore this email.</span>
    </td></tr>
  `);
}

// ─── Send Functions ─────────────────────────────────────

async function sendOtpEmail(to, code) {
  if (!resend) {
    console.log(`[OTP] ${to}: ${code}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${code} is your Fluttrr verification code`,
      html: otpEmailHtml(code),
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send OTP email:', err.message);
    // Don't throw — OTP is still stored in DB, user can request resend
  }
}

async function sendPasswordResetEmail(to, code) {
  if (!resend) {
    console.log(`[OTP-RESET] ${to}: ${code}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${code} is your Fluttrr password reset code`,
      html: resetEmailHtml(code),
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send reset email:', err.message);
  }
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
