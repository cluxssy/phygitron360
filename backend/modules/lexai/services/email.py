import os
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
import logging

logger = logging.getLogger(__name__)



async def send_password_reset_email(email_to: str, reset_link: str):
    """
    Sends a password reset email to the user.
    If SMTP credentials are not provided or are placeholders, it logs the link instead.
    """
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    username = os.getenv("MAIL_USERNAME", "").strip()
    password = os.getenv("MAIL_PASSWORD", "").strip()
    
    logger.info(f"Preparing password reset email for {email_to} using SMTP user {username or '<not configured>'}")

    # Gmail app passwords are 16 chars, sometimes users copy with spaces
    password = password.replace(" ", "")
    
    # Check if credentials are missing or still placeholders
    is_placeholder = any(x in [username, password] for x in ["your-email@gmail.com", "your-app-password", ""])
    
    if is_placeholder:
        logger.warning(f"SMTP credentials not configured or are placeholders. Email for {email_to} will be logged to console.")
        print("\n" + "="*50)
        print(f"PASSWORD RESET LINK FOR: {email_to}")
        print(f"LINK: {reset_link}")
        print("="*50 + "\n")
        return

    # Re-initialize config to ensure it picks up latest environment variables
    config = ConnectionConfig(
        MAIL_USERNAME=username,
        MAIL_PASSWORD=password,
        MAIL_FROM=os.getenv("MAIL_FROM", username),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )

    message = MessageSchema(
        subject="e-Learning AI - Password Reset",
        recipients=[email_to],
        body=f"""
        <html>
            <body style="font-family: Helvetica, Arial, sans-serif; line-height: 1.6; color: #160E21; padding: 2rem;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 2.5rem;">
                    <h2 style="color: #9347FF; margin-bottom: 1.5rem;">Reset Your Password</h2>
                    <p>Hello,</p>
                    <p>You requested a password reset for your e-Learning AI account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 2rem 0;">
                        <a href="{reset_link}" style="background: #9347FF; color: white; padding: 1rem 2rem; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p>This link will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 2rem 0;" />
                    <p style="font-size: 0.8rem; color: #64748B;">Â© 2024 e-Learning AI Inc. All rights reserved.</p>
                </div>
            </body>
        </html>
        """,
        subtype=MessageType.html
    )

    fm = FastMail(config)
    try:
        await fm.send_message(message)
        logger.info(f"Password reset email sent to {email_to}")
    except Exception as e:
        logger.error(f"Failed to send email to {email_to}: {str(e)}")
        # Raise for transparency
        raise e

