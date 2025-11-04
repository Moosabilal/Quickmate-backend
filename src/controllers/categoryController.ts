import { Request, Response, NextFunction } from 'express';
import { ICategoryInput, ICategoryFormCombinedData, ICategoryResponse } from '../interface/category';
import { ICategory } from '../models/Categories';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import * as fsPromises from 'fs/promises';
import { inject, injectable } from 'inversify';
import TYPES from '../di/type';
import { ICategoryService } from '../services/interface/ICategoryService';
import { HttpStatusCode } from '../enums/HttpStatusCode';
import logger from '../logger/logger';
import { ZodError } from 'zod';
import {
  createCategorySchema,
  updateCategorySchema,
  mongoIdParamSchema,
  getSubcategoriesQuerySchema
} from '../utils/validations/category.validation';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
  file?: Express.Multer.File;
}

@injectable()
export class CategoryController {
  private _categoryService: ICategoryService;

  constructor(@inject(TYPES.CategoryService) categoryService: ICategoryService) {
    this._categoryService = categoryService


  }

  createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = createCategorySchema.parse(req.body);
      const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;

      let iconUrl: string | undefined;
      if (req.file) {
        const fullUrl = await uploadToCloudinary(req.file.path);
        iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, '');
      }

      const categoryInput: ICategoryInput = {
        name,
        description,
        status,
        iconUrl,
        parentId: parentId || null,
      };

      const commissionRuleInput = {
        commissionType,
        commissionValue,
        status: commissionStatus,
      };

      const { category, commissionRule } = await this._categoryService.createCategory(categoryInput, commissionRuleInput);

      res.status(HttpStatusCode.CREATED).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} created successfully`,
        category,
        commissionRule,
      });
    } catch (error) {
      logger.error('Error in createCategory controller:', error);
      if (req.file?.path) {
        await fsPromises.unlink(req.file.path).catch(err => logger.error("Failed to delete temp file on error:", err));
      }

      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          message: "Validation failed",
          errors: error.issues
        });
      }

      if (error.message.includes('already exists')) {
        res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
      }

      next(error);
    }
  };

  updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = mongoIdParamSchema.parse(req.params);
      const validatedBody = updateCategorySchema.parse(req.body);
      const { name, description, status, parentId, commissionType, commissionValue, commissionStatus } = validatedBody;

      let iconUrl: string | undefined | null = req.body.iconUrl;
      if (req.file) {
        const fullUrl = await uploadToCloudinary(req.file.path);
        iconUrl = fullUrl.replace(process.env.CLOUDINARY_BASE_URL, '');
      } else if (req.body.iconUrl === '') {
        iconUrl = null; 
      }

      const updateCategoryData: Partial<ICategoryInput> = {
        name,
        description,
        status,
        iconUrl,
        parentId: parentId === '' ? null : parentId,
      };

      const commissionRuleInput = {
        commissionType,
        commissionValue,
        status: commissionStatus,
      };

      const { category, commissionRule } = await this._categoryService.updateCategory(id, updateCategoryData, commissionRuleInput);

      res.status(HttpStatusCode.OK).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} updated successfully`,
        category,
        commissionRule,
      });

    } catch (error) {
      if (req.file?.path) {
        await fsPromises.unlink(req.file.path).catch(err => logger.error("Failed to delete temp file on error:", err));
      }

      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      if (error.message.includes('not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
      }
      if (error.message.includes('already exists')) {
        res.status(HttpStatusCode.CONFLICT).json({ message: error.message });
      }

      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = mongoIdParamSchema.parse(req.params);

      const responseData = await this._categoryService.getCategoryById(id);

      res.status(HttpStatusCode.OK).json(responseData);

    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      if (error.message.includes('Category not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
      }
      next(error);
    }
};

public getCategoryForEdit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = mongoIdParamSchema.parse(req.params);
      const categoryData = await this._categoryService.getCategoryForEdit(id);
      res.status(HttpStatusCode.OK).json(categoryData);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
      }
      if (error.message.includes('Category not found')) {
        res.status(HttpStatusCode.NOT_FOUND).json({ message: error.message });
      }
      next(error);
    }
};


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


  getSubCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, search = '' } = getSubcategoriesQuerySchema.parse(req.query);
            const allSubCategories = await this._categoryService.getSubcategories(page, limit, search);
            res.status(HttpStatusCode.OK).json(allSubCategories);
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            }
            next(error);
        }
    }
}