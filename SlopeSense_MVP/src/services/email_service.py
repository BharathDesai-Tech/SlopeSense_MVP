import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


def send_otp_email(to_email: str, otp: str, purpose: str = "password_reset") -> bool:
    """Dispatches a 6-digit OTP email.

    If SMTP credentials are provided in environment variables (e.g. free
    Gmail SMTP), it transmits a real email to the user's inbox.
    Otherwise, it logs to the server terminal in zero-configuration Demo Mode.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_name = os.getenv("SMTP_SENDER_NAME", "SlopeSense AI Early Warning System")

    subject = (
        f"SlopeSense AI: Your Verification Code is {otp}"
        if purpose == "verify_email"
        else f"SlopeSense AI: Password Reset Authorization Code [{otp}]"
    )

    action_text = (
        "activate your SlopeSense AI citizen/authority account"
        if purpose == "verify_email"
        else "reset your account password"
    )

    # If no SMTP credentials are configured, log to server console
    if not smtp_user or not smtp_password:
        print(f"\n[EMAIL DISPATCHER (Zero-Cost Demo Mode)]")
        print(f"  To: {to_email}")
        print(f"  Subject: {subject}")
        print(f"  6-Digit Code: {otp}")
        print(f"  Note: To send to a real inbox, set SMTP_USER and SMTP_PASSWORD.\n")
        return True

    # Real SMTP Dispatch (Free Gmail or custom SMTP)
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{smtp_user}>"
        msg["To"] = to_email

        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <span style="font-size: 20px; font-weight: 900; color: #38bdf8;">🏔️ SlopeSense AI</span>
            </div>
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Authorization Code</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                You recently requested to {action_text}. Use the following 6-digit verification code to complete the procedure:
            </p>
            <div style="text-align: center; margin: 28px 0; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #38bdf8;">{otp}</span>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
                This code will expire in 15 minutes. If you did not make this request, you can safely disregard this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
            <p style="color: #475569; font-size: 11px; margin: 0;">
                National Disaster Early Warning Node • Northeast India Regional Corridor
            </p>
        </div>
        """

        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [to_email], msg.as_string())

        print(f"[EMAIL DISPATCHER] Successfully sent verification email to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL DISPATCHER ERROR] Failed to send email to {to_email}: {e}")
        return False
