import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

def send_email(subject: str, body: str, sender: str, recipient: str):
    password = os.getenv("EMAIL_APP_PASSWORD")
    if not password:
        raise ValueError("EMAIL_APP_PASSWORD environment variable not set")
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp_server:
       smtp_server.login(sender, password)
       smtp_server.sendmail(sender, [recipient], msg.as_string())
    print("Message sent!")
