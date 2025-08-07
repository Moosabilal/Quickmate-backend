import express from "express"
import { BookingController } from "../controllers/bookingController"
import TYPES from "../di/type"
import { container } from "../di/container"

const router = express.Router()
const bookingController = container.get<BookingController>(TYPES.BookingController)

router.post('/createBooking', bookingController.createBooking)
router.post('/payment', bookingController.confirmPayment)
router.post('/verifyPayment', bookingController.verifyPayment)


export default router