import { inject, injectable } from "inversify";
import { IWalletService } from "../services/interface/IWalletService";
import TYPES from "../di/type";

@injectable()
export class WalletController {
    private walletService: IWalletService;
    constructor(@inject(TYPES.WalletService) walletService: IWalletService) {
        this.walletService = walletService
    }
}