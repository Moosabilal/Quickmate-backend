export interface IPaymentService {
  createOrder(amount: number): Promise<any>;
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>;
}