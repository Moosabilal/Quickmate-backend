import express from 'express';
import upload from '../utils/multer';
import { container } from '../di/container';
import TYPES from '../di/type';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { ProviderController } from '../controllers/providerController';

const router = express.Router();
const providerController = container.get<ProviderController>(TYPES.ProviderController)

const isProvider = [authenticateToken, authorizeRoles(['ServiceProvider'])];
const isProvOrUser = [authenticateToken, authorizeRoles(['ServiceProvider', "Customer"])];
const isAdmin = [authenticateToken, authorizeRoles(['Admin'])];



router.post('/register',authenticateToken, upload.fields([{ name: 'aadhaarIdProof', maxCount: 1 },{ name: 'profilePhoto', maxCount: 1 }]), providerController.register)
router.post('/verify-registration-otp', providerController.verifyOtp);
router.post('/resend-registration-otp', providerController.resendOtp);
router.post('/updateProvider', isProvOrUser, authenticateToken, upload.fields([{ name: 'aadhaarIdProof', maxCount: 1 },{ name: 'profilePhoto', maxCount: 1 }]), providerController.updateProvider)
router.get('/getProvider', providerController.getProvider)
router.get('/getFeaturedProviders', providerController.featuredProviders)
router.get('/getFilteredServiceProvider',isProvOrUser, providerController.getServiceProvider)
router.get('/getServicesForAddPage', providerController.getServicesForAddPage)
router.get('/getProviderForChatPage', authenticateToken, providerController.getProviderForChatPage)
router.get('/getProviderDashboard', isProvider, providerController.getProviderDashboard)
router.get('/earnings', isProvider, providerController.getEarningsAnalytics);


// router.get('/google/auth',isProvOrUser, providerController.initiateGoogleAuth);
// router.get('/auth/google/callback', providerController.googleCallback)
router.get('/calendar/availability', providerController.getProviderAvailability)


// admin
router.get('/getAllProviders', providerController.getAllProvidersList)
router.get('/getProviderList', providerController.getProvidersforAdmin)
router.patch('/updateProviderStatus/:id',isAdmin, providerController.updateProviderStatus)

export default router