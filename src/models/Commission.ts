import { Schema, type HydratedDocument, type InferSchemaType, model } from "mongoose";
import { CommissionTypes } from "../enums/CommissionType.enum.js";

const CommissionRuleSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      unique: true,
      sparse: true,
    },
    commissionType: {
      type: String,
      enum: Object.values(CommissionTypes),
      default: CommissionTypes.NONE,
      required: false,
    },
    commissionValue: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

type CommissionRuleSchemaType = InferSchemaType<typeof CommissionRuleSchema>;
export type ICommissionRule = HydratedDocument<CommissionRuleSchemaType>;

export const CommissionRule = model<ICommissionRule>("CommissionRule", CommissionRuleSchema);
