import { type IBaseRepository } from "./base/IBaseRepository.js";
import { type IPayment } from "../../models/payment.js";
import { type IPaymentTotals } from "../../interface/payment.js";

export interface IPaymentRepository extends IBaseRepository<IPayment> {
  getMonthlyAdminRevenue(): Promise<{ month: string; total: number }[]>;
  getTotalRevenue(): Promise<number>;
  getTotalsInDateRange(startDate: Date, endDate: Date): Promise<IPaymentTotals>;
}
