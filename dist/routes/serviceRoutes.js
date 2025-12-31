"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("../utils/multer"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const router = express_1.default.Router();
const serviceController = container_1.container.get(type_1.default.ServiceController);
const isProvider = [authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRoles)(["ServiceProvider"])];
router.post('/addService', isProvider, multer_1.default.fields([{ name: 'businessCertification', maxCount: 1 }]), serviceController.addService);
router.put('/updateService/:id', isProvider, multer_1.default.none(), serviceController.updateService);
router.get('/getServicesForProvider/:providerId', isProvider, serviceController.getServicesForProvider);
router.get('/getServiceById/:id', isProvider, serviceController.getServiceById);
router.delete('/deleteService/:id', isProvider, serviceController.deleteService);
exports.default = router;
