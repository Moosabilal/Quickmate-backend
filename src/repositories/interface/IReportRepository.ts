import { type IReport } from "../../models/Report.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

export interface IReportRepository extends IBaseRepository<IReport> {
  findByBookingId(bookingId: string): Promise<IReport | null>;
  findAllWithPopulate(page: number, limit: number): Promise<{ reports: IReport[]; total: number }>;
  findAllUserReportsWithPopulate(userId: string): Promise<IReport[]>;
}
