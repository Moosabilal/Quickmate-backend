import { inject, injectable } from "inversify";
import { IAddressService } from "../interface/IAddressService";
import { IAddressRepository } from "../../repositories/interface/IAddressRepository";
import TYPES from "../../di/type";
import { IAddress } from "../../models/address";
import { IAddressRequest } from "../../types/address";

injectable()
export class AddressService implements IAddressService {
    private addressRepsitory: IAddressRepository
    constructor(@inject(TYPES.AddressRepository) addressRepsitory: IAddressRepository) {
        this.addressRepsitory = addressRepsitory
    }

    public async addAddress(data: IAddressRequest): Promise<IAddressRequest> {
        console.log('the data is coming to the servive', data)
        const createdAddress = await this.addressRepsitory.createAddress(data)
        console.log('the udpated data in service', createdAddress)
        return {
            id: createdAddress._id.toString(),
            userId: createdAddress.userId.toString(),
            label: createdAddress.label,
            street: createdAddress.street,
            city: createdAddress.city,
            state: createdAddress.state,
            zip: createdAddress.zip,
        }
    }

    public async getAllAddress(userId: string): Promise<IAddressRequest[]> {
        const allAddress = await this.addressRepsitory.fetchAddress(userId)
        return allAddress.map((adr) => ({
            id: adr._id.toString(),
            userId: adr.userId.toString(),
            label: adr.label,
            street: adr.street,
            city: adr.city,
            state: adr.state,
            zip: adr.zip,
        }))
    }

    public async updateAddressById(id: string, data: IAddressRequest): Promise<IAddressRequest> {
        const updatedAddress = await this.addressRepsitory.updateAddress(id, data)
        return {
            id: updatedAddress._id.toString(),
            userId: updatedAddress.userId.toString(),
            label: updatedAddress.label,
            street: updatedAddress.street,
            city: updatedAddress.city,
            state: updatedAddress.state,
            zip: updatedAddress.zip,
        } 
    }

    public async delete_Address(id: string): Promise<{message: string}> {
        await this.addressRepsitory.deleteAddressById(id)
        return {
            message: "Address Deleted"
        }
    }
}