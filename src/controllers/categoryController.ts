import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/implementation/categoryService';
import { ICategoryInput, ICategoryFormCombinedData, ICategoryResponse } from '../types/category';
import { ICategory } from '../models/Categories';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { validationResult } from 'express-validator';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { inject, injectable } from 'inversify';
import TYPES from '../di/type';
import { ICategoryService } from '../services/interface/ICategoryService';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
  file?: Express.Multer.File;
}

type CommissionRuleInputController = {
  flatFee?: number;
  categoryCommission?: number;
  status?: boolean;
  removeRule?: boolean;
};

@injectable()
export class CategoryController {
  private categoryService: ICategoryService;

  constructor(@inject(TYPES.CategoryService) categoryService: ICategoryService) {
    this.categoryService = categoryService


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
      res.status(400).json({ errors: errors.array() });
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

      if (commissionType === 'none') {
        commissionRuleInputForService = {
          removeRule: true,
          status: commissionStatus,
        };
      } else if (commissionType && parsedCommissionValue !== undefined) {
        if (commissionType === 'percentage') {
          commissionRuleInputForService = {
            categoryCommission: parsedCommissionValue,
            flatFee: undefined,
            status: commissionStatus,
          };
        } else if (commissionType === 'flatFee') {
          commissionRuleInputForService = {
            flatFee: parsedCommissionValue,
            categoryCommission: undefined,
            status: commissionStatus,
          };
        }
      }


      const { category, commissionRule } = await this.categoryService.createCategory(
        categoryInput,
        commissionRuleInputForService
      );

      res.status(201).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} created successfully`,
        category,
        commissionRule,
      });
      return;
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file on createCategory error:", fileErr);
        }
      }
      if (error.message.includes('Category with this name already exists') || error.message.includes('A subcategory with this name already exists under the specified parent')) {
        res.status(409).json({ message: error.message });
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
      res.status(400).json({ errors: errors.array() });
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
      if (commissionType === 'none') {
        commissionRuleInputForService = {
          removeRule: true,
          status: commissionStatus,
        };
      } else if (commissionType && parsedCommissionValue !== undefined) {

        if (commissionType === 'percentage') {
          commissionRuleInputForService = {
            categoryCommission: parsedCommissionValue,
            flatFee: undefined,
            status: commissionStatus,
          };
        } else if (commissionType === 'flatFee') {
          commissionRuleInputForService = {
            flatFee: parsedCommissionValue,
            categoryCommission: undefined,
            status: commissionStatus,
          };
        }

      }


      const { category, commissionRule } = await this.categoryService.updateCategory(
        id,
        updateCategoryData,
        commissionRuleInputForService
      );

      if (!category) {
        res.status(500).json({ message: 'Category update failed: category is null.' });
        return;
      }

      const categoryId = category._id;

      if (!category.parentId && updateCategoryData.status) {
        await this.categoryService.updateManySubcategoriesStatus(categoryId, updateCategoryData.status);
      }

      res.status(200).json({
        message: `${category.parentId ? 'Subcategory' : 'Category'} updated successfully`,
        category,
        commissionRule,
      });
      return;
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (fileErr) {
          console.error("Error deleting temp file on updateCategory error:", fileErr);
        }
      }
      if (error.message.includes('Category not found')) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Category with this name already exists') || error.message.includes('A subcategory with this name already exists under the specified parent')) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { category, commissionRule } = await this.categoryService.getCategoryById(id);
      const subCategories = await this.categoryService.getAllSubcategories(id);

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
        commissionType: 'none',
        commissionValue: '',
        commissionStatus: false,
      };


      if (commissionRule) {
        if (commissionRule.categoryCommission !== undefined && commissionRule.categoryCommission !== null && commissionRule.categoryCommission !== 0) {
          mappedCategoryForFrontend.commissionType = 'percentage';
          mappedCategoryForFrontend.commissionValue = commissionRule.categoryCommission;
        } else if (commissionRule.flatFee !== undefined && commissionRule.flatFee !== null && commissionRule.flatFee !== 0) {
          mappedCategoryForFrontend.commissionType = 'flatFee';
          mappedCategoryForFrontend.commissionValue = commissionRule.flatFee;
        }
        mappedCategoryForFrontend.commissionStatus = commissionRule.status ?? false;
      }
      res.status(200).json({
        ...mappedCategoryForFrontend,
        subCategories
      });

      return;
    } catch (error: any) {
      if (error.message.includes('Category not found')) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  };


  getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { parentId } = req.query;

      let categories: ICategory[] | ICategoryResponse[] | ICategoryFormCombinedData[];

      if (parentId) {
        categories = await this.categoryService.getAllSubcategories(parentId.toString());
        const mappedSubcategories = (categories as ICategoryFormCombinedData[]).map(cat => ({
          _id: cat._id.toString(),
          name: cat.name,
          description: cat.description || '',
          iconUrl: cat.iconUrl || '',
          status: cat.status ?? false,
          parentId: cat.parentId ? cat.parentId.toString() : null,
        }));
        res.status(200).json(mappedSubcategories);

      } else {
        categories = await this.categoryService.getAllTopLevelCategoriesWithDetails();

        const mappedCategories = categories.map(cat => {
          const hasCommissionRule = (obj: any): obj is { commissionRule: any } =>
            obj && typeof obj === 'object' && 'commissionRule' in obj && obj.commissionRule !== undefined && obj.commissionRule !== null;

          let commissionType = 'none';
          let commissionValue = '';
          let commissionStatus = false;

          if (hasCommissionRule(cat)) {
            if (cat.commissionRule.categoryCommission !== 0 && cat.commissionRule.categoryCommission !== null && cat.commissionRule.categoryCommission !== undefined) {
              commissionType = 'percentage';
              commissionValue = cat.commissionRule.categoryCommission;
            } else if (cat.commissionRule.flatFee !== undefined && cat.commissionRule.flatFee !== undefined && cat.commissionRule.flatFee !== null) {
              commissionType = 'flatFee';
              commissionValue = cat.commissionRule.flatFee;
            }
            commissionStatus = cat.commissionRule.status ?? false;
          }


          return {
            _id: cat._id.toString(),
            name: cat.name,
            description: cat.description || '',
            iconUrl: cat.iconUrl || '',
            status: cat.status ?? false,
            parentId: cat.parentId ? cat.parentId.toString() : null,
            subCategoriesCount: (cat as any).subCategoryCount || 0,
            subCategories: (cat as any).subCategories || [],
            commissionType,
            commissionValue,
            commissionStatus,
          };
        });
        res.status(200).json(mappedCategories);
      }
      return;
    } catch (error: any) {
      next(error);
    }
  };


  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedCategory = await this.categoryService.deleteCategory(id);
      res.status(200).json({
        message: 'Category deleted successfully',
        category: deletedCategory,
      });
      return;
    } catch (error: any) {
      if (error.message.includes('Category not found')) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error.message.includes('Cannot delete category with existing subcategories')) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  };
}