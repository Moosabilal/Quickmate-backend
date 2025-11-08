import { IAddress } from "../../models/address";
import { IAddressData, IAddressRequest } from "../../interface/address";
export interface IAddressService {
    addAddress(userId: string, data: Partial<IAddressRequest>): Promise<IAddressRequest>;
    getAllAddress(userId: string): Promise<IAddressRequest[]>;
    updateAddressById(id: string, data: IAddressRequest): Promise<IAddressRequest>;
    delete_Address(id: string): Promise<{message: string}>;
    getAddressesForUser(userId: string): Promise<IAddress[]>;
    createAddress(data: IAddressData, userId: string): Promise<IAddress>;
}