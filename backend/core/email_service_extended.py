"""
Phygitron 360 — Extended Email Service
========================================
SMTP email functions for Source (Talent Vault) and Verify module notifications.
Falls back to structured logging if SMTP is not configured.
"""
import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_smtp_config():
    """Returns (host, port, user, password) from env or Nones."""
    host = os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER")
    port = int(os.getenv("SMTP_PORT", 587))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD")
    return host, port, user, password


def _send_via_smtp(msg: MIMEMultipart) -> bool:
    """Attempt to send a pre-built MIMEMultipart message via SMTP. Returns True/False."""
    host, port, user, password = _get_smtp_config()
    if not all([host, user, password]):
        return False
    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.error(f"SMTP send failed: {exc}")
        return False


def _mock_log(to_email: str, subject: str, plain_body: str):
    """Write a mock email dispatch to logs when SMTP is unavailable."""
    logger.warning("[EMAIL MOCK] SMTP not configured — logging email instead.")
    print(f"\n--- 📧 MOCK EMAIL DISPATCH ---")
    print(f"To:      {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{plain_body}")
    print(f"------------------------------\n")


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------

def send_invite_email(
    to_email: str,
    candidate_name: str,
    role_name: str,
    company_name: str,
    temp_password: str,
    deadline: Optional[str] = None,
    custom_subject: Optional[str] = None,
    custom_body: Optional[str] = None,
) -> bool:
    """
    Send a talent-portal invitation email to a candidate with their temporary credentials.
    Falls back to structured logging if SMTP is not configured.
    """
    subject = custom_subject if custom_subject else f"You've been invited to apply for {role_name} at {company_name}"
    deadline_line = f"Application Deadline: {deadline}" if deadline else "Please complete your application at your earliest convenience."

    if custom_body:
        plain_body = custom_body
        html_body = f"<html><body style=\"font-family: Arial, sans-serif; color: #333; line-height: 1.6;\">{custom_body.replace(chr(10), '<br/>')}</body></html>"
    else:
        plain_body = f"""
Dear {candidate_name},

You have been invited to apply for the position of {role_name} at {company_name}.

Please use the following temporary credentials to access the candidate portal:
  Email:            {to_email}
  Temporary Password: {temp_password}

{deadline_line}

We look forward to reviewing your application.

Best regards,
Talent Acquisition Team
{company_name}
"""

        html_body = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color:#4f46e5;">You've Been Invited!</h2>
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>You have been invited to apply for the position of <strong>{role_name}</strong> at <strong>{company_name}</strong>.</p>
  <p>Please use the following temporary credentials to access the candidate portal:</p>
  <table style="border-collapse:collapse;margin:12px 0;">
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>{to_email}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Temporary Password:</td><td><code>{temp_password}</code></td></tr>
  </table>
  <p>{deadline_line}</p>
  <p>We look forward to reviewing your application.</p>
  <br/>
  <p>Best regards,<br/><strong>Talent Acquisition Team</strong><br/>{company_name}</p>
</body></html>
"""

    host, _, user, _ = _get_smtp_config()
    if not all([host, user]):
        _mock_log(to_email, subject, plain_body)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        result = _send_via_smtp(msg)
        if result:
            logger.info(f"Invite email sent to {to_email} for role '{role_name}'")
        else:
            _mock_log(to_email, subject, plain_body)
        return True
    except Exception as exc:
        logger.error(f"send_invite_email failed for {to_email}: {exc}")
        return False


def send_offer_letter_email(
    to_email: str,
    candidate_name: str,
    company_name: str,
    role_title: str,
    department: Optional[str] = None,
    salary: Optional[str] = None,
    location: Optional[str] = None,
    attachment_bytes: Optional[bytes] = None,
) -> bool:
    """
    Send an offer letter email to a candidate.
    Optionally attaches a PDF if attachment_bytes is provided.
    Falls back to structured logging if SMTP is not configured.
    """
    subject = f"Offer Letter — {role_title} at {company_name}"
    dept_line = f"Department: {department}" if department else ""
    sal_line = f"Offered Salary: {salary}" if salary else ""
    loc_line = f"Work Location: {location}" if location else ""

    plain_body = f"""
Dear {candidate_name},

We are pleased to extend an offer of employment for the position of {role_title} at {company_name}.

{dept_line}
{sal_line}
{loc_line}

Please review the attached offer letter and respond at your earliest convenience.

We look forward to welcoming you to the team!

Warm regards,
HR Operations Team
{company_name}
"""

    html_body = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color:#059669;">Congratulations, {candidate_name}!</h2>
  <p>We are pleased to extend an offer of employment for the position of <strong>{role_title}</strong> at <strong>{company_name}</strong>.</p>
  <table style="border-collapse:collapse;margin:12px 0;">
    {'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Department:</td><td>' + department + '</td></tr>' if department else ''}
    {'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Offered Salary:</td><td>' + salary + '</td></tr>' if salary else ''}
    {'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Work Location:</td><td>' + location + '</td></tr>' if location else ''}
  </table>
  <p>Please review the attached offer letter and respond at your earliest convenience.</p>
  <p>We look forward to welcoming you to the team!</p>
  <br/>
  <p>Warm regards,<br/><strong>HR Operations Team</strong><br/>{company_name}</p>
</body></html>
"""

    host, _, user, _ = _get_smtp_config()
    if not all([host, user]):
        _mock_log(to_email, subject, plain_body)
        return True

    try:
        msg = MIMEMultipart("mixed")
        msg["From"] = user
        msg["To"] = to_email
        msg["Subject"] = subject

        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(plain_body, "plain"))
        alt.attach(MIMEText(html_body, "html"))
        msg.attach(alt)

        if attachment_bytes:
            part = MIMEBase("application", "pdf")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", 'attachment; filename="offer_letter.pdf"')
            msg.attach(part)

        result = _send_via_smtp(msg)
        if result:
            logger.info(f"Offer letter email sent to {to_email}")
        else:
            _mock_log(to_email, subject, plain_body)
        return True
    except Exception as exc:
        logger.error(f"send_offer_letter_email failed for {to_email}: {exc}")
        return False


def send_assessment_notification_email(
    to_email: str,
    candidate_name: str,
    assessment_title: str,
    deadline: Optional[str] = None,
    duration_mins: Optional[int] = None,
    question_count: Optional[int] = None,
    pass_score: Optional[float] = None,
) -> bool:
    """
    Send an assessment assignment notification to a candidate.
    Falls back to structured logging if SMTP is not configured.
    """
    subject = f"Assessment Assigned: {assessment_title}"
    deadline_line = f"Complete by: {deadline}" if deadline else "Please complete the assessment at your earliest convenience."

    detail_rows = ""
    if duration_mins:
        detail_rows += f"  Time Limit: {duration_mins} minutes\n"
    if question_count:
        detail_rows += f"  Questions: {question_count}\n"
    if pass_score is not None:
        detail_rows += f"  Passing Score: {pass_score}%\n"

    plain_body = f"""
Dear {candidate_name},

You have been assigned a new assessment: {assessment_title}

{detail_rows}
{deadline_line}

Please log in to the candidate portal to begin your assessment.

Best regards,
Assessment Team — Phygitron 360
"""

    html_detail_rows = ""
    if duration_mins:
        html_detail_rows += f'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Time Limit:</td><td>{duration_mins} minutes</td></tr>'
    if question_count:
        html_detail_rows += f'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Questions:</td><td>{question_count}</td></tr>'
    if pass_score is not None:
        html_detail_rows += f'<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Passing Score:</td><td>{pass_score}%</td></tr>'

    html_body = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color:#4f46e5;">Assessment Assigned</h2>
  <p>Dear <strong>{candidate_name}</strong>,</p>
  <p>You have been assigned a new assessment: <strong>{assessment_title}</strong></p>
  <table style="border-collapse:collapse;margin:12px 0;">
    {html_detail_rows}
  </table>
  <p>{deadline_line}</p>
  <p>Please log in to the candidate portal to begin your assessment.</p>
  <br/>
  <p>Best regards,<br/><strong>Assessment Team — Phygitron 360</strong></p>
</body></html>
"""

    host, _, user, _ = _get_smtp_config()
    if not all([host, user]):
        _mock_log(to_email, subject, plain_body)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        result = _send_via_smtp(msg)
        if result:
            logger.info(f"Assessment notification sent to {to_email} for '{assessment_title}'")
        else:
            _mock_log(to_email, subject, plain_body)
        return True
    except Exception as exc:
        logger.error(f"send_assessment_notification_email failed for {to_email}: {exc}")
        return False
