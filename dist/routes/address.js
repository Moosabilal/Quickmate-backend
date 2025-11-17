"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const addressController = container_1.container.get(type_1.default.AddressController);
const isUser = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(['Customer', 'ServiceProvider'])];
router.post('/createAddress', isUser, addressController.createAddress);
router.get('/', isUser, addressController.getAddress);
router.put('/updateAddress/:id', isUser, addressController.updateAddress);
router.delete('/deleteAddress/:id', isUser, addressController.deleteAddress);
exports.default = router;
