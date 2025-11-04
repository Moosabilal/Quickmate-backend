import { z } from 'zod';
import { Roles } from '../../enums/userRoles';

const emailSchema = z.string().email("Invalid email address.");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters long.");

export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long."),
    email: emailSchema,
    password: passwordSchema,
    // role: z.nativeEnum(Roles, {
    //     message: "Invalid role specified."
    // }),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required."),
});

export const verifyOtpSchema = z.object({
    email: emailSchema,
    otp: z.string().length(6, "OTP must be exactly 6 characters."),
});

export const emailOnlySchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "A valid token is required."),
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
});

export const googleLoginSchema = z.object({
    token: z.string().min(1, "Google token is required."),
});

export const contactUsSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: emailSchema,
    message: z.string().min(10, "Message must be at least 10 characters long."),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long.").optional(),
    email: emailSchema.optional(),
});