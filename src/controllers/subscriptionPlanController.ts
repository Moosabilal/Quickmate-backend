import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { IVerifySubscriptionPaymentReq } from "../interface/subscriptionPlan";
import { ZodError } from "zod";
import {
    createSubscriptionPlanSchema,
    updateSubscriptionPlanSchema,
    mongoIdParamSchema,
    providerIdParamSchema,
    createSubscriptionOrderSchema,
    verifySubscriptionPaymentSchema,
    getSubscriptionPlanQuerySchema,
    calculateUpgradeSchema
} from '../utils/validations/subscription.validation';

@injectable()
export class SubscriptionPlanController {
    private _subscriptionPlanService: ISubscriptionPlanService;
    constructor(@inject(TYPES.SubscriptionPlanService) subscriptionPlanService: ISubscriptionPlanService) {
        this._subscriptionPlanService = subscriptionPlanService
    }

    public createSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const validatedBody = createSubscriptionPlanSchema.parse(req.body);
            await this._subscriptionPlanService.createSubscriptionPlan(req.body)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error)
        }
    }

    public getSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search } = getSubscriptionPlanQuerySchema.parse(req.query);
            const response = await this._subscriptionPlanService.getSubscriptionPlan(search)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public updateSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const validatedBody = updateSubscriptionPlanSchema.parse(req.body);
            await this._subscriptionPlanService.updateSubscriptionPlan(req.body)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error)
        }
    }

    public deleteSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = mongoIdParamSchema.parse(req.params);
            await this._subscriptionPlanService.deleteSubscriptionPlan(id)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error)
        }
    }

    public checkProviderSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { providerId } = providerIdParamSchema.parse(req.params);
            const subscription = await this._subscriptionPlanService.checkAndExpire(providerId);
            res.json(subscription);
        } catch (error: any) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            res.status(400).json({ message: error.message });
        }
    };

    public createSubscriptionOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { providerId, planId } = createSubscriptionOrderSchema.parse(req.body);
            const response = await this._subscriptionPlanService.createSubscriptionOrder(providerId, planId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error)
        }
    }

    public calculateUpgrade = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { newPlanId } = calculateUpgradeSchema.parse(req.body);
            const userId = req.user.id; // Get provider from logged-in user

            const response = await this._subscriptionPlanService.calculateUpgradeCost(userId, newPlanId);
            res.status(HttpStatusCode.OK).json({ success: true, data: response });
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error);
        }
    }

    public verifySubscriptionPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {            
            const { providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifySubscriptionPaymentSchema.parse(req.body);
            const response = await this._subscriptionPlanService.verifySubscriptionPayment(providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            if (error instanceof ZodError) res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, errors: error.issues });
            next(error)
        }
    }

    
}