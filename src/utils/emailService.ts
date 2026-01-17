import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../logger/logger.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_SECURE === "true",
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
      subject: "QuickMate Account Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Account Verification</h2>
          <p>Hello,</p>
          <p>Thank you for registering with QuickMate. To complete your registration, please use the following One-Time Password (OTP):</p>
          <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">${otp}</p>
          <p>This OTP is valid for <strong>${process.env.OTP_EXPIRY_MINUTES || "5"} minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Regards,<br/>QuickMate Team</p>
        </div>
      `,
    };
    logger.info(`Sending verification email to ${toEmail} with OTP: ${otp} mail`);

    await transporter.sendMail(mailOptions);
    logger.info(`Verification OTP sent to ${toEmail}`);
  } catch (error) {
    logger.error(`Error sending verification email to ${toEmail}:`, error);
    throw new Error("Failed to send verification email.");
  }
};

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "QuickMate Password Reset Request",
    html: `
      <p>You requested a password reset for your QuickMate account.</p>
      <p>Please click on the following link to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link is valid for ${process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60} minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  logger.info(`Sending resetLink email ${resetLink} `);

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}`);
  } catch (error) {
    logger.error(`Error sending password reset email to ${to}:`, error);
    throw new Error("Failed to send password reset email.");
  }
};

export const sendContactUsEmail = async (name: string, email: string, message: string) => {
  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: process.env.RECEIVER_EMAIL,
    subject: "New Contact Form Submission",
    text: message,
    html: `<p><strong>Name:</strong> ${name}</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Message:</strong><br/>${message}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("Email received from the customer ");
  } catch (err) {
    logger.error("Error sending email:", err);
    throw new Error("Failed to send email");
  }
};

export const sendBookingVerificationEmail = async (toEmail: string, otp: string): Promise<void> => {
  try {
    logger.info("the email", toEmail, otp);
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: "QuickMate Booked Service Completion OTP",
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
    logger.info(`Sending verification email to ${toEmail} with OTP: ${otp} mail`);

    await transporter.sendMail(mailOptions);
    logger.info(`Verification OTP sent to ${toEmail}`);
  } catch (error) {
    logger.error(`Error sending booking completion email to ${toEmail}:`, error);
    throw new Error("Failed to send booking completion email.");
  }
};

export const sendPenaltyEmail = async (toEmail: string, bookingDate: string, newRating: number): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: "⚠️ Notice: Penalty Applied for Missed Booking - QuickMate",
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

    logger.info(`Sending penalty email to ${toEmail}`);
    await transporter.sendMail(mailOptions);
    logger.info(`Penalty email sent successfully to ${toEmail}`);
  } catch (error) {
    logger.error(`Error sending penalty email to ${toEmail}:`, error);
  }
};

export const sendUserStatusChangeEmail = async (
  toEmail: string,
  userName: string,
  isBlocked: boolean,
  reason?: string,
): Promise<void> => {
  try {
    const subject = isBlocked
      ? "⚠️ Important: Your QuickMate Account Access Has Been Restricted"
      : "✅ Your QuickMate Account Has Been Reactivated";

    const blockTemplate = `
        <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">Account Access Suspended</h2>
        <p>Dear ${userName},</p>
        <p>This email is to inform you that your QuickMate account has been <strong>blocked</strong> by our administration team.</p>
        
        <div style="background-color: #fff3f3; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0;">
             <p style="margin: 0; font-weight: bold;">Reason for action:</p>
             <p style="margin: 5px 0 0 0;">${reason ? reason : "Violation of Terms of Service or suspicious activity."}</p>
        </div>

        <p>While your account is blocked, you will not be able to log in or access our services.</p>
        <p>If you believe this is a mistake or would like to appeal this decision, please reply to this email or contact our support team.</p>
    `;

    const unblockTemplate = `
        <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Account Reactivated</h2>
        <p>Dear ${userName},</p>
        <p>We are pleased to inform you that your QuickMate account has been <strong>unblocked</strong> and fully reactivated.</p>
        
        <div style="background-color: #f0fff4; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
             <p style="margin: 0; color: #155724;">You can now log in and use all QuickMate services immediately.</p>
        </div>

        <p>Welcome back!</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          ${isBlocked ? blockTemplate : unblockTemplate}
          <p style="margin-top: 30px; font-size: 14px; color: #777;">Regards,<br/>QuickMate Team</p>
        </div>
      `,
    };

    logger.info(`Sending account status update email to ${toEmail} (Blocked: ${isBlocked})`);
    await transporter.sendMail(mailOptions);
    logger.info(`Account status email sent to ${toEmail}`);
  } catch (error) {
    logger.error(`Error sending account status email to ${toEmail}:`, error);
  }
};

export const sendProviderStatusUpdateEmail = async (
  toEmail: string,
  providerName: string,
  status: string,
  reason?: string,
): Promise<void> => {
  try {
    let subject = "";
    let bodyContent = "";
    let colorCode = "#333";

    switch (status) {
      case "Pending":
        subject = "Application Under Review - QuickMate";
        colorCode = "#17a2b8";
        bodyContent = `
                    <h2 style="color: ${colorCode}; border-bottom: 2px solid ${colorCode}; padding-bottom: 10px;">Verification Successful</h2>
                    <p>Dear ${providerName},</p>
                    <p>Your email has been successfully verified!</p>
                    
                    <div style="background-color: #e3f2fd; border-left: 4px solid ${colorCode}; padding: 15px; margin: 20px 0;">
                         <p style="margin: 0; color: #0c5460;"><strong>Current Status: PENDING APPROVAL</strong></p>
                         <p style="margin: 10px 0 0 0; font-size: 14px;">Your application has been forwarded to our administration team for review. We will verify your documents and service details.</p>
                    </div>

                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our team reviews applications within 24-48 hours.</li>
                        <li>You will receive an email immediately upon Approval or Rejection.</li>
                        <li>Once approved, you can start adding services and accepting bookings.</li>
                    </ul>
                `;
        break;
      case "Approved":
        subject = "🎉 Congratulations! Your QuickMate Provider Account is Approved";
        colorCode = "#28a745";
        bodyContent = `
                    <h2 style="color: ${colorCode}; border-bottom: 2px solid ${colorCode}; padding-bottom: 10px;">Application Approved</h2>
                    <p>Dear ${providerName},</p>
                    <p>We are thrilled to inform you that your application to become a provider on QuickMate has been <strong>APPROVED</strong>!</p>
                    
                    <div style="background-color: #f0fff4; border-left: 4px solid ${colorCode}; padding: 15px; margin: 20px 0;">
                         <p style="margin: 0; color: #155724;"><strong>You can now log in to your dashboard, set up your schedule, and start accepting bookings immediately.</strong></p>
                    </div>
                    <p>Welcome to the team!</p>
                `;
        break;

      case "Rejected":
        subject = "Update regarding your QuickMate Provider Application";
        colorCode = "#d9534f";
        bodyContent = `
                    <h2 style="color: ${colorCode}; border-bottom: 2px solid ${colorCode}; padding-bottom: 10px;">Application Status</h2>
                    <p>Dear ${providerName},</p>
                    <p>Thank you for your interest in joining QuickMate. After carefully reviewing your profile and documents, we regret to inform you that we cannot approve your application at this time.</p>
                    
                    <div style="background-color: #fff3f3; border-left: 4px solid ${colorCode}; padding: 15px; margin: 20px 0;">
                         <p style="margin: 0; font-weight: bold;">Reason for rejection:</p>
                         <p style="margin: 5px 0 0 0;">${reason ? reason : "Documentation criteria not met."}</p>
                    </div>
                    
                    <p>If you believe this decision was made in error or if you have updated your documents, please contact our support team.</p>
                `;
        break;

      case "Suspended":
        subject = "⚠️ Urgent: Your QuickMate Provider Account Suspended";
        colorCode = "#ffc107";
        bodyContent = `
                    <h2 style="color: #856404; border-bottom: 2px solid ${colorCode}; padding-bottom: 10px;">Account Suspended</h2>
                    <p>Dear ${providerName},</p>
                    <p>This email is to inform you that your provider account has been <strong>temporarily suspended</strong>.</p>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid ${colorCode}; padding: 15px; margin: 20px 0;">
                         <p style="margin: 0; font-weight: bold; color: #856404;">Reason for suspension:</p>
                         <p style="margin: 5px 0 0 0; color: #856404;">${reason ? reason : "Violation of platform policies."}</p>
                    </div>
                    
                    <p>During this suspension, your profile will not be visible to clients, and you cannot accept new bookings.</p>
                    <p>Please contact support immediately to resolve this issue.</p>
                `;
        break;

      default:
        subject = "QuickMate Provider Account Status Update";
        bodyContent = `
                    <h2>Status Update</h2>
                    <p>Dear ${providerName},</p>
                    <p>Your provider account status has been updated to: <strong>${status}</strong>.</p>
                    ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ""}
                `;
        break;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                  ${bodyContent}
                  <p style="margin-top: 30px; font-size: 14px; color: #777;">Regards,<br/>QuickMate Team</p>
                </div>
            `,
    };

    logger.info(`Sending provider status email (${status}) to ${toEmail}`);
    await transporter.sendMail(mailOptions);
    logger.info(`Provider status email sent successfully`);
  } catch (error) {
    logger.error(`Error sending provider status email to ${toEmail}:`, error);
  }
};

export const sendSubscriptionExpiredEmail = async (
  toEmail: string,
  providerName: string,
  expiryDate: string,
): Promise<void> => {
  try {
    const subject = "⚠️ Alert: Your QuickMate Subscription Has Expired";
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">Subscription Expired</h2>
          <p>Dear ${providerName},</p>
          <p>This is to inform you that your subscription plan on QuickMate expired on <strong>${expiryDate}</strong>.</p>
          
          <div style="background-color: #fff3f3; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0;">
             <p style="margin: 0; font-weight: bold;">Status Update:</p>
             <p style="margin: 5px 0 0 0;">Your account has been downgraded to the free tier limit. Any services exceeding this limit have been deactivated.</p>
          </div>

          <p>To restore full access and reactivate your services, please renew your subscription via your dashboard.</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #777;">Regards,<br/>QuickMate Team</p>
        </div>
      `,
    };

    logger.info(`Sending subscription expired email to ${toEmail}`);
    await transporter.sendMail(mailOptions);
    logger.info(`Subscription expired email sent successfully`);
  } catch (error) {
    logger.error(`Error sending subscription expired email to ${toEmail}:`, error);
  }
};
