import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
  if (!fromEmail) {
    throw new Error("SENDGRID_FROM_EMAIL is not configured");
  }

  await sgMail.send({
    to,
    from: fromEmail,
    subject: "Your Devit verification code",
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <p>Your Devit verification code is:</p>
      <h2 style="letter-spacing: 0.2em; font-size: 2rem;">${code}</h2>
      <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    `,
  });
}
