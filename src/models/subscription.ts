import mongoose, { Schema, InferSchemaType, HydratedDocument } from "mongoose";

const subscriptionPlanSchema = new Schema({
    name: {
        type: String,
        required: true
    }, // e.g. "Basic", "Pro", "Premium"
    price: { 
        type: Number, 
        required: true 
    },
    durationInDays: { 
        type: Number, 
        required: true 
    }, // e.g. 30 days, 90 days
    features: [{ 
        type: String, 
        required: true 
    }],
}, { timestamps: true });

type subscriptionPlanSchemaType = InferSchemaType<typeof subscriptionPlanSchema>
export interface ISubscriptionPlan extends HydratedDocument<subscriptionPlanSchemaType> {}

export default mongoose.model<ISubscriptionPlan>("SubscriptionPlan", subscriptionPlanSchema);
