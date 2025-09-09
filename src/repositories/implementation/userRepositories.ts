import 'reflect-metadata'
import { IUserRepository } from '../interface/IUserRepository';
import { IUser } from '../../models/User';
import { injectable } from 'inversify';
import User from '../../models/User';
import { BaseRepository } from './base/BaseRepository';

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {

  constructor() {
    super(User)
  }

  // async create(userData: Partial<IUser>): Promise<IUser> {
  //   const user = new User(userData);
  //   return await user.save();
  // }

  async findByEmail(email: string, includeOtpFields: boolean = false): Promise<IUser | null> {
    let query = User.findOne<IUser>({ email });

    if (includeOtpFields) {
      query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password');
    }
    return await query.exec();
  }

  // async update(user: IUser): Promise<IUser> {
  //   return await user.save();
  // }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password').exec();
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return await User.findOne({ googleId })
  }

  // async findById(id: string): Promise<IUser | null> {
  //   return await User.findById(id).select('+refreshToken')
  // }

  async findByIdForRefreshToken(id: string): Promise<IUser | null> {
    return await User.findById(id).select('+refreshToken')
  }

  async findAllUsers(): Promise<IUser[]> {
    return await User.find({}).select('-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId'); 
  }

  public async findUsersWithFilter(filter: any, skip: number, limit: number): Promise<IUser[]> {
    return await User.find(filter).skip(skip).limit(limit).exec();
  }

  public async countUsers(filter: any): Promise<number> {
    return await User.countDocuments(filter).exec();
  }


}