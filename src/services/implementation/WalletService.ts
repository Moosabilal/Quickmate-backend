import { inject, injectable } from "inversify";
import { IWalletService } from "../interface/IWalletService";
import { IWalletRepository } from "../../repositories/interface/IWalletRepository";
import TYPES from "../../di/type";

@injectable()
export class WalletService implements IWalletService {
    private walletRepository: IWalletRepository;
    constructor(@inject(TYPES.WalletRepository) walletRepository: IWalletRepository) {
        this.walletRepository = walletRepository
    }
}