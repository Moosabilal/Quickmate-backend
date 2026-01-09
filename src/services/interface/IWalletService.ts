import { type WalletFilter } from "../../interface/payment.js";
import { type IDepositVerification, type IInitiateDepositRes } from "../../interface/wallet.js";
import { type Roles } from "../../enums/userRoles.js";
import { type ITransaction } from "../../models/transaction.js";
import { type IWallet } from "../../models/wallet.js";

export interface IWalletService {
  initiateDeposit(amount: number): Promise<IInitiateDepositRes>;
  verifyDeposit(depositVerification: IDepositVerification): Promise<{ message: string }>;
  getSummary(
    userId: string,
    ownerType: Roles,
    filters: Partial<WalletFilter>,
    page: number,
    limit: number,
  ): Promise<{
    wallet: IWallet;
    transactions: ITransaction[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
}
