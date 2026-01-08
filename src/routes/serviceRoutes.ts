import express from "express";
import upload from "../utils/multer";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";
import { container } from "../di/container";
import { type ServiceController } from "../controllers/serviceController";
import TYPES from "../di/type";

const router = express.Router();
const serviceController = container.get<ServiceController>(TYPES.ServiceController);
const isProvider = [authenticateToken, authorizeRoles(["ServiceProvider"])];

router.post(
  "/addService",
  isProvider,
  upload.fields([{ name: "businessCertification", maxCount: 1 }]),
  serviceController.addService,
);
router.put("/updateService/:id", isProvider, upload.none(), serviceController.updateService);
router.get("/getServicesForProvider/:providerId", isProvider, serviceController.getServicesForProvider);
router.get("/getServiceById/:id", isProvider, serviceController.getServiceById);
router.delete("/deleteService/:id", isProvider, serviceController.deleteService);

export default router;
