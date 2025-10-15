import { ICategoryFormCombinedData, IserviceResponse } from "../../interface/category";
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
