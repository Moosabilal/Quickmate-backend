"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const type_1 = __importDefault(require("../di/type"));
const container_1 = require("../di/container");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const walletController = container_1.container.get(type_1.default.WalletController);
const isUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(["Customer", "ServiceProvider"])];
router.get("/", isUser, walletController.getWallet);
router.post("/deposit/initiate", isUser, walletController.initiateDeposit);
router.post("/deposit/verify", isUser, walletController.verifyDeposit);
exports.default = router;
