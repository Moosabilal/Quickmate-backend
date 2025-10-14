import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';
import { IBaseRepository } from '../../interface/base/IBaseRepository';
import { injectable } from 'inversify';

@injectable()
export class BaseRepository<T extends Document> implements IBaseRepository<T> {
    protected model: Model<T>;

    constructor(model: Model<T>) {
        this.model = model;
    }

    async create(data: Partial<T>): Promise<T> {
        const created = new this.model(data); 
        return await created.save();
    }

    async findById(id: string): Promise<T | null> {
        return await this.model.findById(id);
    }

    async findOne(filter: FilterQuery<T>): Promise<T | null> {
        return await this.model.findOne(filter);
    }

    async findAll(filter: FilterQuery<T> = {}, sort: Record<string, 1 | -1> = {}): Promise<T[]> {
        return await this.model.find(filter).sort(sort);
    }

    async update(id: string, updateData: UpdateQuery<T>): Promise<T | null> {
        return await this.model.findByIdAndUpdate(id, updateData, { new: true });
    }

    async delete(id: string): Promise<T | null> {
        return await this.model.findByIdAndDelete(id);
    }

    async count(filter: FilterQuery<T> = {}): Promise<number> {
        return await this.model.countDocuments(filter);
    }

}
