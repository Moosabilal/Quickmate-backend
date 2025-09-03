import { injectable } from "inversify";
import { IWallet, Wallet } from "../../models/wallet";
import { BaseRepository } from "./base/BaseRepository";
import { IWalletRepository } from "../interface/IWalletRepository";

@injectable()
export class WalletRepository extends BaseRepository<IWallet> implements IWalletRepository {
    constructor() {
        super(Wallet)
    }
}