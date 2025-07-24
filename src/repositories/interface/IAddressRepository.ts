import { IAddress } from "../../models/address";
import { IAddressRequest } from "../../types/address";
export interface IAddressRepository {
    createAddress(data: IAddressRequest): Promise<IAddress>;
    fetchAddress(userId: string): Promise<IAddress[]>;
    updateAddress(id: string, data: IAddressRequest): Promise<IAddress>;
    deleteAddressById(id: string): Promise<void>;
}