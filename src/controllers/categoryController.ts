import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/implementation/categoryService';
import { ICategoryInput, ICategoryFormCombinedData, ICategoryResponse } from '../dto/category.dto';
import { ICategory } from '../models/Categories';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { validationResult } from 'express-validator';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { inject, injectable } from 'inversify';
import TYPES from '../di/type';
import { ICategoryService } from '../services/interface/ICategoryService';
import { HttpStatusCode } from '../enums/HttpStatusCode';
import { CommissionTypes } from '../enums/CommissionType.enum';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
  file?: Express.Multer.File;
}

type CommissionRuleInputController = {
  commissionType: CommissionTypes;
  commissionValue: number;
  status?: boolean;
};

@injectable()
export class CategoryController {
  private _categoryService: ICategoryService;

  constructor(@inject(TYPES.CategoryService) categoryService: ICategoryService) {
    this._categoryService = categoryService


  }

  createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file after validation error:", fileErr);
        }
      }
      res.status(HttpStatusCode.BAD_REQUEST).json({ errors: errors.array() });
      return;
    }

    try {
      const iconFile = req.file;
      let iconUrl: string | undefined | null;

      if (iconFile) {
        const fullUrl = await uploadToCloudinary(iconFile.path);
        const baseUrl = process.env.CLOUDINARY_BASE_URL;
        iconUrl = fullUrl.replace(baseUrl, '');
      } else if (req.body.iconUrl === '') {
        iconUrl = null;
      }

      const {
        name,
        description,
        status,
        parentId,
        commissionType,
        commissionValue,
        commissionStatus,
      } = req.body;


      const categoryInput: ICategoryInput = {
        name,
        description,
        status: status,
        iconUrl: iconUrl,
        parentId: parentId === '' ? null : parentId ?? null,
      };

      let commissionRuleInputForService: CommissionRuleInputController | undefined = undefined;

      const parsedCommissionValue = commissionValue !== '' ? Number(commissionValue) : undefined;

        commissionRuleInputForService = {
          commissionType: commissionType,
          commissionValue: parsedCommissionValue,
          status: commissionStatus
        }

      const { category, commissionRule } = await this._categoryService.createCategory(
        categoryInput,
        commissionRuleInputForService
      );

      console.log('Created category:', category, 'with commission rule:', commissionRule);

      res.status(HttpStatusCode.CREATED).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} created successfully`,
        category,
        commissionRule,
      });
      return;
    } catch (error) {
      console.error('Error in createCategory controller:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file on createCategory error:", fileErr);
        }
      }
      if (error.message.includes('Category with this name already exists') || error.message.includes('A subcategory with this name already exists under the specified parent')) {
        res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
        return;
      }
      next(error);
    }
  };

  updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file after validation error:", fileErr);
        }
      }
      res.status(HttpStatusCode.BAD_REQUEST).json({ errors: errors.array() });
      return;
    }

    try {
      const { id } = req.params;
      const iconFile = req.file;
      let iconUrl: string | undefined | null;

      if (iconFile) {
        const fullUrl = await uploadToCloudinary(iconFile.path);
        const baseUrl = process.env.CLOUDINARY_BASE_URL;
        iconUrl = fullUrl.replace(baseUrl, '');
      } else if (req.body.iconUrl === '') {
        iconUrl = null;
      } else if (req.body.iconUrl !== undefined) {
        iconUrl = req.body.iconUrl;
      }

      const {
        name,
        description,
        status,
        parentId,
        commissionType,
        commissionValue,
        commissionStatus,
      } = req.body;



      const updateCategoryData: Partial<ICategoryInput> = {
        name,
        description,
        status: status,
        iconUrl: iconUrl,
        parentId: parentId === '' ? null : (parentId || null),
      };

      let commissionRuleInputForService: CommissionRuleInputController | undefined = undefined;


      const parsedCommissionValue = commissionValue !== '' ? Number(commissionValue) : undefined;
      
        commissionRuleInputForService = {
          commissionType: commissionType,
          commissionValue: parsedCommissionValue,
          status: commissionStatus
        }

      


      const { category, commissionRule } = await this._categoryService.updateCategory(
        id,
        updateCategoryData,
        commissionRuleInputForService
      );

      if (!category) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Category update failed: category is null.' });
        return;
      }

      const categoryId = category._id;

      if (!category.parentId && updateCategoryData.status) {
        await this._categoryService.updateManySubcategoriesStatus(categoryId, updateCategoryData.status);
      }

      res.status(HttpStatusCode.OK).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} updated successfully`,
        category,
        commissionRule,
      });
      return;
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file on updateCategory error:", fileErr);
        }
      }
      if (error.message.includes('Category not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
        return;
      }
      if (error.message.includes('Category with this name already exists') || error.message.includes('A subcategory with this name already exists under the specified parent')) {
        res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
        return;
      }
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { category, commissionRule } = await this._categoryService.getCategoryById(id);
      const subCategories = await this._categoryService.getAllSubcategories(id);

      const commonData = {
        _id: category._id.toString(),
        name: category.name,
        description: category.description || '',
        iconUrl: category.iconUrl || null,
        status: category.status ?? false,
        parentId: category.parentId ? category.parentId.toString() : null,
      };


      const mappedCategoryForFrontend: ICategoryFormCombinedData = {
        ...commonData,
        commissionType: CommissionTypes.NONE,
        commissionValue: 0,
        commissionStatus: false,
      };


      if (commissionRule) {
        mappedCategoryForFrontend.commissionType = commissionRule.commissionType;
        mappedCategoryForFrontend.commissionValue = commissionRule.commissionValue;
        mappedCategoryForFrontend.commissionStatus = commissionRule.status ?? false;
      }
      res.status(HttpStatusCode.OK).json({
        ...mappedCategoryForFrontend,
        subCategories
      });

      return;
    } catch (error) {
      if (error.message.includes('Category not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
        return;
      }
      next(error);
    }
  };

  getAllMainCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('it scoming but error')
      const response = await this._categoryService.getAllTopCategories()
      console.log('the top response', response)
    } catch (error) {
      next(error)
    }
  }


  getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let categories: ICategory[] | ICategoryResponse[] | ICategoryFormCombinedData[];
        categories = await this._categoryService.getAllCategoriesWithDetails();

        const mappedCategories = categories.map(cat => {
          const hasCommissionRule = (obj): obj is { commissionRule } =>
            obj && typeof obj === 'object' && 'commissionRule' in obj && obj.commissionRule !== undefined && obj.commissionRule !== null;

          let commissionType = 'none';
          let commissionValue = '';
          let commissionStatus = false;

          if (hasCommissionRule(cat)) {
            commissionType = cat.commissionRule.commissionType;
            commissionValue = cat.commissionRule.commissionValue;
            commissionStatus = cat.commissionRule.status ?? false;
          }


          return {
            _id: cat._id.toString(),
            name: cat.name,
            description: cat.description || '',
            iconUrl: cat.iconUrl || '',
            status: cat.status ?? false,
            parentId: cat.parentId ? cat.parentId.toString() : null,
            subCategoriesCount: (cat).subCategoryCount || 0,
            subCategories: (cat).subCategories || [],
            commissionType,
            commissionValue,
            commissionStatus,
          };
        });
        res.status(HttpStatusCode.OK).json(mappedCategories);
      
      return;
    } catch (error) {
      next(error);
    }
  };


  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedCategory = await this._categoryService.deleteCategory(id);
      res.status(HttpStatusCode.OK).json({
        message: 'Category deleted successfully',
        category: deletedCategory,
      });
      return;
    } catch (error) {
      if (error.message.includes('Category not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
        return;
      }
      if (error.message.includes('Cannot delete category with existing subcategories')) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ message: error.message });
        return;
      }
      next(error);
    }
  };

  getSubCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || ''
      const allSubCategories = await this._categoryService.getSubcategories(page, limit, search)
      res.status(HttpStatusCode.OK).json(allSubCategories)
    } catch (error) {
      next(error)
    }
  }
}