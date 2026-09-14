"""
Email Service — Resend Integration
====================================
Sends templated HTML emails using the Resend API.
Falls back to console logging when RESEND_API_KEY is not set (dev mode).

Usage:
    from app.services.email_service import email_service
    email_service.send_patient_added_email(patient_email, patient_name, clinic_name)
    email_service.send_staff_added_email(staff_email, staff_name, clinic_name, role)
"""
import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "email_templates"

def _load_template(template_name: str) -> str:
    """Load an HTML email template from disk."""
    template_path = TEMPLATES_DIR / template_name
    if template_path.exists():
        return template_path.read_text(encoding="utf-8")
    logger.warning(f"Email template not found: {template_path}")
    return ""

class EmailService:
    """Handles sending emails via Resend or console fallback."""

    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY", "")
        self.from_email = os.getenv("RESEND_FROM_EMAIL", "CoreTAT <noreply@coretat.com>")
        self.app_name = "CoreTAT"
        self._resend = None

        if self.api_key:
            try:
                import resend
                resend.api_key = self.api_key
                self._resend = resend
                logger.info("Resend email service initialized successfully.")
            except ImportError:
                logger.warning("'resend' package not installed. Email service will use console fallback.")
        else:
            logger.info("RESEND_API_KEY not set — email service running in console-only mode.")

    def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send an email via Resend or log to console."""
        if not to_email:
            logger.warning("No recipient email provided. Skipping email send.")
            return False

        if self._resend and self.api_key:
            try:
                params = {
                    "from": self.from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_body,
                }
                self._resend.Emails.send(params)
                logger.info(f"Email sent to {to_email}: {subject}")
                return True
            except Exception as e:
                logger.error(f"Failed to send email to {to_email}: {e}")
                return False
        else:

            print("\n" + "=" * 60)
            print("📧 EMAIL NOTIFICATION (Console Mode)")
            print("=" * 60)
            print(f"To:      {to_email}")
            print(f"Subject: {subject}")
            print("-" * 60)
            print(html_body[:500] + ("..." if len(html_body) > 500 else ""))
            print("=" * 60 + "\n")
            return True

    def send_patient_added_email(
        self,
        patient_email: str,
        patient_name: str,
        clinic_name: Optional[str] = None,
        added_by: Optional[str] = None,
    ) -> bool:
        """Send confirmation email when a patient is added to the system."""
        if not patient_email:
            return False

        template = _load_template("patient_added.html")
        if not template:

            template = self._get_patient_added_fallback()

        html_body = template.replace("{{PATIENT_NAME}}", patient_name or "Patient")
        html_body = html_body.replace("{{CLINIC_NAME}}", clinic_name or self.app_name)
        html_body = html_body.replace("{{ADDED_BY}}", added_by or "your healthcare provider")
        html_body = html_body.replace("{{APP_NAME}}", self.app_name)

        subject = f"Welcome to {clinic_name or self.app_name} — Your Profile Has Been Created"
        return self._send_email(patient_email, subject, html_body)

    def send_staff_added_email(
        self,
        staff_email: str,
        staff_name: str,
        clinic_name: str,
        role: str = "Staff",
        temp_password: Optional[str] = None,
    ) -> bool:
        """Send confirmation email when a staff member is added to a clinic."""
        if not staff_email:
            return False

        template = _load_template("staff_added.html")
        if not template:
            template = self._get_staff_added_fallback()

        html_body = template.replace("{{STAFF_NAME}}", staff_name or "Team Member")
        html_body = html_body.replace("{{CLINIC_NAME}}", clinic_name or self.app_name)
        html_body = html_body.replace("{{ROLE}}", role)
        html_body = html_body.replace("{{EMAIL}}", staff_email)
        html_body = html_body.replace("{{APP_NAME}}", self.app_name)
        html_body = html_body.replace(
            "{{PASSWORD_SECTION}}",
            f'<p style="margin:0 0 12px;">Your temporary password is: <strong>{temp_password}</strong></p><p style="margin:0 0 12px;">Please change your password after your first login.</p>'
            if temp_password
            else '<p style="margin:0 0 12px;">Your login credentials have been set by your clinic administrator. Please contact them if you need your password.</p>',
        )

        subject = f"You've been added to {clinic_name} on {self.app_name}"
        return self._send_email(staff_email, subject, html_body)

    def send_verification_assignment_email(
        self,
        psychologist_email: str,
        psychologist_name: str,
        assessment_name: str,
        patient_name: str,
        login_url: str = "https://coretat.com/login",
    ) -> bool:
        """Send notification to a psychologist when they are assigned a new report verification."""
        if not psychologist_email:
            return False

        template = _load_template("verification_assignment.html")
        if not template:
            template = self._get_verification_assignment_fallback()

        html_body = template.replace("{{PSYCHOLOGIST_NAME}}", psychologist_name or "Psychologist")
        html_body = html_body.replace("{{ASSESSMENT_NAME}}", assessment_name or "Assessment")
        html_body = html_body.replace("{{PATIENT_NAME}}", patient_name or "Patient")
        html_body = html_body.replace("{{LOGIN_URL}}", login_url)
        html_body = html_body.replace("{{APP_NAME}}", self.app_name)

        subject = f"Action Required: New Report Verification Assigned ({assessment_name})"
        return self._send_email(psychologist_email, subject, html_body)

    @staticmethod
    def _get_patient_added_fallback() -> str:
        return """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f7;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;">Welcome to {{CLINIC_NAME}}</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">Hello <strong>{{PATIENT_NAME}}</strong>,</p>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      Your profile has been created on <strong>{{APP_NAME}}</strong> by {{ADDED_BY}}.
      You are now registered as a patient at <strong>{{CLINIC_NAME}}</strong>.
    </p>
    <div style="background:#f0f4ff;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0;color:#4b5563;font-size:13px;">
        If you have any questions about your care, please contact your healthcare provider directly.
      </p>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      This is an automated message from {{APP_NAME}}. Please do not reply to this email.
    </p>
  </div>
</div>
</body>
</html>"""

    @staticmethod
    def _get_staff_added_fallback() -> str:
        return """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f7;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;">Welcome to {{CLINIC_NAME}}</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">Hello <strong>{{STAFF_NAME}}</strong>,</p>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      You have been added as <strong>{{ROLE}}</strong> at <strong>{{CLINIC_NAME}}</strong> on {{APP_NAME}}.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Your Login Details</p>
      <p style="margin:0 0 4px;color:#1f2937;font-size:14px;">Email: <strong>{{EMAIL}}</strong></p>
      {{PASSWORD_SECTION}}
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      This is an automated message from {{APP_NAME}}. Please do not reply to this email.
    </p>
  </div>
</div>
</body>
</html>"""

    @staticmethod
    def _get_verification_assignment_fallback() -> str:
        return """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f7;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;">New Verification Request</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">Hello <strong>Dr. {{PSYCHOLOGIST_NAME}}</strong>,</p>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
      You have been assigned a new psychological report for <strong>RCI Verification</strong> on {{APP_NAME}}.
    </p>
    <div style="background:#f0f4ff;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0 0 8px;color:#4b5563;font-size:14px;"><strong>Assessment:</strong> {{ASSESSMENT_NAME}}</p>
      <p style="margin:0 0 8px;color:#4b5563;font-size:14px;"><strong>Patient:</strong> {{PATIENT_NAME}}</p>
      <p style="margin:0;color:#ef4444;font-size:13px;font-weight:600;">
        Action Required: Please verify this report within the SLA deadline to avoid reassignment.
      </p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="{{LOGIN_URL}}" style="background:#6366f1;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View Request Queue</a>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      This is an automated message from {{APP_NAME}}. Please do not reply to this email.
    </p>
  </div>
</div>
</body>
</html>"""

    def send_escalation_notification(
        self,
        request_id: str,
        session_id: str,
        admin_email: str = "admin@coretat.com",
    ) -> bool:
        """Send escalation notification when a verification request exceeds max attempts."""
        subject = f"⚠ ESCALATION: Verification Request {request_id[:8]} Requires Immediate Attention"
        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f7;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px 24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0;">⚠ Verification Escalation</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="margin:0 0 16px;color:#1f2937;font-size:15px;">A verification request has <strong>exceeded all 3 assignment attempts</strong> and requires manual intervention.</p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0 0 8px;color:#4b5563;font-size:14px;"><strong>Request ID:</strong> {request_id}</p>
      <p style="margin:0 0 8px;color:#4b5563;font-size:14px;"><strong>Session ID:</strong> {session_id}</p>
      <p style="margin:0;color:#ef4444;font-size:13px;font-weight:600;">
        No psychologist completed verification within the 15h → 6h → 3h SLA window.
      </p>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
      This is an automated message from {self.app_name}. Please do not reply to this email.
    </p>
  </div>
</div>
</body>
</html>"""
        return self._send_email(admin_email, subject, html_body)

email_service = EmailService()
