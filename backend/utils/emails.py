import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

def send_email(subject: str, body: str, recipient: str):
    password = os.getenv("EMAIL_APP_PASSWORD")
    sender = os.getenv("EMAIL_SENDER")
    if not password or not sender:
        raise ValueError("EMAIL_APP_PASSWORD and EMAIL_SENDER environment variables must be set")
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp_server:
       smtp_server.login(sender, password)
       smtp_server.sendmail(sender, [recipient], msg.as_string())
    print("Message sent!")
