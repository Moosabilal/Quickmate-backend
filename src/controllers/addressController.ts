import { inject, injectable } from "inversify";
import { IAddressService } from "../services/interface/IAddressService";
import TYPES from "../di/type";
import { Request, NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";


injectable()
export class AddressController {
    private addressService: IAddressService
    constructor(@inject(TYPES.AddressService) addressService: IAddressService) {
        this.addressService = addressService;
    }

    public createAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            console.log('req.body', req.body)
            const data = {
                ...req.body,
                userId: req.user.id
            }
            const updatedAddress = await this.addressService.addAddress(data)
            res.status(200).json(updatedAddress)
        } catch (error) {
            next(error)
        }
    }

    public getAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id
            const address = await this.addressService.getAllAddress(userId)
            res.status(200).json(address)
        } catch (error) {
            next(error)
        }
    }

    public updateAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const updateAddress = await this.addressService.updateAddressById(req.params.id, req.body)
            res.status(200).json(updateAddress)
        } catch (error) {
            next(error)
        }

    }

    public deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.addressService.delete_Address(req.params.id)
            res.status(200).json(response)
        } catch (error) {
            next(error)
        }
    }
}