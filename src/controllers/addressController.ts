import { inject, injectable } from "inversify";
import { IAddressService } from "../services/interface/IAddressService";
import TYPES from "../di/type";
import { Request, NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { ZodError } from 'zod';
import {
    createAddressSchema,
    updateAddressSchema,
    mongoIdSchema
} from '../utils/validations/address.validation';


injectable()
export class AddressController {
    private _addressService: IAddressService
    constructor(@inject(TYPES.AddressService) addressService: IAddressService) {
        this._addressService = addressService;
    }

    public createAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const validatedBody = createAddressSchema.parse(req.body);
            const userId = req.user.id
            const updatedAddress = await this._addressService.addAddress(userId, validatedBody)
            res.status(HttpStatusCode.OK).json(updatedAddress)
        } catch (error) {
            next(error)
        }
    }

    public getAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id
            const address = await this._addressService.getAllAddress(userId)
            res.status(HttpStatusCode.OK).json(address)
        } catch (error) {
            next(error)
        }
    }

    public updateAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = mongoIdSchema.parse(req.params);
            const validatedBody = updateAddressSchema.parse(req.body);
            const updateData: any = { ...validatedBody };
            const locationString = validatedBody.locationCoords;
            if (validatedBody.locationCoords) {
                const [lat, lon] = validatedBody.locationCoords.split(",").map(Number);
                updateData.locationCoords = { type: "Point", coordinates: [lon, lat] };
            }
            const updateAddress = await this._addressService.updateAddressById(id, updateData)
            res.status(HttpStatusCode.OK).json(updateAddress)
        } catch (error) {
            next(error)
        }

    }

    public deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = mongoIdSchema.parse(req.params);
            const response = await this._addressService.delete_Address(id)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}