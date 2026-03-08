import { type Types } from "mongoose";

export interface IReportResponse {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  providerId: {
    _id: Types.ObjectId | string;
    fullName: string;
    email: string;
    profilePicture: string;
  };
  bookingId: {
    _id: Types.ObjectId | string;
    serviceId: Types.ObjectId | string;
    date?: string;
    time?: string;
    totalAmount?: string;
    status: string;
    addressId?: {
      _id: Types.ObjectId | string;
      locationCoords?: string;
    };
    paymentId?: {
      razorpay_order_id?: string;
    };
    bookedOrderId?: string;
  };
  reason: string;
  description: string;
  status: "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  adminFeedback?: string | null;
  adminReply?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
