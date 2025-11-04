import { ICategoryFormCombinedData, ICategoryResponse, ICommissionRuleResponse, IserviceResponse } from "../../interface/category";
import { CommissionTypes } from "../../enums/CommissionType.enum";
import { ICategory } from "../../models/Categories";
import { ICommissionRule } from "../../models/Commission";

export function toHomePageDTO(category: ICategory): IserviceResponse {
    return {
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        iconUrl: category.iconUrl,
        parentId: category.parentId.toString(),

    }
}

export const toCategoryResponseDTO = (category: ICategory): ICategoryResponse => {
    const categoryObject = category.toJSON();

    return {
        ...categoryObject,
        _id: categoryObject._id.toString(),
        parentId: categoryObject.parentId ? categoryObject.parentId.toString() : null,
        createdAt: categoryObject.createdAt.toISOString(),
        updatedAt: categoryObject.updatedAt.toISOString(),
    };
};

export const toCommissionRuleResponseDTO = (rule: ICommissionRule): ICommissionRuleResponse => {
    const ruleObject = rule.toJSON();

    return {
        ...ruleObject,
        _id: ruleObject._id.toString(),
        categoryId: ruleObject.categoryId ? ruleObject.categoryId.toString() : null,
        createdAt: ruleObject.createdAt.toISOString(),
        updatedAt: ruleObject.updatedAt.toISOString(),
    };
};