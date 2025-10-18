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
const isAdminOrUser = [authenticateToken, authorizeRoles(['Admin', 'Customer'])];
const isAdminOrUserOrProvider = [authenticateToken, authorizeRoles(['Admin', 'Customer', 'ServiceProvider'])];


router.get('/', categoryController.getAllCategories); 
router.post('/', isAdmin, upload.single('categoryIcon'), categoryController.createCategory);
router.get('/edit/:id', isAdminOrUserOrProvider, categoryController.getCategoryForEdit);
router.get('/getAllSubCategories', categoryController.getSubCategories)

router.put('/:id', isAdmin, upload.single('categoryIcon'), categoryController.updateCategory);

router.get('/:id', categoryController.getCategoryById);



export default router;