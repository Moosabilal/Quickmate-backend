import { type IBaseRepository } from "./base/IBaseRepository";
import { type IPayment } from "../../models/payment";
import { type IPaymentTotals } from "../../interface/payment";

export interface IPaymentRepository extends IBaseRepository<IPayment> {
  getMonthlyAdminRevenue(): Promise<{ month: string; total: number }[]>;
  getTotalRevenue(): Promise<number>;
  getTotalsInDateRange(startDate: Date, endDate: Date): Promise<IPaymentTotals>;
}
