import nodemailer from "nodemailer";

export class EmailService {
  static async sendOtp(email: string, code: string): Promise<void> {
    // Always use SMTP (Office 365 compatible)
    const host = process.env.SMTP_HOST || "smtp.office365.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true"; // STARTTLS on 587 => false
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user || "no-reply@example.com";

    if (!user || !pass) {
      throw new Error("SMTP_USER/SMTP_PASS not set");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: "Your verification code",
      text: `Your verification code is ${code}. It expires in 5 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
    });
  }
}


