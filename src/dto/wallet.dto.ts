import { TransactionStatus } from "../enums/payment&wallet.enum";
import { Roles } from "../enums/userRoles";

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
     description: string
     userId: string
     transactionType: "credit" | "debit";
     status: TransactionStatus
     ownerType: Roles
}

export interface IGetWalletRes {
    _id: string
    walletId: string
    amount: number;
    description: string;
    remarks: string;
    source: string;
    transactionType: "credit" | "debit";

}