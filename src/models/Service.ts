import mongoose, { Schema, Types, InferSchemaType, HydratedDocument } from 'mongoose';
import { ServicesPriceUnit } from '../enums/Services.enum';

const ServiceSchema = new Schema(
  {
    description: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    categoryId: {
      type: Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subCategoryId: {
      type: Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    priceUnit: {
      type: String,
      enum: ServicesPriceUnit,
      default: ServicesPriceUnit.PERSERVICE,
      required: true,
    },
    duration: {
      type: String,
      
    },
    providerId: {
      type: Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
    },

    experience: {
      type: Number,
      required: false
    },

    businessCertification: {
      type: String,
      required: false,
    },
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

type ServiceSchemaType = InferSchemaType<typeof ServiceSchema>;
export type IService = HydratedDocument<ServiceSchemaType>;

export default mongoose.model<IService>('Service', ServiceSchema);
