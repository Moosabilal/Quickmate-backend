import { type IUser } from "../../models/User";
import { type IBaseRepository } from "./base/IBaseRepository";
import { type IUserListFilter } from "../../interface/auth";
export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string, includeOtpFields?: boolean): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
  findByIdForRefreshToken(id: string): Promise<IUser | null>;
  findAllUsers(): Promise<IUser[]>;

  findByPasswordResetToken(token: string): Promise<IUser | null>;
  findUsersWithFilter(filter: IUserListFilter, skip: number, limit: number): Promise<IUser[]>;
  countUsers(filter?: IUserListFilter): Promise<number>;
  findUsersByIds(userIds: string[]): Promise<IUser[]>;
  getActiveUserCount(): Promise<number>;
  findUsersByIdsAndSearch(userIds: string[], search?: string): Promise<IUser[]>;
  findByIdWithPassword(id: string): Promise<IUser | null>;
}
