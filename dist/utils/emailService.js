"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPenaltyEmail = exports.sendBookingVerificationEmail = exports.sendContactUsEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../logger/logger"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendVerificationEmail = (toEmail, otp) => __awaiter(void 0, void 0, void 0, function* () {
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
        logger_1.default.info(`Sending verification email to ${toEmail} with OTP: ${otp} mail`);
        yield transporter.sendMail(mailOptions);
        logger_1.default.info(`Verification OTP sent to ${toEmail}`);
    }
    catch (error) {
        logger_1.default.error(`Error sending verification email to ${toEmail}:`, error);
        throw new Error('Failed to send verification email.');
    }
});
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = (to, resetLink) => __awaiter(void 0, void 0, void 0, function* () {
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
    logger_1.default.info(`Sending resetLink email ${resetLink} `);
    try {
        yield transporter.sendMail(mailOptions);
        logger_1.default.info(`Password reset email sent to ${to}`);
    }
    catch (error) {
        logger_1.default.error(`Error sending password reset email to ${to}:`, error);
        throw new Error('Failed to send password reset email.');
    }
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendContactUsEmail = (name, email, message) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: process.env.RECEIVER_EMAIL,
        subject: 'New Contact Form Submission',
        text: message,
        html: `<p><strong>Name:</strong> ${name}</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Message:</strong><br/>${message}</p>`,
    };
    try {
        yield transporter.sendMail(mailOptions);
        logger_1.default.info('Email received from the customer ');
    }
    catch (err) {
        logger_1.default.error('Error sending email:', err);
        throw new Error('Failed to send email');
    }
});
exports.sendContactUsEmail = sendContactUsEmail;
const sendBookingVerificationEmail = (toEmail, otp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.default.info('the email', toEmail, otp);
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: toEmail,
            subject: 'QuickMate Booked Service Completion OTP',
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Booking Completion Verification</h2>
          <p>Hello,</p>
          <p>Thank you for the service with QuickMate. To complete your service, please use the following One-Time Password (OTP):</p>
          <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">${otp}</p>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>Regards,<br/>QuickMate Team</p>
        </div>
      `,
        };
        logger_1.default.info(`Sending verification email to ${toEmail} with OTP: ${otp} mail`);
        yield transporter.sendMail(mailOptions);
        logger_1.default.info(`Verification OTP sent to ${toEmail}`);
    }
    catch (error) {
        logger_1.default.error(`Error sending booking completion email to ${toEmail}:`, error);
        throw new Error('Failed to send booking completion email.');
    }
});
exports.sendBookingVerificationEmail = sendBookingVerificationEmail;
const sendPenaltyEmail = (toEmail, bookingDate, newRating) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: toEmail,
            subject: '⚠️ Notice: Penalty Applied for Missed Booking - QuickMate',
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">Missed Booking Alert</h2>
          <p>Dear Provider,</p>
          
          <p>We noticed that you missed a scheduled booking on <strong>${bookingDate}</strong>.</p>
          
          <div style="background-color: #fff3f3; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Action Taken:</p>
            <ul style="margin: 10px 0 0 20px; padding: 0;">
              <li>Your rating has been lowered by <strong>1 star</strong>.</li>
              <li>Your new rating is now: <strong style="font-size: 18px;">${newRating}/5</strong></li>
            </ul>
          </div>

          <p>Reliability is critical for success on QuickMate. Repeated missed bookings may lead to temporary suspension of your account.</p>
          
          <p>Please ensure you fulfill all accepted bookings or cancel them well in advance to avoid further penalties.</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #777;">Regards,<br/>QuickMate Team</p>
        </div>
      `,
        };
        logger_1.default.info(`Sending penalty email to ${toEmail}`);
        yield transporter.sendMail(mailOptions);
        logger_1.default.info(`Penalty email sent successfully to ${toEmail}`);
    }
    catch (error) {
        logger_1.default.error(`Error sending penalty email to ${toEmail}:`, error);
    }
});
exports.sendPenaltyEmail = sendPenaltyEmail;
