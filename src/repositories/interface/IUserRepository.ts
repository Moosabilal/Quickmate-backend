import { IUser } from '../../models/User';
export interface IUserRepository {
  findByEmail(email: string, includeOtpFields?: boolean): Promise<IUser | null>;
  create(userData: Partial<IUser>): Promise<IUser>; 
  update(user: IUser): Promise<IUser>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>; 
  findAllUsers(): Promise<IUser[]>; 

  findByPasswordResetToken(token: string): Promise<IUser | null>;
  findUsersWithFilter(filter: any, skip: number, limit: number): Promise<IUser[]>
  countUsers(filter: any): Promise<number>

}