import { injectable } from "inversify";
import payment, { IPayment } from "../../models/payment";
import { IPaymentRepository } from "../interface/IPaymentRepository";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class PaymentRepository extends BaseRepository<IPayment> implements IPaymentRepository {
    constructor () {
        super(payment)
    }
}