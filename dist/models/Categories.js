import { Schema, model } from "mongoose";
const CategorySchema = new Schema({
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
        type: Schema.Types.ObjectId,
        ref: "Category",
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
    timestamps: true,
});
export const Category = model("Category", CategorySchema);
