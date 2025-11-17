"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLoginResponseDTO = toLoginResponseDTO;
function toLoginResponseDTO(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
    };
}
