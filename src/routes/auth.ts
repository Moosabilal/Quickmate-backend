import express from 'express';
import { AuthController } from '../controllers/authController';
import upload from '../utils/multer';
import { container } from '../di/container';
import TYPES from '../di/type';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();
const authController = container.get<AuthController>(TYPES.AuthController)

const isUser = [authenticateToken, authorizeRoles(['Customer','ServiceProvider'])];

router.post('/register',authController.register);
router.post('/login',  authController.login);
router.post('/verify-registration-otp', authController.verifyOtp);
router.post('/resend-registration-otp', authController.resendOtp);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/google-login', authController.googleLogin);

router.post('/refresh-token', authController.refreshToken)


router.get('/getUser', isUser, authController.getUser);
router.put('/update-profile', isUser, upload.single('profilePicture') , authController.updateProfile);
router.post('/logout', authController.logout )

// admin routes
router.put('/update-user/:userId', authController.updateUser);
router.get('/getUserWithAllDetails', authController.getUserWithRelated);


export default router;


