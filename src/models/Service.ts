import mongoose, { Schema, Types, InferSchemaType, HydratedDocument } from 'mongoose';

const ServiceSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
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
    basePrice: {
      type: Number,
      required: true,
    },
    priceUnit: {
      type: String,
      enum: ['PerHour', 'PerService'],
      required: true,
    },
    providerId: {
      type: Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },
    price: {
      type: Number,
      required: true,
    },
    // longitude: {
    //   type: String,
    //   required: true,
    // },
    // latitude: {
    //   type: String,
    //   required: true,
    // },
    businessCertification: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

type ServiceSchemaType = InferSchemaType<typeof ServiceSchema>;
export type IService = HydratedDocument<ServiceSchemaType>;

export default mongoose.model<IService>('Service', ServiceSchema);
