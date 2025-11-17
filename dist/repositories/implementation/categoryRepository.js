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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const inversify_1 = require("inversify");
const Categories_1 = require("../../models/Categories");
const mongoose_1 = require("mongoose");
const BaseRepository_1 = require("./base/BaseRepository");
let CategoryRepository = class CategoryRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Categories_1.Category);
    }
    findByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Categories_1.Category.findOne({ name, parentId: null }).exec();
        });
    }
    findSubCatByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Categories_1.Category.findOne({ name, parentId: { $ne: null } }).exec();
        });
    }
    findByNameAndParent(name, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentObjectId = new mongoose_1.Types.ObjectId(parentId);
            return yield Categories_1.Category.findOne({ name, parentId: parentObjectId }).exec();
        });
    }
    findAll() {
        return __awaiter(this, arguments, void 0, function* (filter = {}) {
            const queryFilter = Object.assign({}, filter);
            if (queryFilter.parentId && typeof queryFilter.parentId === 'string') {
                queryFilter.parentId = new mongoose_1.Types.ObjectId(queryFilter.parentId);
            }
            const { take, skip } = queryFilter, conditions = __rest(queryFilter, ["take", "skip"]);
            let query = Categories_1.Category.find(conditions);
            if (skip)
                query = query.skip(Number(skip));
            if (take)
                query = query.limit(Number(take));
            return yield query.exec();
        });
    }
    findAllSubcategories(p0) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Categories_1.Category.find({ parentId: { $ne: null } }).exec();
        });
    }
    getAllCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Categories_1.Category.find({});
        });
    }
    update(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataToUpdate = Object.assign({}, updateData);
            if (dataToUpdate.parentId !== undefined) {
                if (dataToUpdate.parentId === null) {
                    dataToUpdate.parentId = null;
                }
                else if (typeof dataToUpdate.parentId === 'string' && mongoose_1.Types.ObjectId.isValid(dataToUpdate.parentId)) {
                    dataToUpdate.parentId = dataToUpdate.parentId;
                }
                else {
                    delete dataToUpdate.parentId;
                }
            }
            return yield Categories_1.Category.findByIdAndUpdate(id, dataToUpdate, { new: true }).exec();
        });
    }
    countSubcategories(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Categories_1.Category.countDocuments({ parentId: new mongoose_1.Types.ObjectId(parentId) }).exec();
        });
    }
    updateSubcategoriesStatus(parentId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentObjectId = typeof parentId === 'string' ? new mongoose_1.Types.ObjectId(parentId) : parentId;
            yield Categories_1.Category.updateMany({ parentId: parentObjectId }, { status }).exec();
        });
    }
    findAllSubCategories(search, skip, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                name: { $regex: search, $options: 'i' },
                parentId: { $ne: null },
                status: true
            };
            return Categories_1.Category.find(filter).skip(skip).limit(limit).exec();
        });
    }
    countOfSubCategories(search) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                name: { $regex: search, $options: 'i' },
                parentId: { $ne: null },
                status: true
            };
            return Categories_1.Category.countDocuments(filter).exec();
        });
    }
    findByIds(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return Categories_1.Category.find({ _id: { $in: ids } });
        });
    }
    findSubcategoryIds(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const subcategories = yield this.model.find({ parentId: new mongoose_1.Types.ObjectId(parentId) }).select('_id');
            return subcategories.map(sub => sub._id);
        });
    }
    updateStatusForIds(ids, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.updateMany({ _id: { $in: ids } }, { $set: { status } });
        });
    }
    findCategoriesWithDetails(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { filter, page, limit } = options;
            const skip = (page - 1) * limit;
            const mainPipeline = [
                { $match: filter },
                {
                    $lookup: {
                        from: "categories",
                        localField: "_id",
                        foreignField: "parentId",
                        as: "subCategories"
                    }
                },
                {
                    $lookup: {
                        from: "commissionrules",
                        localField: "_id",
                        foreignField: "categoryId",
                        as: "commissionRule"
                    }
                },
                {
                    $addFields: {
                        subCategoryCount: { $size: "$subCategories" },
                        commissionRule: { $arrayElemAt: ["$commissionRule", 0] }
                    }
                },
                {
                    $project: {
                        subCategories: 0
                    }
                }
            ];
            const results = yield this.model.aggregate([
                ...mainPipeline,
                {
                    $facet: {
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                        ],
                        metadata: [
                            { $count: 'total' }
                        ]
                    }
                }
            ]);
            const categories = results[0].data;
            const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
            return { categories, total };
        });
    }
    findActiveSubCategories(sort, skip, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({
                parentId: { $ne: null },
                status: true
            })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
        });
    }
    findSubCategoryByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                parentId: { $ne: null }
            });
        });
    }
    findParentCategoryByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                parentId: null
            });
        });
    }
};
exports.CategoryRepository = CategoryRepository;
exports.CategoryRepository = CategoryRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], CategoryRepository);
