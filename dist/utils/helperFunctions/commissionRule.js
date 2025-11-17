"use strict";
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
exports.calculateCommission = calculateCommission;
exports.calculateParentCommission = calculateParentCommission;
const CommissionType_enum_1 = require("../../enums/CommissionType.enum");
function calculateCommission(amount, commissionRule) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!commissionRule || commissionRule.commissionType === CommissionType_enum_1.CommissionTypes.NONE)
            return 0;
        if (commissionRule.commissionType === CommissionType_enum_1.CommissionTypes.PERCENTAGE) {
            return (amount * (commissionRule.commissionValue || 0)) / 100;
        }
        return commissionRule.commissionValue || 0;
    });
}
function calculateParentCommission(amount, subCategory, categoryRepo, commissionRepo) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!subCategory.parentId)
            return 0;
        const parentCategory = yield categoryRepo.findById(subCategory.parentId.toString());
        if (!parentCategory)
            return 0;
        const parentCommission = yield commissionRepo.findOne({ categoryId: parentCategory._id.toString() });
        return calculateCommission(amount, parentCommission);
    });
}
