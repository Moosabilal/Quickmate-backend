import express from 'express';
import upload from '../utils/multer';
import { container } from '../di/container';
import TYPES from '../di/type';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { ProviderController } from '../controllers/providerController';

const router = express.Router();
const providerController = container.get<ProviderController>(TYPES.ProviderController)

const isProvider = [authenticateToken, authorizeRoles(['Provider'])];



router.post('/register',authenticateToken, upload.fields([{ name: 'aadhaarIdProof', maxCount: 1 },{ name: 'profilePhoto', maxCount: 1 },
    { name: 'businessCertifications', maxCount: 1 },]), providerController.register)
router.get('/getFeaturedProviders', providerController.featuredProviders)

// admin
router.get('/getAllProviders', providerController.getAllProvidersList)
router.get('/getProviderList', providerController.getProvidersforAdmin)


export default router