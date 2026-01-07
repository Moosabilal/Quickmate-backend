import expres from "express";
import TYPES from "../di/type";
import { type WalletController } from "../controllers/walletController";
import { container } from "../di/container";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = expres.Router();
const walletController = container.get<WalletController>(TYPES.WalletController);
const isUser = [authenticateToken, authorizeRoles(["Customer", "ServiceProvider"])];

router.get("/", isUser, walletController.getWallet);

router.post("/deposit/initiate", isUser, walletController.initiateDeposit);
router.post("/deposit/verify", isUser, walletController.verifyDeposit);

export default router;
