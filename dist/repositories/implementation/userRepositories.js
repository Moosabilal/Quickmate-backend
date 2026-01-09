var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import "reflect-metadata";
import {} from "../interface/IUserRepository.js";
import {} from "../../models/User.js";
import { injectable } from "inversify";
import User from "../../models/User.js";
import { BaseRepository } from "./base/BaseRepository.js";
import { Types } from "mongoose";
import {} from "../../interface/auth.js";
let UserRepository = class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }
    async findByEmail(email, includeOtpFields = false) {
        const query = User.findOne({ email });
        if (includeOtpFields) {
            query.select("+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password");
        }
        return await query.exec();
    }
    async findByPasswordResetToken(token) {
        return User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        })
            .select("+passwordResetToken +passwordResetExpires +password")
            .exec();
    }
    async findByGoogleId(googleId) {
        return await User.findOne({ googleId });
    }
    async findByIdForRefreshToken(id) {
        return await User.findById(id).select("+refreshToken").exec();
    }
    async findAllUsers() {
        return await User.find({})
            .select("-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId")
            .exec();
    }
    async findUsersWithFilter(filter, page, limit) {
        const mongooseQuery = this.buildMongooseQuery(filter);
        const skip = (page - 1) * limit;
        return await this.model
            .find(mongooseQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }) // Usually you want newest first
            .exec();
    }
    async countUsers(filter = {}) {
        const mongooseQuery = this.buildMongooseQuery(filter);
        return await this.model.countDocuments(mongooseQuery).exec();
    }
    async findUsersByIds(userIds) {
        const filter = {
            _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        };
        return this.findAll(filter);
    }
    async getActiveUserCount() {
        return this.model.countDocuments({ isVerified: true });
    }
    async findUsersByIdsAndSearch(userIds, search) {
        const filter = {
            _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        };
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        return this.findAll(filter);
    }
    async findByIdWithPassword(id) {
        return await this.model.findById(id).select("+password").exec();
    }
    buildMongooseQuery(filter) {
        const query = {};
        if (filter.search) {
            query.$or = [
                { name: { $regex: filter.search, $options: "i" } },
                { email: { $regex: filter.search, $options: "i" } },
            ];
        }
        if (filter.status && filter.status !== "All") {
            if (filter.status === "Active") {
                query.isVerified = true;
            }
            else if (filter.status === "Inactive") {
                query.isVerified = false;
            }
        }
        if (filter.role) {
            query.role = filter.role;
        }
        return query;
    }
};
UserRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], UserRepository);
export { UserRepository };
