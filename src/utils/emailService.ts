import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (toEmail: string, otp: string): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'QuickMate Account Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Account Verification</h2>
          <p>Hello,</p>
          <p>Thank you for registering with QuickMate. To complete your registration, please use the following One-Time Password (OTP):</p>
          <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">${otp}</p>
          <p>This OTP is valid for <strong>${process.env.OTP_EXPIRY_MINUTES || '5'} minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Regards,<br/>QuickMate Team</p>
        </div>
      `,
    };
    console.log(`Sending verification email to ${toEmail} with OTP: ${otp} mail`);

    await transporter.sendMail(mailOptions);
    console.log(`Verification OTP sent to ${toEmail}`);
  } catch (error) {
    console.error(`Error sending verification email to ${toEmail}:`, error);
    throw new Error('Failed to send verification email.');
  }
};

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'QuickMate Password Reset Request',
    html: `
      <p>You requested a password reset for your QuickMate account.</p>
      <p>Please click on the following link to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link is valid for ${process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60} minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending password reset email to ${to}:`, error);
    throw new Error('Failed to send password reset email.');
  }
};