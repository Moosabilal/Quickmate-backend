export interface IInitiateDepositRes {
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
}

export interface IDepositVerification {
    razorpay_order_id: string;
     razorpay_payment_id: string;
     razorpay_signature: string;
     amount: number;
     userId: string
}