import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const subscriptionPlanSchema = new Schema(
  {
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
  },
  { timestamps: true },
);

type subscriptionPlanSchemaType = InferSchemaType<typeof subscriptionPlanSchema>;
export type ISubscriptionPlan = HydratedDocument<subscriptionPlanSchemaType>;

export default mongoose.model<ISubscriptionPlan>("SubscriptionPlan", subscriptionPlanSchema);
