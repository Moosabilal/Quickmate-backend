import {} from "../../interface/category.js";
import {} from "../../models/Categories.js";
import {} from "../../models/Commission.js";
import { getSignedUrl } from "../cloudinaryUpload.js";
export function toHomePageDTO(category) {
    return {
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        iconUrl: category.iconUrl,
        parentId: category.parentId.toString(),
    };
}
export const toCategoryResponseDTO = (category) => {
    const categoryObject = category.toJSON();
    return {
        ...categoryObject,
        id: categoryObject._id.toString(),
        parentId: categoryObject.parentId ? categoryObject.parentId.toString() : null,
        iconUrl: categoryObject.iconUrl ? getSignedUrl(categoryObject.iconUrl) : null,
        createdAt: categoryObject.createdAt.toISOString(),
        updatedAt: categoryObject.updatedAt.toISOString(),
    };
};
export const toCommissionRuleResponseDTO = (rule) => {
    const ruleObject = rule.toJSON();
    return {
        ...ruleObject,
        _id: ruleObject._id.toString(),
        categoryId: ruleObject.categoryId ? ruleObject.categoryId.toString() : null,
        createdAt: ruleObject.createdAt.toISOString(),
        updatedAt: ruleObject.updatedAt.toISOString(),
    };
};
