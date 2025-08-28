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
router.get('/getAllPreviousChats/:bookingId', isUser, bookingController.getAllPreviousChats)
router.patch('/cancelBooking/:id', isUser, bookingController.cancelBooking)

//provider
router.get('/getBookingFor_Prov_mngmnt/:id', isProvider, bookingController.getBookingFor_Prov_mngmnt)



export default router