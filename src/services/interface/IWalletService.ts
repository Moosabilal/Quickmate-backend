import { type WalletFilter } from "../../interface/payment";
import { type IDepositVerification, type IInitiateDepositRes } from "../../interface/wallet";
import { type Roles } from "../../enums/userRoles";
import { type ITransaction } from "../../models/transaction";
import { type IWallet } from "../../models/wallet";

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
