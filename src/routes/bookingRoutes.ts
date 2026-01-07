import express from "express";
import { type BookingController } from "../controllers/bookingController";
import TYPES from "../di/type";
import { container } from "../di/container";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = express.Router();
const bookingController = container.get<BookingController>(TYPES.BookingController);
const isUser = [authenticateToken, authorizeRoles(["Customer", "ServiceProvider"])];
const isProvider = [authenticateToken, authorizeRoles(["ServiceProvider"])];
const isAdmin = [authenticateToken, authorizeRoles(["Admin"])];

router.post("/createBooking", isUser, bookingController.createBooking);
router.post("/payment", isUser, bookingController.confirmPayment);
router.post("/verifyPayment", isUser, bookingController.verifyPayment);
router.get("/getBookingById/:id", isUser, bookingController.getBookingById);
router.get("/", isUser, bookingController.getAllBookings);
router.get("/getAllPreviousChats/:joiningId", isUser, bookingController.getAllPreviousChats);
router.patch("/updateBookingStatus/:id", isUser, bookingController.updateBookingStatus);
router.patch("/updateBookingDateTime/:id", isUser, bookingController.updateBookingDateTime);
router.get("/findProviderRange", isUser, bookingController.findProviderRange);
router.post("/refund", isUser, bookingController.refundPayment);

//provider
router.get("/getBookingFor_Prov_mngmnt", isProvider, bookingController.getBookingFor_Prov_mngmnt);
router.post("/verify-bookingCompletion-otp", isProvider, bookingController.verifyOtp);
router.post("/resend-bookingCompletion-otp", isProvider, bookingController.resendOtp);
router.get("/admin/bookings", bookingController.getAllBookingsForAdmin);

//admin
router.get("/admin/bookings/:id", isAdmin, bookingController.getBookingDetailsForAdmin);

export default router;
