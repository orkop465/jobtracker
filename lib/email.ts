import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getTransport(): nodemailer.Transporter | null {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "noreply@mkvdata.com";
  const transport = getTransport();

  if (!transport) {
    console.log(
      `\n📧 Email (dev mode):\n  To: ${options.to}\n  Subject: ${options.subject}\n  Body:\n${options.text}\n`,
    );
    return;
  }

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
