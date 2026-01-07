var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import { Category } from "../../models/Categories";
import { Types } from "mongoose";
import { BaseRepository } from "./base/BaseRepository";
let CategoryRepository = class CategoryRepository extends BaseRepository {
    constructor() {
        super(Category);
    }
    async findByName(name) {
        return await Category.findOne({ name, parentId: null }).exec();
    }
    async findSubCatByName(name) {
        return await Category.findOne({ name, parentId: { $ne: null } }).exec();
    }
    async findByNameAndParent(name, parentId) {
        const parentObjectId = new Types.ObjectId(parentId);
        return await Category.findOne({ name, parentId: parentObjectId }).exec();
    }
    async findAll(filter = {}) {
        const queryFilter = { ...filter };
        if (queryFilter.parentId && typeof queryFilter.parentId === "string") {
            queryFilter.parentId = new Types.ObjectId(queryFilter.parentId);
        }
        const { take, skip, ...conditions } = queryFilter;
        let query = Category.find(conditions);
        if (skip)
            query = query.skip(Number(skip));
        if (take)
            query = query.limit(Number(take));
        return await query.exec();
    }
    async getAllCategories() {
        return await Category.find({});
    }
    async update(id, updateData) {
        const dataToUpdate = { ...updateData };
        if (dataToUpdate.parentId !== undefined) {
            if (dataToUpdate.parentId !== null && !Types.ObjectId.isValid(dataToUpdate.parentId)) {
                delete dataToUpdate.parentId;
            }
        }
        return await Category.findByIdAndUpdate(id, dataToUpdate, {
            new: true,
        }).exec();
    }
    async countSubcategories(parentId) {
        return await Category.countDocuments({
            parentId: new Types.ObjectId(parentId),
        }).exec();
    }
    async updateSubcategoriesStatus(parentId, status) {
        const parentObjectId = typeof parentId === "string" ? new Types.ObjectId(parentId) : parentId;
        await Category.updateMany({ parentId: parentObjectId }, { status }).exec();
    }
    async findAllSubCategories(search, skip, limit) {
        const filter = {
            name: { $regex: search, $options: "i" },
            parentId: { $ne: null },
            status: true,
        };
        return Category.find(filter).skip(skip).limit(limit).exec();
    }
    async countOfSubCategories(search) {
        const filter = {
            name: { $regex: search, $options: "i" },
            parentId: { $ne: null },
            status: true,
        };
        return Category.countDocuments(filter).exec();
    }
    async findByIds(ids) {
        return Category.find({ _id: { $in: ids } });
    }
    async findSubcategoryIds(parentId) {
        const subcategories = await this.model.find({ parentId: new Types.ObjectId(parentId) }).select("_id");
        return subcategories.map((sub) => sub._id);
    }
    async updateStatusForIds(ids, status) {
        await this.model.updateMany({ _id: { $in: ids } }, { $set: { status } });
    }
    async findCategoriesWithDetails(options) {
        const { filter, page, limit } = options;
        const skip = (page - 1) * limit;
        const mainPipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "parentId",
                    as: "subCategories",
                },
            },
            {
                $lookup: {
                    from: "commissionrules",
                    localField: "_id",
                    foreignField: "categoryId",
                    as: "commissionRule",
                },
            },
            {
                $addFields: {
                    subCategoryCount: { $size: "$subCategories" },
                    commissionRule: { $arrayElemAt: ["$commissionRule", 0] },
                },
            },
            {
                $project: {
                    subCategories: 0,
                },
            },
        ];
        const results = await this.model.aggregate([
            ...mainPipeline,
            {
                $facet: {
                    data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
                    metadata: [{ $count: "total" }],
                },
            },
        ]);
        const categories = results[0].data;
        const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
        return { categories, total };
    }
    async findActiveSubCategories(sort, skip, limit) {
        return this.model
            .find({
            parentId: { $ne: null },
            status: true,
        })
            .sort({ createdAt: sort })
            .skip(skip)
            .limit(limit);
    }
    async findSubCategoryByName(name) {
        return this.model.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") },
            parentId: { $ne: null },
        });
    }
    async findParentCategoryByName(name) {
        return this.model.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") },
            parentId: null,
        });
    }
    async findAllActiveSubCategories() {
        return this.model
            .find({
            parentId: { $ne: null },
            status: true,
        })
            .select("name");
    }
    async findRelatedCategories(parentId, currentId, limit) {
        return this.model
            .find({
            parentId: new Types.ObjectId(parentId),
            _id: { $ne: new Types.ObjectId(currentId) },
            status: true,
        })
            .select("name iconUrl parentId")
            .limit(limit);
    }
};
CategoryRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], CategoryRepository);
export { CategoryRepository };
