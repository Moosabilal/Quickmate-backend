import { FilterQuery } from 'mongoose';
import { IUser } from '../../models/User';
import { IBaseRepository } from './base/IBaseRepository';
export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string, includeOtpFields?: boolean): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
  findByIdForRefreshToken(id: string): Promise<IUser | null>; 
  findAllUsers(): Promise<IUser[]>; 

  findByPasswordResetToken(token: string): Promise<IUser | null>;
  findUsersWithFilter(filter: any, skip: number, limit: number): Promise<IUser[]>
  countUsers(filter?: FilterQuery<IUser>): Promise<number>

}