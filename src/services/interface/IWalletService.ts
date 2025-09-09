import { WalletFilter } from "../../dto/payment.dto";
import { IDepositVerification, IGetWalletRes, IInitiateDepositRes } from "../../dto/wallet.dto";
import { Roles } from "../../enums/userRoles";
import { ITransaction } from "../../models/transaction";
import { IWallet } from "../../models/wallet";


export interface IWalletService {
    initiateDeposit(amount: number): Promise<IInitiateDepositRes>;
    verifyDeposit(depositVerification: IDepositVerification): Promise<{message: string}>;
    // deposit(userId: string,ownerType: Roles,amount: number,source: string, description: string, transactionType: "credit" | "debit", remarks?: string,): Promise<IWallet>
    getSummary(userId: string, ownerType: Roles, filters: Partial<WalletFilter>, page: number, limit: number): Promise<{wallet: IWallet, transactions: ITransaction[], total: number, totalPages: number, currentPage: number}>
}