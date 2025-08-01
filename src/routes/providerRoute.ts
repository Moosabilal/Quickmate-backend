import express from 'express';
import upload from '../utils/multer';
import { container } from '../di/container';
import TYPES from '../di/type';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { ProviderController } from '../controllers/providerController';

const router = express.Router();
const providerController = container.get<ProviderController>(TYPES.ProviderController)

const isProvider = [authenticateToken, authorizeRoles(['Provider'])];



router.post('/register',authenticateToken, upload.fields([{ name: 'aadhaarIdProof', maxCount: 1 },{ name: 'profilePhoto', maxCount: 1 }]), providerController.register)
router.post('/verify-registration-otp', providerController.verifyOtp);
router.post('/resend-registration-otp', providerController.resendOtp);
router.post('/updateProvider', authenticateToken, upload.fields([{ name: 'aadhaarIdProof', maxCount: 1 },{ name: 'profilePhoto', maxCount: 1 }]), providerController.updateProvider)
router.get('/getProvider', providerController.getProvider)
router.get('/getFeaturedProviders', providerController.featuredProviders)
router.get('/getFilteredServiceProvider', providerController.getServiceProvider)


// admin
router.get('/getAllProviders', providerController.getAllProvidersList)
router.get('/getProviderList', providerController.getProvidersforAdmin)
router.patch('/updateProviderStatus/:id', providerController.updateProviderStatus)


export default router