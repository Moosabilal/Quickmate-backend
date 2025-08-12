import express from "express"
import { BookingController } from "../controllers/bookingController"
import TYPES from "../di/type"
import { container } from "../di/container"
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware"

const router = express.Router()
const bookingController = container.get<BookingController>(TYPES.BookingController)
const isUser = [authenticateToken, authorizeRoles(['Customer'])];


router.post('/createBooking', isUser, bookingController.createBooking)
router.post('/payment', isUser, bookingController.confirmPayment)
router.post('/verifyPayment', isUser, bookingController.verifyPayment)
router.get('/getBookingById/:id', isUser, bookingController.getBookingById)
router.get('/', isUser, bookingController.getAllBookings)


export default router