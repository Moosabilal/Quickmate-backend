import { Currency } from "lucide-react"
import { IOrder } from "../../interface/payment"


export const toIInitiateDepositRes = async (order: IOrder) => {
    return {
        success: true,
        orderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,

    }
}