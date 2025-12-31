"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = void 0;
const zod_1 = require("zod");
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required."),
    newPassword: zod_1.z.string().min(6, "New password must be at least 6 characters."),
});
