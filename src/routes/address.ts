import express from "express";
import { container } from "../di/container.js";
import TYPES from "../di/type.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { type AddressController } from "../controllers/addressController.js";

const router = express.Router();
const addressController = container.get<AddressController>(TYPES.AddressController);

const isUser = [authenticateToken, authorizeRoles(["Customer", "ServiceProvider"])];

router.post("/createAddress", isUser, addressController.createAddress);
router.get("/", isUser, addressController.getAddress);
router.put("/updateAddress/:id", isUser, addressController.updateAddress);
router.delete("/deleteAddress/:id", isUser, addressController.deleteAddress);

export default router;
