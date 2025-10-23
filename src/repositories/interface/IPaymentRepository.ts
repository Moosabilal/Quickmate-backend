import { IBaseRepository } from './base/IBaseRepository'
import { IPayment } from '../../models/payment'

export interface IPaymentRepository extends IBaseRepository<IPayment> {
    getMonthlyAdminRevenue(): Promise<{ month: string; total: number }[]>;
    getTotalRevenue(): Promise<number>;
}