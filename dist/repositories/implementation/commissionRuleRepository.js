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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionRuleRepository = void 0;
const Commission_1 = require("../../models/Commission");
const mongoose_1 = require("mongoose");
const inversify_1 = require("inversify");
const BaseRepository_1 = require("./base/BaseRepository");
let CommissionRuleRepository = class CommissionRuleRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Commission_1.CommissionRule);
    }
    getAllCommissions() {
        return __awaiter(this, void 0, void 0, function* () {
            return Commission_1.CommissionRule.find();
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return Commission_1.CommissionRule.findByIdAndDelete(id).exec();
        });
    }
    updateStatusForCategoryIds(categoryIds, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.updateMany({ categoryId: { $in: categoryIds } }, { $set: { status } });
        });
    }
    createOrUpdate(categoryId, ruleInput) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const existingRule = yield this.findOne({ categoryId: new mongoose_1.Types.ObjectId(categoryId) });
            const ruleData = {
                categoryId: new mongoose_1.Types.ObjectId(categoryId),
                commissionType: ruleInput.commissionType,
                commissionValue: ruleInput.commissionValue,
                status: (_a = ruleInput.status) !== null && _a !== void 0 ? _a : true,
            };
            if (existingRule) {
                return this.update(existingRule._id.toString(), ruleData);
            }
            else {
                return this.create(ruleData);
            }
        });
    }
};
exports.CommissionRuleRepository = CommissionRuleRepository;
exports.CommissionRuleRepository = CommissionRuleRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], CommissionRuleRepository);
