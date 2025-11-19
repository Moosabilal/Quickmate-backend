import mongoose, { Schema, Types, InferSchemaType, HydratedDocument } from 'mongoose';
import { PaymentMethod } from '../enums/userRoles';

const PaymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.BANK
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    transactionId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    adminCommission: {  
      type: Number,
      required: false,
    },
    providerAmount: {
      type: Number,
      required: false,
    },
    razorpay_order_id: {
        type: String,
        required: false,
    },
    razorpay_payment_id: {
        type: String,
        required: false,
    },
    razorpay_signature: {
        type: String,
        required: false,
    }
  },
  { timestamps: true }
);

type PaymentSchemaType = InferSchemaType<typeof PaymentSchema>;
export type IPayment = HydratedDocument<PaymentSchemaType>;

export default mongoose.model<IPayment>('Payment', PaymentSchema);
