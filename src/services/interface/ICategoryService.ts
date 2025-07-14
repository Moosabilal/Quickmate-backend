import { ICategoryInput, ICategoryResponse, ICommissionRuleResponse } from '../../types/category';
import { ServiceCommissionRuleInput } from '../implementation/categoryService';


export interface ICategoryService {
    createCategory(
        categoryInput: ICategoryInput,
        commissionRuleInput?: ServiceCommissionRuleInput 
    ): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse }>
    updateCategory(
        categoryId: string,
        updateCategoryInput: Partial<ICategoryInput>,
        commissionRuleInput?: ServiceCommissionRuleInput
    ): Promise<{ category: ICategoryResponse | null; commissionRule?: ICommissionRuleResponse | null }>
    updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void>
    getCategoryById(categoryId: string): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse | null }>
    getAllTopLevelCategoriesWithDetails(): Promise<Array<ICategoryResponse>>
    getAllSubcategories(parentId: string): Promise<ICategoryResponse[]>
    deleteCategory(categoryId: string): Promise<ICategoryResponse>
    
}