import { injectable } from 'inversify';
import { Category, ICategory } from '../../models/Categories'; 
import { ICategoryInput } from '../../types/category'; 
import { Types } from 'mongoose';
import { ICategoryRepository } from '../interface/ICategoryRepository';

@injectable()
export class CategoryRepository implements ICategoryRepository {

    async create(categoryData: ICategoryInput): Promise<ICategory> {
        const dataToSave = { ...categoryData };
        if (dataToSave.parentId && typeof dataToSave.parentId === 'string') {
            dataToSave.parentId = new Types.ObjectId(dataToSave.parentId);
        } else if (dataToSave.parentId === null) {
             dataToSave.parentId = null; 
        } else {
             delete dataToSave.parentId; 
        }

        const category = new Category(dataToSave);
        await category.save();
        return category;
    }

    async findById(id: string | Types.ObjectId): Promise<ICategory | null> {
        return Category.findById({_id:id}).exec();
    }

 
    async findByName(name: string): Promise<ICategory | null> {
        return Category.findOne({ name, parentId: null}).exec();
    }


    async findByNameAndParent(name: string, parentId: string | Types.ObjectId): Promise<ICategory | null> {
        const parentObjectId = new Types.ObjectId(parentId);
        return Category.findOne({ name, parentId: parentObjectId}).exec();
    }

    async findAll(filter: any = {}): Promise<ICategory[]> {
        const queryFilter = { ...filter };
        if (queryFilter.parentId && typeof queryFilter.parentId === 'string') {
            queryFilter.parentId = new Types.ObjectId(queryFilter.parentId);
             
        }
        return Category.find(queryFilter).exec();
    }

    async findAllSubcategories(p0: {}): Promise<ICategory[]> {
        return Category.find({ parentId: { $ne: null} }).exec();
    }

    async getAllCategories(): Promise<ICategory[]> {
        return Category.find({})
    }


    async update(id: string | Types.ObjectId, updateData: Partial<ICategoryInput>): Promise<ICategory | null> {
        const dataToUpdate = { ...updateData };
        if (dataToUpdate.parentId !== undefined) {
            if (dataToUpdate.parentId === null) {
                dataToUpdate.parentId = null; 
            } else if (typeof dataToUpdate.parentId === 'string' && Types.ObjectId.isValid(dataToUpdate.parentId)) {
                dataToUpdate.parentId = new Types.ObjectId(dataToUpdate.parentId);
            } else {
                delete dataToUpdate.parentId;
            }
        }
        return Category.findByIdAndUpdate(id, dataToUpdate, { new: true }).exec();
    }


    async delete(id: string | Types.ObjectId): Promise<ICategory | null> {
        return Category.findByIdAndDelete(id).exec();
    }


    async countSubcategories(parentId: string | Types.ObjectId): Promise<number> {
        return Category.countDocuments({ parentId: new Types.ObjectId(parentId) }).exec();
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

}