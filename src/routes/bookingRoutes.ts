import express from "express"
import { BookingController } from "../controllers/bookingController"
import TYPES from "../di/type"
import { container } from "../di/container"
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware"

const router = express.Router()
const bookingController = container.get<BookingController>(TYPES.BookingController)
const isUser = [authenticateToken, authorizeRoles(['Customer','ServiceProvider'])];
const isProvider = [authenticateToken, authorizeRoles(['ServiceProvider'])]


router.post('/createBooking', isUser, bookingController.createBooking)
router.post('/payment', isUser, bookingController.confirmPayment)
router.post('/verifyPayment', isUser, bookingController.verifyPayment)
router.get('/getBookingById/:id', isUser, bookingController.getBookingById)
router.get('/', isUser, bookingController.getAllBookings)
router.get('/getAllPreviousChats/:joiningId', isUser, bookingController.getAllPreviousChats)
router.patch('/updateBookingStatus/:id', isUser, bookingController.updateBookingStatus)
router.patch('/updateBookingDateTime/:id', isUser, bookingController.updateBookingDateTime)

//provider
router.get('/getBookingFor_Prov_mngmnt/:id', isProvider, bookingController.getBookingFor_Prov_mngmnt)
router.post('/verify-bookingCompletion-otp', isProvider, bookingController.verifyOtp);
router.post('/resend-bookingCompletion-otp', isProvider, bookingController.resendOtp);




export default router