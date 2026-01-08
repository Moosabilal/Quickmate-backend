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
let BaseRepository = class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create(data, session) {
        if (session) {
            const [created] = await this.model.create([data], { session });
            return created;
        }
        else {
            const created = new this.model(data);
            return await created.save();
        }
    }
    async findById(id) {
        return await this.model.findById(id);
    }
    async findOne(filter) {
        return await this.model.findOne(filter);
    }
    async findAll(filter = {}, sort = {}) {
        return await this.model.find(filter).sort(sort);
    }
    async update(id, updateData, options = {}) {
        const updateOptions = { new: true, ...options };
        return await this.model.findByIdAndUpdate(id, updateData, updateOptions);
    }
    async delete(id) {
        return await this.model.findByIdAndDelete(id);
    }
    async count(filter = {}) {
        return await this.model.countDocuments(filter);
    }
};
BaseRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [Function])
], BaseRepository);
export { BaseRepository };
