import 'reflect-metadata'
import { IUserRepository } from '../interface/IUserRepository';
import { IUser } from '../../models/User';
import { injectable } from 'inversify';
import User from '../../models/User';
import { BaseRepository } from './base/BaseRepository';
import { FilterQuery, Types } from 'mongoose';

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {

  constructor() {
    super(User)
  }

  async findByEmail(email: string, includeOtpFields: boolean = false): Promise<IUser | null> {
    let query = User.findOne<IUser>({ email });

    if (includeOtpFields) {
      query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password');
    }
    return await query.exec();
  }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password').exec();
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return await User.findOne({ googleId })
  }

  async findByIdForRefreshToken(id: string): Promise<IUser | null> {
    return await User.findById(id).select('+refreshToken')
  }

  async findAllUsers(): Promise<IUser[]> {
    return await User.find({}).select('-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId'); 
  }

  public async findUsersWithFilter(filter: any, skip: number, limit: number): Promise<IUser[]> {
    return await User.find(filter).skip(skip).limit(limit).exec();
  }

  public async countUsers(filter: FilterQuery<IUser>): Promise<number> {
    return await User.countDocuments(filter).exec();
  }

  public async findUsersByIds(userIds: string[]): Promise<IUser[]> {
    const filter = { _id: { $in: userIds.map(id => new Types.ObjectId(id)) } };
    return this.findAll(filter);
  }

}