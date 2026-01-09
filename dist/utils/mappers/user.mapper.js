import {} from "../../interface/auth.js";
import {} from "../../interface/category.js";
import {} from "../../interface/provider.js";
import {} from "../../interface/service.js";
import {} from "../../enums/userRoles.js";
import {} from "../../models/User.js";
import {} from "../../models/Categories.js";
import {} from "../../models/Service.js";
import {} from "../../models/Providers.js";
import { getSignedUrl } from "../cloudinaryUpload.js";
export function toLoginResponseDTO(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: typeof user.profilePicture === "string" ? getSignedUrl(user.profilePicture) : undefined,
    };
}
export const mapProviderToDto = (provider) => {
    const p = provider.toObject ? provider.toObject() : provider;
    return {
        ...p,
        profilePicture: p.profilePhoto ? getSignedUrl(p.profilePhoto) : null,
    };
};
export const mapServiceToDto = (service) => {
    const s = service.toObject ? service.toObject() : service;
    return {
        ...s,
        businessCertification: s.businessCertification ? getSignedUrl(s.businessCertification) : null,
    };
};
export const mapCategoryToDto = (category) => {
    const c = category.toObject ? category.toObject() : category;
    return {
        ...c,
        iconUrl: c.iconUrl ? getSignedUrl(c.iconUrl) : null,
    };
};
