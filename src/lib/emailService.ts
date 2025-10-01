"use server"
import nodemailer from 'nodemailer';
import { DailyDigestEmail } from '@/emails/DailyDigestEmail';
import { render } from '@react-email/render';
import { Bill } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendDigestEmail(bills: Bill[]) {
  const emailHtml = await render(DailyDigestEmail({ bills }));
  const reportDate = new Date().toLocaleDateString('uk-UA');

  const mailOptions = {
    from: `"Законодавчий Монітор" <${process.env.SMTP_USER}>`,
    to: 'irudoj63@gmail.com',
    subject: `Щоденний дайджест законодавства (${reportDate})`,
    html: emailHtml,
  };

  try {
    console.log('Sending email via Nodemailer...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully! Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}