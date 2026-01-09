import { type ILoginResponseDTO } from "../../interface/auth.js";
import { type ICategoryDto } from "../../interface/category.js";
import { type IProviderDto } from "../../interface/provider.js";
import { type IServiceDto } from "../../interface/service.js";
import { type Roles } from "../../enums/userRoles.js";
import { type IUser } from "../../models/User.js";
import { type ICategory } from "../../models/Categories.js";
import { type IService } from "../../models/Service.js";
import { type IProvider } from "../../models/Providers.js";
import { getSignedUrl } from "../cloudinaryUpload.js";

export function toLoginResponseDTO(user: IUser): ILoginResponseDTO {
  return {
    id: user._id.toString(),
    name: user.name as string,
    email: user.email as string,
    role: user.role as Roles,
    isVerified: Boolean(user.isVerified),
    profilePicture: typeof user.profilePicture === "string" ? getSignedUrl(user.profilePicture) : undefined,
  };
}

export const mapProviderToDto = (provider: IProvider): IProviderDto => {
  const p = provider.toObject ? provider.toObject() : provider;

  return {
    ...p,
    profilePicture: p.profilePhoto ? getSignedUrl(p.profilePhoto) : null,
  };
};

export const mapServiceToDto = (service: IService): IServiceDto => {
  const s = service.toObject ? service.toObject() : service;
  return {
    ...s,
    businessCertification: s.businessCertification ? getSignedUrl(s.businessCertification) : null,
  };
};

export const mapCategoryToDto = (category: ICategory): ICategoryDto => {
  const c = category.toObject ? category.toObject() : category;
  return {
    ...c,
    iconUrl: c.iconUrl ? getSignedUrl(c.iconUrl) : null,
  };
};
