import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
smtp_port = int(os.environ.get("SMTP_PORT", 587))
smtp_username = os.environ.get("SMTP_USERNAME", "")
smtp_password = os.environ.get("SMTP_PASSWORD", "")

print(f"SMTP Server: {smtp_server}")
print(f"SMTP Port: {smtp_port}")
print(f"SMTP Username: {smtp_username}")
print(f"Password length: {len(smtp_password)}")
print("\nTesting SMTP connection...")

try:
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.set_debuglevel(1)
    print("\n--- Starting TLS ---")
    server.starttls()
    print("\n--- Attempting Login ---")
    server.login(smtp_username, smtp_password)
    print("\n✅ SUCCESS! SMTP connection and authentication successful!")
    
    # Send test email
    print("\n--- Sending Test Email ---")
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = smtp_username
    msg['Subject'] = "Test Email from Divine Cakery Backend"
    body = "This is a test email to verify SMTP configuration is working."
    msg.attach(MIMEText(body, 'plain'))
    
    server.sendmail(smtp_username, smtp_username, msg.as_string())
    print("✅ Test email sent successfully!")
    server.quit()
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
