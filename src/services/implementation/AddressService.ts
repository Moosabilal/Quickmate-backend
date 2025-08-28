import { inject, injectable } from "inversify";
import { IAddressService } from "../interface/IAddressService";
import { IAddressRepository } from "../../repositories/interface/IAddressRepository";
import TYPES from "../../di/type";
import { IAddress } from "../../models/address";
import { IAddressRequest } from "../../dto/address..dto";

injectable()
export class AddressService implements IAddressService {
    private addressRepsitory: IAddressRepository
    constructor(@inject(TYPES.AddressRepository) addressRepsitory: IAddressRepository) {
        this.addressRepsitory = addressRepsitory
    }

    public async addAddress(data: Partial<IAddress>): Promise<IAddressRequest> {
        const createdAddress = await this.addressRepsitory.create(data)
        return {
            id: createdAddress._id.toString(),
            userId: createdAddress.userId.toString(),
            label: createdAddress.label,
            street: createdAddress.street,
            city: createdAddress.city,
            state: createdAddress.state,
            zip: createdAddress.zip,
            locationCoords: `${createdAddress.locationCoords.coordinates[1]},${createdAddress.locationCoords.coordinates[0]}` || "",
        }
    }

    public async getAllAddress(userId: string): Promise<IAddressRequest[]> {
        const allAddress = await this.addressRepsitory.findAll({ userId: userId })
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
        const updatedAddress = await this.addressRepsitory.update(id, data)
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

    public async delete_Address(id: string): Promise<{message: string}> {
        await this.addressRepsitory.delete(id)
        return {
            message: "Address Deleted"
        }
    }
}