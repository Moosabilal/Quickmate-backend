"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCategoryToDto = exports.mapServiceToDto = exports.mapProviderToDto = void 0;
exports.toLoginResponseDTO = toLoginResponseDTO;
const cloudinaryUpload_1 = require("../cloudinaryUpload");
function toLoginResponseDTO(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: typeof user.profilePicture === 'string' ? (0, cloudinaryUpload_1.getSignedUrl)(user.profilePicture) : undefined,
    };
}
const mapProviderToDto = (provider) => {
    const p = provider.toObject ? provider.toObject() : provider;
    return Object.assign(Object.assign({}, p), { profilePicture: p.profilePhoto ? (0, cloudinaryUpload_1.getSignedUrl)(p.profilePhoto) : null });
};
exports.mapProviderToDto = mapProviderToDto;
const mapServiceToDto = (service) => {
    const s = service.toObject ? service.toObject() : service;
    return Object.assign(Object.assign({}, s), { businessCertification: s.businessCertification ? (0, cloudinaryUpload_1.getSignedUrl)(s.businessCertification) : null });
};
exports.mapServiceToDto = mapServiceToDto;
const mapCategoryToDto = (category) => {
    const c = category.toObject ? category.toObject() : category;
    return Object.assign(Object.assign({}, c), { iconUrl: c.iconUrl ? (0, cloudinaryUpload_1.getSignedUrl)(c.iconUrl) : null });
};
exports.mapCategoryToDto = mapCategoryToDto;
