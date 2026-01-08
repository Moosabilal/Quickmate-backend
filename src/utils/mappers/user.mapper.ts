import { type ILoginResponseDTO } from "../../interface/auth";
import { type ICategoryDto } from "../../interface/category";
import { type IProviderDto } from "../../interface/provider";
import { type IServiceDto } from "../../interface/service";
import { type Roles } from "../../enums/userRoles";
import { type IUser } from "../../models/User";
import { type ICategory } from "../../models/Categories";
import { type IService } from "../../models/Service";
import { type IProvider } from "../../models/Providers";
import { getSignedUrl } from "../cloudinaryUpload";

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
