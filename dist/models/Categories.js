"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const CategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: false,
    },
    description: {
        type: String,
        required: false,
        trim: true,
    },
    parentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        required: false,
    },
    status: {
        type: Boolean,
        default: true,
    },
    iconUrl: {
        type: String,
        required: false,
    },
}, {
    timestamps: true
});
exports.Category = (0, mongoose_1.model)('Category', CategorySchema);
