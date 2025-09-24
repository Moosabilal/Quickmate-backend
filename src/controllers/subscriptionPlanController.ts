import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { IVerifySubscriptionPaymentReq } from "../interface/subscriptionPlan";

@injectable()
export class SubscriptionPlanController {
    private _subscriptionPlanService: ISubscriptionPlanService;
    constructor(@inject(TYPES.SubscriptionPlanService) subscriptionPlanService: ISubscriptionPlanService) {
        this._subscriptionPlanService = subscriptionPlanService
    }

    public createSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            await this._subscriptionPlanService.createSubscriptionPlan(req.body)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            next(error)
        }
    }

    public getSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this._subscriptionPlanService.getSubscriptionPlan()
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public updateSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            await this._subscriptionPlanService.updateSubscriptionPlan(req.body)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            next(error)
        }
    }

    public deleteSubscriptionPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            await this._subscriptionPlanService.deleteSubscriptionPlan(id)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            next(error)
        }
    }

    public checkProviderSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { providerId } = req.params;
            const subscription = await this._subscriptionPlanService.checkAndExpire(providerId);
            res.json(subscription);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    };

    public createSubscriptionOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { providerId, planId } = req.body
            const response = await this._subscriptionPlanService.createSubscriptionOrder(providerId, planId)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    public verifySubscriptionPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {            
            const {providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body as IVerifySubscriptionPaymentReq
            const response = await this._subscriptionPlanService.verifySubscriptionPayment(providerId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }

    
}