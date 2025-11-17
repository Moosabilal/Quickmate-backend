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
exports.sendBookingVerificationEmail = exports.sendContactUsEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
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
