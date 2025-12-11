import { inject, injectable } from "inversify";
import { IAddressService } from "../services/interface/IAddressService";
import TYPES from "../di/type";
import { Request, NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { ZodError } from 'zod';
import {
    createAddressSchema,
    paramIdSchema,
    updateAddressSchema,
} from '../utils/validations/address.validation';
import { IAddressData, IAddressRequest } from "../interface/address";


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
            const { id } = paramIdSchema.parse(req.params);
            const validatedBody = updateAddressSchema.parse(req.body);
            const updateData: IAddressData = { 
                label: validatedBody.label,
                street: validatedBody.street,
                city: validatedBody.city,
                state: validatedBody.state,
                zip: validatedBody.zip
             };
            if (validatedBody.locationCoords) {
                const [lat, lon] = validatedBody.locationCoords.split(",").map(Number);
                updateData.locationCoords = { type: "Point", coordinates: [lon, lat] };
            }
            console.log('the location correds', updateData)
            const updateAddress = await this._addressService.updateAddressById(id, updateData as IAddressRequest)
            res.status(HttpStatusCode.OK).json(updateAddress)
        } catch (error) {
            next(error)
        }

    }

    public deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const response = await this._addressService.delete_Address(id)
            res.status(HttpStatusCode.OK).json(response)
        } catch (error) {
            next(error)
        }
    }
}