import { IBaseRepository } from './base/IBaseRepository'
import { IPayment } from '../../models/payment'
import { IPaymentTotals } from '../../interface/payment';

export interface IPaymentRepository extends IBaseRepository<IPayment> {
    getMonthlyAdminRevenue(): Promise<{ month: string; total: number }[]>;
    getTotalRevenue(): Promise<number>;
    getTotalsInDateRange(startDate: Date, endDate: Date): Promise<IPaymentTotals>;
}