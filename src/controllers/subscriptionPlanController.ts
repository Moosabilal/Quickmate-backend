import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService";
import { AuthRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { HttpStatusCode } from "../enums/HttpStatusCode";

@injectable()
export class SubscriptionPlanController {
    private _subscriptionPlanService: ISubscriptionPlanService;
    constructor(@inject(TYPES.SubscriptionPlanService) subscriptionPlanService: ISubscriptionPlanService){
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
            const response = await this._subscriptionPlanService.deleteSubscriptionPlan(id)
            res.status(HttpStatusCode.OK).json()
        } catch (error) {
            next(error)
        }
    }
}