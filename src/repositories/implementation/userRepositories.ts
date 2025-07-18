import 'reflect-metadata'
import User, { IUserDocument } from '../../models/User';
import { IUserRepository } from '../interface/IUserRepository';
import { IUser } from '../../models/User';
import { injectable } from 'inversify';

@injectable()
export class UserRepository implements IUserRepository {
  async findByEmail(email: string, includeOtpFields: boolean = false): Promise<IUserDocument | null> {
    let query = User.findOne<IUserDocument>({ email });

    if (includeOtpFields) {
      query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password');
    }
    return await query.exec();
  }

  async create(userData: Partial<IUser>): Promise<IUserDocument> {
    const user = new User(userData);
    return await user.save();
  }

  async update(user: IUserDocument): Promise<IUserDocument> {
    return await user.save();
  }

  async findByPasswordResetToken(token: string): Promise<IUserDocument | null> {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password').exec();
  }

  async findByGoogleId(googleId: string): Promise<IUserDocument | null> {
    return await User.findOne({ googleId })
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return await User.findById(id).select('+refreshToken')
  }

  async findAllUsers(): Promise<IUserDocument[]> {
    return await User.find({}).select('-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId'); // Exclude sensitive fields
  }

  public async findUsersWithFilter(filter: any, skip: number, limit: number): Promise<IUserDocument[]> {
    return await User.find(filter).skip(skip).limit(limit).exec();
  }

  public async countUsers(filter: any): Promise<number> {
    return await User.countDocuments(filter).exec();
  }


}