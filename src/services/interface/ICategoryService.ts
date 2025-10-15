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
    getCategoryById(categoryId: string): Promise<{ category: ICategoryResponse; commissionRule?: ICommissionRuleResponse | null }>
    getAllTopCategories(): Promise<IserviceResponse[]>
    getAllCategoriesWithDetails(): Promise<Array<ICategoryResponse>>
    getAllSubcategories(parentId: string): Promise<ICategoryFormCombinedData[]>
    deleteCategory(categoryId: string): Promise<ICategoryResponse>;
    getSubcategories(page: number, limit: number, search: string): Promise<{
        allServices:IserviceResponse[],
        total: number,
        totalPages: number,
        currentPage: number}>;
    
}