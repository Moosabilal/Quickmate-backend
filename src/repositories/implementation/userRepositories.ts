import "reflect-metadata";
import { type IUserRepository } from "../interface/IUserRepository";
import { type IUser } from "../../models/User";
import { injectable } from "inversify";
import User from "../../models/User";
import { BaseRepository } from "./base/BaseRepository";
import { type FilterQuery, Types } from "mongoose";
import { type IUserListFilter } from "../../interface/auth";

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email: string, includeOtpFields: boolean = false): Promise<IUser | null> {
    const query = User.findOne({ email });

    if (includeOtpFields) {
      query.select("+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password");
    }
    return await query.exec();
  }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    })
      .select("+passwordResetToken +passwordResetExpires +password")
      .exec();
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return await User.findOne({ googleId });
  }

  async findByIdForRefreshToken(id: string): Promise<IUser | null> {
    return await User.findById(id).select("+refreshToken").exec();
  }

  async findAllUsers(): Promise<IUser[]> {
    return await User.find({})
      .select(
        "-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId",
      )
      .exec();
  }

  public async findUsersWithFilter(filter: IUserListFilter, page: number, limit: number): Promise<IUser[]> {
    const mongooseQuery = this.buildMongooseQuery(filter);
    const skip = (page - 1) * limit;

    return await this.model
      .find(mongooseQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Usually you want newest first
      .exec();
  }

  public async countUsers(filter: IUserListFilter = {}): Promise<number> {
    const mongooseQuery = this.buildMongooseQuery(filter);
    return await this.model.countDocuments(mongooseQuery).exec();
  }

  public async findUsersByIds(userIds: string[]): Promise<IUser[]> {
    const filter = {
      _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    };
    return this.findAll(filter);
  }

  public async getActiveUserCount(): Promise<number> {
    return this.model.countDocuments({ isVerified: true });
  }

  public async findUsersByIdsAndSearch(userIds: string[], search?: string): Promise<IUser[]> {
    const filter: FilterQuery<IUser> = {
      _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    return this.findAll(filter);
  }

  public async findByIdWithPassword(id: string): Promise<IUser | null> {
    return await this.model.findById(id).select("+password").exec();
  }

  private buildMongooseQuery(filter: IUserListFilter): FilterQuery<IUser> {
    const query: FilterQuery<IUser> = {};

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: "i" } },
        { email: { $regex: filter.search, $options: "i" } },
      ];
    }

    if (filter.status && filter.status !== "All") {
      if (filter.status === "Active") {
        query.isVerified = true;
      } else if (filter.status === "Inactive") {
        query.isVerified = false;
      }
    }

    if (filter.role) {
      query.role = filter.role;
    }

    return query;
  }
}
