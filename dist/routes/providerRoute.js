"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("../utils/multer"));
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const providerController = container_1.container.get(type_1.default.ProviderController);
const isProvider = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['ServiceProvider'])];
const isProvOrUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['ServiceProvider', "Customer"])];
const isAdmin = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Admin'])];
router.post('/register', authMiddleware_1.authenticateToken, multer_1.default.fields([{ name: 'aadhaarIdProof', maxCount: 1 }, { name: 'profilePhoto', maxCount: 1 }]), providerController.register);
router.post('/verify-registration-otp', providerController.verifyOtp);
router.post('/resend-registration-otp', providerController.resendOtp);
router.post('/updateProvider', isProvider, authMiddleware_1.authenticateToken, multer_1.default.fields([{ name: 'aadhaarIdProof', maxCount: 1 }, { name: 'profilePhoto', maxCount: 1 }]), providerController.updateProvider);
router.get('/getProvider', providerController.getProvider);
router.get('/details/:providerId', providerController.getPublicProviderDetails);
router.get('/getFeaturedProviders', providerController.featuredProviders);
router.get('/getFilteredServiceProvider', isProvOrUser, providerController.getServiceProvider);
router.get('/getServicesForAddPage', providerController.getServicesForAddPage);
router.get('/getProviderForChatPage', authMiddleware_1.authenticateToken, providerController.getProviderForChatPage);
router.get('/getProviderDashboard', isProvider, providerController.getProviderDashboard);
router.get('/earnings', isProvider, providerController.getEarningsAnalytics);
router.get('/calendar/availability', isProvOrUser, providerController.getProviderAvailability);
router.get('/performance', isProvider, providerController.getPerformance);
//provider
router.get('/availability', isProvider, providerController.getAvailability);
router.put('/availability', isProvider, providerController.updateAvailability);
// admin
router.get('/getAllProviders', providerController.getAllProvidersList);
router.get('/getProviderList', providerController.getProvidersforAdmin);
router.patch('/updateProviderStatus/:id', isAdmin, providerController.updateProviderStatus);
exports.default = router;
