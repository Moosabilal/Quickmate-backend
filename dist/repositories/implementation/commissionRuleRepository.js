var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { CommissionRule } from "../../models/Commission";
import { Types } from "mongoose";
import { injectable } from "inversify";
import { BaseRepository } from "./base/BaseRepository";
let CommissionRuleRepository = class CommissionRuleRepository extends BaseRepository {
    constructor() {
        super(CommissionRule);
    }
    async getAllCommissions() {
        return CommissionRule.find();
    }
    async delete(id) {
        return CommissionRule.findByIdAndDelete(id).exec();
    }
    async updateStatusForCategoryIds(categoryIds, status) {
        await this.model.updateMany({ categoryId: { $in: categoryIds } }, { $set: { status } });
    }
    async createOrUpdate(categoryId, ruleInput) {
        const existingRule = await this.findOne({
            categoryId: new Types.ObjectId(categoryId),
        });
        const ruleData = {
            categoryId: new Types.ObjectId(categoryId),
            commissionType: ruleInput.commissionType,
            commissionValue: ruleInput.commissionValue,
            status: ruleInput.status ?? true,
        };
        if (existingRule) {
            return this.update(existingRule._id.toString(), ruleData);
        }
        else {
            return this.create(ruleData);
        }
    }
};
CommissionRuleRepository = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], CommissionRuleRepository);
export { CommissionRuleRepository };
