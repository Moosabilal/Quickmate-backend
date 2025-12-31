import { inject, injectable } from "inversify";
import { IAddressService } from "../interface/IAddressService";
import { IAddressRepository } from "../../repositories/interface/IAddressRepository";
import TYPES from "../../di/type";
import { IAddress } from "../../models/address";
import { IAddressData, IAddressRequest } from "../../interface/address";
import { toAddressRequestDTO } from "../../utils/mappers/address.mapper";
import { toAddressModel } from "../../utils/reverseMapper/address.rMapper";
import { Types } from "mongoose";
import { geocodeAddress } from "../../utils/helperFunctions/geocoder";

injectable()
export class AddressService implements IAddressService {
    private _addressRepository: IAddressRepository
    constructor(@inject(TYPES.AddressRepository) addressRepsitory: IAddressRepository) {
        this._addressRepository = addressRepsitory
    }

    public async addAddress(userId: string, data: Partial<IAddressRequest>): Promise<IAddressRequest> {
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

    public async getAllAddress(userId: string): Promise<IAddressRequest[]> {
        const allAddress = await this._addressRepository.findAll({ userId: userId })
        return allAddress.filter((adr => adr.label !== "Current Location")).map((adr) => ({
            id: adr._id.toString(),
            userId: adr.userId.toString(),
            label: adr.label,
            street: adr.street,
            city: adr.city,
            state: adr.state,
            zip: adr.zip,
            locationCoords: `${adr.locationCoords.coordinates[1]},${adr.locationCoords.coordinates[0]}` || "",
        }))
    }

    public async updateAddressById(id: string, data: IAddressRequest): Promise<IAddressRequest> {
        const updatedAddress = await this._addressRepository.update(id, data)
        return {
            id: updatedAddress._id.toString(),
            userId: updatedAddress.userId.toString(),
            label: updatedAddress.label,
            street: updatedAddress.street,
            city: updatedAddress.city,
            state: updatedAddress.state,
            zip: updatedAddress.zip,
            locationCoords: `${updatedAddress.locationCoords.coordinates[1]},${updatedAddress.locationCoords.coordinates[0]}` || "",
        }
    }

    public async delete_Address(id: string): Promise<{ message: string }> {
        await this._addressRepository.delete(id)
        return {
            message: "Address Deleted"
        }
    }

    public async getAddressesForUser(userId: string): Promise<IAddress[]> {
        return this._addressRepository.findAll({ userId: new Types.ObjectId(userId), label: { $ne: "Current Location" }});
    }

}