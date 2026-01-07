import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .email("Please enter a valid email address")
  .max(50, "Email address is too long")
  .refine((val) => val.split("@")[0].length >= 3, {
    message: "Email address is too short",
  });
const passwordSchema = z.string().min(6, "Password must be at least 6 characters long.");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: emailSchema,
  password: passwordSchema,
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
  currentPassword: z.string().min(1, "Current password is required.").optional(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "A valid token is required."),
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
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
