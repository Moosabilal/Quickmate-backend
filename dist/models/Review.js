import mongoose, { Schema } from "mongoose";
import { ReviewStatus } from "../enums/review.enum";
const ReviewSchema = new Schema({
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    reviewText: {
        type: String,
        required: false,
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(ReviewStatus),
        default: ReviewStatus.PENDING,
    },
}, { timestamps: true });
export default mongoose.model("Review", ReviewSchema);
