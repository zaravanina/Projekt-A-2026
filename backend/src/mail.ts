import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMagicLink(email: string, link: string) {
  await transporter.sendMail({
    from: `"Secure App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your login link",
    html: `
      <h2>Login link</h2>
      <p>Click the link below to login:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 10 minutes and can only be used once.</p>
    `,
  });
}
