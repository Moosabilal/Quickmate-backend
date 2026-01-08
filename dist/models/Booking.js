import mongoose, { Schema } from "mongoose";
import { PaymentStatus } from "../enums/userRoles";
import { BookingStatus } from "../enums/booking.enum";
const BookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: false,
    },
    providerId: {
        type: Schema.Types.ObjectId,
        ref: "Provider",
        required: false,
    },
    paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
    },
    addressId: {
        type: Schema.Types.ObjectId,
        ref: "Address",
    },
    customerName: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: false,
    },
    instructions: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.UNPAID,
    },
    amount: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(BookingStatus),
        default: BookingStatus.PENDING,
    },
    scheduledDate: {
        type: String,
        required: false,
    },
    scheduledTime: {
        type: String,
        required: false,
    },
    duration: {
        type: Number,
        required: false,
    },
    bookingDate: {
        type: Date,
        required: false,
    },
    reviewed: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: String,
        enum: ["Bot", "Manual"],
        default: "Manual",
    },
}, { timestamps: true });
export default mongoose.model("Booking", BookingSchema);
