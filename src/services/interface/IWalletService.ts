import { IDepositVerification, IInitiateDepositRes } from "../../dto/wallet.dto";
import { Roles } from "../../enums/userRoles";


export interface IWalletService {
    initiateDeposit(amount: number): Promise<IInitiateDepositRes>;
    verifyDeposit(depositVerification: IDepositVerification): Promise<{message: string}>;
    deposit(userId: string,ownerType: Roles,amount: number,source: string,remarks?: string)
    getSummary(userId: string, ownerType: Roles)
}