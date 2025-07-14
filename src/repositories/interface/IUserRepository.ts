import { IUserDocument } from '../../models/User'; 
import { IUser } from '../../models/User';
export interface IUserRepository {
  findByEmail(email: string, includeOtpFields?: boolean): Promise<IUserDocument | null>;
  create(userData: Partial<IUser>): Promise<IUserDocument>; 
  update(user: IUserDocument): Promise<IUserDocument>;
  findByGoogleId(googleId: string): Promise<IUserDocument | null>;
  findById(id: string): Promise<IUserDocument | null>; 
  findAllUsers(): Promise<IUserDocument[]>; 

  findByPasswordResetToken(token: string): Promise<IUserDocument | null>;

}