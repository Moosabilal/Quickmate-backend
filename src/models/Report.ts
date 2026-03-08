import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const ReportSchema: Schema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
      default: "PENDING",
    },
    adminFeedback: {
      type: String,
      default: null,
    },
    assignedReworkProviderId: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      default: null,
    },
    reworkBookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  { timestamps: true },
);

ReportSchema.index({ bookingId: 1, userId: 1 }, { unique: true });

export type ReportSchemaType = InferSchemaType<typeof ReportSchema> & {
  _id: Types.ObjectId;
};

export type IReport = HydratedDocument<ReportSchemaType>;

export default mongoose.model<IReport>("Report", ReportSchema);
