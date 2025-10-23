import { FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';

export interface IBaseRepository<T> {
    create(data: Partial<T>): Promise<T>;
    findById(id: string): Promise<T | null>;
    findOne(filter: FilterQuery<T>): Promise<T | null>;
    findAll(filter?: FilterQuery<T>, sort?: Record<string, 1 | -1>): Promise<T[]>;
    update(id: string, updateData: UpdateQuery<T>, options?: QueryOptions): Promise<T | null>; delete(id: string): Promise<T | null>;
    count(filter?: FilterQuery<T>): Promise<number>;
}
