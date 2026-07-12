import smtplib
from email.message import EmailMessage

from src.core.config import get_settings
from src.core.logger import logger

settings = get_settings()

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send an OTP email using Gmail SMTP.
    Returns True if sent successfully or if SMTP is disabled, False on error.
    """
    if not settings.SMTP_ENABLED:
        logger.info(f"SMTP is disabled. OTP for {to_email} is {otp}")
        return True

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP enabled but credentials are missing.")
        return False

    msg = EmailMessage()
    msg.set_content(
        f"Hello,\n\nYour password reset OTP is: {otp}\n\n"
        f"It will expire in 10 minutes.\n\n"
        f"If you did not request this, please ignore this email."
    )
    msg["Subject"] = "AssetFlow - Password Reset OTP"
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"OTP email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False
