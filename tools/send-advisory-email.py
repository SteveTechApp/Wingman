"""Send the completed advisory report using repository SMTP secrets."""
import os
import pathlib
import smtplib
import ssl
from email.message import EmailMessage


def main():
    required = ["ALERT_SMTP_HOST", "ALERT_SMTP_USERNAME", "ALERT_SMTP_PASSWORD", "ALERT_EMAIL_TO"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Email delivery is not configured; missing secrets: " + ", ".join(missing))
    message = EmailMessage()
    message["From"] = os.environ.get("ALERT_EMAIL_FROM") or os.environ["ALERT_SMTP_USERNAME"]
    message["To"] = os.environ["ALERT_EMAIL_TO"]
    message["Subject"] = "Wingman dependency advisory alert"
    report = pathlib.Path("/tmp/audit-findings.log")
    message.set_content(os.environ.get("ALERT_RUN_URL", "") + "\n\n" +
                        (report.read_text(encoding="utf-8") if report.exists() else "The advisory survey did not complete."))
    with smtplib.SMTP(os.environ["ALERT_SMTP_HOST"], int(os.environ.get("ALERT_SMTP_PORT") or "587"), timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(os.environ["ALERT_SMTP_USERNAME"], os.environ["ALERT_SMTP_PASSWORD"])
        smtp.send_message(message)
    print("Advisory email delivered to the configured recipient")


if __name__ == "__main__":
    main()
