import { ClientSession } from "mongoose";
import { IWallet } from "../../models/wallet";
import { IBaseRepository } from "./base/IBaseRepository";
import { ITransaction } from "../../models/transaction";


export interface IWalletRepository extends IBaseRepository<IWallet> {
    saveWallet(wallet: IWallet, session?: ClientSession): Promise<IWallet>;
    createTransaction(data: Partial<ITransaction>,session?: ClientSession): Promise<ITransaction>;
    getTransactions(walletId: string, limit?: number): Promise<ITransaction[]>;
}