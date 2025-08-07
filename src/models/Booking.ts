
import mongoose, { Schema, Document, HydratedDocument, InferSchemaType } from 'mongoose';

const BookingSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: false,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: false,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
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
    amount: {
      type: Number,
      required: false,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Refunded'],
      default: 'Unpaid',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
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
      enum: ['Bot', 'Manual'],
      default: 'Manual',
    },
  },
  { timestamps: true }
);

type BookingSchemaType = InferSchemaType<typeof BookingSchema>
export type IBooking = HydratedDocument<BookingSchemaType>

export default mongoose.model<IBooking>('Booking', BookingSchema)