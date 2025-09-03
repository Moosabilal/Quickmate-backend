import { PaymentMethod } from "../enums/userRoles";

export interface IOrder {
    id?: string,
    amount: number,
    currency: string,
    receipt: string
}

export interface IPaymentVerificationRequest {
    userId: string,
    providerId: string,
    bookingId: string,
    paymentMethod: PaymentMethod,
    paymentDate: Date,
    amount: number,
    adminCommission: number,
    providerAmount: number,
    razorpay_order_id: string, 
    razorpay_payment_id: string, 
    razorpay_signature: string,
}