import { ILoginResponseDTO } from "../../interface/auth";
import { Roles } from "../../enums/userRoles";
import { IUser } from "../../models/User";


export function toLoginResponseDTO(user: IUser): ILoginResponseDTO {
  return {
    id: user._id.toString(),
    name: user.name as string,
    email: user.email as string,
    role: user.role as Roles,
    isVerified: Boolean(user.isVerified),
    profilePicture: typeof user.profilePicture === 'string' ? user.profilePicture : undefined,
  };
}