import { injectable } from "inversify";
import { IAddressRepository } from "../interface/IAddressRepository";
import { Address, IAddress } from "../../models/address";
import { IAddressRequest } from "../../dto/address..dto";


@injectable()
export class AddressRepository implements IAddressRepository {
    async createAddress(data: IAddressRequest): Promise<IAddress> {
        const address = new Address(data)
        return await address.save()
    }

    async fetchAddress(userId: string): Promise<IAddress[]> {
        return await Address.find({userId: userId})
    }

    async updateAddress(id: string, data: IAddressRequest): Promise<IAddress> {
        return await Address.findByIdAndUpdate(id, data,{new: true})
    }

    async deleteAddressById(id: string): Promise<void> {
        await Address.findByIdAndDelete(id)
    }
}