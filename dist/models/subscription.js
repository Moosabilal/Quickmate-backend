import mongoose, { Schema } from "mongoose";
const subscriptionPlanSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    price: {
        type: Number,
        required: true,
    },
    durationInDays: {
        type: Number,
        required: true,
    },
    features: [
        {
            type: String,
            required: true,
        },
    ],
}, { timestamps: true });
export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
