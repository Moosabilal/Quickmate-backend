"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.contactUsSchema = exports.googleLoginSchema = exports.resetPasswordSchema = exports.emailOnlySchema = exports.verifyOtpSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z.string().email("Invalid email address.");
const passwordSchema = zod_1.z.string().min(6, "Password must be at least 6 characters long.");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters long."),
    email: emailSchema,
    password: passwordSchema,
});
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(1, "Password is required."),
});
exports.verifyOtpSchema = zod_1.z.object({
    email: emailSchema,
    otp: zod_1.z.string().length(6, "OTP must be exactly 6 characters."),
});
exports.emailOnlySchema = zod_1.z.object({
    email: emailSchema,
    currentPassword: zod_1.z.string().min(1, "Current password is required.").optional(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "A valid token is required."),
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
});
exports.googleLoginSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Google token is required."),
});
exports.contactUsSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required."),
    email: emailSchema,
    message: zod_1.z.string().min(10, "Message must be at least 10 characters long."),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters long.").optional(),
    email: emailSchema.optional(),
});
