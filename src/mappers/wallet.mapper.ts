import { Currency } from "lucide-react"
import { IOrder } from "../dto/payment.dto"


export const toIInitiateDepositRes = async (order: IOrder) => {
    return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,

    }
}