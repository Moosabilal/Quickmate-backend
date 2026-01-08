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
import TYPES from "../../di/type";
import { toAddressRequestDTO } from "../../utils/mappers/address.mapper";
import { toAddressModel } from "../../utils/reverseMapper/address.rMapper";
import { Types } from "mongoose";
injectable();
let AddressService = class AddressService {
    _addressRepository;
    constructor(addressRepsitory) {
        this._addressRepository = addressRepsitory;
    }
    async addAddress(userId, data) {
        const dataForDb = toAddressModel(userId, data);
        const existingAddress = await this._addressRepository.findOne({
            userId: dataForDb.userId,
            label: dataForDb.label,
            street: dataForDb.street,
            zip: dataForDb.zip,
        });
        if (existingAddress) {
            return toAddressRequestDTO(existingAddress);
        }
        const createdAddress = await this._addressRepository.create(dataForDb);
        return toAddressRequestDTO(createdAddress);
    }
    async getAllAddress(userId) {
        const allAddress = await this._addressRepository.findAll({
            userId: userId,
        });
        return allAddress
            .filter((adr) => adr.label !== "Current Location")
            .map((adr) => ({
            id: adr._id.toString(),
            userId: adr.userId.toString(),
            label: adr.label,
            street: adr.street,
            city: adr.city,
            state: adr.state,
            zip: adr.zip,
            locationCoords: adr.locationCoords.coordinates
                ? `${adr.locationCoords.coordinates[1]},${adr.locationCoords.coordinates[0]}`
                : "",
        }));
    }
    async updateAddressById(id, data) {
        const updatedAddress = await this._addressRepository.update(id, data);
        return {
            id: updatedAddress._id.toString(),
            userId: updatedAddress.userId.toString(),
            label: updatedAddress.label,
            street: updatedAddress.street,
            city: updatedAddress.city,
            state: updatedAddress.state,
            zip: updatedAddress.zip,
            locationCoords: updatedAddress.locationCoords.coordinates
                ? `${updatedAddress.locationCoords.coordinates[1]},${updatedAddress.locationCoords.coordinates[0]}`
                : "",
        };
    }
    async delete_Address(id) {
        await this._addressRepository.delete(id);
        return {
            message: "Address Deleted",
        };
    }
    async getAddressesForUser(userId) {
        return this._addressRepository.findAll({
            userId: new Types.ObjectId(userId),
            label: { $ne: "Current Location" },
        });
    }
};
AddressService = __decorate([
    __param(0, inject(TYPES.AddressRepository)),
    __metadata("design:paramtypes", [Object])
], AddressService);
export { AddressService };
