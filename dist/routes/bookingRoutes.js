"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const type_1 = __importDefault(require("../di/type"));
const container_1 = require("../di/container");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const bookingController = container_1.container.get(type_1.default.BookingController);
const isUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Customer', 'ServiceProvider'])];
const isProvider = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['ServiceProvider'])];
router.post('/createBooking', isUser, bookingController.createBooking);
router.post('/payment', isUser, bookingController.confirmPayment);
router.post('/verifyPayment', isUser, bookingController.verifyPayment);
router.get('/getBookingById/:id', isUser, bookingController.getBookingById);
router.get('/', isUser, bookingController.getAllBookings);
router.get('/getAllPreviousChats/:joiningId', isUser, bookingController.getAllPreviousChats);
router.patch('/updateBookingStatus/:id', isUser, bookingController.updateBookingStatus);
router.patch('/updateBookingDateTime/:id', isUser, bookingController.updateBookingDateTime);
router.get('/findProviderRange', isUser, bookingController.findProviderRange);
//provider
router.get('/getBookingFor_Prov_mngmnt', isProvider, bookingController.getBookingFor_Prov_mngmnt);
router.post('/verify-bookingCompletion-otp', isProvider, bookingController.verifyOtp);
router.post('/resend-bookingCompletion-otp', isProvider, bookingController.resendOtp);
router.get('/admin/bookings', bookingController.getAllBookingsForAdmin);
exports.default = router;
