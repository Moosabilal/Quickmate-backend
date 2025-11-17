"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
require("reflect-metadata");
const inversify_1 = require("inversify");
const User_1 = __importDefault(require("../../models/User"));
const BaseRepository_1 = require("./base/BaseRepository");
const mongoose_1 = require("mongoose");
let UserRepository = class UserRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(User_1.default);
    }
    findByEmail(email_1) {
        return __awaiter(this, arguments, void 0, function* (email, includeOtpFields = false) {
            let query = User_1.default.findOne({ email });
            if (includeOtpFields) {
                query = query.select('+registrationOtp +registrationOtpExpires +registrationOtpAttempts +password');
            }
            return yield query.exec();
        });
    }
    findByPasswordResetToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            return User_1.default.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: new Date() }
            }).select('+passwordResetToken +passwordResetExpires +password').exec();
        });
    }
    findByGoogleId(googleId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.default.findOne({ googleId });
        });
    }
    findByIdForRefreshToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.default.findById(id).select('+refreshToken');
        });
    }
    findAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.default.find({}).select('-password -registrationOtp -registrationOtpExpires -registrationOtpAttempts -passwordResetToken -passwordResetExpires -googleId');
        });
    }
    findUsersWithFilter(filter, skip, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.default.find(filter).skip(skip).limit(limit).exec();
        });
    }
    countUsers(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield User_1.default.countDocuments(filter).exec();
        });
    }
    findUsersByIds(userIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { _id: { $in: userIds.map(id => new mongoose_1.Types.ObjectId(id)) } };
            return this.findAll(filter);
        });
    }
    getActiveUserCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.countDocuments({ isVerified: true });
        });
    }
    findUsersByIdsAndSearch(userIds, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                _id: { $in: userIds.map(id => new mongoose_1.Types.ObjectId(id)) }
            };
            if (search) {
                filter.name = { $regex: search, $options: 'i' };
            }
            return this.findAll(filter);
        });
    }
    findByIdWithPassword(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.model.findById(id).select('+password').exec();
        });
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], UserRepository);
