import asyncio, smtplib, os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime
from backend.config import settings

SEVERITY_COLOR = {"fall": "#C0392B", "sleeping": "#D35400", "inactivity": "#7D3C98"}
SEVERITY_LABEL = {"fall": "CRITICAL — FALL DETECTED", "sleeping": "WARNING — SLEEPING ALERT", "inactivity": "WARNING — INACTIVITY ALERT"}
SEVERITY_DESC  = {
    "fall":       "A fall event has been detected for the monitored individual. Immediate caregiver attention is strongly recommended.",
    "sleeping":   "The monitored individual appears to be sleeping outside of designated rest hours.",
    "inactivity": "No significant movement has been detected for an extended period. Please verify the individual's condition.",
}
SEVERITY_ACTION = {
    "fall":       "Please check on the individual immediately and contact emergency services if necessary.",
    "sleeping":   "Please verify whether the individual requires assistance.",
    "inactivity": "Please check on the individual to ensure they are safe and responsive.",
}

def _html(event_type: str, track_id: int, timestamp: str, has_image: bool) -> str:
    color  = SEVERITY_COLOR.get(event_type, "#555")
    label  = SEVERITY_LABEL.get(event_type, event_type.upper())
    desc   = SEVERITY_DESC.get(event_type, "An anomalous activity was detected.")
    action = SEVERITY_ACTION.get(event_type, "Please review the monitoring system.")
    img_block = '<img src="cid:snapshot" style="width:100%;border-radius:6px;margin-top:16px" alt="Event snapshot"/>' if has_image else ""

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:{color};padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">🛡 ElderSafe</span><br>
            <span style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;display:block">Elderly Safety Monitoring System</span></td>
        <td align="right"><span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;
            padding:4px 12px;border-radius:20px;letter-spacing:.5px">{label.split("—")[0].strip()}</span></td>
      </tr>
    </table>
  </td></tr>

  <!-- Alert title -->
  <tr><td style="padding:28px 32px 0">
    <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0">{label}</p>
    <p style="font-size:14px;color:#555;margin:10px 0 0;line-height:1.6">{desc}</p>
    {img_block}
  </td></tr>

  <!-- Details table -->
  <tr><td style="padding:20px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;font-size:13px">
      <tr style="background:#f8fafc">
        <td style="padding:10px 16px;color:#888;font-weight:600;width:140px;border-bottom:1px solid #e8ecf0">Event Type</td>
        <td style="padding:10px 16px;font-weight:700;color:{color};border-bottom:1px solid #e8ecf0">{event_type.upper()}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#888;font-weight:600;border-bottom:1px solid #e8ecf0">Person ID</td>
        <td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e8ecf0">#{track_id}</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px 16px;color:#888;font-weight:600;border-bottom:1px solid #e8ecf0">Date &amp; Time</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e8ecf0">{timestamp}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#888;font-weight:600">System</td>
        <td style="padding:10px 16px">ElderSafe Monitor</td>
      </tr>
    </table>
  </td></tr>

  <!-- Action required -->
  <tr><td style="padding:0 32px 28px">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fff8f8;border:1px solid {color}40;border-left:4px solid {color};border-radius:6px">
      <tr><td style="padding:14px 16px">
        <p style="margin:0;font-size:13px;font-weight:700;color:{color}">⚠ Action Required</p>
        <p style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.5">{action}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e8ecf0">
    <p style="margin:0;font-size:11px;color:#aaa;text-align:center">
      This is an automated alert from ElderSafe Monitoring System.<br>
      Please do not reply to this email.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>"""

async def send_email(subject: str, body: str, event_type: str = "", track_id: int = 0, snapshot_path: str = None):
    if not settings.smtp_user or not settings.alert_email:
        return

    timestamp  = datetime.now().strftime("%B %d, %Y at %I:%M:%S %p")
    has_image  = snapshot_path and os.path.exists(snapshot_path)

    msg = MIMEMultipart("related")
    msg["Subject"] = f"[ElderSafe] {subject}"
    msg["From"]    = f"ElderSafe Monitoring <{settings.smtp_user}>"
    msg["To"]      = settings.alert_email

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(body, "plain"))
    alt.attach(MIMEText(_html(event_type, track_id, timestamp, has_image), "html"))
    msg.attach(alt)

    if has_image:
        with open(snapshot_path, "rb") as f:
            img = MIMEImage(f.read(), _subtype="jpeg")
            img.add_header("Content-ID", "<snapshot>")
            img.add_header("Content-Disposition", "inline", filename="snapshot.jpg")
            msg.attach(img)

    def _send():
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
            s.starttls()
            s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send)
