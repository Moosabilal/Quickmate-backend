import { injectable } from 'inversify';
import { Category, ICategory } from '../../models/Categories';
import { ICategoryInput } from '../../dto/category.dto';
import { Types } from 'mongoose';
import { ICategoryRepository } from '../interface/ICategoryRepository';
import { BaseRepository } from './base/BaseRepository';

@injectable()
export class CategoryRepository extends BaseRepository<ICategory> implements ICategoryRepository {

    constructor() {
        super(Category)
    }

    // async create(categoryData: ICategoryInput): Promise<ICategory> {
    //     const dataToSave = { ...categoryData };
    //     if (dataToSave.parentId && typeof dataToSave.parentId === 'string') {
    //         dataToSave.parentId = new Types.ObjectId(dataToSave.parentId);
    //     } else if (dataToSave.parentId === null) {
    //         dataToSave.parentId = null;
    //     } else {
    //         delete dataToSave.parentId;
    //     }

    //     const category = new Category(dataToSave);
    //     await category.save();
    //     return category;
    // }

    // async findById(id: string | Types.ObjectId): Promise<ICategory | null> {
    //     return await Category.findById({ _id: id }).exec();
    // }


    async findByName(name: string): Promise<ICategory | null> {
        return await Category.findOne({ name, parentId: null }).exec();
    }

    async findSubCatByName(name: string): Promise<ICategory | null> {
        return await Category.findOne({ name, parentId: { $ne: null } }).exec();
    }


    async findByNameAndParent(name: string, parentId: string | Types.ObjectId): Promise<ICategory | null> {
        const parentObjectId = new Types.ObjectId(parentId);
        return await Category.findOne({ name, parentId: parentObjectId }).exec();
    }

    async getAllMainCategories(): Promise<ICategory[]> {
        return await Category.find()
    }

    async findAll(filter: any = {}): Promise<ICategory[]> {
    const queryFilter = { ...filter };

    // Handle parentId conversion
    if (queryFilter.parentId && typeof queryFilter.parentId === 'string') {
        queryFilter.parentId = new Types.ObjectId(queryFilter.parentId);
    }

    // Extract special options like "take"
    const { take, skip, ...conditions } = queryFilter;

    let query = Category.find(conditions);

    if (skip) query = query.skip(Number(skip));
    if (take) query = query.limit(Number(take));

    return await query.exec();
}


    async findAllSubcategories(p0: {}): Promise<ICategory[]> {
        return await Category.find({ parentId: { $ne: null } }).exec();
    }

    async getAllCategories(): Promise<ICategory[]> {
        return await Category.find({})
    }


    async update(id: string | Types.ObjectId, updateData: Partial<ICategoryInput>): Promise<ICategory | null> {
        const dataToUpdate = { ...updateData };
        if (dataToUpdate.parentId !== undefined) {
            if (dataToUpdate.parentId === null) {
                dataToUpdate.parentId = null;
            } else if (typeof dataToUpdate.parentId === 'string' && Types.ObjectId.isValid(dataToUpdate.parentId)) {
                dataToUpdate.parentId = dataToUpdate.parentId;
            } else {
                delete dataToUpdate.parentId;
            }
        }
        return await Category.findByIdAndUpdate(id, dataToUpdate, { new: true }).exec();
    }


    async delete(id: string | Types.ObjectId): Promise<ICategory | null> {
        return await Category.findByIdAndDelete(id).exec();
    }


    async countSubcategories(parentId: string | Types.ObjectId): Promise<number> {
        return await Category.countDocuments({ parentId: new Types.ObjectId(parentId) }).exec();
    }

    async updateSubcategoriesStatus(parentId: string | Types.ObjectId, status: boolean): Promise<void> {
        const parentObjectId = typeof parentId === 'string' ? new Types.ObjectId(parentId) : parentId;
        await Category.updateMany({ parentId: parentObjectId }, { status }).exec();
    }

    async findAllSubCategories(filter: any, skip: number, limit: number): Promise<ICategory[]> {
        return await Category.find(filter).skip(skip).limit(limit).exec()
    }

    async countOfSubCategories(filter: any): Promise<number> {
        return await Category.countDocuments(filter).exec()
    }

    async findByIds(ids: string[]): Promise<ICategory[]> {
        return Category.find({ _id: { $in: ids } });
    }


}