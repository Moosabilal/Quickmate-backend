import { inject, injectable } from "inversify";
import { IAddressService } from "../services/interface/IAddressService";
import TYPES from "../di/type";
import { Request, NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";


injectable()
export class AddressController {
    private addressService: IAddressService
    constructor(@inject(TYPES.AddressService) addressService: IAddressService) {
        this.addressService = addressService;
    }

    public createAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = {
                ...req.body,
                userId: req.user.id
            }
            const updatedAddress = await this.addressService.addAddress(data)
            res.status(HttpStatusCode.OK).json(updatedAddress)
        } catch (error) {
            next(error)
        }
    }

    public getAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id
            const address = await this.addressService.getAllAddress(userId)
            res.status(HttpStatusCode.OK).json(address)
        } catch (error) {
            next(error)
        }
    }

    public updateAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const updateAddress = await this.addressService.updateAddressById(req.params.id, req.body)
            res.status(HttpStatusCode.OK).json(updateAddress)
        } catch (error) {
            next(error)
        }

    }

    public deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.addressService.delete_Address(req.params.id)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}