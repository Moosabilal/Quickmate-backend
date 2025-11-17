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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const zod_1 = require("zod");
const review_validation_1 = require("../utils/validations/review.validation");
const booking_validation_1 = require("../utils/validations/booking.validation");
let ReviewController = class ReviewController {
    constructor(reviewService) {
        this.addReview = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { bookingId, rating, review } = review_validation_1.addReviewSchema.parse(req.body);
                const response = yield this._reviewService.addReview(bookingId, rating, review);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.getAllReviewsForAdmin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = review_validation_1.getReviewsQuerySchema.parse(req.query), { page = 1, limit = 10 } = _a, queryFilters = __rest(_a, ["page", "limit"]);
                const filters = Object.assign({ page,
                    limit }, queryFilters);
                const { reviews, total } = yield this._reviewService.getPaginatedReviews(filters);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Reviews fetched successfully",
                    data: reviews,
                    pagination: {
                        total,
                        page: filters.page,
                        limit: filters.limit,
                        totalPages: Math.ceil(total / filters.limit)
                    }
                });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                }
                next(error);
            }
        });
        this.updateReviewStatus = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = booking_validation_1.mongoIdParamSchema.parse(req.params);
                const { status } = review_validation_1.updateReviewStatusSchema.parse(req.body);
                const updatedReview = yield this._reviewService.updateReviewStatus(id, status);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "Review status updated successfully",
                    data: updatedReview
                });
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
                    return;
                }
                next(error);
            }
        });
        this._reviewService = reviewService;
    }
};
exports.ReviewController = ReviewController;
exports.ReviewController = ReviewController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ReviewService)),
    __metadata("design:paramtypes", [Object])
], ReviewController);
