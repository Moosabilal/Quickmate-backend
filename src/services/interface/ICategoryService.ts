import { ICategoryFormCombinedData, ICategoryInput, ICategoryResponse, ICommissionRuleInput, ICommissionRuleResponse, IserviceResponse } from '../../interface/category';


export interface ICategoryService {
    createCategory(
        categoryInput: ICategoryInput,
        commissionRuleInput?: ICommissionRuleInput 
    ): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse }>
    updateCategory(
        categoryId: string,
        updateCategoryInput: Partial<ICategoryInput>,
        commissionRuleInput?: ICommissionRuleInput
    ): Promise<{ category: ICategoryResponse | null; commissionRule?: ICommissionRuleResponse | null }>
    updateManySubcategoriesStatus(parentCategoryId: string, status: boolean): Promise<void>
    getCategoryById(categoryId: string): Promise<{ categoryDetails: ICategoryFormCombinedData; subCategories: ICategoryFormCombinedData[] }>;
    getCategoryForEdit(categoryId: string): Promise<ICategoryFormCombinedData>
    getAllCategoriesWithDetails(): Promise<Array<ICategoryResponse>>
    getAllSubcategories(parentId: string): Promise<ICategoryFormCombinedData[]>
    getSubcategories(page: number, limit: number, search: string): Promise<{
        allServices:IserviceResponse[],
        total: number,
        totalPages: number,
        currentPage: number}>;
    
}