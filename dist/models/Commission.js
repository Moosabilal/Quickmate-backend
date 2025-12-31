"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionRule = void 0;
const mongoose_1 = require("mongoose");
const CommissionType_enum_1 = require("../enums/CommissionType.enum");
const CommissionRuleSchema = new mongoose_1.Schema({
    categoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
        unique: true,
        sparse: true,
    },
    commissionType: {
        type: String,
        enum: Object.values(CommissionType_enum_1.CommissionTypes),
        default: CommissionType_enum_1.CommissionTypes.NONE,
        required: false,
    },
    commissionValue: {
        type: Number,
        required: false,
        min: 0,
        max: 100,
    },
    status: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
exports.CommissionRule = (0, mongoose_1.model)('CommissionRule', CommissionRuleSchema);
