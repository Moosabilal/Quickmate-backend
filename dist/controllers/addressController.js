var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { createAddressSchema, paramIdSchema, updateAddressSchema } from "../utils/validations/address.validation";
injectable();
let AddressController = class AddressController {
    _addressService;
    constructor(addressService) {
        this._addressService = addressService;
    }
    createAddress = async (req, res, next) => {
        try {
            const validatedBody = createAddressSchema.parse(req.body);
            const userId = req.user.id;
            const updatedAddress = await this._addressService.addAddress(userId, validatedBody);
            res.status(HttpStatusCode.OK).json(updatedAddress);
        }
        catch (error) {
            next(error);
        }
    };
    getAddress = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const address = await this._addressService.getAllAddress(userId);
            res.status(HttpStatusCode.OK).json(address);
        }
        catch (error) {
            next(error);
        }
    };
    updateAddress = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const validatedBody = updateAddressSchema.parse(req.body);
            const updateData = {
                label: validatedBody.label,
                street: validatedBody.street,
                city: validatedBody.city,
                state: validatedBody.state,
                zip: validatedBody.zip,
            };
            if (validatedBody.locationCoords) {
                const [lat, lon] = validatedBody.locationCoords.split(",").map(Number);
                updateData.locationCoords = { type: "Point", coordinates: [lon, lat] };
            }
            const updateAddress = await this._addressService.updateAddressById(id, updateData);
            res.status(HttpStatusCode.OK).json(updateAddress);
        }
        catch (error) {
            next(error);
        }
    };
    deleteAddress = async (req, res, next) => {
        try {
            const { id } = paramIdSchema.parse(req.params);
            const response = await this._addressService.delete_Address(id);
            res.status(HttpStatusCode.OK).json(response);
        }
        catch (error) {
            next(error);
        }
    };
};
AddressController = __decorate([
    __param(0, inject(TYPES.AddressService)),
    __metadata("design:paramtypes", [Object])
], AddressController);
export { AddressController };
