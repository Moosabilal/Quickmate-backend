import { Router } from 'express';
import { body, param, query } from 'express-validator'; 
import { CategoryController } from '../controllers/categoryController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import upload from '../utils/multer';
import TYPES from '../di/type';
import { container } from '../di/container';

const router = Router();
const categoryController = container.get<CategoryController>(TYPES.CategoryController)

const isAdmin = [authenticateToken, authorizeRoles(['Admin'])];



router.post('/', isAdmin, upload.single('categoryIcon'), categoryController.createCategory);
router.put('/:id', isAdmin, upload.single('categoryIcon'), categoryController.updateCategory);

router.get('/:id', isAdmin, categoryController.getCategoryById);

router.get('/', categoryController.getAllCategories); 








export default router;